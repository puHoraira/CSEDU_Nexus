const bcrypt = require("bcryptjs");
const { ApiError } = require("../core/ApiError");
const { User } = require("../models/User");
const { Member } = require("../models/Member");
const { Role } = require("../models/Role");
const { UserRole } = require("../models/UserRole");
const { TokenService } = require("./TokenService");
const { AccessService } = require("./AccessService");
const { AuditService } = require("./AuditService");
const { policyRegistry } = require("../policies");

class AuthService {
  static buildAuthUserPayload(user, roles) {
    return {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || "",
      avatarUrl: user.avatarUrl || "",
      bio: user.bio || "",
      experience: user.experience || "",
      designation: user.designation || "",
      roles,
    };
  }

  static async register(payload, requestMeta) {
    const { email, password, firstName, lastName, studentId, batch, currentYear, experience } = payload;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(409, "Email already exists");
    }

    const policyResult = await policyRegistry.evaluate("membership.register", { studentId });
    if (!policyResult.allowed) {
      throw new ApiError(409, policyResult.reason || "Membership registration blocked");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, firstName, lastName, experience: experience || "" });
    await Member.create({ userId: user._id, studentId, batch, currentYear });

    const generalMemberRole = await Role.findOne({ name: "General Member" });
    if (generalMemberRole) {
      await UserRole.create({ userId: user._id, roleId: generalMemberRole._id });
    }

    const roles = await AccessService.getUserRoleNames(user._id);
    const accessToken = TokenService.createAccessToken({ sub: user._id.toString(), roles });
    const refreshToken = TokenService.createRefreshToken({ sub: user._id.toString() });

    await AuditService.log({
      actorId: user._id,
      action: "AUTH_REGISTER",
      resource: "User",
      resourceId: user._id.toString(),
      requestId: requestMeta?.requestId,
      metadata: { email: user.email },
    });

    return {
      user: this.buildAuthUserPayload(user, roles),
      accessToken,
      refreshToken,
    };
  }

  static async registerTeacher(payload, requestMeta) {
    const { email, password, firstName, lastName, designation, phone, experience } = payload;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(409, "Email already exists");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      passwordHash,
      firstName,
      lastName,
      designation,
      phone: phone || "",
      experience: experience || "",
      bio: experience || "",
    });

    const alumniRole = await Role.findOne({ name: "Alumni" });
    if (!alumniRole) {
      throw new ApiError(500, "Alumni role is missing. Run seed first.");
    }
    await UserRole.create({ userId: user._id, roleId: alumniRole._id });

    const roles = await AccessService.getUserRoleNames(user._id);
    const accessToken = TokenService.createAccessToken({ sub: user._id.toString(), roles });
    const refreshToken = TokenService.createRefreshToken({ sub: user._id.toString() });

    await AuditService.log({
      actorId: user._id,
      action: "AUTH_REGISTER_TEACHER",
      resource: "User",
      resourceId: user._id.toString(),
      requestId: requestMeta?.requestId,
      metadata: { email: user.email, designation, mappedRole: "Alumni" },
    });

    return {
      user: this.buildAuthUserPayload(user, roles),
      accessToken,
      refreshToken,
    };
  }

  static async login({ email, password }, requestMeta) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      throw new ApiError(401, "Invalid credentials");
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new ApiError(401, "Invalid credentials");
    }

    const roles = await AccessService.getUserRoleNames(user._id);
    const accessToken = TokenService.createAccessToken({ sub: user._id.toString(), roles });
    const refreshToken = TokenService.createRefreshToken({ sub: user._id.toString() });

    await AuditService.log({
      actorId: user._id,
      action: "AUTH_LOGIN",
      resource: "User",
      resourceId: user._id.toString(),
      requestId: requestMeta?.requestId,
    });

    return {
      user: this.buildAuthUserPayload(user, roles),
      accessToken,
      refreshToken,
    };
  }

  static async refresh(token) {
    const payload = TokenService.verifyRefreshToken(token);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new ApiError(401, "Invalid refresh token state");
    }

    const roles = await AccessService.getUserRoleNames(user._id);
    const accessToken = TokenService.createAccessToken({ sub: user._id.toString(), roles });
    return { accessToken };
  }

  static async getProfile(userId) {
    const [user, member, roles] = await Promise.all([
      User.findById(userId).select("email firstName lastName phone avatarUrl bio isActive createdAt updatedAt"),
      Member.findOne({ userId }).select("studentId batch currentYear status"),
      AccessService.getUserRoleNames(userId),
    ]);

    if (!user) throw new ApiError(404, "User not found");

    return {
      user: this.buildAuthUserPayload(user, roles),
      membership: member
        ? {
            studentId: member.studentId,
            batch: member.batch,
            currentYear: member.currentYear,
            status: member.status,
          }
        : null,
      account: {
        isActive: user.isActive,
        joinedAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  static async updateProfile(userId, payload, requestMeta) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    user.firstName = payload.firstName;
    user.lastName = payload.lastName;
    user.phone = payload.phone || "";
    user.avatarUrl = payload.avatarUrl || "";
    user.bio = payload.bio || "";
    user.designation = payload.designation || "";
    user.experience = payload.experience || "";
    await user.save();

    await AuditService.log({
      actorId: user._id,
      action: "PROFILE_UPDATED",
      resource: "User",
      resourceId: user._id.toString(),
      requestId: requestMeta?.requestId,
    });

    const roles = await AccessService.getUserRoleNames(user._id);
    return this.buildAuthUserPayload(user, roles);
  }
}

module.exports = { AuthService };
