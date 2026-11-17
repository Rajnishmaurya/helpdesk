
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Calendar,
  MessageSquare,
  History,
  Sparkles,
  RefreshCw,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  Tag,
  ShieldCheck,
  FileText,
} from "lucide-react";

import { api } from "../api";
import { useAuth } from "../auth/AuthContext";

import {
  categories,
  priorities,
} from "../data/mockData";

import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";

export default function TicketDetails() {
  const { id } = useParams();
  const { user } = useAuth();

  const isSupportAnalyst = user?.role === "support";

  const [ticket, setTicket] = useState(null);
  const [comment, setComment] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingAI, setLoadingAI] = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // =====================================
  // LOAD TICKET, REQUESTER, HISTORY AND AI
  // =====================================

  const refreshTicket = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const ticketData = await api.getTicket(id);

      const [
        requesterData,
        historyData,
        suggestionsData,
      ] = await Promise.all([
        api.getRequester(ticketData.requester_id),
        api.getTicketHistory(id),
        isSupportAnalyst
          ? api.getAISuggestions(id)
          : Promise.resolve([]),
      ]);

      const comments = historyData
        .filter((item) => item.action_type === "comment")
        .map((item) => ({
          id: item.id,
          author: item.actor || "User",
          message: item.note || "",
          created_at: item.created_at,
        }));

      setTicket({
        ...ticketData,
        requester_name: requesterData.display_name,
        department: requesterData.department,
        history: historyData,
        comments,
        aiSuggestion: suggestionsData[0] || null,
      });
    } catch (err) {
      setError(
        err.message || "Unable to load ticket details."
      );
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [id, isSupportAnalyst]);

  useEffect(() => {
    refreshTicket();
  }, [refreshTicket]);

  // =====================================
  // ALLOWED STATUS TRANSITIONS
  // =====================================

  const allowedTransitions = {
    New: ["In Progress"],
    "In Progress": ["Resolved"],
    Resolved: ["In Progress"],
  };

  // =====================================
  // UPDATE STATUS
  // =====================================

  async function changeStatus(event) {
    if (!isSupportAnalyst || !ticket) return;

    const newStatus = event.target.value;

    if (newStatus === ticket.status) return;

    try {
      setError("");
      setSuccess("");

      await api.updateStatus(id, newStatus);

      await refreshTicket();

      setSuccess(
        `Ticket status updated to ${newStatus}.`
      );
    } catch (err) {
      setError(
        err.message || "Unable to update ticket status."
      );
    }
  }

  // =====================================
  // UPDATE PRIORITY
  // =====================================

  async function changePriority(event) {
    if (!isSupportAnalyst || !ticket) return;

    const newPriority = event.target.value;

    if (newPriority === ticket.priority) return;

    if (!newPriority) {
      setError(
        "The backend does not currently support clearing an assigned priority."
      );
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api.updatePriority(id, newPriority);

      await refreshTicket();

      setSuccess(
        "Ticket priority updated successfully."
      );
    } catch (err) {
      setError(
        err.message || "Unable to update ticket priority."
      );
    }
  }

  // =====================================
  // UPDATE CATEGORY
  // =====================================

  async function changeCategory(event) {
    if (!isSupportAnalyst || !ticket) return;

    const newCategory = event.target.value;

    if ((newCategory || null) === ticket.category) return;

    try {
      setError("");
      setSuccess("");

      await api.updateTicket(id, {
        category: newCategory || null,
      });

      await refreshTicket();

      setSuccess(
        "Ticket category updated successfully."
      );
    } catch (err) {
      setError(
        err.message || "Unable to update ticket category."
      );
    }
  }

  // =====================================
  // ADD COMMENT
  // =====================================

  async function submitComment(event) {
    event.preventDefault();

    if (!comment.trim()) {
      setError("Please enter a comment.");
      return;
    }

    if (comment.trim().length > 2000) {
      setError("Comment cannot exceed 2000 characters.");
      return;
    }

    try {
      setSubmittingComment(true);
      setError("");
      setSuccess("");

      await api.addComment(
        id,
        comment.trim(),
        isSupportAnalyst
          ? "Support Analyst"
          : "Employee"
      );

      setComment("");

      await refreshTicket();

      setSuccess("Comment added successfully.");
    } catch (err) {
      setError(
        err.message || "Unable to add comment."
      );
    } finally {
      setSubmittingComment(false);
    }
  }

  // =====================================
  // GENERATE AI ANALYSIS
  // SUPPORT ANALYST ONLY
  // =====================================

  async function runAIAnalysis() {
    if (!isSupportAnalyst || !ticket) return;

    try {
      setLoadingAI(true);
      setError("");
      setSuccess("");

      const suggestion = await api.analyseTicket(id);

      setTicket((current) => ({
        ...current,
        aiSuggestion: suggestion,
      }));

      setSuccess(
        "AI suggestions generated successfully."
      );
    } catch (err) {
      setError(
        err.message || "Unable to generate AI suggestions."
      );
    } finally {
      setLoadingAI(false);
    }
  }



async function approveAISuggestion() {
  if (!isSupportAnalyst || !ticket?.aiSuggestion) return;

  const suggestion = ticket.aiSuggestion;

  try {
    setSubmittingApproval(true);
    setError("");
    setSuccess("");

    // Apply the suggested category
    if (
      suggestion.suggested_category &&
      suggestion.suggested_category !== ticket.category
    ) {
      await api.updateTicket(id, {
        category: suggestion.suggested_category,
      });
    }

    // Apply the suggested priority
    if (
      suggestion.suggested_priority &&
      suggestion.suggested_priority !== ticket.priority
    ) {
      await api.updatePriority(
        id,
        suggestion.suggested_priority
      );
    }

    // Record the support analyst's approval
    await api.submitAIFeedback(suggestion.id, {
      accepted: true,
      useful: true,
      final_category:
        suggestion.suggested_category || ticket.category,
      final_priority:
        suggestion.suggested_priority || ticket.priority,
      comment: "AI suggestions approved by support analyst.",
    });

    await refreshTicket();

    setSuccess(
      "AI suggestions approved and ticket details updated successfully."
    );
  } catch (err) {
    setError(
      err.message || "Unable to approve AI suggestions."
    );
  } finally {
    setSubmittingApproval(false);
  }
}


  // =====================================
  // LOADING SCREEN
  // =====================================

  if (loading) {
    return (
      <div className="page dashboard-loading">
        <RefreshCw
          size={21}
          className="spin-icon"
        />

        <p>Loading ticket details...</p>
      </div>
    );
  }

  // =====================================
  // TICKET NOT FOUND
  // =====================================

  if (!ticket) {
    return (
      <div className="page">
        <div className="error-message">
          <AlertCircle size={18} />
          {error || "Ticket not found."}
        </div>

        <Link to="/" className="text-link">
          <ArrowLeft size={15} />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const transitions =
    allowedTransitions[ticket.status] || [];

  return (
    <div className="page">

      {/* BACK NAVIGATION */}

      <div className="back-link">
        <Link to="/">
          <ArrowLeft size={15} />
          Back to Dashboard
        </Link>
      </div>

      {/* SUCCESS MESSAGE */}

      {success && (
        <div className="success-message">
          <CheckCircle2 size={17} />
          {success}
        </div>
      )}

      {/* ERROR MESSAGE */}

      {error && (
        <div className="error-message">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      {/* TICKET HEADER */}

      <div className="ticket-detail-heading">
        <div>
          <span className="eyebrow">
            TICKET #{ticket.id}
          </span>

          <h2>{ticket.title}</h2>

          <p>
            Submitted by {ticket.requester_name}
            {ticket.department && ` · ${ticket.department}`}
          </p>
        </div>

        <StatusBadge status={ticket.status} />
      </div>

      <div className="detail-layout">

        {/* =====================================
            LEFT CONTENT
        ===================================== */}

        <div className="detail-main">

          {/* TICKET DESCRIPTION */}

          <section className="panel">
            <div className="section-heading">
              <div className="section-icon">
                <FileText size={18} />
              </div>

              <div>
                <h3>Issue Description</h3>
                <p>
                  Details provided by the requester
                </p>
              </div>
            </div>

            <p className="description-text">
              {ticket.description}
            </p>

            <div className="detail-meta">
              <div>
                <span>
                  <Calendar size={13} />
                  Created
                </span>

                <strong>
                  {new Date(
                    ticket.created_at
                  ).toLocaleString()}
                </strong>
              </div>

              <div>
                <span>
                  <Tag size={13} />
                  Category
                </span>

                <strong>
                  {ticket.category || "Unassigned"}
                </strong>
              </div>

              <div>
                <span>Priority</span>

                <PriorityBadge
                  priority={ticket.priority}
                />
              </div>
            </div>
          </section>

          {/* COMMENTS */}

          <section className="panel">
            <div className="section-heading">
              <div className="section-icon">
                <MessageSquare size={18} />
              </div>

              <div>
                <h3>Comments and Updates</h3>
                <p>
                  Communication related to this ticket
                </p>
              </div>
            </div>

            <div className="comment-list">
              {(!ticket.comments ||
                ticket.comments.length === 0) && (
                <p className="empty-state">
                  No comments yet. Start the conversation.
                </p>
              )}

              {ticket.comments?.map((item) => (
                <div
                  className="comment-item"
                  key={item.id}
                >
                  <div className="comment-avatar">
                    {item.author?.charAt(0) || "U"}
                  </div>

                  <div className="comment-content">
                    <strong>{item.author}</strong>

                    <span className="table-subtext">
                      {new Date(
                        item.created_at
                      ).toLocaleString()}
                    </span>

                    <p>{item.message}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* BOTH ROLES CAN COMMENT */}

            <form
              onSubmit={submitComment}
              className="comment-form"
            >
              <textarea
                value={comment}
                onChange={(event) =>
                  setComment(event.target.value)
                }
                placeholder="Write a comment or provide an update..."
                rows={3}
                maxLength={2000}
                required
              />

              <div className="form-actions">
                <span className="table-subtext">
                  {comment.length}/2000 characters
                </span>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={
                    submittingComment ||
                    !comment.trim()
                  }
                >
                  <Send size={15} />

                  {submittingComment
                    ? "Sending..."
                    : "Add Comment"}
                </button>
              </div>
            </form>
          </section>

          {/* ACTIVITY HISTORY */}

          <section className="panel">
            <div className="section-heading">
              <div className="section-icon">
                <History size={18} />
              </div>

              <div>
                <h3>Ticket Activity History</h3>
                <p>
                  Timeline of ticket updates and actions
                </p>
              </div>
            </div>

            <div className="timeline">
              {(!ticket.history ||
                ticket.history.length === 0) && (
                <p className="empty-state">
                  No activity history available.
                </p>
              )}

              {[...(ticket.history || [])]
                .sort(
                  (a, b) =>
                    new Date(b.created_at) -
                    new Date(a.created_at)
                )
                .map((item) => (
                  <div
                    className="timeline-item"
                    key={item.id}
                  >
                    <div className="timeline-dot" />

                    <div className="timeline-content">
                      <strong>
                        {item.action_type?.replaceAll(
                          "_",
                          " "
                        )}
                      </strong>

                      {item.old_value && (
                        <p>
                          {item.old_value}
                          {" → "}
                          {item.new_value}
                        </p>
                      )}

                      {item.note && (
                        <p>{item.note}</p>
                      )}

                      <span className="table-subtext">
                        {item.actor || "System"}
                        {" · "}
                        {new Date(
                          item.created_at
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </div>

        {/* =====================================
            RIGHT SIDEBAR
        ===================================== */}

        <aside className="detail-side">

          {/* TICKET MANAGEMENT
              SUPPORT ANALYST ONLY */}

          {isSupportAnalyst && (
            <section className="panel">
              <div className="section-heading">
                <div className="section-icon">
                  <ShieldCheck size={18} />
                </div>

                <div>
                  <h3>Ticket Management</h3>
                  <p>Manage ticket properties</p>
                </div>
              </div>

              {/* STATUS */}

              <div className="form-group">
                <label htmlFor="ticket-status">
                  Status
                </label>

                <select
                  id="ticket-status"
                  value={ticket.status}
                  onChange={changeStatus}
                >
                  <option value={ticket.status}>
                    {ticket.status}
                  </option>

                  {transitions.map((status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              {/* PRIORITY */}

              <div className="form-group">
                <label htmlFor="ticket-priority">
                  Priority
                </label>

                <select
                  id="ticket-priority"
                  value={ticket.priority || ""}
                  onChange={changePriority}
                >
                  {!ticket.priority && (
                    <option value="" disabled>
                      Unassigned
                    </option>
                  )}

                  {priorities.map((priority) => (
                    <option
                      key={priority}
                      value={priority}
                    >
                      {priority}
                    </option>
                  ))}
                </select>
              </div>

              {/* CATEGORY */}

              <div className="form-group">
                <label htmlFor="ticket-category">
                  Category
                </label>

                <select
                  id="ticket-category"
                  value={ticket.category || ""}
                  onChange={changeCategory}
                >
                  <option value="">
                    Unassigned
                  </option>

                  {categories.map((category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </section>
          )}

          
{/* AI ASSISTANT - SUPPORT ANALYST ONLY */}

{isSupportAnalyst && (
  <section className="panel ai-panel">

    <div className="ai-heading">
      <span className="ai-icon">
        <Sparkles size={17} />
      </span>

      <div>
        <h3>AI Assistant</h3>
        <span className="table-subtext">
          Intelligent ticket recommendations
        </span>
      </div>
    </div>

    <p>
      Analyse this ticket to receive AI-powered category,
      priority, and troubleshooting recommendations.
    </p>

    {/* GENERATE / REGENERATE BUTTON */}

    <button
      type="button"
      className="primary-button full-width"
      onClick={runAIAnalysis}
      disabled={loadingAI || submittingApproval}
    >
      {loadingAI ? (
        <>
          <RefreshCw size={15} className="spin-icon" />
          Generating Suggestions...
        </>
      ) : (
        <>
          <Sparkles size={15} />
          {ticket.aiSuggestion
            ? "Regenerate AI Suggestions"
            : "Generate AI Suggestions"}
        </>
      )}
    </button>

    {/* AI RESULTS */}

    {ticket.aiSuggestion && (
      <div className="ai-results">

        <div>
          <span className="field-label">
            Suggested Category
          </span>

          <strong>
            {ticket.aiSuggestion.suggested_category || "Unassigned"}
          </strong>
        </div>

        <div>
          <span className="field-label">
            Suggested Priority
          </span>

          <PriorityBadge
            priority={ticket.aiSuggestion.suggested_priority}
          />
        </div>

        <div>
          <span className="field-label">
            Priority Reason
          </span>

          <p>
            {ticket.aiSuggestion.priority_reason ||
              "No priority reason provided."}
          </p>
        </div>

        <div>
          <strong>Recommended Troubleshooting Steps</strong>

          {ticket.aiSuggestion.troubleshooting_steps?.length > 0 ? (
            <ol>
              {ticket.aiSuggestion.troubleshooting_steps.map(
                (step, index) => (
                  <li key={index}>{step}</li>
                )
              )}
            </ol>
          ) : (
            <p>No troubleshooting steps available.</p>
          )}
        </div>

        {/* APPROVAL BUTTON */}

        <button
          type="button"
          className="primary-button full-width ai-approve-button"
          onClick={approveAISuggestion}
          disabled={submittingApproval || loadingAI}
        >
          {submittingApproval ? (
            <>
              <RefreshCw size={15} className="spin-icon" />
              Applying Suggestions...
            </>
          ) : (
            <>
              <CheckCircle2 size={16} />
              Approve Suggestions
            </>
          )}
        </button>

        <div className="ai-disclaimer">
          <AlertCircle size={15} />

          <p>
            Review AI recommendations before approval.
            Approval applies the suggested category and priority
            to this ticket.
          </p>
        </div>

        {ticket.aiSuggestion.model_name && (
          <span className="table-subtext">
            Generated by {ticket.aiSuggestion.model_name}
          </span>
        )}

      </div>
    )}
  </section>
)}


          {/* EMPLOYEE INFORMATION */}

          {!isSupportAnalyst && (
            <section className="panel employee-info-panel">
              <div className="section-heading">
                <div className="section-icon">
                  <Clock size={18} />
                </div>

                <div>
                  <h3>Ticket Updates</h3>
                  <p>
                    Stay informed about your request
                  </p>
                </div>
              </div>

              <p>
                Your request is being tracked by the
                support team. You can add comments if
                you have additional information.
              </p>

              <div className="employee-status">
                <span>Current Status</span>

                <StatusBadge status={ticket.status} />
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
