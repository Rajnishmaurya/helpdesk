import { CheckCircle2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SuccessModal({ ticket, onClose }) {
  const navigate = useNavigate();

  if (!ticket) return null;

  function viewTicket() {
    onClose();
    navigate(`/tickets/${ticket.id}`);
  }

  function goToDashboard() {
    onClose();
    navigate("/");
  }

  return (
    <div className="modal-overlay" role="presentation">
      <div
        className="success-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-title"
      >
        <button
          className="modal-close"
          onClick={goToDashboard}
          aria-label="Close popup"
        >
          <X size={19} />
        </button>

        <div className="success-icon">
          <CheckCircle2 size={38} />
        </div>

        <h2 id="success-title">Ticket Created Successfully!</h2>

        <p className="success-description">
          Your support request has been submitted successfully. Our support
          team will review it shortly.
        </p>

        <div className="created-ticket-reference">
          <span>YOUR TICKET ID</span>
          <strong>#{ticket.id}</strong>
          <p>{ticket.title}</p>
        </div>

        <div className="success-modal-actions">
          <button className="primary-button" onClick={viewTicket}>
            View Ticket
          </button>

          <button className="secondary-button" onClick={goToDashboard}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}