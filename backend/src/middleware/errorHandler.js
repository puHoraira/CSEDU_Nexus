const { ApiError } = require("../core/ApiError");

function notFoundHandler(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
}

function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";
  const details = error.details || null;
  return res.status(statusCode).json({
    success: false,
    message,
    details,
  });
}

module.exports = { notFoundHandler, errorHandler };
