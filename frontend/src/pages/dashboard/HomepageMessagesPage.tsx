import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Clock, 
  Eye,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { PageScreen } from "../../components/ui/PageScreen";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { useAuth } from "../../auth/AuthContext";
import { 
  useMyHomepageMessages, 
  usePendingHomepageMessages,
  useApproveHomepageMessage,
  useRejectHomepageMessage,
  useDeleteHomepageMessage,
  type HomepageMessage 
} from "../../hooks/useHomepageMessages";

export function HomepageMessagesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"my-messages" | "pending">("my-messages");
  const [rejectingMessage, setRejectingMessage] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: myMessages = [], isLoading: isLoadingMy } = useMyHomepageMessages();
  const { data: pendingMessages = [], isLoading: isLoadingPending } = usePendingHomepageMessages();
  
  const approveMessage = useApproveHomepageMessage();
  const rejectMessage = useRejectHomepageMessage();
  const deleteMessage = useDeleteHomepageMessage();

  const canApprove = user?.roles?.some(role => 
    ["Moderator", "Chief Patron", "Chairman"].includes(role)
  );

  const canCreate = user?.roles?.some(role => 
    ["President", "Vice President", "General Secretary", "Assistant General Secretary (Organization)", 
     "Assistant General Secretary (Public Relations)", "Treasurer", "Secretary (Publication)", 
     "Secretary (Sports)", "Secretary (Seminars and Workshops)", "Secretary (Cultural)", 
     "Secretary (Graphics and Media)", "Executive Member", "Moderator", "Chief Patron", "Chairman"].includes(role)
  );

  const handleApprove = async (messageId: string) => {
    try {
      await approveMessage.mutateAsync(messageId);
    } catch (error) {
      console.error("Failed to approve message:", error);
    }
  };

  const handleReject = async (messageId: string) => {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    try {
      await rejectMessage.mutateAsync({ messageId, rejectionReason });
      setRejectingMessage(null);
      setRejectionReason("");
    } catch (error) {
      console.error("Failed to reject message:", error);
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;

    try {
      await deleteMessage.mutateAsync(messageId);
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const getStatusIcon = (status: HomepageMessage["status"]) => {
    switch (status) {
      case "Approved":
        return <CheckCircle size={16} className="text-green-600" />;
      case "Rejected":
        return <XCircle size={16} className="text-red-600" />;
      case "PendingApproval":
        return <Clock size={16} className="text-yellow-600" />;
      case "Draft":
        return <Edit size={16} className="text-gray-600" />;
      case "Expired":
        return <AlertCircle size={16} className="text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: HomepageMessage["status"]) => {
    switch (status) {
      case "Approved":
        return "chip--success";
      case "Rejected":
        return "chip--error";
      case "PendingApproval":
        return "chip--warning";
      case "Draft":
        return "chip--info";
      case "Expired":
        return "chip--neutral";
      default:
        return "";
    }
  };

  const MessageCard = ({ message, showActions = true }: { message: HomepageMessage; showActions?: boolean }) => (
    <div className="message-card">
      <div className="message-card__header">
        <div className="message-card__author">
          <div className="message-card__avatar">
            {message.authorImageUrl ? (
              <img src={message.authorImageUrl} alt={message.authorName} />
            ) : (
              <div className="avatar-placeholder">
                {message.authorName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h4 className="message-card__name">{message.authorName}</h4>
            <p className="message-card__title">{message.authorTitle}</p>
            {message.authorDesignation && (
              <p className="message-card__designation">{message.authorDesignation}</p>
            )}
          </div>
        </div>
        <div className="message-card__meta">
          <span className={`chip ${getStatusColor(message.status)}`}>
            {getStatusIcon(message.status)}
            {message.status}
          </span>
          <span className={`chip ${message.messageType === "Leadership" ? "chip--primary" : ""}`}>
            {message.messageType}
          </span>
        </div>
      </div>

      <div className="message-card__content">
        <p className="message-card__message">
          {message.message.length > 200 
            ? `${message.message.slice(0, 200)}...` 
            : message.message
          }
        </p>
      </div>

      <div className="message-card__footer">
        <div className="message-card__dates">
          <span>Created: {new Date(message.createdAt).toLocaleDateString()}</span>
          {message.publishedAt && (
            <span>Published: {new Date(message.publishedAt).toLocaleDateString()}</span>
          )}
          {message.expiresAt && (
            <span>Expires: {new Date(message.expiresAt).toLocaleDateString()}</span>
          )}
        </div>

        {showActions && (
          <div className="message-card__actions">
            {message.status === "PendingApproval" && canApprove && (
              <>
                <button
                  className="action-button action-button--success"
                  onClick={() => handleApprove(message._id)}
                  disabled={approveMessage.isPending}
                >
                  <Check size={16} />
                  Approve
                </button>
                <button
                  className="action-button action-button--error"
                  onClick={() => setRejectingMessage(message._id)}
                >
                  <X size={16} />
                  Reject
                </button>
              </>
            )}
            
            {(message.authorUserId === user?.id || canApprove) && (
              <>
                <Link
                  to={`/dashboard/homepage-messages/${message._id}/edit`}
                  className="action-button action-button--secondary"
                >
                  <Edit size={16} />
                  Edit
                </Link>
                <button
                  className="action-button action-button--error"
                  onClick={() => handleDelete(message._id)}
                  disabled={deleteMessage.isPending}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </>
            )}

            <Link
              to={`/dashboard/homepage-messages/${message._id}`}
              className="action-button action-button--secondary"
            >
              <Eye size={16} />
              View
            </Link>
          </div>
        )}
      </div>

      {message.rejectionReason && (
        <div className="message-card__rejection">
          <AlertCircle size={16} />
          <span>Rejection Reason: {message.rejectionReason}</span>
        </div>
      )}
    </div>
  );

  return (
    <PageScreen title="Homepage Messages" description="Manage messages displayed on the homepage">
      <div className="homepage-messages-page">
        <div className="page-header">
          <div className="page-header__content">
            <h1 className="page-title">Homepage Messages</h1>
            <p className="page-description">
              Create and manage messages that appear on the homepage leadership section
            </p>
          </div>
          {canCreate && (
            <Link to="/dashboard/homepage-messages/create" className="primary-button">
              <Plus size={20} />
              Create Message
            </Link>
          )}
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === "my-messages" ? "tab--active" : ""}`}
            onClick={() => setActiveTab("my-messages")}
          >
            <MessageSquare size={16} />
            My Messages ({myMessages.length})
          </button>
          {canApprove && (
            <button
              className={`tab ${activeTab === "pending" ? "tab--active" : ""}`}
              onClick={() => setActiveTab("pending")}
            >
              <Clock size={16} />
              Pending Approval ({pendingMessages.length})
            </button>
          )}
        </div>

        <div className="tab-content">
          {activeTab === "my-messages" && (
            <div className="messages-section">
              {isLoadingMy ? (
                <LoadingSpinner />
              ) : myMessages.length > 0 ? (
                <div className="messages-grid">
                  {myMessages.map((message) => (
                    <MessageCard key={message._id} message={message} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <MessageSquare size={48} />
                  <h3>No Messages Yet</h3>
                  <p>You haven't created any homepage messages yet.</p>
                  {canCreate && (
                    <Link to="/dashboard/homepage-messages/create" className="primary-button">
                      Create Your First Message
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "pending" && canApprove && (
            <div className="messages-section">
              {isLoadingPending ? (
                <LoadingSpinner />
              ) : pendingMessages.length > 0 ? (
                <div className="messages-grid">
                  {pendingMessages.map((message) => (
                    <MessageCard key={message._id} message={message} />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Clock size={48} />
                  <h3>No Pending Messages</h3>
                  <p>All messages have been reviewed.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rejection Modal */}
        {rejectingMessage && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal__header">
                <h3>Reject Message</h3>
                <button
                  className="modal__close"
                  onClick={() => setRejectingMessage(null)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="modal__content">
                <p>Please provide a reason for rejecting this message:</p>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  rows={4}
                  className="form-textarea"
                />
              </div>
              <div className="modal__footer">
                <button
                  className="secondary-button"
                  onClick={() => setRejectingMessage(null)}
                >
                  Cancel
                </button>
                <button
                  className="primary-button primary-button--error"
                  onClick={() => handleReject(rejectingMessage)}
                  disabled={rejectMessage.isPending || !rejectionReason.trim()}
                >
                  {rejectMessage.isPending ? "Rejecting..." : "Reject Message"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageScreen>
  );
}