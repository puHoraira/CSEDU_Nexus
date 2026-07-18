const express = require("express");
const { PostController } = require("../controllers/PostController");
const { authenticate } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const {
  createPostSchema,
  updatePostSchema,
  createCommentSchema,
  toggleLikeSchema
} = require("../validators/postValidators");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Post routes
router.get("/", PostController.getFeed);
router.post("/", validate(createPostSchema), PostController.createPost);
router.get("/user/:userId", PostController.getUserPosts);
router.get("/mentions/search", PostController.searchUsersForMention);
router.get("/:id", PostController.getPost);
router.patch("/:id", validate(updatePostSchema), PostController.updatePost);
router.delete("/:id", PostController.deletePost);

// Like routes
router.post("/:id/like", validate(toggleLikeSchema), PostController.toggleLike);

// Comment routes
router.get("/:id/comments", PostController.getComments);
router.post("/:id/comments", validate(createCommentSchema), PostController.createComment);
router.post("/comments/:commentId/like", validate(toggleLikeSchema), PostController.toggleCommentLike);
router.delete("/comments/:commentId", PostController.deleteComment);

module.exports = { postRoutes: router };
