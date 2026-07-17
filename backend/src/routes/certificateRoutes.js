const express = require("express");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { CertificateController } = require("../controllers/CertificateController");
const { createCertificateRequestSchema, reviewCertificateSchema } = require("../validators/certificateValidators");

const router = express.Router();

router.post("/requests", authenticate, validate(createCertificateRequestSchema), CertificateController.createRequest);
router.get("/my", authenticate, CertificateController.myRequests);
router.get("/inbox/moderator", authenticate, CertificateController.moderatorInbox);
router.get("/inbox/chairman", authenticate, CertificateController.chairmanInbox);
router.get("/issued", authenticate, CertificateController.allIssued);
router.patch("/:id/moderator-review", authenticate, validate(reviewCertificateSchema), CertificateController.moderatorReview);
router.patch("/:id/chairman-review", authenticate, validate(reviewCertificateSchema), CertificateController.chairmanReview);
router.get("/:id/download", authenticate, CertificateController.download);

module.exports = { certificateRoutes: router };
