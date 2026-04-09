const { ApiError } = require("../core/ApiError");

function validate(schema, source = "body") {
  return function validateMiddleware(req, _res, next) {
    const payload = req[source];
    const result = schema.safeParse(payload);
    if (!result.success) {
      return next(
        new ApiError(400, "Validation failed", result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })))
      );
    }

    req[source] = result.data;
    return next();
  };
}

module.exports = { validate };
