import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Search,
  Send,
  Image as ImageIcon,
  MoreVertical,
  ArrowLeft,
  Smile,
  Paperclip,
  X,
  Check,
  CheckCheck,
  Edit3,
  Trash2
} from "lucide-react";
import {
  getConversations,
  getConversation,
  sendChatMessage,
  getChatUnreadCount,
  markMessagesAsRead,
  setTypingIndicator,
  type ApiConversation,
  type ApiChatMessage,
  type SendMessageData
} from "../../lib/api";
import { useAuth } from "../../auth/AuthContext";
import "./ChatPage.css";

export function ChatPage() {
  const { userId: selectedUserId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [messageImages, setMessageImages] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Common emojis for picker
  const commonEmojis = [
    "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂",
    "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋",
    "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🥳", "😏",
    "😒", "😞", "😔", "😟", "😕", "🙁", "😣", "😖", "😫", "😩",
    "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵",
    "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫",
    "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮",
    "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮",
    "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "👍", "👎", "👌", "✌️",
    "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "👏",
  ];

  // Fetch conversations list
  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => getConversations({ limit: 50 }),
    enabled: !!user, // Only fetch when user is authenticated
  });

  // Fetch selected conversation
  const { data: conversationData, isLoading: messagesLoading } = useQuery({
    queryKey: ["conversation", selectedUserId],
    queryFn: () => getConversation(selectedUserId!, { limit: 50 }),
    enabled: !!selectedUserId && !!user, // Only fetch when user is authenticated and userId is selected
  });

  // Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ["chatUnreadCount"],
    queryFn: getChatUnreadCount,
    enabled: !!user, // Only fetch when user is authenticated
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: SendMessageData) => sendChatMessage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation", selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setMessageText("");
      setMessageImages([]);
      scrollToBottom();
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (senderId: string) => markMessagesAsRead(senderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["chatUnreadCount"] });
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [conversationData?.messages]);

  // Mark messages as read when conversation opens
  useEffect(() => {
    if (selectedUserId && conversationData) {
      markAsReadMutation.mutate(selectedUserId);
    }
  }, [selectedUserId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = () => {
    if (!messageText.trim() && messageImages.length === 0) return;
    if (!selectedUserId) return;

    sendMessageMutation.mutate({
      receiverId: selectedUserId,
      content: messageText,
      images: messageImages,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = () => {
    if (!selectedUserId) return;

    // Set typing indicator
    setTypingIndicator(selectedUserId, true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to clear typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setTypingIndicator(selectedUserId, false);
    }, 3000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Limit to 5 images per message
    const remainingSlots = 5 - messageImages.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setMessageImages((prev) => [...prev, base64]);
        };
        reader.readAsDataURL(file);
      }
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = messageText;
    const before = text.substring(0, start);
    const after = text.substring(end);

    setMessageText(before + emoji + after);
    setShowEmojiPicker(false);

    // Set cursor position after emoji
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const removeImage = (index: number) => {
    setMessageImages(messageImages.filter((_, i) => i !== index));
  };

  const filteredConversations = conversationsData?.conversations.filter((conv) =>
    `${conv.otherUser.firstName} ${conv.otherUser.lastName}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="chat-page">
      {/* Conversations List */}
      <div className={`conversations-panel ${selectedUserId ? "hidden-mobile" : ""}`}>
        <div className="conversations-header">
          <h2 className="conversations-title">
            <MessageCircle size={24} />
            Messages
            {unreadData && unreadData.unreadCount > 0 && (
              <span className="unread-badge">{unreadData.unreadCount}</span>
            )}
          </h2>
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="conversations-list">
          {conversationsLoading ? (
            <div className="conversations-loading">
              <div className="spinner"></div>
            </div>
          ) : filteredConversations?.length === 0 ? (
            <div className="conversations-empty">
              <MessageCircle size={48} />
              <p>No conversations yet</p>
            </div>
          ) : (
            filteredConversations?.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedUserId === conversation.otherUser._id}
                onClick={() => navigate(`/dashboard/chat/${conversation.otherUser._id}`)}
              />
            ))
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div className={`chat-panel ${!selectedUserId ? "hidden-mobile" : ""}`}>
        {selectedUserId ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <button
                className="back-btn"
                onClick={() => navigate("/dashboard/chat")}
              >
                <ArrowLeft size={20} />
              </button>
              <div className="chat-user-info">
                <div className="chat-user-avatar">
                  {conversationData?.otherUser.avatarUrl ? (
                    <img
                      src={conversationData.otherUser.avatarUrl}
                      alt={conversationData.otherUser.firstName}
                    />
                  ) : (
                    <span>
                      {conversationData?.otherUser.firstName[0]}
                      {conversationData?.otherUser.lastName[0]}
                    </span>
                  )}
                </div>
                <div className="chat-user-details">
                  <h3 className="chat-user-name">
                    {conversationData?.otherUser.firstName}{" "}
                    {conversationData?.otherUser.lastName}
                  </h3>
                  {conversationData?.otherUser.designation && (
                    <p className="chat-user-designation">
                      {conversationData.otherUser.designation}
                    </p>
                  )}
                </div>
              </div>
              <button className="chat-menu-btn">
                <MoreVertical size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="messages-area">
              {messagesLoading ? (
                <div className="messages-loading">
                  <div className="spinner"></div>
                </div>
              ) : (
                <>
                  <AnimatePresence>
                    {conversationData?.messages.map((message) => {
                      // user object has 'id' not '_id'
                      const isOwnMessage = message.senderId._id === user?.id;
                      return (
                        <MessageBubble
                          key={message._id}
                          message={message}
                          isOwn={isOwnMessage}
                        />
                      );
                    })}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input */}
            <div className="message-input-container">
              {messageImages.length > 0 && (
                <div className="message-images-preview">
                  {messageImages.map((img, index) => (
                    <div key={index} className="message-image-preview">
                      <img src={img} alt={`Preview ${index + 1}`} />
                      <button
                        className="remove-image-btn"
                        onClick={() => removeImage(index)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="message-input-wrapper">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleImageUpload}
                />
                <button
                  className="input-tool-btn"
                  title="Attach image"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={messageImages.length >= 5}
                >
                  <ImageIcon size={20} />
                </button>
                <div className="emoji-picker-container">
                  <button
                    className="input-tool-btn"
                    title="Add emoji"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  >
                    <Smile size={20} />
                  </button>
                  {showEmojiPicker && (
                    <div className="emoji-picker-dropdown">
                      <div className="emoji-picker-header">
                        <span>Emojis</span>
                        <button
                          className="emoji-close-btn"
                          onClick={() => setShowEmojiPicker(false)}
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="emoji-picker-grid">
                        {commonEmojis.map((emoji, index) => (
                          <button
                            key={index}
                            className="emoji-btn"
                            onClick={() => handleEmojiSelect(emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <textarea
                  ref={textareaRef}
                  className="message-input"
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={handleKeyPress}
                  rows={1}
                />
                <button
                  className="send-btn"
                  onClick={handleSendMessage}
                  disabled={
                    (!messageText.trim() && messageImages.length === 0) ||
                    sendMessageMutation.isPending
                  }
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="chat-empty">
            <MessageCircle size={64} />
            <h3>Select a conversation</h3>
            <p>Choose a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Conversation Item Component
function ConversationItem({
  conversation,
  isSelected,
  onClick,
}: {
  conversation: ApiConversation;
  isSelected: boolean;
  onClick: () => void;
}) {
  const timeAgo = (date: string) => {
    const seconds = Math.floor(
      (new Date().getTime() - new Date(date).getTime()) / 1000
    );
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <motion.div
      className={`conversation-item ${isSelected ? "selected" : ""} ${
        conversation.unreadCount > 0 ? "unread" : ""
      }`}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="conversation-avatar">
        {conversation.otherUser.avatarUrl ? (
          <img
            src={conversation.otherUser.avatarUrl}
            alt={conversation.otherUser.firstName}
          />
        ) : (
          <span>
            {conversation.otherUser.firstName[0]}
            {conversation.otherUser.lastName[0]}
          </span>
        )}
      </div>
      <div className="conversation-info">
        <div className="conversation-header-row">
          <span className="conversation-name">
            {conversation.otherUser.firstName} {conversation.otherUser.lastName}
          </span>
          <span className="conversation-time">
            {timeAgo(conversation.lastMessageAt)}
          </span>
        </div>
        <div className="conversation-last-message">
          <p className="last-message-text">{conversation.lastMessageContent}</p>
          {conversation.unreadCount > 0 && (
            <span className="conversation-unread-badge">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Message Bubble Component
function MessageBubble({
  message,
  isOwn,
}: {
  message: ApiChatMessage;
  isOwn: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const timeFormat = (date: string) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <motion.div
      className={`message-bubble ${isOwn ? "own" : "other"}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      {!isOwn && (
        <div className="message-avatar">
          {message.senderId.avatarUrl ? (
            <img
              src={message.senderId.avatarUrl}
              alt={message.senderId.firstName}
            />
          ) : (
            <span>{message.senderId.firstName[0]}</span>
          )}
        </div>
      )}
      <div className="message-content-wrapper">
        {message.images && message.images.length > 0 && (
          <div className="message-images">
            {message.images.map((img, index) => (
              <img key={index} src={img} alt={`Message ${index + 1}`} />
            ))}
          </div>
        )}
        {message.content && (
          <div className="message-content">
            <p>{message.content}</p>
          </div>
        )}
        <div className="message-meta">
          <span className="message-time">{timeFormat(message.createdAt)}</span>
          {isOwn && (
            <span className="message-status">
              {message.isRead ? (
                <CheckCheck size={14} className="read" />
              ) : (
                <Check size={14} />
              )}
            </span>
          )}
          {message.isEdited && <span className="edited-label">Edited</span>}
        </div>
      </div>
    </motion.div>
  );
}
