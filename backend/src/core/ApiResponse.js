class ApiResponse {
  constructor(statusCode, data = {}, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode >= 200 && statusCode < 300;
  }

  static ok(res, data = {}, message = "OK") {
    return res.status(200).json({ success: true, message, data });
  }

  static created(res, data = {}, message = "Created") {
    return res.status(201).json({ success: true, message, data });
  }
}

module.exports = { ApiResponse };
