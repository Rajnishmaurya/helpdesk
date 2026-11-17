
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserRound, Mail } from "lucide-react";

import { api } from "../api";
import { useAuth } from "../auth/AuthContext";

import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";

export default function MyTickets() {
  const { user } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTickets() {
      if (!user?.email || user.role !== "employee") {
        setError("Unable to identify the logged-in employee.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        // Fetch tickets belonging to the logged-in employee
        const data = await api.getTickets({
          requester_email: user.email,
        });

        setTickets(data);
      } catch (err) {
        setError(err.message || "Unable to load your tickets.");
      } finally {
        setLoading(false);
      }
    }

    loadTickets();
  }, [user?.email, user?.role]);

  return (
    <div className="page">
      <div className="page-intro">
        <h2>My Tickets</h2>
        <p>Track your submitted support requests.</p>
      </div>

      <div className="panel employee-profile-panel">
        <h3>My Employee Details</h3>

        <div className="employee-profile-details">
          <div>
            <UserRound size={20} />
            <span>{user?.name}</span>
          </div>

          <div>
            <Mail size={20} />
            <span>{user?.email}</span>
          </div>
        </div>
      </div>

      <div className="page-intro">
        <h3>My Submitted Tickets</h3>
        <p>Only your submitted tickets are displayed.</p>
      </div>

      <div className="panel">
        {loading ? (
          <p className="empty-state">Loading your tickets...</p>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <TicketList tickets={tickets} />
        )}
      </div>
    </div>
  );
}

export function TicketList({ tickets = [] }) {
  if (!tickets.length) {
    return (
      <p className="empty-state">
        You haven't raised any tickets yet.
      </p>
    );
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Requester</th>
            <th>Category</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>

        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id}>
              <td>
                <Link
                  to={`/tickets/${ticket.id}`}
                  className="ticket-title"
                >
                  #{ticket.id} — {ticket.title}
                </Link>
              </td>

              <td>{ticket.requester_name || "Unknown"}</td>
              <td>{ticket.category || "Unassigned"}</td>
              <td>
                <PriorityBadge priority={ticket.priority} />
              </td>
              <td>
                <StatusBadge status={ticket.status} />
              </td>
              <td>
                {new Date(ticket.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
