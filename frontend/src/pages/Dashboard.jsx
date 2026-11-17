
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Ticket,
  Clock,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

import { api } from "../api";
import { useAuth } from "../auth/AuthContext";

import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";

export default function Dashboard() {
  const { user } = useAuth();

  const isEmployee = user?.role === "employee";
  const isSupport = user?.role === "support";

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTickets() {
    try {
      setLoading(true);
      setError("");

      let data;

      if (isEmployee) {
        // Fetch only tickets belonging to the logged-in employee
        data = await api.getTickets({
          requester_email: user.email,
        });
      } else if (isSupport) {
        // Support can see all employee tickets
        data = await api.getTickets();
      } else {
        throw new Error("Invalid user role.");
      }

      setTickets(data);
    } catch (err) {
      setError(
        err.message || "Unable to load dashboard tickets."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadTickets();
    }
  }, [user?.email, user?.role]);

  const newCount = tickets.filter(
    (ticket) => ticket.status === "New"
  ).length;

  const progressCount = tickets.filter(
    (ticket) => ticket.status === "In Progress"
  ).length;

  const resolvedCount = tickets.filter(
    (ticket) => ticket.status === "Resolved"
  ).length;

  return (
    <div className="page">

      {/* Welcome section */}
      <div className="welcome-row">
        <div>
          <h2>
            {isEmployee
              ? `Welcome back, ${user?.name}!`
              : "Welcome back, Support Team!"}
          </h2>

          <p>
            {isEmployee
              ? "Here is an overview of your submitted support requests."
              : "Here is an overview of all employee support requests."}
          </p>
        </div>

        {isEmployee && (
          <Link to="/new-ticket" className="primary-button">
            <Plus size={17} />
            Create Ticket
          </Link>
        )}
      </div>

      {/* Employee details */}
      {isEmployee && (
        <section className="panel employee-dashboard-profile">
          <h3>My Employee Details</h3>

          <div className="employee-dashboard-details">
            <div>
              <strong>Name</strong>
              <span>{user?.name}</span>
            </div>

            <div>
              <strong>Email</strong>
              <span>{user?.email}</span>
            </div>

            <div>
              <strong>Role</strong>
              <span>Employee</span>
            </div>
          </div>
        </section>
      )}

      {/* Ticket statistics */}
      <div className="stats-grid">
        <StatCard
          title="Total Tickets"
          value={tickets.length}
          icon={<Ticket />}
          color="blue"
        />

        <StatCard
          title="New"
          value={newCount}
          icon={<Clock />}
          color="orange"
        />

        <StatCard
          title="In Progress"
          value={progressCount}
          icon={<Clock />}
          color="purple"
        />

        <StatCard
          title="Resolved"
          value={resolvedCount}
          icon={<CheckCircle2 />}
          color="green"
        />
      </div>

      {/* Recent tickets */}
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>
              {isEmployee
                ? "My Recent Tickets"
                : "Recent Employee Requests"}
            </h3>

            <p>
              {isEmployee
                ? "Your recently submitted support requests."
                : "Latest support requests from all employees."}
            </p>
          </div>

          <Link
            to={isEmployee ? "/my-tickets" : "/work-queue"}
            className="text-link"
          >
            View all
          </Link>
        </div>

        {loading ? (
          <p className="empty-state">
            Loading tickets...
          </p>
        ) : error ? (
          <div>
            <div className="error-message">{error}</div>

            <button
              className="primary-button"
              onClick={loadTickets}
            >
              <RefreshCw size={15} />
              Retry
            </button>
          </div>
        ) : (
          <TicketTable tickets={tickets.slice(0, 5)} />
        )}
      </section>
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>
        {icon}
      </div>

      <div>
        <p>{title}</p>
        <h2>{value}</h2>
      </div>
    </div>
  );
}

function TicketTable({ tickets }) {
  if (!tickets.length) {
    return (
      <p className="empty-state">
        No tickets found.
      </p>
    );
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Ticket</th>
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

                <span className="table-subtext">
                  {ticket.requester_name}
                </span>
              </td>

              <td>{ticket.category || "Unassigned"}</td>

              <td>
                <PriorityBadge priority={ticket.priority} />
              </td>

              <td>
                <StatusBadge status={ticket.status} />
              </td>

              <td>
                {new Date(
                  ticket.created_at
                ).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
