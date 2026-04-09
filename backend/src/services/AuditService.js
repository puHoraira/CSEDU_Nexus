const { AuditLog } = require("../models/AuditLog");

class AuditService {
  static async log({ actorId = null, action, resource, resourceId = null, requestId = null, metadata = {} }) {
    await AuditLog.create({ actorId, action, resource, resourceId, requestId, metadata });
  }
}

module.exports = { AuditService };
