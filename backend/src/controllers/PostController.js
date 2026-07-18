const { PostService } = require("../services/PostService");
const { asyncHandler } = require("../core/asyncHandler");
const { ApiResponse } = require("../core/ApiResponse");

class PostController {
  /**
   * Create a new post
   * POST /api/posts
   */
  static createPost = asyncHandler(async (req, res) => {
    const userId = req.auth.userId;
    const post = await PostService.createPost(userId, req.body);
    
    return ApiResponse.created(res, post, "Post created successfully");
  });

  /**
   * Get posts feed
   * GET /api/posts
   */
  static getFeed = asyncHandler(async (req, res) => {
    const userId = req.auth.userId;
    const { page, limit, filter } = req.query;
    
    const result = await PostService.getFeed(userId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      filter
    });
    
    return ApiResponse.ok(res, result, "Posts retrieved successfully");
  });

  /**
   * Get a single post by ID
   * GET /api/posts/:id
   */
  static getPost = asyncHandler(async (req, res) => {
    const userId = req.auth.userId;
    const { id } = req.params;
    
    const post = await PostService.getPostById(id, userId);
    
    return ApiResponse.ok(res, post, "Post retrieved successfully");
  });

  /**
   * Update a post
   * PATCH /api/posts/:id
   */
  static updatePost = asyncHandler(async (req, res) => {
    const userId = req.auth.userId;
    const userRoles = req.auth.roles || [];
    const { id } = req.params;
    
    const post = await PostService.updatePost(id, userId, userRoles, req.body);
    
    return ApiResponse.ok(res, post, "Post updated successfully");
  });

  /**
   * Delete a post
   * DELETE /api/posts/:id
   */
  static deletePost = asyncHandler(async (req, res) => {
    const userId = req.auth.userId;
    const userRoles = req.auth.roles || [];
    const { id } = req.params;
    
    const result = await PostService.deletePost(id, userId, userRoles);
    
    return ApiResponse.ok(res, result, "Post deleted successfully");
  });

  /**
   * Toggle like on a post
   * POST /api/posts/:id/like
   */
  static toggleLike = asyncHandler(async (req, res) => {
    const userId = req.auth.userId;
    const { id } = req.params;
    const { reactionType } = req.body;
    
    const result = await PostService.toggleLike(id, userId, reactionType);
    
    const message = result.liked ? "Post liked" : "Post unliked";
    return ApiResponse.ok(res, result, message);
  });

  /**
   * Create a comment on a post
   * POST /api/posts/:id/comments
   */
  static createComment = asyncHandler(async (req, res) => {
    const userId = req.auth.userId;
    const { id } = req.params;
    
    const comment = await PostService.createComment(id, userId, req.body);
    
    return ApiResponse.created(res, comment, "Comment created successfully");
  });

  /**
   * Get comments for a post
   * GET /api/posts/:id/comments
   */
  static getComments = asyncHandler(async (req, res) => {
    const userId = req.auth.userId;
    const { id } = req.params;
    const { page, limit } = req.query;
    
    const result = await PostService.getComments(id, userId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    
    return ApiResponse.ok(res, result, "Comments retrieved successfully");
  });

  /**
   * Toggle like on a comment
   * POST /api/posts/comments/:commentId/like
   */
  static toggleCommentLike = asyncHandler(async (req, res) => {
    const userId = req.auth.userId;
    const { commentId } = req.params;
    const { reactionType } = req.body;
    
    const result = await PostService.toggleCommentLike(commentId, userId, reactionType);
    
    const message = result.liked ? "Comment liked" : "Comment unliked";
    return ApiResponse.ok(res, result, message);
  });

  /**
   * Delete a comment
   * DELETE /api/posts/comments/:commentId
   */
  static deleteComment = asyncHandler(async (req, res) => {
    const userId = req.auth.userId;
    const userRoles = req.auth.roles || [];
    const { commentId } = req.params;
    
    const result = await PostService.deleteComment(commentId, userId, userRoles);
    
    return ApiResponse.ok(res, result, "Comment deleted successfully");
  });

  /**
   * Get posts by a specific user
   * GET /api/posts/user/:userId
   */
  static getUserPosts = asyncHandler(async (req, res) => {
    const currentUserId = req.auth.userId;
    const { userId } = req.params;
    const { page, limit } = req.query;
    
    const result = await PostService.getUserPosts(userId, currentUserId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10
    });
    
    return ApiResponse.ok(res, result, "User posts retrieved successfully");
  });

  /**
   * Search users for mentions (autocomplete)
   * GET /api/posts/mentions/search
   */
  static searchUsersForMention = asyncHandler(async (req, res) => {
    const { q, limit } = req.query;
    
    if (!q || q.length < 2) {
      return ApiResponse.ok(res, [], "Query too short");
    }
    
    const users = await PostService.searchUsersForMention(q, parseInt(limit) || 10);
    
    return ApiResponse.ok(res, users, "Users retrieved successfully");
  });
}

module.exports = { PostController };
