const express = require("express");
const multer = require("multer");
const { UploadController } = require("../controllers/UploadController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (file.fieldname === "avatar") {
      if (!file.mimetype.startsWith("image/")) {
        return cb(new Error("Only image files are allowed"));
      }
    }
    cb(null, true);
  },
});

// Upload routes
router.post("/avatar", authenticate, upload.single("avatar"), UploadController.uploadAvatar);
router.post("/document", authenticate, upload.single("document"), UploadController.uploadDocument);
router.post("/", authenticate, upload.single("file"), UploadController.uploadFile);

module.exports = { uploadRoutes: router };
