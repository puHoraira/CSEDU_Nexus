const crypto = require("crypto");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const { ApiError } = require("../core/ApiError");
const { User } = require("../models/User");
const { AuditService } = require("./AuditService");

class SecurityService {
  // Rate limiting storage (in production, use Redis)
  static loginAttempts = new Map();
  static passwordResetAttempts = new Map();
  static verificationAttempts = new Map();
  static videoUploadAttempts = new Map();

  // Password complexity requirements
  static passwordRequirements = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    forbiddenPasswords: [
      'password', '123456', '12345678', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey'
    ]
  };

  // Account lockout settings
  static lockoutSettings = {
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    maxPasswordResetAttempts: 5,
    resetLockoutDuration: 30 * 60 * 1000, // 30 minutes
    maxVerificationAttempts: 10,
    verificationLockoutDuration: 30 * 60 * 1000 // 30 minutes
  };

  // Rate limiting settings
  static rateLimits = {
    login: { windowMs: 15 * 60 * 1000, max: 5 }, // 5 attempts per 15 minutes
    passwordReset: { windowMs: 15 * 60 * 1000, max: 5 }, // 5 attempts per 15 minutes
    emailVerification: { windowMs: 60 * 60 * 1000, max: 5 }, // 5 attempts per hour
    registration: { windowMs: 60 * 60 * 1000, max: 3 }, // 3 registrations per hour
    videoUpload: { windowMs: 5 * 60 * 1000, max: 20 }, // 20 uploads per 5 minutes
  };

  // Password strength validation
  static validatePasswordStrength(password) {
    const errors = [];
    const { passwordRequirements } = this;

    if (!password) {
      errors.push("Password is required");
      return { isValid: false, errors, strength: 0 };
    }

    // Length checks
    if (password.length < passwordRequirements.minLength) {
      errors.push(`Password must be at least ${passwordRequirements.minLength} characters long`);
    }
    if (password.length > passwordRequirements.maxLength) {
      errors.push(`Password must not exceed ${passwordRequirements.maxLength} characters`);
    }

    // Character requirements
    if (passwordRequirements.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    if (passwordRequirements.requireLowercase && !/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    if (passwordRequirements.requireNumbers && !/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }
    if (passwordRequirements.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }

    // Common password check
    if (passwordRequirements.forbiddenPasswords.includes(password.toLowerCase())) {
      errors.push("This password is too common and not allowed");
    }

    // Calculate strength score
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;
    if (password.length >= 16) strength++;

    return {
      isValid: errors.length === 0,
      errors,
      strength: Math.min(5, strength),
      strengthText: this.getStrengthText(Math.min(5, strength))
    };
  }

  static getStrengthText(strength) {
    const levels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    return levels[strength] || 'Very Weak';
  }

  // Rate limiting functions
  static checkRateLimit(identifier, type = 'login') {
    const limits = this.rateLimits[type];
    if (!limits) return { allowed: true };

    const key = `${type}:${identifier}`;
    const now = Date.now();
    const attempts = this.getAttemptStore(type);
    
    if (!attempts.has(key)) {
      attempts.set(key, { count: 1, resetTime: now + limits.windowMs });
      return { allowed: true, remaining: limits.max - 1 };
    }

    const record = attempts.get(key);
    
    // Reset if window expired
    if (now > record.resetTime) {
      attempts.set(key, { count: 1, resetTime: now + limits.windowMs });
      return { allowed: true, remaining: limits.max - 1 };
    }

    // Check if limit exceeded
    if (record.count >= limits.max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      return { 
        allowed: false, 
        remaining: 0, 
        retryAfter,
        message: `Too many ${type} attempts. Try again in ${retryAfter} seconds.`
      };
    }

    // Increment count
    record.count++;
    return { allowed: true, remaining: limits.max - record.count };
  }

  static getAttemptStore(type) {
    switch (type) {
      case 'passwordReset':
        return this.passwordResetAttempts;
      case 'emailVerification':
        return this.verificationAttempts;
      case 'videoUpload':
        return this.videoUploadAttempts;
      default:
        return this.loginAttempts;
    }
  }

  // Account lockout functions
  static async checkAccountLockout(userId, type = 'login') {
    const user = await User.findById(userId);
    if (!user) return { locked: false };

    const lockoutField = `${type}Lockout`;
    const lockout = user[lockoutField];
    
    if (!lockout || !lockout.lockedUntil) {
      return { locked: false };
    }

    if (new Date() > lockout.lockedUntil) {
      // Lockout expired, clear it
      user[lockoutField] = {
        attempts: 0,
        lockedUntil: null,
        lastAttempt: null
      };
      await user.save();
      return { locked: false };
    }

    const remainingMs = lockout.lockedUntil.getTime() - Date.now();
    return {
      locked: true,
      remainingMs,
      remainingMinutes: Math.ceil(remainingMs / (1000 * 60)),
      message: `Account locked due to too many ${type} attempts. Try again in ${Math.ceil(remainingMs / (1000 * 60))} minutes.`
    };
  }

  static async recordFailedAttempt(userId, type = 'login') {
    const user = await User.findById(userId);
    if (!user) return;

    const lockoutField = `${type}Lockout`;
    const maxAttempts = this.lockoutSettings[`max${type.charAt(0).toUpperCase() + type.slice(1)}Attempts`] || 5;
    const lockoutDuration = this.lockoutSettings[`${type}LockoutDuration`] || 15 * 60 * 1000;

    if (!user[lockoutField]) {
      user[lockoutField] = { attempts: 0, lockedUntil: null, lastAttempt: null };
    }

    user[lockoutField].attempts++;
    user[lockoutField].lastAttempt = new Date();

    if (user[lockoutField].attempts >= maxAttempts) {
      user[lockoutField].lockedUntil = new Date(Date.now() + lockoutDuration);
      
      // Log account lockout
      await AuditService.log({
        actorId: userId,
        action: `ACCOUNT_LOCKED_${type.toUpperCase()}`,
        resource: "User",
        resourceId: userId.toString(),
        metadata: { 
          attempts: user[lockoutField].attempts,
          lockedUntil: user[lockoutField].lockedUntil,
          type
        }
      });
    }

    await user.save();
  }

  static async clearFailedAttempts(userId, type = 'login') {
    const user = await User.findById(userId);
    if (!user) return;

    const lockoutField = `${type}Lockout`;
    user[lockoutField] = {
      attempts: 0,
      lockedUntil: null,
      lastAttempt: null
    };
    
    await user.save();
  }

  // Two-Factor Authentication (2FA) functions
  static generateTwoFactorSecret(email) {
    const secret = speakeasy.generateSecret({
      name: `CSEDU Nexus (${email})`,
      issuer: 'CSEDU Nexus',
      length: 32
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
      backupCodes: this.generateBackupCodes()
    };
  }

  static generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  static async generateQRCode(otpauthUrl) {
    try {
      return await QRCode.toDataURL(otpauthUrl);
    } catch (error) {
      throw new ApiError(500, "Failed to generate QR code");
    }
  }

  static verifyTwoFactorToken(secret, token) {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps (60 seconds) of tolerance
    });
  }

  static async enableTwoFactor(userId, token, secret) {
    if (!this.verifyTwoFactorToken(secret, token)) {
      throw new ApiError(400, "Invalid verification code");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const backupCodes = this.generateBackupCodes();

    user.twoFactorAuth = {
      enabled: true,
      secret,
      backupCodes: backupCodes.map(code => ({ code, used: false })),
      enabledAt: new Date()
    };

    await user.save();

    await AuditService.log({
      actorId: userId,
      action: "TWO_FACTOR_ENABLED",
      resource: "User",
      resourceId: userId.toString(),
      metadata: { enabledAt: new Date() }
    });

    return { backupCodes };
  }

  static async disableTwoFactor(userId, currentPassword) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Verify current password
    const bcrypt = require("bcryptjs");
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new ApiError(401, "Current password is incorrect");
    }

    user.twoFactorAuth = {
      enabled: false,
      secret: null,
      backupCodes: [],
      disabledAt: new Date()
    };

    await user.save();

    await AuditService.log({
      actorId: userId,
      action: "TWO_FACTOR_DISABLED",
      resource: "User",
      resourceId: userId.toString(),
      metadata: { disabledAt: new Date() }
    });

    return { message: "Two-factor authentication disabled successfully" };
  }

  static async verifyTwoFactorLogin(userId, token, isBackupCode = false) {
    const user = await User.findById(userId);
    if (!user || !user.twoFactorAuth?.enabled) {
      throw new ApiError(400, "Two-factor authentication is not enabled");
    }

    if (isBackupCode) {
      const backupCode = user.twoFactorAuth.backupCodes.find(
        bc => bc.code === token.toUpperCase() && !bc.used
      );
      
      if (!backupCode) {
        throw new ApiError(400, "Invalid or used backup code");
      }

      // Mark backup code as used
      backupCode.used = true;
      backupCode.usedAt = new Date();
      await user.save();

      await AuditService.log({
        actorId: userId,
        action: "BACKUP_CODE_USED",
        resource: "User",
        resourceId: userId.toString(),
        metadata: { usedAt: new Date() }
      });

      return { valid: true, backupCodeUsed: true };
    }

    const isValid = this.verifyTwoFactorToken(user.twoFactorAuth.secret, token);
    
    if (isValid) {
      await AuditService.log({
        actorId: userId,
        action: "TWO_FACTOR_VERIFIED",
        resource: "User",
        resourceId: userId.toString(),
        metadata: { verifiedAt: new Date() }
      });
    }

    return { valid: isValid, backupCodeUsed: false };
  }

  // Security headers and session management
  static getSecurityHeaders() {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    };
  }

  static sanitizeUserAgent(userAgent) {
    if (!userAgent) return 'Unknown';
    
    // Remove potential harmful characters and limit length
    return userAgent
      .replace(/[<>'"&]/g, '')
      .substring(0, 200);
  }

  static async logSecurityEvent(event, userId, metadata = {}) {
    await AuditService.log({
      actorId: userId,
      action: `SECURITY_${event}`,
      resource: "Security",
      resourceId: userId?.toString() || 'anonymous',
      metadata: {
        ...metadata,
        timestamp: new Date(),
        severity: this.getEventSeverity(event)
      }
    });
  }

  static getEventSeverity(event) {
    const highSeverityEvents = ['ACCOUNT_LOCKED', 'MULTIPLE_FAILED_LOGIN', 'SUSPICIOUS_ACTIVITY'];
    const mediumSeverityEvents = ['PASSWORD_CHANGED', 'TWO_FACTOR_DISABLED', 'EMAIL_CHANGED'];
    
    if (highSeverityEvents.some(e => event.includes(e))) return 'HIGH';
    if (mediumSeverityEvents.some(e => event.includes(e))) return 'MEDIUM';
    return 'LOW';
  }

  // Device tracking and suspicious activity detection
  static generateDeviceFingerprint(req) {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const ip = req.ip || req.connection.remoteAddress;

    const fingerprint = crypto
      .createHash('sha256')
      .update(`${userAgent}${acceptLanguage}${acceptEncoding}${ip}`)
      .digest('hex');

    return {
      fingerprint,
      userAgent: this.sanitizeUserAgent(userAgent),
      ip,
      acceptLanguage,
      acceptEncoding
    };
  }

  static async trackDeviceLogin(userId, deviceInfo, isSuccess) {
    const user = await User.findById(userId);
    if (!user) return;

    if (!user.devices) user.devices = [];

    const existingDevice = user.devices.find(d => d.fingerprint === deviceInfo.fingerprint);

    if (existingDevice) {
      existingDevice.lastSeen = new Date();
      existingDevice.loginAttempts = (existingDevice.loginAttempts || 0) + 1;
      if (isSuccess) {
        existingDevice.lastSuccessfulLogin = new Date();
        existingDevice.failedAttempts = 0;
      } else {
        existingDevice.failedAttempts = (existingDevice.failedAttempts || 0) + 1;
      }
    } else {
      // New device
      const newDevice = {
        fingerprint: deviceInfo.fingerprint,
        userAgent: deviceInfo.userAgent,
        firstSeen: new Date(),
        lastSeen: new Date(),
        trusted: false,
        loginAttempts: 1,
        failedAttempts: isSuccess ? 0 : 1
      };

      if (isSuccess) {
        newDevice.lastSuccessfulLogin = new Date();
      }

      user.devices.push(newDevice);

      // Alert user about new device (in a real app, send email)
      await this.logSecurityEvent('NEW_DEVICE_LOGIN', userId, {
        deviceFingerprint: deviceInfo.fingerprint,
        userAgent: deviceInfo.userAgent,
        ip: deviceInfo.ip
      });
    }

    await user.save();
  }

  // Password breach checking (simplified implementation)
  static async checkPasswordBreach(password) {
    // In a real implementation, you would check against Have I Been Pwned API
    // For now, we'll just check against common passwords
    const commonPasswords = [
      'password', '123456', '12345678', 'qwerty', 'abc123', 'password123',
      'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'football',
      'iloveyou', 'adminpassword', 'welcome123', 'password1'
    ];

    return {
      isBreached: commonPasswords.includes(password.toLowerCase()),
      breachCount: commonPasswords.includes(password.toLowerCase()) ? 999 : 0
    };
  }

  // Session security
  static generateSecureSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  static hashSessionId(sessionId) {
    return crypto.createHash('sha256').update(sessionId).digest('hex');
  }
}

module.exports = { SecurityService };