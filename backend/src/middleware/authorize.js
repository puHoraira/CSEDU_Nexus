const { ApiError } = require("../core/ApiError");
const { AccessService } = require("../services/AccessService");

function authorize(requiredPermission) {
  return async function authorizeMiddleware(req, _res, next) {
    if (!req.auth) {
      return next(new ApiError(401, "Authentication required"));
    }

    const granted = await AccessService.hasPermission(req.auth.userId, requiredPermission, req.auth.activeTermId);
    if (!granted) {
      return next(new ApiError(403, "Forbidden"));
    }

    return next();
  };
}

module.exports = { authorize };
