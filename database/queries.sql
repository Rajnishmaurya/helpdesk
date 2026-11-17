-- =====================================================================
-- queries.sql : the SQL the assessment asks you to demonstrate.
-- Run each query in pgAdmin and screenshot the results for docs/.
-- The API (work queue and dashboard) uses the same logic.
-- =====================================================================

-- Q1. JOIN: every ticket with its requester and its latest status change
--     LATERAL lets the sub-query see "t" so it can pick that ticket's newest history row.
SELECT  t.id,
        t.title,
        t.status,
        COALESCE(t.priority, 'Not set') AS priority,
        COALESCE(t.category, 'Not set') AS category,
        r.display_name                  AS requester,
        r.email                         AS requester_email,
        last_change.created_at          AS status_changed_at
FROM    tickets t
JOIN    requesters r ON r.id = t.requester_id
LEFT JOIN LATERAL (
        SELECT a.created_at
        FROM   ticket_activity a
        WHERE  a.ticket_id = t.id
          AND  a.action_type IN ('created', 'status_change')
        ORDER  BY a.created_at DESC
        LIMIT  1
) AS last_change ON true
ORDER BY t.created_at DESC;

-- Q2. AGGREGATE: ticket count per status (dashboard)
SELECT  status, COUNT(*) AS ticket_count
FROM    tickets
GROUP BY status
ORDER BY status;

-- Q3. AGGREGATE: ticket count per priority, showing unset priority as 'Not set' (dashboard)
SELECT  COALESCE(priority, 'Not set') AS priority, COUNT(*) AS ticket_count
FROM    tickets
GROUP BY COALESCE(priority, 'Not set')
ORDER BY priority;

-- Q4. JOIN: AI suggestion next to the analyst's decision (shows human oversight)
SELECT  t.id                 AS ticket_id,
        t.title,
        s.suggested_category,
        s.suggested_priority,
        f.final_category,
        f.final_priority,
        f.accepted,
        f.useful
FROM    ai_suggestions s
JOIN    tickets t          ON t.id = s.ticket_id
LEFT JOIN ai_feedback f    ON f.suggestion_id = s.id   -- LEFT: suggestions not yet reviewed still appear
ORDER BY s.created_at DESC;
