import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  Send,
  Heart,
  MessageCircle,
  Share2,
  MoreVertical,
  Trash2,
  X,
  AtSign,
  ThumbsUp,
  Smile,
  Sparkles
} from "lucide-react";
import { 
  getPostsFeed, 
  createPost, 
  togglePostLike, 
  createComment,
  getPostComments,
  toggleCommentLike,
  deletePost,
  searchUsersForMention,
  type ApiPost,
  type ApiPostComment,
  type CreatePostData,
  type CreateCommentData
} from "../../lib/api";
import { useAuth } from "../../auth/AuthContext";
import { normalizeApiError } from "../../lib/api";
import { ProfileHoverCard } from "../../components/profile/ProfileHoverCard";
import toast from "react-hot-toast";
import "./SocialPostsPage.css";

// Common emojis
const EMOJI_LIST = [
  "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂",
  "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛",
  "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥳", "😏", "😒",
  "😞", "😔", "😟", "😕", "🙁", "😣", "😖", "😫", "😩", "🥺",
  "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶",
  "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥",
  "👍", "👎", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✌️", "🤞",
  "🤟", "🤘", "👌", "🤌", "🤏", "👈", "👉", "👆", "👇", "☝️",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
  "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "🎉", "🎊",
  "🎈", "🎁", "🏆", "🥇", "🥈", "🥉", "⭐", "🌟", "✨", "💫",
  "🔥", "💥", "💯", "✅", "❌", "⚠️", "🚀", "💻", "📱", "🎯"
];

export function SocialPostsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "announcements">("all");
  const [postContent, setPostContent] = useState("");
  const [postImages, setPostImages] = useState<string[]>([]);
  const [mentions, setMentions] = useState<Array<{ userId: string; userName: string }>>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionSearch, setShowMentionSearch] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch posts
  const { data: postsData, isLoading } = useQuery({
    queryKey: ["posts", filter],
    queryFn: () => getPostsFeed({ page: 1, limit: 20, filter }),
  });

  // Search users for mentions
  const { data: mentionUsers } = useQuery({
    queryKey: ["mention-users", mentionQuery],
    queryFn: () => searchUsersForMention(mentionQuery),
    enabled: showMentionSearch && mentionQuery.length >= 2,
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: (data: CreatePostData) => createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setPostContent("");
      setPostImages([]);
      setMentions([]);
      toast.success("Post created successfully!");
    },
    onError: (error) => {
      toast.error(normalizeApiError(error));
    },
  });

  const handleCreatePost = () => {
    if (!postContent.trim() && postImages.length === 0) {
      toast.error("Please add some content or images");
      return;
    }
    
    createPostMutation.mutate({
      content: postContent,
      images: postImages,
      mentions: mentions,
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (postImages.length + files.length > 10) {
      toast.error("Maximum 10 images allowed per post");
      return;
    }

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPostImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEmojiClick = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const newContent = postContent.substring(0, start) + emoji + postContent.substring(end);
    
    setPostContent(newContent);
    setShowEmojiPicker(false);

    // Set cursor position after emoji
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setPostContent(value);

    // Check for @ mention trigger
    const lastAtIndex = value.lastIndexOf("@", cursorPos - 1);
    if (lastAtIndex !== -1 && cursorPos - lastAtIndex <= 50) {
      const textAfterAt = value.substring(lastAtIndex + 1, cursorPos);
      if (!textAfterAt.includes(" ")) {
        setShowMentionSearch(true);
        setMentionQuery(textAfterAt);
        setCursorPosition(cursorPos);
      } else {
        setShowMentionSearch(false);
      }
    } else {
      setShowMentionSearch(false);
    }
  };

  const handleMentionSelect = (user: { id: string; name: string }) => {
    const lastAtIndex = postContent.lastIndexOf("@", cursorPosition - 1);
    const beforeMention = postContent.substring(0, lastAtIndex);
    const afterMention = postContent.substring(cursorPosition);
    const newContent = `${beforeMention}@${user.name} ${afterMention}`;
    
    setPostContent(newContent);
    setMentions([...mentions, { userId: user.id, userName: user.name }]);
    setShowMentionSearch(false);
    setMentionQuery("");

    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleCreatePost();
    }
  };

  return (
    <div className="social-posts-page">
      <div className="posts-container">
        {/* Header */}
        <div className="posts-header">
          <h1 className="posts-title">
            <Sparkles size={28} />
            Social Posts
          </h1>
          <div className="posts-filter">
            <button
              className={`filter-btn ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              All Posts
            </button>
            <button
              className={`filter-btn ${filter === "announcements" ? "active" : ""}`}
              onClick={() => setFilter("announcements")}
            >
              Announcements
            </button>
          </div>
        </div>

        {/* Create Post Card */}
        <motion.div
          className="create-post-card"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="create-post-header">
            <div className="user-avatar">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.firstName} />
              ) : (
                <span>{user?.firstName?.[0]}</span>
              )}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.firstName} {user?.lastName}</span>
              <span className="user-role">{user?.roles[0]}</span>
            </div>
          </div>

          <div className="create-post-input-wrapper">
            <textarea
              ref={textareaRef}
              className="create-post-textarea"
              placeholder="Share your thoughts, announcements, or achievements..."
              value={postContent}
              onChange={handleTextChange}
              onKeyDown={handleKeyPress}
              rows={3}
            />

            {/* Mention Search Dropdown */}
            {showMentionSearch && mentionUsers && mentionUsers.length > 0 && (
              <div className="mention-dropdown">
                {mentionUsers.map((user) => (
                  <button
                    key={user.id}
                    className="mention-item"
                    onClick={() => handleMentionSelect(user)}
                  >
                    <span className="mention-name">{user.name}</span>
                    <span className="mention-email">{user.email}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="emoji-picker">
                <div className="emoji-picker-header">
                  <span>Emojis</span>
                  <button onClick={() => setShowEmojiPicker(false)}>
                    <X size={16} />
                  </button>
                </div>
                <div className="emoji-grid">
                  {EMOJI_LIST.map((emoji, index) => (
                    <button
                      key={index}
                      className="emoji-item"
                      onClick={() => handleEmojiClick(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {postImages.length > 0 && (
            <div className="post-images-preview">
              {postImages.map((img, index) => (
                <div key={index} className="image-preview-item">
                  <img src={img} alt={`Preview ${index + 1}`} />
                  <button
                    className="remove-image-btn"
                    onClick={() => setPostImages(postImages.filter((_, i) => i !== index))}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="create-post-actions">
            <div className="post-tools">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                style={{ display: "none" }}
              />
              <button
                className="tool-btn"
                title="Add image"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon size={20} />
                <span>Photo</span>
              </button>
              <button
                className="tool-btn"
                title="Mention someone"
                onClick={() => {
                  const textarea = textareaRef.current;
                  if (textarea) {
                    const cursorPos = textarea.selectionStart;
                    const newContent = postContent.substring(0, cursorPos) + "@" + postContent.substring(cursorPos);
                    setPostContent(newContent);
                    setShowMentionSearch(true);
                    setCursorPosition(cursorPos + 1);
                    setTimeout(() => {
                      textarea.focus();
                      textarea.setSelectionRange(cursorPos + 1, cursorPos + 1);
                    }, 0);
                  }
                }}
              >
                <AtSign size={20} />
                <span>Mention</span>
              </button>
              <button
                className="tool-btn"
                title="Add emoji"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <Smile size={20} />
                <span>Emoji</span>
              </button>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleCreatePost}
              disabled={!postContent.trim() && postImages.length === 0 || createPostMutation.isPending}
            >
              {createPostMutation.isPending ? "Posting..." : "Post"}
              <Send size={18} />
            </button>
          </div>
        </motion.div>

        {/* Posts Feed */}
        <div className="posts-feed">
          {isLoading ? (
            <div className="posts-loading">
              <div className="spinner"></div>
              <p>Loading posts...</p>
            </div>
          ) : postsData?.posts.length === 0 ? (
            <div className="posts-empty">
              <Sparkles size={48} />
              <h3>No posts yet</h3>
              <p>Be the first to share something!</p>
            </div>
          ) : (
            <AnimatePresence>
              {postsData?.posts.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}

// Image Modal Component
function ImageModal({ images, initialIndex, onClose }: { images: string[]; initialIndex: number; onClose: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft") handlePrevious();
    if (e.key === "ArrowRight") handleNext();
  };

  React.useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="image-modal-overlay" onClick={onClose}>
      <button className="modal-close-btn" onClick={onClose}>
        <X size={32} />
      </button>
      <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
        <img src={images[currentIndex]} alt={`Image ${currentIndex + 1}`} />
        {images.length > 1 && (
          <>
            <button className="modal-nav-btn prev" onClick={handlePrevious}>
              ‹
            </button>
            <button className="modal-nav-btn next" onClick={handleNext}>
              ›
            </button>
            <div className="modal-counter">
              {currentIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Post Card Component
function PostCard({ post }: { post: ApiPost }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentImages, setCommentImages] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Toggle like mutation
  const likeMutation = useMutation({
    mutationFn: () => togglePostLike(post._id, "Like"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  // Delete post mutation
  const deleteMutation = useMutation({
    mutationFn: () => deletePost(post._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Post deleted successfully");
    },
    onError: (error) => {
      toast.error(normalizeApiError(error));
    },
  });

  // Get comments
  const { data: commentsData } = useQuery({
    queryKey: ["comments", post._id],
    queryFn: () => getPostComments(post._id),
    enabled: showComments,
  });

  // Create comment mutation
  const commentMutation = useMutation({
    mutationFn: (data: CreateCommentData) => createComment(post._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", post._id] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setCommentText("");
      setCommentImages([]);
      toast.success("Comment added!");
    },
    onError: (error) => {
      toast.error(normalizeApiError(error));
    },
  });

  const handleComment = () => {
    if (!commentText.trim() && commentImages.length === 0) {
      toast.error("Please add some content");
      return;
    }
    commentMutation.mutate({ content: commentText, images: commentImages });
  };

  const handleCommentImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (commentImages.length + files.length > 4) {
      toast.error("Maximum 4 images allowed per comment");
      return;
    }

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setCommentImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    if (commentFileInputRef.current) {
      commentFileInputRef.current.value = "";
    }
  };

  const handleCommentEmojiClick = (emoji: string) => {
    const textarea = commentTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const newContent = commentText.substring(0, start) + emoji + commentText.substring(end);
    
    setCommentText(newContent);
    setShowEmojiPicker(false);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const isOwner = user?._id === post.authorId._id;
  const canDelete = isOwner || user?.roles.includes("Moderator") || user?.roles.includes("System Admin");

  return (
    <motion.div
      className={`post-card ${post.isAnnouncement ? "announcement" : ""}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {post.isAnnouncement && (
        <div className="announcement-badge">
          <Sparkles size={14} />
          Announcement
        </div>
      )}

      <div className="post-header">
        <div className="post-author">
          <ProfileHoverCard userId={post.authorId._id} placement="bottom">
            <div className="author-avatar">
              {post.authorId.avatarUrl ? (
                <img src={post.authorId.avatarUrl} alt={post.authorId.firstName} />
              ) : (
                <span>{post.authorId.firstName[0]}</span>
              )}
            </div>
          </ProfileHoverCard>
          <div className="author-info">
            <ProfileHoverCard userId={post.authorId._id} placement="bottom">
              <span className="author-name">
                {post.authorId.firstName} {post.authorId.lastName}
              </span>
            </ProfileHoverCard>
            <span className="post-meta">
              {post.authorId.designation && `${post.authorId.designation} · `}
              {timeAgo(post.createdAt)}
              {post.isEdited && " · Edited"}
            </span>
          </div>
        </div>
        {canDelete && (
          <div className="post-menu-wrapper">
            <button className="post-menu-btn" onClick={() => setShowMenu(!showMenu)}>
              <MoreVertical size={20} />
            </button>
            {showMenu && (
              <div className="post-menu">
                <button className="menu-item" onClick={() => {
                  if (window.confirm("Are you sure you want to delete this post?")) {
                    deleteMutation.mutate();
                  }
                  setShowMenu(false);
                }}>
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="post-content">
        <p>{post.content}</p>
      </div>

      {post.images.length > 0 && (
        <div className={`post-images grid-${Math.min(post.images.length, 4)}`}>
          {post.images.slice(0, 4).map((img, index) => (
            <div 
              key={index} 
              className="post-image-item"
              onClick={() => {
                setSelectedImageIndex(index);
                setShowImageModal(true);
              }}
              style={{ cursor: 'pointer' }}
            >
              <img src={img} alt={`Post image ${index + 1}`} />
              {index === 3 && post.images.length > 4 && (
                <div className="more-images-overlay">
                  +{post.images.length - 4}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showImageModal && (
        <ImageModal
          images={post.images}
          initialIndex={selectedImageIndex}
          onClose={() => setShowImageModal(false)}
        />
      )}

      <div className="post-stats">
        <span className="stat-item">
          <Heart size={16} className={post.hasLiked ? "filled" : ""} />
          {post.stats.totalLikes} {post.stats.totalLikes === 1 ? "like" : "likes"}
        </span>
        <span className="stat-item clickable" onClick={() => setShowComments(!showComments)}>
          {post.stats.totalComments} {post.stats.totalComments === 1 ? "comment" : "comments"}
        </span>
      </div>

      <div className="post-actions">
        <button
          className={`action-btn ${post.hasLiked ? "active" : ""}`}
          onClick={() => likeMutation.mutate()}
        >
          <Heart size={20} />
          {post.hasLiked ? "Liked" : "Like"}
        </button>
        <button className="action-btn" onClick={() => setShowComments(!showComments)}>
          <MessageCircle size={20} />
          Comment
        </button>
        <button className="action-btn">
          <Share2 size={20} />
          Share
        </button>
      </div>

      {showComments && (
        <div className="comments-section">
          <div className="comment-input-container">
            <textarea
              ref={commentTextareaRef}
              className="comment-input"
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={2}
            />

            {commentImages.length > 0 && (
              <div className="comment-images-preview">
                {commentImages.map((img, index) => (
                  <div key={index} className="comment-image-preview-item">
                    <img src={img} alt={`Preview ${index + 1}`} />
                    <button
                      className="remove-image-btn"
                      onClick={() => setCommentImages(commentImages.filter((_, i) => i !== index))}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showEmojiPicker && (
              <div className="comment-emoji-picker">
                <div className="emoji-picker-header">
                  <span>Emojis</span>
                  <button onClick={() => setShowEmojiPicker(false)}>
                    <X size={14} />
                  </button>
                </div>
                <div className="emoji-grid">
                  {EMOJI_LIST.map((emoji, index) => (
                    <button
                      key={index}
                      className="emoji-item"
                      onClick={() => handleCommentEmojiClick(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="comment-input-actions">
              <input
                ref={commentFileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleCommentImageUpload}
                style={{ display: "none" }}
              />
              <button
                className="comment-tool-btn"
                title="Add image"
                onClick={() => commentFileInputRef.current?.click()}
              >
                <ImageIcon size={16} />
              </button>
              <button
                className="comment-tool-btn"
                title="Add emoji"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <Smile size={16} />
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={handleComment}
                disabled={(!commentText.trim() && commentImages.length === 0) || commentMutation.isPending}
              >
                <Send size={16} />
              </button>
            </div>
          </div>

          <div className="comments-list">
            {commentsData?.comments.map((comment) => (
              <CommentItem key={comment._id} comment={comment} postId={post._id} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Comment Component
function CommentItem({ comment, postId }: { comment: ApiPostComment; postId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyImages, setReplyImages] = useState<string[]>([]);
  const [showReplyEmojiPicker, setShowReplyEmojiPicker] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const likeMutation = useMutation({
    mutationFn: () => toggleCommentLike(comment._id, "Like"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
    },
  });

  // Reply to comment mutation
  const replyMutation = useMutation({
    mutationFn: (data: CreateCommentData) => createComment(postId, { ...data, parentCommentId: comment._id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", postId] });
      setReplyText("");
      setReplyImages([]);
      setShowReplyInput(false);
      setShowReplies(true);
      toast.success("Reply added!");
    },
    onError: (error) => {
      toast.error(normalizeApiError(error));
    },
  });

  const handleReply = () => {
    if (!replyText.trim() && replyImages.length === 0) {
      toast.error("Please add some content");
      return;
    }
    replyMutation.mutate({ content: replyText, images: replyImages });
  };

  const handleReplyImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (replyImages.length + files.length > 4) {
      toast.error("Maximum 4 images allowed per reply");
      return;
    }

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setReplyImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    if (replyFileInputRef.current) {
      replyFileInputRef.current.value = "";
    }
  };

  const handleReplyEmojiClick = (emoji: string) => {
    const textarea = replyTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const newContent = replyText.substring(0, start) + emoji + replyText.substring(end);
    
    setReplyText(newContent);
    setShowReplyEmojiPicker(false);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="comment-item">
      <ProfileHoverCard userId={comment.authorId._id} placement="right">
        <div className="comment-avatar">
          {comment.authorId.avatarUrl ? (
            <img src={comment.authorId.avatarUrl} alt={comment.authorId.firstName} />
          ) : (
            <span>{comment.authorId.firstName[0]}</span>
          )}
        </div>
      </ProfileHoverCard>
      <div className="comment-body">
        <div className="comment-content-wrapper">
          <div className="comment-header">
            <ProfileHoverCard userId={comment.authorId._id} placement="right">
              <span className="comment-author">
                {comment.authorId.firstName} {comment.authorId.lastName}
              </span>
            </ProfileHoverCard>
            <span className="comment-time">{timeAgo(comment.createdAt)}</span>
          </div>
          <p className="comment-text">{comment.content}</p>
          {comment.images && comment.images.length > 0 && (
            <div className="comment-images">
              {comment.images.map((img, index) => (
                <img 
                  key={index} 
                  src={img} 
                  alt={`Comment ${index + 1}`}
                  onClick={() => {
                    setSelectedImageIndex(index);
                    setShowImageModal(true);
                  }}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </div>
          )}
        </div>

        {showImageModal && comment.images && (
          <ImageModal
            images={comment.images}
            initialIndex={selectedImageIndex}
            onClose={() => setShowImageModal(false)}
          />
        )}

        <div className="comment-actions">
          <button
            className={`comment-action-btn ${comment.hasLiked ? "active" : ""}`}
            onClick={() => likeMutation.mutate()}
          >
            <ThumbsUp size={14} />
            {comment.stats.totalLikes > 0 && comment.stats.totalLikes}
          </button>
          <button 
            className="comment-action-btn"
            onClick={() => {
              setShowReplyInput(!showReplyInput);
              setTimeout(() => replyTextareaRef.current?.focus(), 0);
            }}
          >
            Reply
          </button>
          {comment.stats.totalReplies > 0 && (
            <button
              className="comment-action-btn"
              onClick={() => setShowReplies(!showReplies)}
            >
              {showReplies ? "Hide" : "View"} {comment.stats.totalReplies}{" "}
              {comment.stats.totalReplies === 1 ? "reply" : "replies"}
            </button>
          )}
        </div>

        {/* Reply Input */}
        {showReplyInput && (
          <div className="reply-input-container">
            <textarea
              ref={replyTextareaRef}
              className="reply-input"
              placeholder={`Reply to ${comment.authorId.firstName}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={2}
            />

            {replyImages.length > 0 && (
              <div className="reply-images-preview">
                {replyImages.map((img, index) => (
                  <div key={index} className="reply-image-preview-item">
                    <img src={img} alt={`Preview ${index + 1}`} />
                    <button
                      className="remove-image-btn"
                      onClick={() => setReplyImages(replyImages.filter((_, i) => i !== index))}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showReplyEmojiPicker && (
              <div className="reply-emoji-picker">
                <div className="emoji-picker-header">
                  <span>Emojis</span>
                  <button onClick={() => setShowReplyEmojiPicker(false)}>
                    <X size={14} />
                  </button>
                </div>
                <div className="emoji-grid">
                  {EMOJI_LIST.map((emoji, index) => (
                    <button
                      key={index}
                      className="emoji-item"
                      onClick={() => handleReplyEmojiClick(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="reply-input-actions">
              <input
                ref={replyFileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleReplyImageUpload}
                style={{ display: "none" }}
              />
              <button
                className="reply-tool-btn"
                title="Add image"
                onClick={() => replyFileInputRef.current?.click()}
              >
                <ImageIcon size={16} />
              </button>
              <button
                className="reply-tool-btn"
                title="Add emoji"
                onClick={() => setShowReplyEmojiPicker(!showReplyEmojiPicker)}
              >
                <Smile size={16} />
              </button>
              <button
                className="btn btn-sm btn-primary"
                onClick={handleReply}
                disabled={(!replyText.trim() && replyImages.length === 0) || replyMutation.isPending}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}

        {showReplies && comment.replies && (
          <div className="comment-replies">
            {comment.replies.map((reply) => (
              <CommentItem key={reply._id} comment={reply} postId={postId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
