import { env } from "../config/env";

export type ApiUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  experience?: string;
  designation?: string;
  roles: string[];
};

export type AuthPayload = {
  user: ApiUser;
  accessToken: string;
};

export class ApiRequestError extends Error {
  status: number;
  details: Array<{ path?: string; message?: string }> | null;

  constructor(message: string, status: number, details: Array<{ path?: string; message?: string }> | null = null) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.details = details;
  }
}

type ApiOptions = RequestInit & {
  token?: string | null;
  isFormData?: boolean;
};

const TOKEN_REFRESHED_EVENT = "csedu:token-refreshed";

let inMemoryAccessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;

function emitTokenRefreshed(token: string | null) {
  window.dispatchEvent(new CustomEvent(TOKEN_REFRESHED_EVENT, { detail: { token } }));
}

export function getAuthTokenEventName() {
  return TOKEN_REFRESHED_EVENT;
}

export function setApiAccessToken(token: string | null) {
  inMemoryAccessToken = token;
}

async function tryRefreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${env.apiBaseUrl}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        inMemoryAccessToken = null;
        emitTokenRefreshed(null);
        return null;
      }

      const body = await response.json();
      const nextToken = body?.data?.accessToken || null;
      inMemoryAccessToken = nextToken;
      emitTokenRefreshed(nextToken);
      return nextToken;
    } catch {
      inMemoryAccessToken = null;
      emitTokenRefreshed(null);
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function buildHeaders(token: string | null, headers?: HeadersInit, isFormData?: boolean) {
  const baseHeaders: Record<string, string> = {};
  
  // Don't set Content-Type for FormData - browser will set it with boundary
  if (!isFormData) {
    baseHeaders["Content-Type"] = "application/json";
  }
  
  if (token) {
    baseHeaders["Authorization"] = `Bearer ${token}`;
  }
  
  return {
    ...baseHeaders,
    ...(headers || {}),
  };
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, headers, isFormData, ...rest } = options;
  const requestToken = token ?? inMemoryAccessToken;

  let response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...rest,
    cache: "no-store",
    credentials: "include",
    headers: buildHeaders(requestToken, headers, isFormData),
  });

  if (response.status === 401) {
    const refreshedToken = await tryRefreshAccessToken();
    if (refreshedToken) {
      response = await fetch(`${env.apiBaseUrl}${path}`, {
        ...rest,
        cache: "no-store",
        credentials: "include",
        headers: buildHeaders(refreshedToken, headers, isFormData),
      });
    }
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json() : null;

  if (!response.ok) {
    const message =
      response.status === 401
        ? "Session expired. Please login again."
        : body?.message || body?.error || `Request failed with ${response.status}`;
    throw new ApiRequestError(message, response.status, body?.details || null);
  }

  return body?.data !== undefined ? body.data : body;
}

export function normalizeApiError(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.details && Array.isArray(error.details)) {
      const messages = error.details
        .map((d) => d.message || (d as any).path)
        .filter(Boolean);
      if (messages.length > 0) {
        return messages.join(", ");
      }
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

// ============================================================
// POST API
// ============================================================

export type ApiPost = {
  _id: string;
  authorId: {
    _id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    bio?: string;
    designation?: string;
  };
  content: string;
  images: string[];
  isAnnouncement: boolean;
  isPinned: boolean;
  mentions: Array<{ userId: string; userName: string }>;
  visibility: "Public" | "Members_Only" | "Hidden";
  stats: {
    totalLikes: number;
    totalComments: number;
    totalShares: number;
  };
  tags: string[];
  isEdited: boolean;
  lastEditedAt?: string;
  hasLiked: boolean;
  userReaction: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiPostComment = {
  _id: string;
  postId: string;
  authorId: {
    _id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    bio?: string;
    designation?: string;
  };
  content: string;
  images: string[];
  parentCommentId?: string | null;
  mentions: Array<{ userId: string; userName: string }>;
  stats: {
    totalLikes: number;
    totalReplies: number;
  };
  isEdited: boolean;
  lastEditedAt?: string;
  hasLiked: boolean;
  userReaction: string | null;
  replies?: ApiPostComment[];
  createdAt: string;
  updatedAt: string;
};

export type ApiMentionUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
};

export type CreatePostData = {
  content: string;
  images?: string[];
  isAnnouncement?: boolean;
  tags?: string[];
  mentions?: Array<{ userId: string; userName: string }>;
};

export type UpdatePostData = {
  content?: string;
  images?: string[];
  tags?: string[];
  mentions?: Array<{ userId: string; userName: string }>;
  isAnnouncement?: boolean;
};

export type CreateCommentData = {
  content: string;
  images?: string[];
  parentCommentId?: string | null;
  mentions?: Array<{ userId: string; userName: string }>;
};

export type PostFeedResponse = {
  posts: ApiPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type CommentListResponse = {
  comments: ApiPostComment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

// Post CRUD
export async function createPost(data: CreatePostData): Promise<ApiPost> {
  return apiRequest<ApiPost>("/posts", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getPostsFeed(params?: {
  page?: number;
  limit?: number;
  filter?: string;
}): Promise<PostFeedResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", params.page.toString());
  if (params?.limit) query.append("limit", params.limit.toString());
  if (params?.filter) query.append("filter", params.filter);
  
  return apiRequest<PostFeedResponse>(`/posts?${query.toString()}`);
}

export async function getPostById(postId: string): Promise<ApiPost> {
  return apiRequest<ApiPost>(`/posts/${postId}`);
}

export async function updatePost(postId: string, data: UpdatePostData): Promise<ApiPost> {
  return apiRequest<ApiPost>(`/posts/${postId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deletePost(postId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/posts/${postId}`, {
    method: "DELETE",
  });
}

export async function getUserPosts(userId: string, params?: {
  page?: number;
  limit?: number;
}): Promise<PostFeedResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", params.page.toString());
  if (params?.limit) query.append("limit", params.limit.toString());
  
  return apiRequest<PostFeedResponse>(`/posts/user/${userId}?${query.toString()}`);
}

// Post interactions
export async function togglePostLike(
  postId: string,
  reactionType?: string
): Promise<{ liked: boolean; totalLikes: number; reactionType?: string }> {
  return apiRequest<{ liked: boolean; totalLikes: number; reactionType?: string }>(
    `/posts/${postId}/like`,
    {
      method: "POST",
      body: JSON.stringify({ reactionType: reactionType || "Like" }),
    }
  );
}

// Comments
export async function createComment(postId: string, data: CreateCommentData): Promise<ApiPostComment> {
  return apiRequest<ApiPostComment>(`/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getPostComments(postId: string, params?: {
  page?: number;
  limit?: number;
}): Promise<CommentListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", params.page.toString());
  if (params?.limit) query.append("limit", params.limit.toString());
  
  return apiRequest<CommentListResponse>(`/posts/${postId}/comments?${query.toString()}`);
}

export async function toggleCommentLike(
  commentId: string,
  reactionType?: string
): Promise<{ liked: boolean; totalLikes: number; reactionType?: string }> {
  return apiRequest<{ liked: boolean; totalLikes: number; reactionType?: string }>(
    `/posts/comments/${commentId}/like`,
    {
      method: "POST",
      body: JSON.stringify({ reactionType: reactionType || "Like" }),
    }
  );
}

export async function deleteComment(commentId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/posts/comments/${commentId}`, {
    method: "DELETE",
  });
}

// Mention search
export async function searchUsersForMention(query: string, limit?: number): Promise<ApiMentionUser[]> {
  const params = new URLSearchParams();
  params.append("q", query);
  if (limit) params.append("limit", limit.toString());
  
  return apiRequest<ApiMentionUser[]>(`/posts/mentions/search?${params.toString()}`);
}

// ============================================================
// CHAT API
// ============================================================

export type ApiChatMessage = {
  _id: string;
  senderId: {
    _id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  receiverId: {
    _id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  content: string;
  images: string[];
  isRead: boolean;
  readAt?: string | null;
  isEdited: boolean;
  lastEditedAt?: string | null;
  replyToMessageId?: {
    _id: string;
    content: string;
    senderId: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiConversation = {
  id: string;
  otherUser: {
    _id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    bio?: string;
  };
  lastMessage?: {
    _id: string;
    content: string;
    senderId: string;
    createdAt: string;
  } | null;
  lastMessageContent: string;
  lastMessageAt: string;
  unreadCount: number;
};

export type SendMessageData = {
  receiverId: string;
  content: string;
  images?: string[];
  replyToMessageId?: string | null;
};

export type ConversationResponse = {
  messages: ApiChatMessage[];
  otherUser: {
    _id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    bio?: string;
    designation?: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type ConversationListResponse = {
  conversations: ApiConversation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

// Send message
export async function sendChatMessage(data: SendMessageData): Promise<ApiChatMessage> {
  return apiRequest<ApiChatMessage>("/chat/messages", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Get conversation with specific user
export async function getConversation(userId: string, params?: {
  page?: number;
  limit?: number;
}): Promise<ConversationResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", params.page.toString());
  if (params?.limit) query.append("limit", params.limit.toString());
  
  return apiRequest<ConversationResponse>(`/chat/conversations/${userId}?${query.toString()}`);
}

// Get all conversations
export async function getConversations(params?: {
  page?: number;
  limit?: number;
}): Promise<ConversationListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", params.page.toString());
  if (params?.limit) query.append("limit", params.limit.toString());
  
  return apiRequest<ConversationListResponse>(`/chat/conversations?${query.toString()}`);
}

// Mark messages as read
export async function markMessagesAsRead(senderId: string): Promise<{ markedAsRead: number }> {
  return apiRequest<{ markedAsRead: number }>(`/chat/conversations/${senderId}/read`, {
    method: "POST",
  });
}

// Get unread count
export async function getChatUnreadCount(): Promise<{ unreadCount: number }> {
  return apiRequest<{ unreadCount: number }>("/chat/unread-count");
}

// Edit message
export async function editChatMessage(messageId: string, content: string): Promise<ApiChatMessage> {
  return apiRequest<ApiChatMessage>(`/chat/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  });
}

// Delete message
export async function deleteChatMessage(messageId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/chat/messages/${messageId}`, {
    method: "DELETE",
  });
}

// Set typing indicator
export async function setTypingIndicator(userId: string, isTyping: boolean): Promise<{ typing: boolean }> {
  return apiRequest<{ typing: boolean }>(`/chat/conversations/${userId}/typing`, {
    method: "POST",
    body: JSON.stringify({ isTyping }),
  });
}

// Search messages
export async function searchChatMessages(userId: string, query: string, params?: {
  page?: number;
  limit?: number;
}): Promise<{
  messages: ApiChatMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> {
  const searchParams = new URLSearchParams();
  searchParams.append("q", query);
  if (params?.page) searchParams.append("page", params.page.toString());
  if (params?.limit) searchParams.append("limit", params.limit.toString());
  
  return apiRequest(`/chat/conversations/${userId}/search?${searchParams.toString()}`);
}

// Delete conversation
export async function deleteChatConversation(userId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/chat/conversations/${userId}`, {
    method: "DELETE",
  });
}

// ============================================================
// USER PROFILE API
// ============================================================

export type ApiUserProfile = {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string;
  bio?: string;
  designation?: string;
  experience?: string;
  roles: string[];
  socialMedia?: {
    facebook?: string;
    linkedin?: string;
    github?: string;
    twitter?: string;
    instagram?: string;
    website?: string;
  } | null;
  technicalSkills?: string[];
  softSkills?: string[];
  achievements?: Array<{
    title: string;
    description: string;
    date: string;
    category: string;
  }>;
  certifications?: Array<{
    name: string;
    issuingOrganization: string;
    issueDate: string;
    expiryDate?: string;
    credentialId?: string;
    credentialUrl?: string;
  }>;
  workExperience?: Array<{
    company: string;
    position: string;
    duration: string;
    description: string;
    isCurrentJob: boolean;
  }>;
  leadershipExperience?: Array<{
    organization: string;
    position: string;
    startDate: string;
    endDate?: string;
    description: string;
    isCurrent: boolean;
  }>;
  hobbies?: string[];
  interests?: string[];
  privacySettings: {
    allowDirectMessages: boolean;
    showInDirectory: boolean;
  };
  member?: {
    studentId: string;
    batch: number;
    currentYear: number;
    academicYearLevel: string;
    session?: string;
    academicRecord?: {
      currentCgpa?: number;
      totalCreditsCompleted?: number;
      totalCreditsRequired?: number;
    };
    ecExperience: Array<{
      postName: string;
      startDate: string;
      endDate?: string;
      isCurrent: boolean;
      performanceRating?: string;
    }>;
    clubParticipation?: any;
  } | null;
  createdAt: string;
};

export type ApiUserDirectory = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  designation?: string;
  roles: string[];
  member?: {
    studentId: string;
    batch: number;
    currentYear: number;
    academicYearLevel: string;
  } | null;
};

// Get user profile by ID
export async function getUserProfile(userId: string): Promise<ApiUserProfile> {
  return apiRequest<ApiUserProfile>(`/users/${userId}/profile`);
}

// Search users
export async function searchUsers(params: {
  q?: string;
  limit?: number;
  roles?: string[];
}): Promise<ApiUserDirectory[]> {
  const query = new URLSearchParams();
  if (params.q) query.append("q", params.q);
  if (params.limit) query.append("limit", params.limit.toString());
  if (params.roles && params.roles.length > 0) {
    query.append("roles", params.roles.join(","));
  }
  
  return apiRequest<ApiUserDirectory[]>(`/users/search?${query.toString()}`);
}

// Get user directory
export async function getUserDirectory(params?: {
  page?: number;
  limit?: number;
  roles?: string[];
  batch?: number;
  year?: string;
}): Promise<{
  users: ApiUserDirectory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", params.page.toString());
  if (params?.limit) query.append("limit", params.limit.toString());
  if (params?.roles && params.roles.length > 0) {
    query.append("roles", params.roles.join(","));
  }
  if (params?.batch) query.append("batch", params.batch.toString());
  if (params?.year) query.append("year", params.year);
  
  return apiRequest(`/users/directory?${query.toString()}`);
}

// Update own profile
export async function updateOwnProfile(data: Partial<ApiUserProfile>): Promise<ApiUser> {
  return apiRequest<ApiUser>("/users/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ============================================================
// SEARCH API
// ============================================================

export type SearchResultItem = {
  id: string;
  type: "user" | "event" | "workshop" | "meeting" | "election";
  title: string;
  subtitle: string;
  description: string;
  avatarUrl?: string;
  imageUrl?: string;
  roles?: string[];
  member?: {
    studentId: string;
    batch: number;
    currentYear: number;
    academicYearLevel: string;
  } | null;
  status?: string;
  eventType?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
};

export type GlobalSearchResults = {
  users: SearchResultItem[];
  events: SearchResultItem[];
  workshops: SearchResultItem[];
  meetings: SearchResultItem[];
  elections: SearchResultItem[];
  total: number;
};

export type QuickSearchUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
};

// Global search across all categories
export async function globalSearch(params: {
  q: string;
  categories?: string[];
  limit?: number;
}): Promise<GlobalSearchResults> {
  const query = new URLSearchParams();
  query.append("q", params.q);
  if (params.categories && params.categories.length > 0) {
    query.append("categories", params.categories.join(","));
  }
  if (params.limit) query.append("limit", params.limit.toString());

  return apiRequest<GlobalSearchResults>(`/search?${query.toString()}`);
}

// Quick user search for autocomplete
export async function quickSearchUsers(q: string, limit?: number): Promise<QuickSearchUser[]> {
  const query = new URLSearchParams();
  query.append("q", q);
  if (limit) query.append("limit", limit.toString());

  return apiRequest<QuickSearchUser[]>(`/search/users?${query.toString()}`);
}
