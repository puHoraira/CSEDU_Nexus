const { ApiResponse } = require("../core/ApiResponse");
const { asyncHandler } = require("../core/asyncHandler");
const { AuthService } = require("../services/AuthService");
const { ApiError } = require("../core/ApiError");

class AuthController {
  static register = asyncHandler(async (req, res) => {
    const result = await AuthService.register(req.body, req.requestMeta);
    res.cookie("refreshToken", result.refreshToken, { httpOnly: true, sameSite: "lax" });
    return ApiResponse.created(res, { user: result.user, accessToken: result.accessToken }, "Registered");
  });

  static registerTeacher = asyncHandler(async (req, res) => {
    const result = await AuthService.registerTeacher(req.body, req.requestMeta);
    res.cookie("refreshToken", result.refreshToken, { httpOnly: true, sameSite: "lax" });
    return ApiResponse.created(res, { user: result.user, accessToken: result.accessToken }, "Teacher registered");
  });

  static login = asyncHandler(async (req, res) => {
    const result = await AuthService.login(req.body, req.requestMeta);
    res.cookie("refreshToken", result.refreshToken, { httpOnly: true, sameSite: "lax" });
    return ApiResponse.ok(res, { user: result.user, accessToken: result.accessToken }, "Logged in");
  });

  static refresh = asyncHandler(async (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) throw new ApiError(401, "Refresh token missing");
    const result = await AuthService.refresh(token);
    return ApiResponse.ok(res, result, "Token refreshed");
  });

  static me = asyncHandler(async (req, res) => {
    const result = await AuthService.getProfile(req.auth.userId);
    return ApiResponse.ok(res, result, "Profile");
  });

  static updateProfile = asyncHandler(async (req, res) => {
    const result = await AuthService.updateProfile(req.auth.userId, req.body, req.requestMeta);
    return ApiResponse.ok(res, result, "Profile updated");
  });
}

module.exports = { AuthController };
