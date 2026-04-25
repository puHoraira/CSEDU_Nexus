import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { PageScreen } from "../../components/ui/PageScreen";
import { useAuth } from "../../auth/AuthContext";
import { useCreateHomepageMessage, type CreateHomepageMessageData } from "../../hooks/useHomepageMessages";

export function CreateHomepageMessagePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createMessage = useCreateHomepageMessage();

  const [formData, setFormData] = useState<CreateHomepageMessageData>({
    authorName: user ? `${user.firstName} ${user.lastName}` : "",
    authorTitle: "",
    authorDesignation: "",
    authorImageUrl: "",
    message: "",
    displayOrder: 0,
    messageType: "Leadership",
    backgroundColor: "",
    textColor: "",
    showOnHomepage: true,
    showOnDashboard: false,
    allowComments: false,
    priority: "Medium"
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPreview, setIsPreview] = useState(false);

  const handleInputChange = (field: keyof CreateHomepageMessageData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.authorName.trim()) {
      newErrors.authorName = "Author name is required";
    } else if (formData.authorName.length < 2 || formData.authorName.length > 120) {
      newErrors.authorName = "Author name must be between 2 and 120 characters";
    }

    if (!formData.authorTitle.trim()) {
      newErrors.authorTitle = "Author title is required";
    } else if (formData.authorTitle.length < 2 || formData.authorTitle.length > 120) {
      newErrors.authorTitle = "Author title must be between 2 and 120 characters";
    }

    if (formData.authorDesignation && formData.authorDesignation.length > 200) {
      newErrors.authorDesignation = "Author designation must not exceed 200 characters";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    } else if (formData.message.length < 10 || formData.message.length > 2000) {
      newErrors.message = "Message must be between 10 and 2000 characters";
    }

    if (formData.authorImageUrl && !isValidUrl(formData.authorImageUrl)) {
      newErrors.authorImageUrl = "Please enter a valid URL";
    }

    if (formData.backgroundColor && !isValidHexColor(formData.backgroundColor)) {
      newErrors.backgroundColor = "Please enter a valid hex color (e.g., #FF0000)";
    }

    if (formData.textColor && !isValidHexColor(formData.textColor)) {
      newErrors.textColor = "Please enter a valid hex color (e.g., #000000)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const isValidHexColor = (color: string) => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await createMessage.mutateAsync(formData);
      navigate("/dashboard/homepage-messages");
    } catch (error) {
      console.error("Failed to create message:", error);
    }
  };

  const PreviewCard = () => (
    <div className="leadership-message" style={{
      backgroundColor: formData.backgroundColor || undefined,
      color: formData.textColor || undefined
    }}>
      <div className="leadership-message__header">
        <div className="leadership-message__avatar">
          {formData.authorImageUrl ? (
            <img src={formData.authorImageUrl} alt={formData.authorName} className="leadership-message__image" />
          ) : (
            <div className="leadership-message__placeholder">
              {formData.authorName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div className="leadership-message__info">
          <h3 className="leadership-message__name">{formData.authorName || "Author Name"}</h3>
          <p className="leadership-message__title">{formData.authorTitle || "Author Title"}</p>
          {formData.authorDesignation && (
            <p className="leadership-message__designation">{formData.authorDesignation}</p>
          )}
        </div>
      </div>
      <div className="leadership-message__content">
        <div className="leadership-message__quote-icon">"</div>
        <p className="leadership-message__text">
          {formData.message || "Your message will appear here..."}
        </p>
      </div>
    </div>
  );

  return (
    <PageScreen title="Create Homepage Message" description="Create a new message for the homepage">
      <div className="create-message-page">
        <div className="page-header">
          <button
            className="back-button"
            onClick={() => navigate("/dashboard/homepage-messages")}
          >
            <ArrowLeft size={20} />
            Back to Messages
          </button>
          <div className="page-header__actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setIsPreview(!isPreview)}
            >
              <Eye size={16} />
              {isPreview ? "Edit" : "Preview"}
            </button>
          </div>
        </div>

        {isPreview ? (
          <div className="preview-section">
            <h2>Preview</h2>
            <div className="preview-container">
              <PreviewCard />
            </div>
            <div className="preview-actions">
              <button
                className="secondary-button"
                onClick={() => setIsPreview(false)}
              >
                Continue Editing
              </button>
              <button
                className="primary-button"
                onClick={handleSubmit}
                disabled={createMessage.isPending}
              >
                <Save size={16} />
                {createMessage.isPending ? "Creating..." : "Create Message"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="message-form">
            <div className="form-grid">
              <div className="form-section">
                <h3>Author Information</h3>
                
                <div className="form-group">
                  <label htmlFor="authorName" className="form-label">
                    Author Name *
                  </label>
                  <input
                    type="text"
                    id="authorName"
                    value={formData.authorName}
                    onChange={(e) => handleInputChange("authorName", e.target.value)}
                    className={`form-input ${errors.authorName ? "form-input--error" : ""}`}
                    placeholder="Enter author's full name"
                  />
                  {errors.authorName && <span className="form-error">{errors.authorName}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="authorTitle" className="form-label">
                    Author Title *
                  </label>
                  <input
                    type="text"
                    id="authorTitle"
                    value={formData.authorTitle}
                    onChange={(e) => handleInputChange("authorTitle", e.target.value)}
                    className={`form-input ${errors.authorTitle ? "form-input--error" : ""}`}
                    placeholder="e.g., President, Moderator, Chief Patron"
                  />
                  {errors.authorTitle && <span className="form-error">{errors.authorTitle}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="authorDesignation" className="form-label">
                    Author Designation
                  </label>
                  <input
                    type="text"
                    id="authorDesignation"
                    value={formData.authorDesignation}
                    onChange={(e) => handleInputChange("authorDesignation", e.target.value)}
                    className={`form-input ${errors.authorDesignation ? "form-input--error" : ""}`}
                    placeholder="e.g., CSEDU Students' Club 2024"
                  />
                  {errors.authorDesignation && <span className="form-error">{errors.authorDesignation}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="authorImageUrl" className="form-label">
                    Author Image URL
                  </label>
                  <input
                    type="url"
                    id="authorImageUrl"
                    value={formData.authorImageUrl}
                    onChange={(e) => handleInputChange("authorImageUrl", e.target.value)}
                    className={`form-input ${errors.authorImageUrl ? "form-input--error" : ""}`}
                    placeholder="https://example.com/image.jpg"
                  />
                  {errors.authorImageUrl && <span className="form-error">{errors.authorImageUrl}</span>}
                </div>
              </div>

              <div className="form-section">
                <h3>Message Content</h3>
                
                <div className="form-group">
                  <label htmlFor="message" className="form-label">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleInputChange("message", e.target.value)}
                    className={`form-textarea ${errors.message ? "form-textarea--error" : ""}`}
                    rows={6}
                    placeholder="Enter the message content..."
                  />
                  <div className="form-help">
                    {formData.message.length}/2000 characters
                  </div>
                  {errors.message && <span className="form-error">{errors.message}</span>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="messageType" className="form-label">
                      Message Type
                    </label>
                    <select
                      id="messageType"
                      value={formData.messageType}
                      onChange={(e) => handleInputChange("messageType", e.target.value)}
                      className="form-select"
                    >
                      <option value="Leadership">Leadership</option>
                      <option value="Welcome">Welcome</option>
                      <option value="Announcement">Announcement</option>
                      <option value="Achievement">Achievement</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="priority" className="form-label">
                      Priority
                    </label>
                    <select
                      id="priority"
                      value={formData.priority}
                      onChange={(e) => handleInputChange("priority", e.target.value)}
                      className="form-select"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Display Settings</h3>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="displayOrder" className="form-label">
                      Display Order
                    </label>
                    <input
                      type="number"
                      id="displayOrder"
                      value={formData.displayOrder}
                      onChange={(e) => handleInputChange("displayOrder", parseInt(e.target.value) || 0)}
                      className="form-input"
                      min="0"
                    />
                    <div className="form-help">Lower numbers appear first</div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="backgroundColor" className="form-label">
                      Background Color
                    </label>
                    <input
                      type="text"
                      id="backgroundColor"
                      value={formData.backgroundColor}
                      onChange={(e) => handleInputChange("backgroundColor", e.target.value)}
                      className={`form-input ${errors.backgroundColor ? "form-input--error" : ""}`}
                      placeholder="#FFFFFF"
                    />
                    {errors.backgroundColor && <span className="form-error">{errors.backgroundColor}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="textColor" className="form-label">
                      Text Color
                    </label>
                    <input
                      type="text"
                      id="textColor"
                      value={formData.textColor}
                      onChange={(e) => handleInputChange("textColor", e.target.value)}
                      className={`form-input ${errors.textColor ? "form-input--error" : ""}`}
                      placeholder="#000000"
                    />
                    {errors.textColor && <span className="form-error">{errors.textColor}</span>}
                  </div>
                </div>

                <div className="form-checkboxes">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.showOnHomepage}
                      onChange={(e) => handleInputChange("showOnHomepage", e.target.checked)}
                    />
                    Show on Homepage
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.showOnDashboard}
                      onChange={(e) => handleInputChange("showOnDashboard", e.target.checked)}
                    />
                    Show on Dashboard
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.allowComments}
                      onChange={(e) => handleInputChange("allowComments", e.target.checked)}
                    />
                    Allow Comments
                  </label>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => navigate("/dashboard/homepage-messages")}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={createMessage.isPending}
              >
                <Save size={16} />
                {createMessage.isPending ? "Creating..." : "Create Message"}
              </button>
            </div>
          </form>
        )}
      </div>
    </PageScreen>
  );
}