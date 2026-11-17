export const initialTickets = [
  {
    id: 1001,
    title: "Laptop is not connecting to Wi-Fi",
    description: "My office laptop cannot connect to the company Wi-Fi network.",
    requester_id: 1,
    requester_name: "Ravi Kumar",
    department: "Engineering",
    category: "Network",
    priority: "High",
    status: "New",
    created_at: "2026-11-15T09:30:00",
    updated_at: "2026-11-15T09:30:00",
    comments: [],
    history: [
      {
        id: 1,
        action_type: "created",
        note: "Ticket created",
        actor: "Ravi Kumar",
        created_at: "2026-11-15T09:30:00",
      },
    ],
    aiSuggestion: null,
  },
  {
    id: 1002,
    title: "Unable to access payroll portal",
    description: "The payroll portal displays an access denied message.",
    requester_id: 2,
    requester_name: "Priya Sharma",
    department: "Finance",
    category: "Access",
    priority: "Medium",
    status: "In Progress",
    created_at: "2026-11-14T11:00:00",
    updated_at: "2026-11-15T10:00:00",
    comments: [
      {
        id: 1,
        author: "Support Analyst",
        message: "We are checking your account permissions.",
        created_at: "2026-11-15T10:00:00",
      },
    ],
    history: [
      {
        id: 1,
        action_type: "created",
        note: "Ticket created",
        actor: "Priya Sharma",
        created_at: "2026-11-14T11:00:00",
      },
      {
        id: 2,
        action_type: "status_change",
        old_value: "New",
        new_value: "In Progress",
        actor: "Support Analyst",
        created_at: "2026-11-15T09:45:00",
      },
    ],
    aiSuggestion: null,
  },
  {
    id: 1003,
    title: "Microsoft Teams application crashing",
    description: "Teams closes unexpectedly when I join a meeting.",
    requester_id: 1,
    requester_name: "Ravi Kumar",
    department: "Engineering",
    category: "Software",
    priority: "Low",
    status: "Resolved",
    created_at: "2026-11-12T08:00:00",
    updated_at: "2026-11-13T15:00:00",
    comments: [],
    history: [
      {
        id: 1,
        action_type: "created",
        note: "Ticket created",
        actor: "Ravi Kumar",
        created_at: "2026-11-12T08:00:00",
      },
      {
        id: 2,
        action_type: "status_change",
        old_value: "New",
        new_value: "In Progress",
        actor: "Support Analyst",
        created_at: "2026-11-12T10:00:00",
      },
      {
        id: 3,
        action_type: "status_change",
        old_value: "In Progress",
        new_value: "Resolved",
        actor: "Support Analyst",
        created_at: "2026-11-13T15:00:00",
      },
    ],
    aiSuggestion: null,
  },
];

export const initialRequesters = [
  {
    id: 1,
    display_name: "Ravi Kumar",
    email: "ravi@example.com",
    department: "Engineering",
  },
  {
    id: 2,
    display_name: "Priya Sharma",
    email: "priya@example.com",
    department: "Finance",
  },
];

export const categories = [
  "Hardware",
  "Software",
  "Network",
  "Access",
  "Other",
];

export const priorities = ["Low", "Medium", "High"];

export const statuses = ["New", "In Progress", "Resolved"];