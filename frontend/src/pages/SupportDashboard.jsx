
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";

import { api } from "../api";
import MetricCard from "../components/MetricCard";
import TicketTable from "../components/TicketTable";

const priorityColors = {
  High: "#dc5555",
  Medium: "#e5a23b",
  Low: "#28a36a",
  Unassigned: "#a0a8b5",
};

export default function SupportDashboard() {
  const [tickets, setTickets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [ticketData, summaryData] = await Promise.all([
        api.getTickets(),
        api.getDashboardSummary(),
      ]);

      setTickets(ticketData);
      setSummary(summaryData);
    } catch (err) {
      setError(err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const metrics = {
    total: summary?.total_tickets || 0,
    new: summary?.status_summary?.New || 0,
    progress: summary?.status_summary?.["In Progress"] || 0,
    resolved: summary?.status_summary?.Resolved || 0,
    high: summary?.priority_summary?.High || 0,
  };

  const priorityStats = {
    High: summary?.priority_summary?.High || 0,
    Medium: summary?.priority_summary?.Medium || 0,
    Low: summary?.priority_summary?.Low || 0,
    Unassigned: summary?.priority_summary?.Unassigned || 0,
  };

  const categoryStats = useMemo(() => {
    return Object.entries(summary?.category_summary || {}).sort(
      (a, b) => b[1] - a[1]
    );
  }, [summary]);

  const recentTickets = useMemo(() => {
    return [...tickets]
      .sort(
        (a, b) =>
          new Date(b.created_at) - new Date(a.created_at)
      )
      .slice(0, 5);
  }, [tickets]);

  const highPriorityTickets = useMemo(() => {
    return tickets.filter(
      (ticket) =>
        ticket.priority === "High" &&
        ticket.status !== "Resolved"
    );
  }, [tickets]);

  if (loading) {
    return (
      <div className="page dashboard-loading">
        <RefreshCw className="spin-icon" size={22} />
        <p>Loading Support Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="error-message">{error}</div>

        <button
          className="primary-button"
          onClick={loadDashboard}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="welcome-row">
        <div>
          <span className="eyebrow">SUPPORT OPERATIONS</span>

          <h2>Support Dashboard</h2>

          <p>
            Monitor ticket activity, manage priorities, and keep
            employee requests moving.
          </p>
        </div>

        <button
          className="secondary-button"
          onClick={loadDashboard}
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      <div className="stats-grid">
        <MetricCard
          title="Total Tickets"
          value={metrics.total}
          description="All support requests"
          type="total"
          color="blue"
        />

        <MetricCard
          title="New Tickets"
          value={metrics.new}
          description="Awaiting attention"
          type="new"
          color="orange"
        />

        <MetricCard
          title="In Progress"
          value={metrics.progress}
          description="Currently being handled"
          type="progress"
          color="purple"
        />

        <MetricCard
          title="Resolved"
          value={metrics.resolved}
          description="Successfully completed"
          type="resolved"
          color="green"
        />
      </div>

      <div className="support-overview-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Priority Distribution</h3>
              <p>Tickets grouped by priority</p>
            </div>
          </div>

          <div className="priority-summary">
            {Object.entries(priorityStats).map(
              ([priority, count]) => {
                const percentage =
                  metrics.total > 0
                    ? (count / metrics.total) * 100
                    : 0;

                return (
                  <div
                    className="priority-stat"
                    key={priority}
                  >
                    <div className="priority-stat-heading">
                      <span>
                        <span
                          className="priority-color-dot"
                          style={{
                            background: priorityColors[priority],
                          }}
                        />

                        {priority}
                      </span>

                      <strong>{count}</strong>
                    </div>

                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${percentage}%`,
                          background: priorityColors[priority],
                        }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Tickets by Category</h3>
              <p>Understand common employee issues</p>
            </div>
          </div>

          {categoryStats.length === 0 ? (
            <p className="empty-state">
              No categories available.
            </p>
          ) : (
            <div className="category-list">
              {categoryStats.map(([category, count]) => (
                <div
                  className="category-item"
                  key={category}
                >
                  <div className="category-name">
                    <span>{category}</span>
                    <strong>{count}</strong>
                  </div>

                  <span className="category-percentage">
                    {metrics.total
                      ? Math.round(
                          (count / metrics.total) * 100
                        )
                      : 0}
                    %
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="panel attention-panel">
        <div className="attention-heading">
          <div className="attention-icon">
            <AlertTriangle size={19} />
          </div>

          <div>
            <h3>Needs Attention</h3>
            <p>
              High-priority tickets that are not yet resolved
            </p>
          </div>

          <strong className="attention-count">
            {highPriorityTickets.length}
          </strong>
        </div>

        {highPriorityTickets.length === 0 ? (
          <p className="empty-state">
            No unresolved high-priority tickets.
          </p>
        ) : (
          <div className="attention-list">
            {highPriorityTickets.slice(0, 3).map((ticket) => (
              <div
                className="attention-item"
                key={ticket.id}
              >
                <div>
                  <Link
                    to={`/tickets/${ticket.id}`}
                    className="ticket-title"
                  >
                    #{ticket.id} — {ticket.title}
                  </Link>

                  <span className="table-subtext">
                    {ticket.requester_name} ·{" "}
                    {ticket.category || "Unassigned"}
                  </span>
                </div>

                <Link
                  to={`/tickets/${ticket.id}`}
                  className="text-link"
                >
                  Review <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <TicketTable
        tickets={recentTickets}
        title="Recent Tickets"
        showRequester={true}
        emptyMessage="No tickets have been created yet."
      />

      <div className="dashboard-footer-action">
        <Link to="/work-queue" className="primary-button">
          Open Full Work Queue
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
