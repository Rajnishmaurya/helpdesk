-- =====================================================================
-- schema.sql : creates the 5 helpdesk tables in PostgreSQL
-- Run in pgAdmin: select the "helpdesk" database > Query Tool > open this file > Execute (F5)
-- WARNING: the DROP lines delete existing tables and data. Use on dev machines only.
-- =====================================================================

-- Drop in reverse dependency order so foreign keys don't block the drop
DROP TABLE IF EXISTS ai_feedback      CASCADE;
DROP TABLE IF EXISTS ai_suggestions   CASCADE;
DROP TABLE IF EXISTS ticket_activity  CASCADE;
DROP TABLE IF EXISTS tickets          CASCADE;
DROP TABLE IF EXISTS requesters       CASCADE;

-- ---------------------------------------------------------------------
-- 1. requesters: employees who raise tickets
-- ---------------------------------------------------------------------
CREATE TABLE requesters (
    id            SERIAL PRIMARY KEY,                    -- auto-increment ID
    display_name  VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,          -- no two employees share an email
    department    VARCHAR(100),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 2. tickets: category and priority here are the HUMAN-CONFIRMED values.
--    The AI's proposal is stored separately in ai_suggestions.
-- ---------------------------------------------------------------------
CREATE TABLE tickets (
    id            SERIAL PRIMARY KEY,
    requester_id  INTEGER      NOT NULL REFERENCES requesters(id),   -- must point at a real employee
    title         VARCHAR(150) NOT NULL CHECK (length(title) >= 5),
    description   TEXT         NOT NULL CHECK (length(description) >= 10),
    -- NULL means "not set yet"; otherwise only these values are allowed
    category      VARCHAR(20)  CHECK (category IN ('Hardware','Software','Network','Access','Other')),
    priority      VARCHAR(10)  CHECK (priority IN ('Low','Medium','High')),
    status        VARCHAR(20)  NOT NULL DEFAULT 'New'
                               CHECK (status IN ('New','In Progress','Resolved')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 3. ticket_activity: append-only history (status changes, notes, feedback)
-- ---------------------------------------------------------------------
CREATE TABLE ticket_activity (
    id           SERIAL PRIMARY KEY,
    ticket_id    INTEGER     NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    action_type  VARCHAR(30) NOT NULL CHECK (action_type IN
                 ('created','status_change','priority_change','field_update','comment','ai_feedback')),
    old_value    VARCHAR(100),          -- e.g. 'New'          (NULL when not a change)
    new_value    VARCHAR(100),          -- e.g. 'In Progress'
    note         TEXT,                  -- support comment text, if any
    actor        VARCHAR(100) NOT NULL, -- who did it, e.g. 'support' or the employee's name
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 4. ai_suggestions: what the model proposed. Never overwrites the ticket.
-- ---------------------------------------------------------------------
CREATE TABLE ai_suggestions (
    id                     SERIAL PRIMARY KEY,
    ticket_id              INTEGER     NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    suggested_category     VARCHAR(20) NOT NULL
                           CHECK (suggested_category IN ('Hardware','Software','Network','Access','Other')),
    suggested_priority     VARCHAR(10) NOT NULL
                           CHECK (suggested_priority IN ('Low','Medium','High')),
    priority_reason        TEXT        NOT NULL,
    troubleshooting_steps  JSONB       NOT NULL,   -- JSON array of strings, e.g. ["Check cable", "Restart"]
    model_name             VARCHAR(100) NOT NULL,  -- which model produced it (useful for the report)
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 5. ai_feedback: the support analyst's decision on a suggestion
-- ---------------------------------------------------------------------
CREATE TABLE ai_feedback (
    id              SERIAL PRIMARY KEY,
    suggestion_id   INTEGER NOT NULL UNIQUE REFERENCES ai_suggestions(id) ON DELETE CASCADE, -- one review per suggestion
    ticket_id       INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    accepted        BOOLEAN NOT NULL,          -- true = took the AI values as they were
    useful          BOOLEAN NOT NULL,          -- analyst's rating of the suggestion
    final_category  VARCHAR(20) NOT NULL
                    CHECK (final_category IN ('Hardware','Software','Network','Access','Other')),
    final_priority  VARCHAR(10) NOT NULL CHECK (final_priority IN ('Low','Medium','High')),
    comment         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes on the columns we filter and join on most often
CREATE INDEX idx_tickets_requester   ON tickets(requester_id);
CREATE INDEX idx_tickets_status      ON tickets(status);
CREATE INDEX idx_activity_ticket     ON ticket_activity(ticket_id);
CREATE INDEX idx_suggestions_ticket  ON ai_suggestions(ticket_id);
