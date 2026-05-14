const { ApiResponse } = require("../core/ApiResponse");
const { ApiError } = require("../core/ApiError");
const { asyncHandler } = require("../core/asyncHandler");

class UploadController {
  // Upload avatar image
  static uploadAvatar = asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError(400, "No file uploaded");
    }

    // In a real application, you would:
    // 1. Upload to cloud storage (AWS S3, Cloudinary, etc.)
    // 2. Resize/optimize the image
    // 3. Return the cloud URL
    
    // For now, we'll convert to base64 and store in MongoDB
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    
    return ApiResponse.ok(res, { url: base64Image }, "Image uploaded successfully");
  });

  // Upload document
  static uploadDocument = asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError(400, "No file uploaded");
    }

    const base64Document = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    
    return ApiResponse.ok(res, { url: base64Document }, "Document uploaded successfully");
  });

  // General file upload
  static uploadFile = asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError(400, "No file uploaded");
    }

    // Convert to base64 data URL
    const base64File = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    
    return ApiResponse.ok(res, { 
      url: base64File,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    }, "File uploaded successfully");
  });
}

module.exports = { UploadController };
