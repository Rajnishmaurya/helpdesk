import { Link } from "react-router-dom";
import { ArrowUpRight, Inbox } from "lucide-react";

import StatusBadge from "./StatusBadge";
import PriorityBadge from "./PriorityBadge";

export default function TicketTable({
  tickets = [],
  title = "Recent Tickets",
  showRequester = true,
  emptyMessage = "No tickets found.",
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h3>{title}</h3>
          <p>Review and track support requests</p>
        </div>

        <span className="ticket-count">
          {tickets.length} tickets
        </span>
      </div>

      {tickets.length === 0 ? (
        <div className="empty-table">
          <Inbox size={30} />
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                {showRequester && <th>Requester</th>}
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
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
                      {ticket.department || "Department not specified"}
                    </span>
                  </td>

                  {showRequester && (
                    <td>{ticket.requester_name || "Unknown"}</td>
                  )}

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

                  <td>
                    <Link
                      to={`/tickets/${ticket.id}`}
                      className="table-action"
                      aria-label={`View ticket ${ticket.id}`}
                    >
                      <ArrowUpRight size={17} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}