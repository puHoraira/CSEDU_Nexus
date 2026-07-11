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

/**
 * Populates req.auth when a valid bearer token is present, but never rejects
 * the request when the token is missing or invalid. Use on routes that are
 * readable by the public but need user context to apply audience gating.
 */
async function optionalAuthenticate(req, _res, next) {
  const bearer = req.headers.authorization;
  const token = bearer && bearer.startsWith("Bearer ") ? bearer.split(" ")[1] : null;
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    const user = await User.findById(payload.sub).select("_id email isActive");
    if (user && user.isActive) {
      req.auth = {
        userId: user._id.toString(),
        email: user.email,
        roles: Array.isArray(payload.roles) ? payload.roles : [],
        activeTermId: payload.activeTermId || null,
      };
    }
  } catch (_error) {
    // Ignore invalid tokens for optional auth — treat as anonymous.
  }
  return next();
}

module.exports = { authenticate, optionalAuthenticate };