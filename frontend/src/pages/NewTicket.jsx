
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api";
import { useAuth } from "../auth/AuthContext";
import { categories } from "../data/mockData";

import SuccessModal from "../components/SuccessModal";

export default function NewTicket() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [requesterId, setRequesterId] = useState(null);
  const [requesterLoading, setRequesterLoading] = useState(true);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);

  // Automatically identify the logged-in employee
  useEffect(() => {
    let cancelled = false;

    async function loadRequester() {
      try {
        setRequesterLoading(true);
        setError("");

        if (!user?.email || user.role !== "employee") {
          throw new Error("Unable to identify the logged-in employee.");
        }

        const requesters = await api.getRequesters();

        const currentRequester = requesters.find(
          (requester) =>
            requester.email?.trim().toLowerCase() ===
            user.email.trim().toLowerCase()
        );

        if (!currentRequester) {
          throw new Error(
            "Your employee record was not found in the database."
          );
        }

        if (!cancelled) {
          setRequesterId(currentRequester.id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to identify requester.");
        }
      } finally {
        if (!cancelled) {
          setRequesterLoading(false);
        }
      }
    }

    loadRequester();

    return () => {
      cancelled = true;
    };
  }, [user?.email, user?.role]);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!requesterId) {
      setError("Employee information is not available.");
      return;
    }

    if (form.title.trim().length < 5) {
      setError("Title must contain at least 5 characters.");
      return;
    }

    if (form.description.trim().length < 10) {
      setError("Description must contain at least 10 characters.");
      return;
    }

    try {
      setSubmitting(true);

      const ticket = await api.createTicket({
        requester_id: requesterId,
        title: form.title,
        description: form.description,
        category: form.category || null,
      });

      setCreatedTicket(ticket);

      setForm({
        title: "",
        description: "",
        category: "",
      });
    } catch (err) {
      setError(err.message || "Unable to create ticket.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page narrow-page">
      <div className="page-intro">
        <h2>Create a Support Ticket</h2>
        <p>
          Describe your issue so that the support team can help you.
        </p>
      </div>

      <form className="panel form-panel" onSubmit={handleSubmit}>
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {requesterLoading ? (
          <p className="empty-state">
            Loading your employee information...
          </p>
        ) : requesterId ? (
          <>
            <div className="form-group">
              <label htmlFor="title">Issue Title *</label>

              <input
                id="title"
                name="title"
                value={form.title}
                onChange={updateField}
                placeholder="Briefly describe your issue"
                minLength={5}
                maxLength={150}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description *</label>

              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={updateField}
                placeholder="Provide details about the issue..."
                rows={5}
                minLength={10}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Category</label>

              <select
                id="category"
                name="category"
                value={form.category}
                onChange={updateField}
              >
                <option value="">Select category</option>

                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => navigate("/")}
                disabled={submitting}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Ticket"}
              </button>
            </div>
          </>
        ) : (
          <p className="empty-state">
            Your employee record could not be identified.
            Please contact the support team.
          </p>
        )}
      </form>

      {createdTicket && (
        <SuccessModal
          ticket={createdTicket}
          onClose={() => {
            setCreatedTicket(null);
            navigate("/my-tickets");
          }}
        />
      )}
    </div>
  );
}
