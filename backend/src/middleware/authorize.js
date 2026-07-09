const { ApiError } = require("../core/ApiError");
const { AccessService } = require("../services/AccessService");

/**
 * Authorization middleware that supports two modes:
 * 1. Permission-based: authorize("meeting.read") - checks permission via AccessService
 * 2. Role-based: authorize(["Moderator", "Chief Patron"]) - checks if user has any of the roles
 */
function authorize(requiredPermissionOrRoles) {
  return async function authorizeMiddleware(req, _res, next) {
    if (!req.auth) {
      return next(new ApiError(401, "Authentication required"));
    }

    // Mode 1: Array of role names (role-based authorization)
    if (Array.isArray(requiredPermissionOrRoles)) {
      const roleNames = await AccessService.getUserRoleNames(req.auth.userId);
      const postNames = await AccessService.getEcPostNames(req.auth.userId, req.auth.activeTermId);
      const allRoleLikeNames = [...new Set([...roleNames, ...postNames])];

      const hasRole = requiredPermissionOrRoles.some(role => allRoleLikeNames.includes(role));
      if (!hasRole) {
        return next(new ApiError(403, "Forbidden"));
      }
      return next();
    }

    // Mode 2: Permission key string (permission-based authorization)
    const granted = await AccessService.hasPermission(req.auth.userId, requiredPermissionOrRoles, req.auth.activeTermId);
    if (!granted) {
      return next(new ApiError(403, "Forbidden"));
    }

    return next();
  };
}

module.exports = { authorize };
