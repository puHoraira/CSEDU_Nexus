import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";

export interface HomepageMessage {
  _id: string;
  authorUserId: string;
  authorName: string;
  authorTitle: string;
  authorDesignation: string;
  authorImageUrl: string;
  message: string;
  displayOrder: number;
  isActive: boolean;
  isPublished: boolean;
  publishedAt: string | null;
  expiresAt: string | null;
  messageType: "Leadership" | "Welcome" | "Announcement" | "Achievement" | "General";
  backgroundColor: string;
  textColor: string;
  metadata: {
    showOnHomepage: boolean;
    showOnDashboard: boolean;
    allowComments: boolean;
    priority: "Low" | "Medium" | "High" | "Critical";
  };
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string;
  status: "Draft" | "PendingApproval" | "Approved" | "Rejected" | "Expired";
  createdAt: string;
  updatedAt: string;
}

export interface CreateHomepageMessageData {
  authorName: string;
  authorTitle: string;
  authorDesignation?: string;
  authorImageUrl?: string;
  message: string;
  displayOrder?: number;
  messageType?: "Leadership" | "Welcome" | "Announcement" | "Achievement" | "General";
  backgroundColor?: string;
  textColor?: string;
  expiresAt?: string;
  showOnHomepage?: boolean;
  showOnDashboard?: boolean;
  allowComments?: boolean;
  priority?: "Low" | "Medium" | "High" | "Critical";
}

export function usePublishedHomepageMessages(messageType?: string) {
  return useQuery({
    queryKey: ["homepage-messages", "published", messageType],
    queryFn: () => {
      const params = messageType ? `?messageType=${messageType}` : "";
      return apiRequest<HomepageMessage[]>(`/homepage-messages/published${params}`);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useMyHomepageMessages() {
  return useQuery({
    queryKey: ["homepage-messages", "my-messages"],
    queryFn: () => apiRequest<HomepageMessage[]>("/homepage-messages/my-messages"),
  });
}

export function usePendingHomepageMessages() {
  return useQuery({
    queryKey: ["homepage-messages", "pending"],
    queryFn: () => apiRequest<HomepageMessage[]>("/homepage-messages/admin/pending"),
  });
}

export function useHomepageMessage(messageId: string) {
  return useQuery({
    queryKey: ["homepage-messages", messageId],
    queryFn: () => apiRequest<HomepageMessage>(`/homepage-messages/${messageId}`),
    enabled: !!messageId,
  });
}

export function useCreateHomepageMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateHomepageMessageData) =>
      apiRequest<HomepageMessage>("/homepage-messages", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-messages"] });
    },
  });
}

export function useUpdateHomepageMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, data }: { messageId: string; data: Partial<CreateHomepageMessageData> }) =>
      apiRequest<HomepageMessage>(`/homepage-messages/${messageId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-messages"] });
    },
  });
}

export function useDeleteHomepageMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) =>
      apiRequest(`/homepage-messages/${messageId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-messages"] });
    },
  });
}

export function useApproveHomepageMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) =>
      apiRequest<HomepageMessage>(`/homepage-messages/${messageId}/approve`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-messages"] });
    },
  });
}

export function useRejectHomepageMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, rejectionReason }: { messageId: string; rejectionReason: string }) =>
      apiRequest<HomepageMessage>(`/homepage-messages/${messageId}/reject`, {
        method: "POST",
        body: JSON.stringify({ rejectionReason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-messages"] });
    },
  });
}