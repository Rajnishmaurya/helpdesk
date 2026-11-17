
import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const http = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

function handleApiError(error) {
  if (error.response) {
    const detail = error.response.data?.detail;

    if (typeof detail === "string") {
      throw new Error(detail);
    }

    if (Array.isArray(detail)) {
      throw new Error(
        detail.map((item) => item.msg).join(", ")
      );
    }

    throw new Error(
      error.response.data?.message ||
      `Request failed with status ${error.response.status}`
    );
  }

  if (error.code === "ECONNABORTED") {
    throw new Error("The server took too long to respond.");
  }

  if (error.request) {
    throw new Error(
      "Cannot connect to the backend. Make sure FastAPI is running."
    );
  }

  throw new Error(error.message || "An unexpected error occurred.");
}

async function request(callback) {
  try {
    const response = await callback();
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export const api = {
  // =====================================
  // REQUESTERS
  // =====================================

  getRequesters() {
    return request(() => http.get("/api/requesters/"));
  },

  getRequester(requesterId) {
    return request(() =>
      http.get(`/api/requesters/${requesterId}`)
    );
  },

  createRequester(payload) {
    return request(() =>
      http.post("/api/requesters/", payload)
    );
  },

  // =====================================
  // TICKETS
  // =====================================

  async getTickets(filters = {}) {
    const params = {};

    if (filters.requester_id != null) {
      params.requester_id = filters.requester_id;
    }

    if (filters.requester_email) {
      params.requester_email = filters.requester_email;
    }

    if (
      filters.status_filter &&
      filters.status_filter !== "All"
    ) {
      params.status_filter = filters.status_filter;
    }

    if (filters.category && filters.category !== "All") {
      params.category = filters.category;
    }

    if (filters.priority && filters.priority !== "All") {
      params.priority = filters.priority;
    }

    const [tickets, requesters] = await Promise.all([
      request(() => http.get("/api/tickets/", { params })),
      request(() => http.get("/api/requesters/")),
    ]);

    const requesterMap = new Map(
      requesters.map((requester) => [
        requester.id,
        requester,
      ])
    );

    return tickets.map((ticket) => {
      const requester = requesterMap.get(ticket.requester_id);

      return {
        ...ticket,
        requester_name: requester?.display_name || "Unknown",
        department: requester?.department || "",
      };
    });
  },

  getTicket(ticketId) {
    return request(() =>
      http.get(`/api/tickets/${ticketId}`)
    );
  },

  createTicket(payload) {
    const body = {
      requester_id: Number(payload.requester_id),
      title: payload.title.trim(),
      description: payload.description.trim(),
      category: payload.category || null,
    };

    return request(() =>
      http.post("/api/tickets/", body)
    );
  },

  updateTicket(ticketId, payload) {
    return request(() =>
      http.patch(`/api/tickets/${ticketId}`, payload)
    );
  },

  updateStatus(ticketId, status, note = null) {
    return request(() =>
      http.patch(`/api/tickets/${ticketId}/status`, {
        status,
        note,
      })
    );
  },

  updatePriority(ticketId, priority) {
    if (!["Low", "Medium", "High"].includes(priority)) {
      throw new Error("Please select a valid priority.");
    }

    return request(() =>
      http.patch(`/api/tickets/${ticketId}/priority`, {
        priority,
      })
    );
  },

  // =====================================
  // TICKET HISTORY AND COMMENTS
  // =====================================

  getTicketHistory(ticketId) {
    return request(() =>
      http.get(`/api/tickets/${ticketId}/history`)
    );
  },

  addComment(ticketId, message, actor = "Employee") {
    return request(() =>
      http.post(`/api/tickets/${ticketId}/comments`, {
        note: message,
        actor,
      })
    );
  },

  // =====================================
  // DASHBOARD
  // =====================================

  getDashboardSummary() {
    return request(() =>
      http.get("/api/dashboard/summary")
    );
  },

  // =====================================
  // AI SUGGESTIONS
  // =====================================

  analyseTicket(ticketId) {
    return request(() =>
      http.post(`/api/tickets/${ticketId}/ai-analysis`)
    );
  },

  getAISuggestions(ticketId) {
    return request(() =>
      http.get(`/api/tickets/${ticketId}/ai-suggestions`)
    );
  },

  // =====================================
  // AI FEEDBACK
  // =====================================

  submitAIFeedback(suggestionId, payload) {
    return request(() =>
      http.post(
        `/api/ai-suggestions/${suggestionId}/feedback`,
        payload
      )
    );
  },
};
