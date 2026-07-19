const { ApiError } = require("../core/ApiError");

function validate(schema, source = "body") {
  return function validateMiddleware(req, _res, next) {
    const payload = req[source];
    const result = schema.safeParse(payload);
    if (!result.success) {
      console.log('[Validation] Failed. Payload:', JSON.stringify(payload, null, 2));
      console.log('[Validation] Issues:', JSON.stringify(result.error.issues, null, 2));
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
