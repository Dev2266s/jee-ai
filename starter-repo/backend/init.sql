-- JEE AI Platform Database Schema
-- Run on PostgreSQL 16+

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- ============ USERS ============
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    target_exam VARCHAR(20) DEFAULT 'BOTH',
    target_year INTEGER DEFAULT 2025,
    target_rank INTEGER DEFAULT 5000,
    hours_per_week DECIMAL(4,1) DEFAULT 18.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    subscription_tier VARCHAR(20) DEFAULT 'free'
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);

-- ============ SYLLABUS & CONTENT ============
CREATE TABLE subjects (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    display_order INTEGER DEFAULT 0
);

INSERT INTO subjects (id, name, display_order) VALUES
('Physics', 'Physics', 1),
('Chemistry', 'Chemistry', 2),
('Mathematics', 'Mathematics', 3);

CREATE TABLE categories (
    id VARCHAR(50) PRIMARY KEY,
    subject_id VARCHAR(50) REFERENCES subjects(id),
    name VARCHAR(100) NOT NULL,
    display_order INTEGER DEFAULT 0
);

CREATE TABLE topics (
    id VARCHAR(100) PRIMARY KEY,
    category_id VARCHAR(50) REFERENCES categories(id),
    subject_id VARCHAR(50) REFERENCES subjects(id),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    weight_main INTEGER DEFAULT 5,
    weight_adv INTEGER DEFAULT 5,
    estimated_hours DECIMAL(4,1) DEFAULT 5.0,
    difficulty_level INTEGER DEFAULT 3,
    is_adv_only BOOLEAN DEFAULT FALSE,
    prerequisites TEXT[], -- array of topic_ids
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_topics_subject ON topics(subject_id);
CREATE INDEX idx_topics_category ON topics(category_id);

CREATE TABLE questions (
    id VARCHAR(100) PRIMARY KEY,
    topic_id VARCHAR(100) REFERENCES topics(id),
    subtopic VARCHAR(200),
    question_type VARCHAR(30) NOT NULL, -- MCQ_SINGLE, MCQ_MULTIPLE, INTEGER, NUMERICAL
    difficulty INTEGER DEFAULT 3, -- 1-5
    text TEXT NOT NULL,
    options JSONB DEFAULT '[]',
    answer JSONB NOT NULL,
    hints JSONB DEFAULT '[]',
    explanation TEXT,
    irt_a DECIMAL(4,3) DEFAULT 1.0,
    irt_b DECIMAL(4,3) DEFAULT 0.0,
    irt_c DECIMAL(4,3) DEFAULT 0.2,
    tags TEXT[],
    source VARCHAR(200),
    year INTEGER,
    exam_type VARCHAR(20),
    time_limit_seconds INTEGER DEFAULT 120,
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_questions_topic ON questions(topic_id);
CREATE INDEX idx_questions_type ON questions(question_type);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_tags ON questions USING GIN(tags);

-- ============ STUDENT MODEL ============
CREATE TABLE student_mastery (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    topic_id VARCHAR(100) REFERENCES topics(id) ON DELETE CASCADE,
    -- IRT parameters
    theta DECIMAL(6,4) DEFAULT 0.0,
    theta_se DECIMAL(6,4) DEFAULT 1.0,
    -- BKT parameters
    p_known DECIMAL(4,3) DEFAULT 0.0,
    p_learn DECIMAL(4,3) DEFAULT 0.3,
    p_slip DECIMAL(4,3) DEFAULT 0.1,
    p_guess DECIMAL(4,3) DEFAULT 0.25,
    -- Spaced Repetition (SM-2)
    next_review TIMESTAMPTZ DEFAULT NOW(),
    interval_days DECIMAL(6,2) DEFAULT 1.0,
    ease_factor DECIMAL(3,2) DEFAULT 2.5,
    lapses INTEGER DEFAULT 0,
    -- Activity tracking
    last_practiced TIMESTAMPTZ,
    sessions_this_week INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    confidence_self_report DECIMAL(2,1) DEFAULT 3.0,
    -- Metadata
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, topic_id)
);

CREATE INDEX idx_student_mastery_user ON student_mastery(user_id);
CREATE INDEX idx_student_mastery_next_review ON student_mastery(next_review);
CREATE INDEX idx_student_mastery_theta ON student_mastery(theta);

-- ============ INTERACTIONS ============
CREATE TABLE attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id VARCHAR(100) REFERENCES questions(id),
    topic_id VARCHAR(100) REFERENCES topics(id),
    correct BOOLEAN NOT NULL,
    response_time_ms INTEGER NOT NULL,
    confidence INTEGER CHECK (confidence BETWEEN 1 AND 5),
    hints_used INTEGER DEFAULT 0,
    user_answer JSONB,
    mistake_type VARCHAR(30), -- CONCEPTUAL_GAP, CARELESS, TIME_PRESSURE, FORMULA_RECALL, MISREAD_QUESTION, TRAP_FALLING
    session_id UUID,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attempts_user ON attempts(user_id);
CREATE INDEX idx_attempts_topic ON attempts(topic_id);
CREATE INDEX idx_attempts_timestamp ON attempts(timestamp);
CREATE INDEX idx_attempts_session ON attempts(session_id);

CREATE TABLE study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    planned_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    topics_covered TEXT[],
    questions_attempted INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    hints_used INTEGER DEFAULT 0,
    session_type VARCHAR(30), -- PRACTICE, MOCK, SPACED_REP, REVIEW
    mood_rating INTEGER CHECK (mood_rating BETWEEN 1 AND 5),
    focus_rating INTEGER CHECK (focus_rating BETWEEN 1 AND 5),
    notes TEXT
);

CREATE INDEX idx_sessions_user ON study_sessions(user_id);
CREATE INDEX idx_sessions_started ON study_sessions(started_at);

-- ============ MOCK TESTS ============
CREATE TABLE mock_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    test_name VARCHAR(200),
    exam_type VARCHAR(20), -- MAIN, ADV_PAPER1, ADV_PAPER2
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    total_questions INTEGER,
    attempted INTEGER DEFAULT 0,
    correct INTEGER DEFAULT 0,
    incorrect INTEGER DEFAULT 0,
    unanswered INTEGER DEFAULT 0,
    score DECIMAL(8,2),
    percentile DECIMAL(5,2),
    time_taken_minutes INTEGER,
    subject_scores JSONB,
    mistake_breakdown JSONB
);

CREATE INDEX idx_mock_tests_user ON mock_tests(user_id);
CREATE INDEX idx_mock_tests_completed ON mock_tests(completed_at);

-- ============ AI TUTOR ============
CREATE TABLE tutor_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    context JSONB DEFAULT '{}',
    message_count INTEGER DEFAULT 0,
    resolution_rate DECIMAL(4,3),
    satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5)
);

CREATE TABLE tutor_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES tutor_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- user, assistant, tool
    content TEXT NOT NULL,
    layer VARCHAR(20), -- instant, deep, human
    tool_calls JSONB,
    tokens_used INTEGER,
    latency_ms INTEGER,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tutor_messages_conv ON tutor_messages(conversation_id);
CREATE INDEX idx_tutor_messages_timestamp ON tutor_messages(timestamp);

-- ============ SPACED REPETITION QUEUE ============
CREATE TABLE spaced_rep_queue (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    topic_id VARCHAR(100) REFERENCES topics(id) ON DELETE CASCADE,
    due_at TIMESTAMPTZ NOT NULL,
    priority INTEGER DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, topic_id)
);

CREATE INDEX idx_spaced_rep_due ON spaced_rep_queue(due_at);
CREATE INDEX idx_spaced_rep_user ON spaced_rep_queue(user_id);

-- ============ FORMULAS & REFERENCE ============
CREATE TABLE formulas (
    id VARCHAR(100) PRIMARY KEY,
    topic_id VARCHAR(100) REFERENCES topics(id),
    name VARCHAR(200) NOT NULL,
    formula_latex TEXT NOT NULL,
    formula_text TEXT,
    description TEXT,
    subject VARCHAR(50),
    category VARCHAR(100),
    tags TEXT[],
    is_verified BOOLEAN DEFAULT TRUE,
    source VARCHAR(200)
);

CREATE INDEX idx_formulas_topic ON formulas(topic_id);
CREATE INDEX idx_formulas_subject ON formulas(subject);
CREATE INDEX idx_formulas_tags ON formulas USING GIN(tags);

-- ============ ANALYTICS VIEWS ============
CREATE VIEW user_topic_summary AS
SELECT
    sm.user_id,
    sm.topic_id,
    t.name AS topic_name,
    t.subject,
    t.category,
    sm.theta,
    sm.theta_se,
    sm.p_known,
    sm.next_review,
    sm.interval_days,
    sm.ease_factor,
    sm.lapses,
    sm.last_practiced,
    sm.sessions_this_week,
    sm.streak_days,
    CASE
        WHEN sm.theta < 0.5 THEN 'critical'
        WHEN sm.theta < 1.0 THEN 'weak'
        WHEN sm.theta < 1.5 THEN 'developing'
        WHEN sm.theta < 2.0 THEN 'strong'
        ELSE 'mastered'
    END AS mastery_level
FROM student_mastery sm
JOIN topics t ON sm.topic_id = t.id;

CREATE VIEW user_subject_summary AS
SELECT
    sm.user_id,
    t.subject,
    COUNT(*) AS topic_count,
    AVG(sm.theta) AS avg_theta,
    AVG(sm.theta_se) AS avg_theta_se,
    AVG(sm.p_known) AS avg_p_known,
    COUNT(*) FILTER (WHERE sm.theta < 0.5) AS critical_count,
    COUNT(*) FILTER (WHERE sm.theta >= 2.0) AS mastered_count
FROM student_mastery sm
JOIN topics t ON sm.topic_id = t.id
GROUP BY sm.user_id, t.subject;

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_student_mastery_updated_at BEFORE UPDATE ON student_mastery
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============ RLS POLICIES (for production) ============
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
-- Similar policies for all user-scoped tables