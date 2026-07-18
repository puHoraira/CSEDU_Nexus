const { Post } = require("../models/Post");
const { PostComment } = require("../models/PostComment");
const { PostLike } = require("../models/PostLike");
const { User } = require("../models/User");
const { Member } = require("../models/Member");
const { ApiError } = require("../core/ApiError");
const { NotificationService } = require("./NotificationService");

class PostService {
  /**
   * Create a new post
   */
  static async createPost(userId, data) {
    const { content, images = [], isAnnouncement = false, tags = [], mentions = [] } = data;

    const post = await Post.create({
      authorId: userId,
      content,
      images,
      isAnnouncement,
      tags,
      mentions,
      visibility: "Public"
    });

    // Populate author information
    await post.populate("authorId", "firstName lastName avatarUrl bio designation");

    // Send notifications to mentioned users
    if (mentions && mentions.length > 0) {
      const mentionedUserIds = mentions.map(m => m.userId).filter(Boolean);
      await NotificationService.createForUsers(mentionedUserIds, {
        title: "You were mentioned in a post",
        message: `${post.authorId.firstName} ${post.authorId.lastName} mentioned you in a post`,
        category: "Social",
        priority: "Normal",
        actionUrl: `/dashboard/posts/${post._id}`,
        entityType: "Post",
        entityId: post._id,
        sentBy: userId
      });
    }

    return post;
  }

  /**
   * Get posts feed with pagination
   */
  static async getFeed(userId, { page = 1, limit = 10, filter = "all" } = {}) {
    const skip = (page - 1) * limit;
    
    let query = { isDeleted: false };
    
    if (filter === "announcements") {
      query.isAnnouncement = true;
    }

    // Get posts with author and engagement info
    const posts = await Post.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("authorId", "firstName lastName avatarUrl bio designation")
      .lean();

    // Get like status for current user on each post
    const postIds = posts.map(p => p._id);
    const userLikes = await PostLike.find({
      userId,
      postId: { $in: postIds }
    }).select("postId reactionType");

    const likeMap = new Map();
    userLikes.forEach(like => {
      likeMap.set(like.postId.toString(), like.reactionType);
    });

    // Enhance posts with like status
    const enhancedPosts = posts.map(post => ({
      ...post,
      hasLiked: likeMap.has(post._id.toString()),
      userReaction: likeMap.get(post._id.toString()) || null
    }));

    const total = await Post.countDocuments(query);

    return {
      posts: enhancedPosts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get a single post by ID with full details
   */
  static async getPostById(postId, userId) {
    const post = await Post.findOne({ _id: postId, isDeleted: false })
      .populate("authorId", "firstName lastName avatarUrl bio designation")
      .lean();

    if (!post) {
      throw new ApiError(404, "Post not found");
    }

    // Check if user liked this post
    const userLike = await PostLike.findOne({ userId, postId });
    
    return {
      ...post,
      hasLiked: !!userLike,
      userReaction: userLike?.reactionType || null
    };
  }

  /**
   * Update a post (only by author or moderator)
   */
  static async updatePost(postId, userId, userRoles, data) {
    const post = await Post.findOne({ _id: postId, isDeleted: false });

    if (!post) {
      throw new ApiError(404, "Post not found");
    }

    // Check permissions
    const isModerator = userRoles.includes("Moderator") || userRoles.includes("System Admin");
    if (post.authorId.toString() !== userId.toString() && !isModerator) {
      throw new ApiError(403, "You don't have permission to edit this post");
    }

    // Store edit history
    if (data.content || data.images) {
      post.editHistory.push({
        editedAt: new Date(),
        previousContent: post.content,
        previousImages: post.images
      });
      post.isEdited = true;
      post.lastEditedAt = new Date();
    }

    // Update fields
    if (data.content) post.content = data.content;
    if (data.images !== undefined) post.images = data.images;
    if (data.tags !== undefined) post.tags = data.tags;
    if (data.mentions !== undefined) post.mentions = data.mentions;
    if (data.isAnnouncement !== undefined && isModerator) {
      post.isAnnouncement = data.isAnnouncement;
    }

    await post.save();
    await post.populate("authorId", "firstName lastName avatarUrl bio designation");

    return post;
  }

  /**
   * Delete a post (soft delete)
   */
  static async deletePost(postId, userId, userRoles) {
    const post = await Post.findOne({ _id: postId, isDeleted: false });

    if (!post) {
      throw new ApiError(404, "Post not found");
    }

    // Check permissions
    const isModerator = userRoles.includes("Moderator") || userRoles.includes("System Admin");
    if (post.authorId.toString() !== userId.toString() && !isModerator) {
      throw new ApiError(403, "You don't have permission to delete this post");
    }

    post.isDeleted = true;
    post.deletedAt = new Date();
    post.deletedBy = userId;
    await post.save();

    return { message: "Post deleted successfully" };
  }

  /**
   * Toggle like on a post
   */
  static async toggleLike(postId, userId, reactionType = "Like") {
    const post = await Post.findOne({ _id: postId, isDeleted: false });

    if (!post) {
      throw new ApiError(404, "Post not found");
    }

    // Check if user already liked
    const existingLike = await PostLike.findOne({ userId, postId });

    if (existingLike) {
      // Unlike
      await PostLike.deleteOne({ _id: existingLike._id });
      post.stats.totalLikes = Math.max(0, post.stats.totalLikes - 1);
      await post.save();

      return { liked: false, totalLikes: post.stats.totalLikes };
    } else {
      // Like
      await PostLike.create({ userId, postId, reactionType });
      post.stats.totalLikes += 1;
      await post.save();

      // Notify post author (if not self-like)
      if (post.authorId.toString() !== userId.toString()) {
        const user = await User.findById(userId).select("firstName lastName");
        await NotificationService.createForUser(post.authorId, {
          title: "New reaction on your post",
          message: `${user.firstName} ${user.lastName} reacted to your post`,
          category: "Social",
          priority: "Low",
          actionUrl: `/dashboard/posts/${postId}`,
          entityType: "Post",
          entityId: postId,
          sentBy: userId
        });
      }

      return { liked: true, totalLikes: post.stats.totalLikes, reactionType };
    }
  }

  /**
   * Create a comment on a post
   */
  static async createComment(postId, userId, data) {
    const { content, images = [], parentCommentId = null, mentions = [] } = data;

    const post = await Post.findOne({ _id: postId, isDeleted: false });
    if (!post) {
      throw new ApiError(404, "Post not found");
    }

    // If replying to a comment, verify it exists
    if (parentCommentId) {
      const parentComment = await PostComment.findOne({ 
        _id: parentCommentId, 
        postId,
        isDeleted: false 
      });
      if (!parentComment) {
        throw new ApiError(404, "Parent comment not found");
      }
      // Update parent comment reply count
      parentComment.stats.totalReplies += 1;
      await parentComment.save();
    }

    const comment = await PostComment.create({
      postId,
      authorId: userId,
      content,
      images,
      parentCommentId,
      mentions
    });

    await comment.populate("authorId", "firstName lastName avatarUrl bio designation");

    // Update post comment count
    post.stats.totalComments += 1;
    await post.save();

    // Notify post author (if not self-comment)
    if (post.authorId.toString() !== userId.toString()) {
      const user = await User.findById(userId).select("firstName lastName");
      await NotificationService.createForUser(post.authorId, {
        title: "New comment on your post",
        message: `${user.firstName} ${user.lastName} commented on your post`,
        category: "Social",
        priority: "Normal",
        actionUrl: `/dashboard/posts/${postId}`,
        entityType: "Post",
        entityId: postId,
        sentBy: userId
      });
    }

    // Notify mentioned users
    if (mentions && mentions.length > 0) {
      const mentionedUserIds = mentions.map(m => m.userId).filter(Boolean);
      const user = await User.findById(userId).select("firstName lastName");
      await NotificationService.createForUsers(mentionedUserIds, {
        title: "You were mentioned in a comment",
        message: `${user.firstName} ${user.lastName} mentioned you in a comment`,
        category: "Social",
        priority: "Normal",
        actionUrl: `/dashboard/posts/${postId}`,
        entityType: "PostComment",
        entityId: comment._id,
        sentBy: userId
      });
    }

    return comment;
  }

  /**
   * Get comments for a post
   */
  static async getComments(postId, userId, { page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;

    const post = await Post.findOne({ _id: postId, isDeleted: false });
    if (!post) {
      throw new ApiError(404, "Post not found");
    }

    // Get top-level comments (no parent)
    const comments = await PostComment.find({ 
      postId, 
      parentCommentId: null,
      isDeleted: false 
    })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate("authorId", "firstName lastName avatarUrl bio designation")
      .lean();

    // Get like status for current user on each comment
    const commentIds = comments.map(c => c._id);
    const userLikes = await PostLike.find({
      userId,
      commentId: { $in: commentIds }
    }).select("commentId reactionType");

    const likeMap = new Map();
    userLikes.forEach(like => {
      likeMap.set(like.commentId.toString(), like.reactionType);
    });

    // Get replies for each comment
    const commentIdsForReplies = comments.map(c => c._id);
    const replies = await PostComment.find({
      parentCommentId: { $in: commentIdsForReplies },
      isDeleted: false
    })
      .sort({ createdAt: 1 })
      .populate("authorId", "firstName lastName avatarUrl bio designation")
      .lean();

    // Group replies by parent comment
    const repliesMap = new Map();
    replies.forEach(reply => {
      const parentId = reply.parentCommentId.toString();
      if (!repliesMap.has(parentId)) {
        repliesMap.set(parentId, []);
      }
      repliesMap.get(parentId).push(reply);
    });

    // Enhance comments with like status and replies
    const enhancedComments = comments.map(comment => ({
      ...comment,
      hasLiked: likeMap.has(comment._id.toString()),
      userReaction: likeMap.get(comment._id.toString()) || null,
      replies: repliesMap.get(comment._id.toString()) || []
    }));

    const total = await PostComment.countDocuments({ 
      postId, 
      parentCommentId: null,
      isDeleted: false 
    });

    return {
      comments: enhancedComments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Toggle like on a comment
   */
  static async toggleCommentLike(commentId, userId, reactionType = "Like") {
    const comment = await PostComment.findOne({ _id: commentId, isDeleted: false });

    if (!comment) {
      throw new ApiError(404, "Comment not found");
    }

    // Check if user already liked
    const existingLike = await PostLike.findOne({ userId, commentId });

    if (existingLike) {
      // Unlike
      await PostLike.deleteOne({ _id: existingLike._id });
      comment.stats.totalLikes = Math.max(0, comment.stats.totalLikes - 1);
      await comment.save();

      return { liked: false, totalLikes: comment.stats.totalLikes };
    } else {
      // Like
      await PostLike.create({ userId, commentId, reactionType });
      comment.stats.totalLikes += 1;
      await comment.save();

      // Notify comment author (if not self-like)
      if (comment.authorId.toString() !== userId.toString()) {
        const user = await User.findById(userId).select("firstName lastName");
        await NotificationService.createForUser(comment.authorId, {
          title: "Someone liked your comment",
          message: `${user.firstName} ${user.lastName} liked your comment`,
          category: "Social",
          priority: "Low",
          actionUrl: `/dashboard/posts/${comment.postId}`,
          entityType: "PostComment",
          entityId: commentId,
          sentBy: userId
        });
      }

      return { liked: true, totalLikes: comment.stats.totalLikes, reactionType };
    }
  }

  /**
   * Delete a comment (soft delete)
   */
  static async deleteComment(commentId, userId, userRoles) {
    const comment = await PostComment.findOne({ _id: commentId, isDeleted: false });

    if (!comment) {
      throw new ApiError(404, "Comment not found");
    }

    // Check permissions
    const isModerator = userRoles.includes("Moderator") || userRoles.includes("System Admin");
    if (comment.authorId.toString() !== userId.toString() && !isModerator) {
      throw new ApiError(403, "You don't have permission to delete this comment");
    }

    comment.isDeleted = true;
    comment.deletedAt = new Date();
    comment.deletedBy = userId;
    await comment.save();

    // Update post comment count
    const post = await Post.findById(comment.postId);
    if (post) {
      post.stats.totalComments = Math.max(0, post.stats.totalComments - 1);
      await post.save();
    }

    // If this comment has a parent, update parent's reply count
    if (comment.parentCommentId) {
      const parentComment = await PostComment.findById(comment.parentCommentId);
      if (parentComment) {
        parentComment.stats.totalReplies = Math.max(0, parentComment.stats.totalReplies - 1);
        await parentComment.save();
      }
    }

    return { message: "Comment deleted successfully" };
  }

  /**
   * Get posts by a specific user
   */
  static async getUserPosts(targetUserId, currentUserId, { page = 1, limit = 10 } = {}) {
    const skip = (page - 1) * limit;

    const posts = await Post.find({ 
      authorId: targetUserId, 
      isDeleted: false 
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("authorId", "firstName lastName avatarUrl bio designation")
      .lean();

    // Get like status for current user
    const postIds = posts.map(p => p._id);
    const userLikes = await PostLike.find({
      userId: currentUserId,
      postId: { $in: postIds }
    }).select("postId reactionType");

    const likeMap = new Map();
    userLikes.forEach(like => {
      likeMap.set(like.postId.toString(), like.reactionType);
    });

    const enhancedPosts = posts.map(post => ({
      ...post,
      hasLiked: likeMap.has(post._id.toString()),
      userReaction: likeMap.get(post._id.toString()) || null
    }));

    const total = await Post.countDocuments({ 
      authorId: targetUserId, 
      isDeleted: false 
    });

    return {
      posts: enhancedPosts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Search users for mentions (autocomplete)
   */
  static async searchUsersForMention(query, limit = 10) {
    const users = await User.find({
      isActive: true,
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    })
      .select("firstName lastName email avatarUrl")
      .limit(limit)
      .lean();

    return users.map(user => ({
      id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      avatarUrl: user.avatarUrl
    }));
  }
}

module.exports = { PostService };
