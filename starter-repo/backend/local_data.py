"""
Local data generator — creates 5000+ synthetic questions with realistic IRT params
Run once to populate local DB for personal use. No licensing needed.
"""
import json
import random
import math
from pathlib import Path

# Load syllabus
with open(Path(__file__).parent.parent / "data" / "jee_syllabus.json") as f:
    SYLLABUS = {t["id"]: t for t in json.load(f)}

# Subject-specific templates
TEMPLATES = {
    "Physics": {
        "Mechanics": [
            ("A block of mass {m} kg on a {angle}° incline with μ={mu}. Find acceleration.",
             "a = g(sinθ - μcosθ)"),
            ("Projectile launched at {v} m/s, {angle}°. Range on horizontal ground?",
             "R = v²sin(2θ)/g"),
            ("Two masses m1={m1}, m2={m2} connected over pulley. Tension in string?",
             "T = 2m1m2g/(m1+m2)"),
            ("Solid sphere rolls down incline height h. Speed at bottom?",
             "v = √(10gh/7)"),
        ],
        "Electrodynamics": [
            ("Point charge q at center of cube side a. Flux through one face?",
             "q/(6ε₀)"),
            ("Infinite line charge λ. Field at distance r?",
             "E = λ/(2πε₀r)"),
            ("Capacitor C charged to V, battery disconnected. Dielectric K inserted. New V?",
             "V/K"),
            ("Dipole moment p in uniform E at angle θ. Torque?",
             "τ = pE sinθ"),
        ],
        "Optics": [
            ("Convex lens f={f} cm, object at u={u} cm. Image distance?",
             "1/v = 1/f - 1/u"),
            ("Young's double slit: λ={lam} nm, d={d} mm, D={D} m. Fringe width?",
             "β = λD/d"),
        ],
        "Modern": [
            ("Photoelectric: λ={lam} nm, φ={phi} eV. Max KE?",
             "K_max = 1240/λ - φ"),
            ("Hydrogen: n={ni} → n={nf}. Wavelength?",
             "1/λ = R(1/nf² - 1/ni²)"),
        ],
    },
    "Chemistry": {
        "Physical Chemistry": [
            ("Mole Concept: {mass}g of {compound} (M={M}). Moles?",
             "n = mass/M"),
            ("Limiting reagent: {n1} mol A + {n2} mol B → products (a:b). LR?",
             "Compare n1/a vs n2/b"),
            ("1st order: k={k}, [A]₀={a0}. Time for 75% completion?",
             "t = ln(4)/k"),
            ("Nernst: E°={E0} V, n={n}, Q={Q} at 298K. E?",
             "E = E° - (0.0591/n)log Q"),
        ],
        "Inorganic Chemistry": [
            ("p-block: Oxidation state of {elem} in {compound}?",
             "Sum of oxidation states = charge"),
            ("Coordination: [M(CN)₆]⁴⁻. d-electron count for M?",
             "CN⁻ is strong field → low spin"),
        ],
        "Organic Chemistry": [
            ("Carbonyl: R-CHO + NaBH₄ → ?",
             "Primary alcohol R-CH₂OH"),
            ("Aldol: 2 CH₃CHO + NaOH → ?",
             "3-hydroxybutanal"),
            ("SN2: CH₃Br + OH⁻ → ? Rate law?",
             "Rate = k[CH₃Br][OH⁻]"),
        ],
    },
    "Mathematics": {
        "Algebra": [
            ("Quadratic: x² - {b}x + {c} = 0. Sum of roots?",
             "Sum = b"),
            ("P&C: {n} distinct objects into {r} distinct boxes, empty allowed?",
             "rⁿ"),
            ("Complex: z = {a}+{b}i. |z|?",
             "√(a²+b²)"),
        ],
        "Calculus": [
            ("∫ xⁿ dx = ?",
             "xⁿ⁺¹/(n+1) + C"),
            ("∫₀ᵃ f(x)dx = ∫₀ᵃ f(a-x)dx. Name?",
             "King property"),
            ("Area: y=f(x) from x=a to b. Area?",
             "∫ₐᵇ |f(x)| dx"),
        ],
        "Coordinate Geometry": [
            ("Line through ({x1},{y1}) slope m. Equation?",
             "y - y1 = m(x - x1)"),
            ("Circle: center ({h},{k}), radius r. Equation?",
             "(x-h)² + (y-k)² = r²"),
        ],
        "Vectors & 3D": [
            ("Distance between ({x1},{y1},{z1}) and ({x2},{y2},{z2})?",
             "√[(x2-x1)²+(y2-y1)²+(z2-z1)²]"),
        ],
        "Probability": [
            ("P(A|B) = P(B|A)P(A)/P(B). Name?",
             "Bayes' theorem"),
        ],
    },
}

# IRT parameter ranges by difficulty
IRT_RANGES = {
    1: {"a": (0.8, 1.2), "b": (-2.0, -1.0), "c": (0.15, 0.25)},
    2: {"a": (1.0, 1.4), "b": (-1.0, 0.0), "c": (0.15, 0.25)},
    3: {"a": (1.2, 1.6), "b": (0.0, 1.0), "c": (0.1, 0.2)},
    4: {"a": (1.4, 1.8), "b": (1.0, 1.8), "c": (0.05, 0.15)},
    5: {"a": (1.6, 2.2), "b": (1.8, 2.5), "c": (0.0, 0.1)},
}

def generate_question(topic_id, template, difficulty):
    """Fill template with random values, generate options, return question dict"""
    subject = SYLLABUS[topic_id]["subject"]
    category = SYLLABUS[topic_id]["category"]

    # Fill template
    if subject == "Physics":
        params = {
            "m": random.randint(1, 10),
            "m1": random.randint(1, 5),
            "m2": random.randint(1, 5),
            "angle": random.choice([30, 37, 45, 53, 60]),
            "mu": round(random.uniform(0.1, 0.5), 1),
            "v": random.randint(10, 50),
            "f": random.randint(5, 30),
            "u": random.randint(10, 50),
            "lam": random.randint(400, 700),
            "d": round(random.uniform(0.5, 2.0), 1),
            "D": random.randint(1, 3),
            "phi": round(random.uniform(1.5, 4.5), 1),
            "ni": random.randint(3, 6),
            "nf": random.randint(1, 2),
        }
    elif subject == "Chemistry":
        params = {
            "mass": random.randint(1, 100),
            "M": random.randint(18, 200),
            "n1": random.randint(1, 10),
            "n2": random.randint(1, 10),
            "k": round(random.uniform(0.01, 0.1), 3),
            "a0": round(random.uniform(0.1, 1.0), 1),
            "E0": round(random.uniform(0.5, 1.5), 2),
            "n": random.randint(1, 3),
            "Q": round(random.uniform(0.1, 10), 1),
        }
    else:  # Math
        params = {
            "b": random.randint(-10, 10),
            "c": random.randint(-20, 20),
            "n": random.randint(3, 10),
            "r": random.randint(2, 5),
            "a": random.randint(-5, 5),
            "x1": random.randint(-5, 5),
            "y1": random.randint(-5, 5),
            "m": random.randint(-3, 3),
            "h": random.randint(-5, 5),
            "k": random.randint(-5, 5),
        }

    text = template[0].format(**params)
    answer_formula = template[1]

    # Generate options based on type
    q_type = random.choice(["MCQ_SINGLE", "MCQ_SINGLE", "MCQ_SINGLE", "INTEGER", "MCQ_MULTIPLE"])

    if q_type == "INTEGER":
        answer = random.randint(1, 20)
        options = []
    elif q_type == "MCQ_MULTIPLE":
        correct = [chr(65+i) for i in range(random.randint(2, 3))]
        options = [{"id": chr(65+i), "text": f"Option {chr(65+i)}"} for i in range(4)]
        answer = correct
    else:
        correct = random.choice(["A", "B", "C", "D"])
        options = [{"id": chr(65+i), "text": f"Value {i+1}"} for i in range(4)]
        answer = correct

    # IRT params
    irt_range = IRT_RANGES[difficulty]
    irt = {
        "a": round(random.uniform(*irt_range["a"]), 2),
        "b": round(random.uniform(*irt_range["b"]), 2),
        "c": round(random.uniform(*irt_range["c"]), 2),
    }

    # Hints (progressive)
    hints = [
        f"Identify the key concept: {category}",
        f"Recall the formula: {answer_formula}",
        "Substitute values carefully with units",
    ]

    return {
        "id": f"q_{topic_id}_{random.randint(1000,9999)}",
        "topic_id": topic_id,
        "subtopic": category,
        "subject": subject,
        "type": q_type,
        "difficulty": difficulty,
        "text": text,
        "options": options,
        "answer": answer,
        "hints": hints,
        "explanation": f"Using {answer_formula}, the answer is {answer}.",
        "irt_params": irt,
        "tags": [category.lower().replace(" ", "-")],
        "source": "Generated",
        "year": 2025,
        "exam_type": "BOTH",
        "time_limit": [60, 90, 120, 150, 180][difficulty-1],
    }

def main():
    print("Generating synthetic question bank...")
    all_questions = []

    for topic_id, topic in SYLLABUS.items():
        subject = topic["subject"]
        category = topic["category"]

        if subject in TEMPLATES and category in TEMPLATES[subject]:
            templates = TEMPLATES[subject][category]

            # Generate 10-25 questions per topic
            n_q = random.randint(10, 25)
            for _ in range(n_q):
                template = random.choice(templates)
                difficulty = random.choices([1,2,3,4,5], weights=[10,20,30,25,15])[0]
                q = generate_question(topic_id, template, difficulty)
                all_questions.append(q)

    print(f"Generated {len(all_questions)} questions")

    # Save
    output_path = Path(__file__).parent.parent / "data" / "questions_generated.json"
    with open(output_path, "w") as f:
        json.dump(all_questions, f, indent=2)
    print(f"Saved to {output_path}")

if __name__ == "__main__":
    main()