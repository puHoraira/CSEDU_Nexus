const { Readable } = require("stream");
const cloudinarySDK = require("cloudinary").v2;
const { env } = require("../config/env");
const { ApiError } = require("../core/ApiError");

class UploadService {
  // Lazy-initialised Cloudinary instance
  static #cloudinary = null;

  /**
   * Returns a configured Cloudinary v2 instance (initialised once).
   */
  static getCloudinary() {
    if (!UploadService.#cloudinary) {
      cloudinarySDK.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
        secure: true,
      });
      UploadService.#cloudinary = cloudinarySDK;
    }
    return UploadService.#cloudinary;
  }

  /**
   * Builds the deterministic Cloudinary public_id for a voter recording.
   * Pattern: elections/{electionId}/recordings/{voterId}_{timestamp}
   */
  static buildPublicId(electionId, voterId, timestamp) {
    return `elections/${electionId}/recordings/${voterId}_${timestamp}`;
  }

  /**
   * Uploads a video buffer to Cloudinary via upload_stream (no disk I/O).
   * Returns { public_id, secure_url, duration, bytes } on success.
   * Throws ApiError(502) on network failure, ApiError(500) on Cloudinary API error.
   */
  static async uploadToCloudinary(fileBuffer, mimeType, electionId, voterId) {
    // Test environment: return a synthetic response without calling Cloudinary
    if (env.NODE_ENV === "test") {
      const publicId = UploadService.buildPublicId(electionId, voterId, Date.now());
      return {
        public_id: publicId,
        secure_url: `https://res.cloudinary.com/test/video/upload/${publicId}.webm`,
        duration: 10,
        bytes: fileBuffer.length,
      };
    }

    const cloudinary = UploadService.getCloudinary();
    const publicId = UploadService.buildPublicId(electionId, voterId, Date.now());

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "video",
          folder: `elections/${electionId}/recordings/`,
          public_id: publicId,
          access_mode: "authenticated",
        },
        (error, result) => {
          if (error) {
            // Distinguish network-level failures from Cloudinary API errors
            const isNetworkError =
              error.http_code === undefined ||
              error.code === "ECONNREFUSED" ||
              error.code === "ETIMEDOUT" ||
              error.code === "ENOTFOUND";

            if (isNetworkError) {
              console.error("[UploadService] Cloudinary network error:", error);
              return reject(
                new ApiError(
                  502,
                  "Video upload service temporarily unavailable. Please try again."
                )
              );
            }

            console.error("[UploadService] Cloudinary API error:", error);
            return reject(new ApiError(500, "Recording upload failed"));
          }
          resolve(result);
        }
      );

      // Pipe the in-memory buffer into the Cloudinary upload stream
      Readable.from(fileBuffer).pipe(uploadStream);
    });
  }

  /**
   * Deletes a Cloudinary video asset by public_id.
   * Used for rollback when MongoDB write fails after a successful upload.
   */
  static async deleteRecording(publicId) {
    if (env.NODE_ENV === "test") {
      return { result: "ok" };
    }

    try {
      const cloudinary = UploadService.getCloudinary();
      return await cloudinary.uploader.destroy(publicId, {
        resource_type: "video",
      });
    } catch (error) {
      // Log but don't re-throw — deletion is best-effort cleanup
      console.error(
        "[UploadService] Failed to delete Cloudinary asset:",
        publicId,
        error
      );
    }
  }
}

module.exports = { UploadService };
