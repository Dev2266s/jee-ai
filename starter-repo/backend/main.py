"""
JEE AI Backend — Local/Personal Version
No external DB, no licensing, runs entirely in-memory with SQLite fallback.
Generates synthetic question bank on first run.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import uuid
import json
import math
import random
import os
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path

# ============ ENUMS & MODELS ============
class ExamType(str, Enum):
    MAIN = "MAIN"
    ADV = "ADV"
    BOTH = "BOTH"

class QuestionType(str, Enum):
    MCQ_SINGLE = "MCQ_SINGLE"
    MCQ_MULTIPLE = "MCQ_MULTIPLE"
    INTEGER = "INTEGER"
    NUMERICAL = "NUMERICAL"

class MistakeType(str, Enum):
    CONCEPTUAL_GAP = "CONCEPTUAL_GAP"
    CARELESS = "CARELESS"
    TIME_PRESSURE = "TIME_PRESSURE"
    FORMULA_RECALL = "FORMULA_RECALL"
    MISREAD_QUESTION = "MISREAD_QUESTION"
    TRAP_FALLING = "TRAP_FALLING"

class MasteryState(BaseModel):
    theta: float = 0.0
    theta_se: float = 1.0
    p_known: float = 0.0
    p_learn: float = 0.3
    p_slip: float = 0.1
    p_guess: float = 0.25
    next_review: datetime = Field(default_factory=datetime.now)
    interval_days: float = 1.0
    ease_factor: float = 2.5
    lapses: int = 0
    last_practiced: Optional[datetime] = None
    sessions_this_week: int = 0
    streak_days: int = 0
    confidence_self_report: float = 3.0

class TopicMastery(BaseModel):
    topic_id: str
    subject: str
    category: str
    mastery: MasteryState = Field(default_factory=MasteryState)
    weight_main: int = 5
    weight_adv: int = 5
    prerequisites: List[str] = []

class Question(BaseModel):
    id: str
    topic_id: str
    subtopic: str
    subject: str
    type: QuestionType
    difficulty: int
    text: str
    options: List[Dict[str, str]] = []
    answer: Any
    hints: List[str] = []
    explanation: str
    irt_params: Dict[str, float] = {"a": 1.0, "b": 0.0, "c": 0.2}
    tags: List[str] = []
    source: str = ""
    time_limit: int = 120

class Attempt(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    question_id: str
    topic_id: str
    correct: bool
    response_time_ms: int
    confidence: int
    hints_used: int
    user_answer: Any
    mistake_type: Optional[MistakeType] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class StudentModel(BaseModel):
    user_id: str
    target_exam: ExamType = ExamType.BOTH
    target_year: int = 2025
    topic_mastery: Dict[str, TopicMastery] = {}
    problem_solving_ability: float = 0.5
    calculation_speed: float = 1.0
    conceptual_depth: float = 0.5
    learning_velocity: float = 0.15
    optimal_difficulty: float = 0.0
    target_rank: int = 5000
    hours_per_week: float = 18.0
    weak_chapters: List[str] = []
    streak_days: int = 0
    last_active: datetime = Field(default_factory=datetime.now)
    total_study_hours: float = 0.0

class NextQuestionRequest(BaseModel):
    user_id: str
    topic_ids: Optional[List[str]] = None
    count: int = 1
    mode: str = "targeted"
    time_budget_minutes: Optional[int] = None
    difficulty_preference: str = "targeted"

class TutorRequest(BaseModel):
    user_id: str
    message: str
    context: Dict[str, Any] = {}

class RankPrediction(BaseModel):
    median_rank: int
    p10_rank: int
    p90_rank: int
    percentile: float
    confidence: str
    key_drivers: List[Dict[str, Any]]
    what_if: List[Dict[str, Any]]

# ============ DATA LOADING ============
DATA_DIR = Path(__file__).parent.parent / "data"

def load_json(filename: str) -> Any:
    path = DATA_DIR / filename
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return None

SYLLABUS_DATA = load_json("jee_syllabus.json") or []
FORMULAS_DATA = load_json("formulas.json") or {"formulas": {}, "traps": {}, "patterns": {}}
QUESTIONS_DATA = load_json("questions.json") or []
GENERATED_QUESTIONS = load_json("questions_generated.json") or []

# Merge questions
ALL_QUESTIONS_RAW = QUESTIONS_DATA + GENERATED_QUESTIONS

SYLLABUS = {t["id"]: t for t in SYLLABUS_DATA}
QUESTIONS = [Question(**q) for q in ALL_QUESTIONS_RAW]
TOPIC_MAP = {t.topic_id: t for t in SYLLABUS.values()}
QUESTION_MAP = {q.id: q for q in QUESTIONS}

print(f"Loaded {len(SYLLABUS)} topics, {len(QUESTIONS)} questions")

# If no generated questions, create them
if not GENERATED_QUESTIONS:
    print("Generating synthetic question bank...")
    import local_data
    local_data.main()
    # Reload
    GENERATED_QUESTIONS = load_json("questions_generated.json") or []
    QUESTIONS = [Question(**q) for q in (QUESTIONS_DATA + GENERATED_QUESTIONS)]
    QUESTION_MAP = {q.id: q for q in QUESTIONS}
    print(f"Now have {len(QUESTIONS)} questions")

# ============ LOCAL STORAGE (SQLite) ============
DB_PATH = Path(__file__).parent / "jee_local.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS student_mastery (
            user_id TEXT,
            topic_id TEXT,
            theta REAL DEFAULT 0,
            theta_se REAL DEFAULT 1,
            p_known REAL DEFAULT 0,
            p_learn REAL DEFAULT 0.3,
            p_slip REAL DEFAULT 0.1,
            p_guess REAL DEFAULT 0.25,
            next_review TEXT,
            interval_days REAL DEFAULT 1,
            ease_factor REAL DEFAULT 2.5,
            lapses INTEGER DEFAULT 0,
            last_practiced TEXT,
            sessions_this_week INTEGER DEFAULT 0,
            streak_days INTEGER DEFAULT 0,
            confidence_self_report REAL DEFAULT 3,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, topic_id)
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS attempts (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            question_id TEXT,
            topic_id TEXT,
            correct INTEGER,
            response_time_ms INTEGER,
            confidence INTEGER,
            hints_used INTEGER,
            user_answer TEXT,
            mistake_type TEXT,
            timestamp TEXT
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS user_profile (
            user_id TEXT PRIMARY KEY,
            target_exam TEXT DEFAULT 'BOTH',
            target_year INTEGER DEFAULT 2025,
            target_rank INTEGER DEFAULT 5000,
            hours_per_week REAL DEFAULT 18,
            streak_days INTEGER DEFAULT 0,
            total_study_hours REAL DEFAULT 0,
            last_active TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ============ STUDENT MODEL LOGIC ============
def get_student_model(user_id: str) -> StudentModel:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Get profile
    c.execute("SELECT * FROM user_profile WHERE user_id=?", (user_id,))
    profile = c.fetchone()

    if not profile:
        # Create default profile
        c.execute("""INSERT INTO user_profile (user_id, last_active) VALUES (?, ?)""",
                  (user_id, datetime.now().isoformat()))
        conn.commit()
        profile = (user_id, 'BOTH', 2025, 5000, 18.0, 0, 0.0, datetime.now().isoformat())

    student = StudentModel(
        user_id=user_id,
        target_exam=ExamType(profile[1]),
        target_year=profile[2],
        target_rank=profile[3],
        hours_per_week=profile[4],
        streak_days=profile[5],
        total_study_hours=profile[6],
        last_active=datetime.fromisoformat(profile[7])
    )

    # Load topic mastery
    c.execute("SELECT * FROM student_mastery WHERE user_id=?", (user_id,))
    rows = c.fetchall()

    for topic in SYLLABUS.values():
        tm = TopicMastery(
            topic_id=topic["id"],
            subject=topic["subject"],
            category=topic["category"],
            weight_main=topic.get("weight_main", 5),
            weight_adv=topic.get("weight_adv", 5),
            prerequisites=topic.get("prerequisites", [])
        )
        # Find saved state
        for row in rows:
            if row[1] == topic["id"]:
                tm.mastery = MasteryState(
                    theta=row[2], theta_se=row[3], p_known=row[4],
                    p_learn=row[5], p_slip=row[6], p_guess=row[7],
                    next_review=datetime.fromisoformat(row[8]) if row[8] else datetime.now(),
                    interval_days=row[9], ease_factor=row[10], lapses=row[11],
                    last_practiced=datetime.fromisoformat(row[12]) if row[12] else None,
                    sessions_this_week=row[13], streak_days=row[14],
                    confidence_self_report=row[15]
                )
                break
        # Initialize with some variance if new
        if tm.mastery.theta == 0 and tm.mastery.theta_se == 1:
            tm.mastery.theta = random.uniform(-0.5, 1.8)
            tm.mastery.theta_se = random.uniform(0.15, 0.4)
            tm.mastery.p_known = 1 / (1 + math.exp(-tm.mastery.theta))
            tm.mastery.next_review = datetime.now() + timedelta(days=random.randint(-5, 15))
            tm.mastery.interval_days = random.uniform(1, 30)
            tm.mastery.ease_factor = random.uniform(2.0, 2.7)
            tm.mastery.lapses = random.randint(0, 3)

        student.topic_mastery[topic["id"]] = tm

    # Set weak chapters based on lowest theta
    sorted_topics = sorted(student.topic_mastery.values(), key=lambda t: t.mastery.theta)
    student.weak_chapters = [t.topic_id for t in sorted_topics[:5]]

    conn.close()
    return student

def save_student_model(student: StudentModel):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Save profile
    c.execute("""INSERT OR REPLACE INTO user_profile
                 (user_id, target_exam, target_year, target_rank, hours_per_week,
                  streak_days, total_study_hours, last_active)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
              (student.user_id, student.target_exam.value, student.target_year,
               student.target_rank, student.hours_per_week, student.streak_days,
               student.total_study_hours, datetime.now().isoformat()))

    # Save topic mastery
    for tm in student.topic_mastery.values():
        m = tm.mastery
        c.execute("""INSERT OR REPLACE INTO student_mastery
                     (user_id, topic_id, theta, theta_se, p_known, p_learn, p_slip, p_guess,
                      next_review, interval_days, ease_factor, lapses, last_practiced,
                      sessions_this_week, streak_days, confidence_self_report, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                  (student.user_id, tm.topic_id, m.theta, m.theta_se, m.p_known,
                   m.p_learn, m.p_slip, m.p_guess, m.next_review.isoformat(),
                   m.interval_days, m.ease_factor, m.lapses,
                   m.last_practiced.isoformat() if m.last_practiced else None,
                   m.sessions_this_week, m.streak_days, m.confidence_self_report,
                   datetime.now().isoformat()))
    conn.commit()
    conn.close()

def save_attempt(attempt: Attempt):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""INSERT INTO attempts
                 (id, user_id, question_id, topic_id, correct, response_time_ms,
                  confidence, hints_used, user_answer, mistake_type, timestamp)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
              (attempt.id, attempt.user_id, attempt.question_id, attempt.topic_id,
               int(attempt.correct), attempt.response_time_ms, attempt.confidence,
               attempt.hints_used, json.dumps(attempt.user_answer),
               attempt.mistake_type.value if attempt.mistake_type else None,
               attempt.timestamp.isoformat()))
    conn.commit()
    conn.close()

def update_mastery(student: StudentModel, attempt: Attempt) -> StudentModel:
    topic = student.topic_mastery.get(attempt.topic_id)
    if not topic:
        return student

    q = QUESTION_MAP.get(attempt.question_id)
    if not q:
        return student

    a, b, c = q.irt_params["a"], q.irt_params["b"], q.irt_params["c"]
    theta = topic.mastery.theta

    # IRT 3PL update
    p_correct = c + (1 - c) / (1 + math.exp(-a * (theta - b)))
    info = (a ** 2) * p_correct * (1 - p_correct) / ((1 - c) ** 2) if c < 1 else 0

    lr = min(0.3, info * 0.5)
    if attempt.correct:
        topic.mastery.theta += lr * (1 - p_correct)
    else:
        topic.mastery.theta -= lr * p_correct

    topic.mastery.theta = max(-3, min(3, topic.mastery.theta))
    topic.mastery.theta_se = max(0.1, 1 / math.sqrt(max(1, 1/topic.mastery.theta_se**2 + info)))
    topic.mastery.p_known = 1 / (1 + math.exp(-topic.mastery.theta))

    # Spaced Repetition (SM-2)
    if attempt.correct:
        if topic.mastery.lapses == 0:
            topic.mastery.interval_days = 1 if topic.mastery.interval_days < 1 else topic.mastery.interval_days * topic.mastery.ease_factor
        else:
            topic.mastery.interval_days *= topic.mastery.ease_factor
        topic.mastery.ease_factor = max(1.3, topic.mastery.ease_factor + 0.1 - 0.08 * (5 - attempt.confidence))
    else:
        topic.mastery.lapses += 1
        topic.mastery.interval_days = 1
        topic.mastery.ease_factor = max(1.3, topic.mastery.ease_factor - 0.2)

    topic.mastery.next_review = datetime.now() + timedelta(days=topic.mastery.interval_days)
    topic.mastery.last_practiced = datetime.now()
    topic.mastery.sessions_this_week += 1

    # Prerequisite propagation
    for prereq_id in topic.prerequisites:
        if prereq_id in student.topic_mastery:
            prereq = student.topic_mastery[prereq_id]
            if prereq.mastery.theta < topic.mastery.theta - 0.5:
                prereq.mastery.theta += 0.1 * (topic.mastery.theta - prereq.mastery.theta)

    return student

# ============ RECOMMENDER ============
def recommend_questions(student: StudentModel, req: NextQuestionRequest) -> List[Dict]:
    candidates = []

    for q in QUESTIONS:
        if req.topic_ids and q.topic_id not in req.topic_ids:
            continue

        topic = student.topic_mastery.get(q.topic_id)
        if not topic:
            continue

        theta = topic.mastery.theta
        se = topic.mastery.theta_se

        # 1. Information Gain (Fisher)
        a, b, c = q.irt_params["a"], q.irt_params["b"], q.irt_params["c"]
        p = c + (1 - c) / (1 + math.exp(-a * (theta - b)))
        info = (a ** 2) * p * (1 - p) / ((1 - c) ** 2) if c < 1 else 0
        info_gain = info * se

        # 2. Spacing Urgency
        days_overdue = (datetime.now() - topic.mastery.next_review).days
        spacing_urgency = max(0, min(1, days_overdue / 30))

        # 3. Prerequisite Readiness
        prereq_ready = 1.0
        for prereq_id in topic.prerequisites:
            if prereq_id in student.topic_mastery:
                prereq_ready *= student.topic_mastery[prereq_id].mastery.p_known

        # 4. Exam Relevance
        weight = topic.weight_adv if student.target_exam in [ExamType.ADV, ExamType.BOTH] else topic.weight_main
        exam_relevance = weight / 10.0

        # 5. Variety Bonus
        variety = 1.0

        # 6. Difficulty Match (target p=0.7)
        diff_match = 1 - abs(p - 0.7)

        # 7. Weakness Targeting
        weakness_boost = 1.5 if q.topic_id in student.weak_chapters else 1.0

        score = (
            3.0 * info_gain +
            2.0 * spacing_urgency +
            1.5 * prereq_ready +
            1.5 * exam_relevance +
            1.0 * variety +
            2.0 * diff_match +
            2.0 * weakness_boost
        )

        candidates.append({
            "question": q,
            "score": score,
            "rationale": {
                "info_gain": round(info_gain, 3),
                "spacing_urgency": round(spacing_urgency, 3),
                "prereq_ready": round(prereq_ready, 3),
                "exam_relevance": round(exam_relevance, 3),
                "diff_match": round(diff_match, 3),
                "weakness_boost": weakness_boost
            }
        })

    candidates.sort(key=lambda x: x["score"], reverse=True)
    selected = candidates[:req.count]

    result = []
    for c in selected:
        q = c["question"]
        result.append({
            "id": q.id,
            "topic_id": q.topic_id,
            "subtopic": q.subtopic,
            "subject": q.subject,
            "type": q.type.value,
            "difficulty": q.difficulty,
            "text": q.text,
            "options": q.options,
            "time_limit": q.time_limit,
            "irt_params": q.irt_params,
            "tags": q.tags,
            "selection_rationale": c["rationale"]
        })

    return result

# ============ RANK PREDICTOR ============
def predict_rank(student: StudentModel) -> RankPrediction:
    phys_topics = [t for t in student.topic_mastery.values() if t.subject == "Physics"]
    chem_topics = [t for t in student.topic_mastery.values() if t.subject == "Chemistry"]
    math_topics = [t for t in student.topic_mastery.values() if t.subject == "Mathematics"]

    phys_avg = sum(t.mastery.theta for t in phys_topics) / len(phys_topics) if phys_topics else 0
    chem_avg = sum(t.mastery.theta for t in chem_topics) / len(chem_topics) if chem_topics else 0
    math_avg = sum(t.mastery.theta for t in math_topics) / len(math_topics) if math_topics else 0

    overall_theta = (phys_avg + chem_avg + math_avg) / 3
    base_rank = int(50000 * math.exp(-overall_theta * 1.2))
    base_rank = max(100, min(200000, base_rank))

    se_avg = sum(t.mastery.theta_se for t in student.topic_mastery.values()) / len(student.topic_mastery)
    ci_width = int(base_rank * se_avg * 1.5)

    return RankPrediction(
        median_rank=base_rank,
        p10_rank=max(100, base_rank - ci_width),
        p90_rank=min(200000, base_rank + ci_width),
        percentile=max(0, min(99.9, 100 * (1 - base_rank / 200000))),
        confidence="high" if ci_width < 5000 else "medium" if ci_width < 15000 else "low",
        key_drivers=[
            {"feature": "Physics Mastery", "impact": -int(phys_avg * 3000), "direction": "improves"},
            {"feature": "Chemistry Mastery", "impact": -int(chem_avg * 2500), "direction": "improves"},
            {"feature": "Math Mastery", "impact": -int(math_avg * 3000), "direction": "improves"},
            {"feature": "Careless Error Rate", "impact": 2000, "direction": "worsens"},
            {"feature": "Syllabus Coverage", "impact": -1000, "direction": "improves"},
        ],
        what_if=[
            {"name": "Master Electrostatics", "new_rank": int(base_rank * 0.7), "effort": "High"},
            {"name": "Fix Careless Errors", "new_rank": int(base_rank * 0.8), "effort": "Medium"},
            {"name": "Complete Syllabus", "new_rank": int(base_rank * 0.85), "effort": "High"},
        ]
    )

# ============ TUTOR TOOLS ============
INSTANT_KB = {
    "formulas": FORMULAS_DATA.get("formulas", {}),
    "traps": FORMULAS_DATA.get("traps", {}),
    "patterns": FORMULAS_DATA.get("patterns", {})
}

def instant_resolve(query: str) -> Optional[Dict]:
    query_lower = query.lower()
    for key, data in INSTANT_KB["formulas"].items():
        if key in query_lower or data["name"].lower() in query_lower:
            return {"type": "formula", "key": key, "data": data}
    for key, data in INSTANT_KB["traps"].items():
        if key in query_lower or data["trap"].lower() in query_lower:
            return {"type": "trap", "key": key, "data": data}
    for key, data in INSTANT_KB["patterns"].items():
        if key in query_lower or data["pattern"].lower() in query_lower:
            return {"type": "pattern", "key": key, "data": data}
    return None

DEEP_RESPONSES = {
    "electrostatics": "**Core Issue**: Electrostatics fundamentals.\n\n**Explanation**: Three pillars: Coulomb's Law, Electric Field (superposition), Gauss's Law. Gauss's Law: $\\oint \\vec{E} \\cdot d\\vec{A} = Q_{enc}/\\varepsilon_0$. Most powerful for symmetric distributions.\n\n**JEE Pattern**: Gauss's Law + Symmetry (2019 Main, 2021 Adv, 2023 Main). Point charge at cube center → flux/face = $Q/(6\\varepsilon_0)$.\n\n**Practice**: (1) Point charge at cube center, flux through face? (2) Infinite line charge, field at distance r?\n\n**Self-Check**: Can you derive infinite plane sheet field using Gauss's Law?",
    "integration": "**Core Issue**: Integration technique selection.\n\n**Decision Tree**: 1) Direct formula 2) Substitution (see $f'(x)$) 3) Partial fractions 4) By parts (LIATE) 5) Trig powers 6) Definite properties (King: $\\int_0^a f(x)dx = \\int_0^a f(a-x)dx$)\n\n**JEE Pattern**: King/Queen Property (2019 Main, 2021 Adv, 2022 Main). Classic: $\\int_0^{\\pi/2} \\ln(\\sin x) dx = -\\frac{\\pi}{2}\\ln 2$.\n\n**Practice**: $\\int_0^{\\pi/2} \\frac{dx}{1+\\tan^3 x}$ (King property).\n\n**Self-Check**: When King vs substitution? King: limits 0 to a, f(a-x) simplifies.",
    "organic": "**Core Issue**: Organic mechanism systematic approach.\n\n**Method**: Identify → Draw Arrows → Check Stability → Predict Product. Identify: electrophile, nucleophile, leaving group. Arrows: always nucleophile → electrophile. Stability: 3° > 2° > 1° > methyl. Rearrangements: only if more stable carbocation.\n\n**JEE Pattern**: Multi-step mechanisms (2018 Adv, 2020 Main, 2021 Adv, 2023 Main). Test: stereochemistry, regioselectivity, rearrangements.\n\n**Practice**: Acetone + CH₃MgBr mechanism. Benzaldehyde + Acetophenone + NaOH (crossed aldol).\n\n**Self-Check**: Pinacol rearrangement — which group migrates? (Forms more stable carbocation)",
    "strategy": "**Core Issue**: JEE exam strategy for max marks.\n\n**MAIN (90 min, 75Q, -1 neg)**: Round 1 (45min): easy/medium confident → 45-50Q. Round 2 (30min): moderate. Round 3 (15min): educated guesses. Order: Chem → Math → Physics.\n\n**ADV (3hr×2, 54Q, partial)**: Accuracy > speed. Integer/NNV: attempt ALL (no neg). Match column: solve one row fully. Paragraph: read questions first.\n\n**Universal**: Write own formula sheet. Error log every mistake (classify → fix root). 1 mock/week last 2 months.\n\n**Practice**: 3 timed mocks this week. Tag every wrong Q with mistake type.\n\n**Self-Check**: Integer accuracy in mocks? If <60%, leaving marks.",
    "default": "I'm Arya, your JEE mentor. Ask me about concepts, problem-solving, strategy, weaknesses, formulas, or PYQ patterns.\n\nTry: \"Why does dielectric geometry matter for capacitors?\" or \"Walk me through a Bayes' theorem problem.\""
}

def generate_deep_response(query: str, student: StudentModel) -> str:
    lower = query.lower()
    if any(k in lower for k in ["electrostatic", "gauss", "flux", "coulomb", "dipole", "capacitor"]):
        return DEEP_RESPONSES["electrostatics"]
    if any(k in lower for k in ["integrat", "definite", "king", "by parts", "substitution"]):
        return DEEP_RESPONSES["integration"]
    if any(k in lower for k in ["organic", "mechanism", "reaction", "carbonyl", "aldol", "sn1", "sn2"]):
        return DEEP_RESPONSES["organic"]
    if any(k in lower for k in ["strateg", "time manag", "attempt", "mock", "paper", "exam"]):
        return DEEP_RESPONSES["strategy"]
    return DEEP_RESPONSES["default"]

# ============ FASTAPI APP ============
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(title="JEE AI Local", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ ROUTES ============
@app.get("/health")
async def health():
    return {"status": "ok", "questions": len(QUESTIONS), "topics": len(SYLLABUS)}

@app.post("/api/v1/ai/next-question")
async def next_question(req: NextQuestionRequest):
    student = get_student_model(req.user_id)
    questions = recommend_questions(student, req)
    return {
        "questions": questions,
        "rationale": "Selected based on: information gain, spaced repetition urgency, prerequisite readiness, exam relevance, difficulty match, and weakness targeting."
    }

@app.post("/api/v1/ai/attempt")
async def submit_attempt(attempt: Attempt):
    student = get_student_model(attempt.user_id)
    student = update_mastery(student, attempt)
    save_student_model(student)
    save_attempt(attempt)
    return {
        "updated_mastery": student.topic_mastery[attempt.topic_id].mastery.model_dump(),
        "next_review": student.topic_mastery[attempt.topic_id].mastery.next_review.isoformat()
    }

@app.post("/api/v1/ai/tutor/chat")
async def tutor_chat(req: TutorRequest):
    student = get_student_model(req.user_id)
    instant = instant_resolve(req.message)
    if instant:
        data = instant["data"]
        if instant["type"] == "formula":
            content = f"**{data['name']}**\n\n```\n{data['formula']}\n```\n\n{data['desc']}"
        elif instant["type"] == "trap":
            content = f"⚠️ **Trap: {data['trap']}**\n\n{data['desc']}\n\n**Example**: {data['example']}"
        else:
            content = f"📊 **Pattern: {data['pattern']}**\n\n**Appears in**: {', '.join(data['years'])}\n\n{data['desc']}"
        return {"reply": content, "layer": "instant", "source": instant["key"]}

    reply = generate_deep_response(req.message, student)
    return {"reply": reply, "layer": "deep", "actions": []}

@app.get("/api/v1/ai/analytics/rank-prediction/{user_id}")
async def rank_prediction(user_id: str):
    student = get_student_model(user_id)
    return predict_rank(student).model_dump()

@app.post("/api/v1/ai/study-plan/generate")
async def generate_study_plan(user_id: str, weekly_hours: float = 18, target_date: str = "2025-05-18"):
    student = get_student_model(user_id)
    target = datetime.fromisoformat(target_date)
    weeks = max(1, (target - datetime.now()).days // 7)
    weak_sorted = sorted(student.weak_chapters, key=lambda t: student.topic_mastery[t].mastery.theta)
    plan = []
    for w in range(min(weeks, 8)):
        week_focus = weak_sorted[w % len(weak_sorted)] if weak_sorted else "Review"
        plan.append({
            "week": w + 1,
            "focus": week_focus,
            "hours": weekly_hours,
            "daily": [
                {"day": "Mon", "topic": week_focus, "hours": weekly_hours/7*2},
                {"day": "Tue", "topic": "Spaced Rep + Weakness", "hours": weekly_hours/7*1.5},
                {"day": "Wed", "topic": "New Concept", "hours": weekly_hours/7*2},
                {"day": "Thu", "topic": "Practice + Review", "hours": weekly_hours/7*1.5},
                {"day": "Fri", "topic": "Mock Sectional", "hours": weekly_hours/7*2},
                {"day": "Sat", "topic": "Full Mock", "hours": weekly_hours/7*3},
                {"day": "Sun", "topic": "Review + Plan", "hours": weekly_hours/7*1},
            ]
        })
    return {"plan": plan, "rationale": "Prioritizes weak chapters with spaced repetition, interleaving, and mock cadence."}

@app.get("/api/v1/syllabus")
async def get_syllabus():
    return list(SYLLABUS.values())

@app.get("/api/v1/formulas")
async def get_formulas():
    return FORMULAS_DATA

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)