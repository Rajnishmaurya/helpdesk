
import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { TicketList } from "./MyTickets";

export default function WorkQueue() {
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTickets() {
    try {
      setLoading(true);
      setError("");

      const data = await api.getTickets();
      setTickets(data);
    } catch (err) {
      setError(err.message || "Unable to load the work queue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesStatus =
        statusFilter === "All" || ticket.status === statusFilter;

      const matchesPriority =
        priorityFilter === "All" || ticket.priority === priorityFilter;

      const matchesSearch =
        `${ticket.title} ${ticket.id} ${ticket.requester_name}`
          .toLowerCase()
          .includes(search.toLowerCase());

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [tickets, statusFilter, priorityFilter, search]);

  return (
    <div className="page">
      <div className="page-intro">
        <h2>Support Work Queue</h2>
        <p>Review, filter, and manage employee support requests.</p>
      </div>

      <div className="filter-bar">
        <input
          placeholder="Search tickets..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option>All</option>
          <option>New</option>
          <option>In Progress</option>
          <option>Resolved</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value)}
        >
          <option>All</option>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>
      </div>

      <div className="panel">
        {loading ? (
          <p className="empty-state">Loading tickets...</p>
        ) : error ? (
          <>
            <div className="error-message">{error}</div>
            <button className="primary-button" onClick={loadTickets}>
              Retry
            </button>
          </>
        ) : (
          <TicketList tickets={filteredTickets} />
        )}
      </div>
    </div>
  );
}
