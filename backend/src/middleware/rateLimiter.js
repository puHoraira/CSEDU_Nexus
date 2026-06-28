const { SecurityService } = require("../services/SecurityService");
const { ApiError } = require("../core/ApiError");

const rateLimiter = (type = 'login') => {
  return (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress;
    const rateCheck = SecurityService.checkRateLimit(identifier, type);
    
    if (!rateCheck.allowed) {
      res.set('Retry-After', rateCheck.retryAfter);
      throw new ApiError(429, rateCheck.message);
    }
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': SecurityService.rateLimits[type]?.max || 5,
      'X-RateLimit-Remaining': rateCheck.remaining || 0,
      'X-RateLimit-Reset': new Date(Date.now() + (SecurityService.rateLimits[type]?.windowMs || 900000))
    });
    
    next();
  };
};

module.exports = { rateLimiter };