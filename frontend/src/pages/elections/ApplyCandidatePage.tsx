import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type Election = {
  _id: string;
  title: string;
  phase: number;
  status: string;
  nominationStartDate: string;
  nominationEndDate: string;
  availablePosts: Array<{
    _id: string;
    name: string;
    description: string;
    maxCandidates: number;
    currentCandidates: number;
  }>;
};

type EligibilityCheck = {
  isEligible: boolean;
  reasons: string[];
  memberInfo: {
    studentId: string;
    batch: number;
    currentCgpa: number;
    attendancePercentage: number;
    disciplinaryActions: number;
    membershipStatus: string;
  };
};

export function ApplyCandidatePage() {
  const { token, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedElection, setSelectedElection] = useState("");
  const [selectedPost, setSelectedPost] = useState("");
  const [form, setForm] = useState({
    manifesto: "",
    qualifications: "",
    experience: "",
    visionStatement: "",
    campaignSlogan: "",
    supportingDocuments: [] as string[],
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch active elections
  const electionsQuery = useQuery({
    queryKey: ["active-elections", token],
    queryFn: () => apiRequest<Election[]>("/elections/active", { token }),
    enabled: Boolean(token) && !loading,
  });

  // Check eligibility
  const eligibilityQuery = useQuery({
    queryKey: ["eligibility-check", token],
    queryFn: () => apiRequest<EligibilityCheck>("/auth/check-eligibility/candidacy", { token }),
    enabled: Boolean(token) && !loading,
  });

  // Submit application
  const applyMutation = useMutation({
    mutationFn: () =>
      apiRequest("/elections/apply", {
        method: "POST",
        token,
        body: JSON.stringify({
          electionId: selectedElection,
          postId: selectedPost,
          ...form,
        }),
      }),
    onSuccess: () => {
      setMessage({ type: "success", text: "Application submitted successfully!" });
      setTimeout(() => navigate("/dashboard/elections/my-applications"), 2000);
    },
    onError: (error) => {
      setMessage({ type: "error", text: normalizeApiError(error) });
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    
    if (!selectedElection || !selectedPost) {
      setMessage({ type: "error", text: "Please select an election and post" });
      return;
    }
    
    if (!form.manifesto || !form.visionStatement) {
      setMessage({ type: "error", text: "Manifesto and vision statement are required" });
      return;
    }
    
    setMessage(null);
    applyMutation.mutate();
  }

  const isEligible = eligibilityQuery.data?.isEligible;
  const eligibilityReasons = eligibilityQuery.data?.reasons || [];
  const memberInfo = eligibilityQuery.data?.memberInfo;

  const selectedElectionData = electionsQuery.data?.find(e => e._id === selectedElection);

  return (
    <PageScreen 
      title="Apply as EC Candidate" 
      subtitle="Submit your application to run for an Executive Committee position."
    >
      {message && (
        <div className={message.type === "success" ? "success-message" : "alert"}>
          {message.text}
        </div>
      )}

      {/* Eligibility Check */}
      <div className="page-section">
        <h2>Eligibility Status</h2>
        {eligibilityQuery.isLoading && <div className="notice">Checking eligibility...</div>}
        
        {eligibilityQuery.data && (
          <div className={`eligibility-card ${isEligible ? 'eligible' : 'not-eligible'}`}>
            <div className="eligibility-card__header">
              <span className="eligibility-icon">{isEligible ? '✓' : '✗'}</span>
              <h3>{isEligible ? 'You are eligible!' : 'Not eligible'}</h3>
            </div>
            
            {memberInfo && (
              <div className="eligibility-card__info">
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">Student ID:</span>
                    <span className="value">{memberInfo.studentId}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Batch:</span>
                    <span className="value">{memberInfo.batch}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">CGPA:</span>
                    <span className={`value ${memberInfo.currentCgpa >= 3.0 ? 'success' : 'error'}`}>
                      {memberInfo.currentCgpa.toFixed(2)} {memberInfo.currentCgpa >= 3.0 ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Attendance:</span>
                    <span className={`value ${memberInfo.attendancePercentage >= 75 ? 'success' : 'error'}`}>
                      {memberInfo.attendancePercentage}% {memberInfo.attendancePercentage >= 75 ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Disciplinary Actions:</span>
                    <span className={`value ${memberInfo.disciplinaryActions === 0 ? 'success' : 'error'}`}>
                      {memberInfo.disciplinaryActions} {memberInfo.disciplinaryActions === 0 ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Membership:</span>
                    <span className={`value ${memberInfo.membershipStatus === 'Active' ? 'success' : 'error'}`}>
                      {memberInfo.membershipStatus}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {!isEligible && eligibilityReasons.length > 0 && (
              <div className="eligibility-card__reasons">
                <h4>Reasons:</h4>
                <ul>
                  {eligibilityReasons.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
                <div className="info" style={{ marginTop: '1rem' }}>
                  Update your profile with CGPA and attendance to become eligible.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Application Form */}
      {isEligible && (
        <form onSubmit={handleSubmit} className="page-section">
          <h2>Application Form</h2>
          
          <div className="form-grid">
            <label className="field">
              <span>Select Election *</span>
              <select
                value={selectedElection}
                onChange={(e) => {
                  setSelectedElection(e.target.value);
                  setSelectedPost(""); // Reset post selection
                }}
                required
              >
                <option value="">Choose an election...</option>
                {electionsQuery.data?.map(election => (
                  <option key={election._id} value={election._id}>
                    {election.title} - Phase {election.phase} ({election.status})
                  </option>
                ))}
              </select>
            </label>

            {selectedElection && (
              <label className="field">
                <span>Select Post *</span>
                <select
                  value={selectedPost}
                  onChange={(e) => setSelectedPost(e.target.value)}
                  required
                >
                  <option value="">Choose a post...</option>
                  {selectedElectionData?.availablePosts.map(post => (
                    <option 
                      key={post._id} 
                      value={post._id}
                      disabled={post.currentCandidates >= post.maxCandidates}
                    >
                      {post.name} - {post.currentCandidates}/{post.maxCandidates} candidates
                      {post.currentCandidates >= post.maxCandidates && " (Full)"}
                    </option>
                  ))}
                </select>
                {selectedPost && (
                  <small>
                    {selectedElectionData?.availablePosts.find(p => p._id === selectedPost)?.description}
                  </small>
                )}
              </label>
            )}

            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Campaign Slogan *</span>
              <input
                value={form.campaignSlogan}
                onChange={(e) => setForm(prev => ({ ...prev, campaignSlogan: e.target.value }))}
                placeholder="A catchy slogan for your campaign"
                maxLength={100}
                required
              />
              <small>{form.campaignSlogan.length}/100 characters</small>
            </label>

            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Vision Statement *</span>
              <textarea
                value={form.visionStatement}
                onChange={(e) => setForm(prev => ({ ...prev, visionStatement: e.target.value }))}
                placeholder="What is your vision for the club? What changes do you want to bring?"
                rows={4}
                maxLength={500}
                required
              />
              <small>{form.visionStatement.length}/500 characters</small>
            </label>

            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Manifesto *</span>
              <textarea
                value={form.manifesto}
                onChange={(e) => setForm(prev => ({ ...prev, manifesto: e.target.value }))}
                placeholder="Describe your plans, goals, and promises if elected..."
                rows={6}
                maxLength={2000}
                required
              />
              <small>{form.manifesto.length}/2000 characters</small>
            </label>

            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Qualifications</span>
              <textarea
                value={form.qualifications}
                onChange={(e) => setForm(prev => ({ ...prev, qualifications: e.target.value }))}
                placeholder="Your academic achievements, certifications, awards..."
                rows={4}
                maxLength={1000}
              />
              <small>{form.qualifications.length}/1000 characters</small>
            </label>

            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Relevant Experience</span>
              <textarea
                value={form.experience}
                onChange={(e) => setForm(prev => ({ ...prev, experience: e.target.value }))}
                placeholder="Previous EC positions, leadership roles, volunteer work..."
                rows={4}
                maxLength={1000}
              />
              <small>{form.experience.length}/1000 characters</small>
            </label>
          </div>

          <div className="info" style={{ marginTop: '1.5rem' }}>
            <strong>Note:</strong> Your application will be reviewed by the Election Commission. 
            Make sure all information is accurate and complete. You can edit your application 
            before the nomination deadline.
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="secondary-button" 
              onClick={() => navigate("/dashboard/elections")}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="primary-button" 
              disabled={applyMutation.isPending || !isEligible}
            >
              {applyMutation.isPending ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </form>
      )}
    </PageScreen>
  );
}
