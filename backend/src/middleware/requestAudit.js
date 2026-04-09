function requestAuditMiddleware(req, _res, next) {
  req.requestMeta = {
    ip: req.ip,
    userAgent: req.headers["user-agent"] || "unknown",
    requestId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  next();
}

module.exports = { requestAuditMiddleware };
