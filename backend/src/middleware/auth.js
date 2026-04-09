const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { ApiError } = require("../core/ApiError");
const { User } = require("../models/User");

async function authenticate(req, _res, next) {
  const bearer = req.headers.authorization;
  const token = bearer && bearer.startsWith("Bearer ") ? bearer.split(" ")[1] : null;

  if (!token) {
    return next(new ApiError(401, "Authentication required"));
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    const user = await User.findById(payload.sub).select("_id email isActive");
    if (!user || !user.isActive) {
      return next(new ApiError(401, "Invalid authentication state"));
    }

    req.auth = {
      userId: user._id.toString(),
      email: user.email,
      roles: Array.isArray(payload.roles) ? payload.roles : [],
      activeTermId: payload.activeTermId || null,
    };
    return next();
  } catch (_error) {
    return next(new ApiError(401, "Invalid or expired token"));
  }
}

module.exports = { authenticate };
