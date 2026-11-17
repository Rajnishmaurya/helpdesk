-- =====================================================================
-- seed.sql : realistic, FICTIONAL test data. Safe to run again and again.
-- Run after schema.sql (pgAdmin > Query Tool > open > Execute).
-- =====================================================================

-- Empty all tables and reset IDs to 1, so the IDs below are predictable
TRUNCATE ai_feedback, ai_suggestions, ticket_activity, tickets, requesters RESTART IDENTITY CASCADE;

-- Employees (IDs become 1..5)
INSERT INTO requesters (display_name, email, department) VALUES
  ('Asha Menon',    'asha.menon@example.com',    'Finance'),
  ('Rahul Verma',   'rahul.verma@example.com',   'Sales'),
  ('Priya Nair',    'priya.nair@example.com',    'Human Resources'),
  ('Karan Singh',   'karan.singh@example.com',   'Operations'),
  ('Meera Iyer',    'meera.iyer@example.com',    'Marketing');

-- Tickets (IDs become 1..8). Mix of statuses; some not yet categorised.
-- "now() - interval" makes the dates look recent whenever you run the seed.
INSERT INTO tickets (requester_id, title, description, category, priority, status, created_at, updated_at) VALUES
  (1, 'Wireless keyboard not typing',            'My wireless keyboard stopped responding this morning. The mouse still works.',              'Hardware', 'Low',    'New',         now() - interval '2 hours', now() - interval '2 hours'),
  (2, 'Shared drive unavailable for Sales team', 'Nobody in Sales can open the shared drive since 9 am. We cannot access client proposals.',  'Network',  'High',   'In Progress', now() - interval '5 hours', now() - interval '4 hours'),
  (3, 'Cannot log in to HR portal',              'The HR portal says my account is locked after I reset my password yesterday.',             'Access',   'Medium', 'In Progress', now() - interval '1 day',   now() - interval '20 hours'),
  (4, 'Excel crashes when opening reports',      'Excel closes without an error whenever I open the monthly operations report file.',       'Software', 'Medium', 'Resolved',    now() - interval '3 days',  now() - interval '2 days'),
  (5, 'Laptop battery drains very fast',         'The laptop battery goes from full to empty in about one hour, even with light use.',      NULL,       NULL,     'New',         now() - interval '30 minutes', now() - interval '30 minutes'),
  (1, 'VPN disconnects every few minutes',       'When working from home the VPN drops every 5 to 10 minutes and I lose my session.',       'Network',  'Medium', 'Resolved',    now() - interval '6 days',  now() - interval '5 days'),
  (2, 'Request access to CRM reports',           'I need read access to the CRM quarterly reports folder for the sales review.',            'Access',   'Low',    'New',         now() - interval '1 hour',  now() - interval '1 hour'),
  (3, 'Printer on floor 2 shows paper jam',      'The floor 2 printer shows a paper jam but there is no paper stuck inside.',               NULL,       NULL,     'New',         now() - interval '10 minutes', now() - interval '10 minutes');

-- History: every ticket gets a 'created' row; worked tickets get status changes and notes
INSERT INTO ticket_activity (ticket_id, action_type, old_value, new_value, note, actor, created_at) VALUES
  (1, 'created',       NULL,          'New',         NULL, 'Asha Menon',  now() - interval '2 hours'),
  (2, 'created',       NULL,          'New',         NULL, 'Rahul Verma', now() - interval '5 hours'),
  (2, 'status_change', 'New',         'In Progress', 'Investigating file server connectivity.', 'support', now() - interval '4 hours'),
  (3, 'created',       NULL,          'New',         NULL, 'Priya Nair',  now() - interval '1 day'),
  (3, 'status_change', 'New',         'In Progress', NULL, 'support', now() - interval '20 hours'),
  (3, 'comment',       NULL,          NULL,          'Account unlock requested from identity team.', 'support', now() - interval '19 hours'),
  (4, 'created',       NULL,          'New',         NULL, 'Karan Singh', now() - interval '3 days'),
  (4, 'status_change', 'New',         'In Progress', NULL, 'support', now() - interval '3 days'),
  (4, 'status_change', 'In Progress', 'Resolved',    'Repaired Office installation; report opens normally.', 'support', now() - interval '2 days'),
  (5, 'created',       NULL,          'New',         NULL, 'Meera Iyer',  now() - interval '30 minutes'),
  (6, 'created',       NULL,          'New',         NULL, 'Asha Menon',  now() - interval '6 days'),
  (6, 'status_change', 'New',         'In Progress', NULL, 'support', now() - interval '6 days'),
  (6, 'status_change', 'In Progress', 'Resolved',    'Updated VPN client to the latest version.', 'support', now() - interval '5 days'),
  (7, 'created',       NULL,          'New',         NULL, 'Rahul Verma', now() - interval '1 hour'),
  (8, 'created',       NULL,          'New',         NULL, 'Priya Nair',  now() - interval '10 minutes');

-- One AI suggestion that support corrected (shows the human-correction data, Scenario 03)
INSERT INTO ai_suggestions (ticket_id, suggested_category, suggested_priority, priority_reason, troubleshooting_steps, model_name, created_at) VALUES
  (3, 'Software', 'Low', 'Affects a single user and has a workaround.',
   '["Confirm the user is entering the new password", "Clear browser cache and cookies", "Check whether the account is locked in the identity system"]',
   'seed-data', now() - interval '21 hours');

INSERT INTO ai_feedback (suggestion_id, ticket_id, accepted, useful, final_category, final_priority, comment, created_at) VALUES
  (1, 3, false, true, 'Access', 'Medium', 'Locked account is an access issue; employee cannot do payroll tasks.', now() - interval '20 hours');

INSERT INTO ticket_activity (ticket_id, action_type, old_value, new_value, note, actor, created_at) VALUES
  (3, 'ai_feedback', 'Software / Low', 'Access / Medium', 'AI suggestion corrected by support.', 'support', now() - interval '20 hours');
