import { useState, useEffect, useRef } from 'react'
import { renderMathInElement } from 'katex'

const INSTANT_KB = {
  formulas: {
    "coulomb": {name: "Coulomb's Law", formula: "F = k q1 q2 / r^2", desc: "Force between two point charges. k = 9×10^9 N·m²/C²"},
    "gauss": {name: "Gauss's Law", formula: "∮ E·dA = Q_enc/ε₀", desc: "Total flux through closed surface = enclosed charge / ε₀"},
    "capacitance": {name: "Parallel Plate Capacitor", formula: "C = ε₀ A / d", desc: "With dielectric: C = K ε₀ A / d"},
    "dipole_field": {name: "Dipole Field (axial)", formula: "E = 2kp / r^3", desc: "Field on axis of dipole at distance r >> dipole length"},
    "dipole_potential": {name: "Dipole Potential", formula: "V = k p cosθ / r^2", desc: "Potential due to dipole at (r,θ)"},
    "kirchhoff_v": {name: "Kirchhoff's Voltage Law", formula: "∑ V = 0", desc: "Algebraic sum of voltages around any closed loop = 0"},
    "kirchhoff_c": {name: "Kirchhoff's Current Law", formula: "∑ I_in = ∑ I_out", desc: "Current entering junction = current leaving"},
    "mole": {name: "Mole Concept", formula: "n = mass / M = volume / 22.4 (STP)", desc: "Number of moles from mass or gas volume"},
    "limiting_reagent": {name: "Limiting Reagent", formula: "Compare n/coeff for each reactant", desc: "Smallest ratio determines limiting reagent"},
    "rate_law": {name: "Rate Law", formula: "Rate = k [A]^x [B]^y", desc: "Order = x+y. Determined experimentally."},
    "arrhenius": {name: "Arrhenius Equation", formula: "k = A e^(-Ea/RT)", desc: "Rate constant temperature dependence"},
    "nernst": {name: "Nernst Equation", formula: "E = E° - (RT/nF) ln Q", desc: "Cell potential under non-standard conditions"},
    "hendersons": {name: "Henderson-Hasselbalch", formula: "pH = pKa + log([A⁻]/[HA])", desc: "Buffer pH calculation"},
    "quadratic": {name: "Quadratic Formula", formula: "x = [-b ± √(b²-4ac)] / 2a", desc: "Roots of ax²+bx+c=0. Discriminant D=b²-4ac"},
    "binom": {name: "Binomial Theorem", formula: "(x+y)^n = Σ C(n,r) x^(n-r) y^r", desc: "General term: T_{r+1} = C(n,r) x^(n-r) y^r"},
    "derivative_basic": {name: "Basic Derivatives", formula: "d/dx(x^n)=nx^(n-1), d/dx(sin x)=cos x, d/dx(e^x)=e^x, d/dx(ln x)=1/x", desc: "Fundamental differentiation rules"},
    "chain_rule": {name: "Chain Rule", formula: "d/dx f(g(x)) = f'(g(x)) · g'(x)", desc: "Derivative of composite functions"},
    "integration_basic": {name: "Basic Integrals", formula: "∫ x^n dx = x^(n+1)/(n+1), ∫ e^x dx = e^x, ∫ 1/x dx = ln|x|", desc: "Fundamental integration rules"},
    "by_parts": {name: "Integration by Parts", formula: "∫ u dv = uv - ∫ v du", desc: "LIATE rule for choosing u: Log, Inverse trig, Algebraic, Trig, Exponential"},
    "definite_props": {name: "Definite Integral Properties", formula: "∫_a^b f(x)dx = -∫_b^a f(x)dx, ∫_a^b f(x)dx = ∫_a^b f(a+b-x)dx", desc: "King property: ∫_0^a f(x)dx = ∫_0^a f(a-x)dx"},
    "distance_3d": {name: "Distance in 3D", formula: "d = √[(x2-x1)²+(y2-y1)²+(z2-z1)²]", desc: "Distance between two points in 3D"},
    "line_eq": {name: "Line Equation (3D)", formula: "(x-x1)/a = (y-y1)/b = (z-z1)/c", desc: "Symmetric form. Vector: r = r₁ + λ(a,b,c)"},
    "plane_eq": {name: "Plane Equation", formula: "ax + by + cz + d = 0", desc: "Normal vector = (a,b,c). Distance from point: |ax1+by1+cz1+d|/√(a²+b²+c²)"},
  },
  traps: {
    "flux_sign": {trap: "Flux sign confusion", desc: "Flux = E·A·cosθ. Inward flux negative, outward positive. Gaussian surface orientation matters.", example: "Charge inside cube: flux through each face = q/(6ε₀) OUTWARD. If asked 'flux entering', answer is negative."},
    "dipole_moment_dir": {trap: "Dipole moment direction", desc: "p points from -q to +q (opposite to field direction inside dipole). Many forget this.", example: "Torque τ = p × E. p direction matters for cross product."},
    "capacitor_series_parallel": {trap: "Series vs parallel capacitors", desc: "Series: 1/Ceq = Σ 1/Ci (charge same). Parallel: Ceq = Σ Ci (voltage same). Dielectric insertion geometry critical.", example: "Dielectric fills half thickness → SERIES. Half area → PARALLEL."},
    "limiting_reagent_excess": {trap: "Limiting reagent vs excess", desc: "Don't just find limiting reagent. Calculate excess remaining: n_excess = n_initial - (coeff_excess/coeff_limiting) × n_limiting_used", example: "2H₂ + O₂ → 2H₂O. If 4 mol H₂, 3 mol O₂: H₂ limiting. O₂ used = 2 mol. Excess O₂ = 1 mol."},
    "kinetics_order_molecularity": {trap: "Order ≠ Molecularity", desc: "Molecularity = elementary step (integer). Order = experimental (can be fractional, zero). Only equal for elementary reactions.", example: "H₂ + Br₂ → 2HBr. Rate = k[H₂][Br₂]^(1/2). Order = 1.5, Molecularity = 2."},
    "nernst_temperature": {trap: "Nernst at 298K", desc: "E = E° - (0.0591/n) log Q at 298K. Don't use 0.0591 at other temperatures!", example: "At 310K: factor = (RT/F) ln 10 = 0.0615. Use (0.0615/n) log Q."},
    "integration_constant": {trap: "Definite vs indefinite", desc: "Indefinite: +C always. Definite: NO +C. Limits absorb it.", example: "∫_0^1 2x dx = [x²]_0^1 = 1. Writing +C here is wrong."},
    "pnc_identical_distinct": {trap: "Identical vs distinct objects", desc: "Distinct objects into distinct boxes: n^r. Identical objects into distinct boxes: C(n+r-1, r).", example: "5 identical balls into 3 distinct boxes: C(5+3-1, 5) = C(7,5) = 21."},
    "vector_cross_order": {"trap": "Cross product order", "desc": "a × b = - (b × a). Direction by right-hand rule. Torque τ = r × F, not F × r.", "example": "If r = (1,0,0), F = (0,1,0), τ = (0,0,1). Reverse order gives (0,0,-1)."}
  },
  patterns: {
    "gauss_symmetry": {pattern: "Gauss's Law + Symmetry", years: ["2019 Main", "2021 Adv", "2023 Main"], desc: "Point charge at center of cube/sphere/cylinder. Flux per face = Q/(n ε₀). n = number of symmetric faces."},
    "dipole_uniform_field": {pattern: "Dipole in Uniform Field", years: ["2018 Main", "2020 Adv", "2022 Main"], desc: "Torque = pE sinθ. PE = -pE cosθ. Stable eq at θ=0. Oscillation period T = 2π√(I/pE)."},
    "capacitor_dielectric_battery": {pattern: "Capacitor + Dielectric ± Battery", years: ["2019 Adv", "2021 Main", "2023 Adv"], desc: "Battery connected: V constant, Q changes. Battery disconnected: Q constant, V changes. Energy: U = ½CV² = Q²/2C."},
    "kirchhoff_wheatstone": {pattern: "Wheatstone Bridge", years: ["2017 Main", "2020 Adv", "2022 Main"], desc: "Balanced: P/Q = R/S → no current through galvanometer. Unbalanced: use Kirchhoff's laws or symmetry."},
    "organic_mechanism_steps": {pattern: "Multi-step Organic Mechanisms", years: ["2018 Adv", "2020 Main", "2021 Adv", "2023 Main"], desc: "Identify: electrophile, nucleophile, leaving group. Draw ALL arrows. Carbocation stability: 3° > 2° > 1° > methyl. Rearrangements: hydride/alkyl shift to more stable carbocation."},
    "integration_king_property": {pattern: "King/Queen Property Definite Integrals", years: ["2019 Main", "2021 Adv", "2022 Main"], desc: "∫_0^a f(x)dx = ∫_0^a f(a-x)dx. Use when f(x)+f(a-x) simplifies. Queen: ∫_0^{π/2} f(sin x, cos x)dx = ∫_0^{π/2} f(cos x, sin x)dx."},
    "complex_numbers_rotation": {pattern: "Complex Numbers as Rotation", years: ["2018 Adv", "2020 Main", "2023 Adv"], desc: "Multiply by e^(iθ) = rotation by θ. |z| = 1 → on unit circle. Cube roots of unity: 1, ω, ω² where 1+ω+ω²=0, ω³=1."},
    "probability_bayes": {pattern: "Bayes' Theorem in JEE", years: ["2019 Adv", "2021 Main", "2022 Adv"], desc: "P(A|B) = P(B|A)P(A)/P(B). Total probability: P(B) = Σ P(B|Aᵢ)P(Aᵢ). Common: defective items from machines, medical tests."}
  }
}

const DEEP_RESPONSES = {
  "electrostatics": "**Core Issue**: You're asking about electrostatics fundamentals. Let me pinpoint what you need.\n\n**Explanation**: Electrostatics deals with charges at rest. The three pillars are:\n1. **Coulomb's Law** — Force between point charges: $F = k q_1 q_2 / r^2$\n2. **Electric Field** — $E = F/q_{test}$. Superposition principle: $\\vec{E}_{net} = \\sum \\vec{E}_i$\n3. **Gauss's Law** — $\\oint \\vec{E} \\cdot d\\vec{A} = Q_{enc}/\\varepsilon_0$. Most powerful for symmetric charge distributions.\n\n**JEE Context**: This appears as **Gauss's Law + Symmetry** in 2019 Main, 2021 Adv, 2023 Main. Typical: point charge at center of cube/sphere → flux per face = $Q/(n\\varepsilon_0)$.\n\n**Practice**:\n- Q1: Point charge q at center of cube side a. Flux through one face? (JEE Main 2019)\n- Q2: Infinite line charge λ. Field at distance r? (JEE Adv 2020)\n\n**Self-Check**: Can you derive the field of an infinite plane sheet using Gauss's Law? If not, start there.",
  "integration": "**Core Issue**: Integration techniques — which method when?\n\n**Explanation**: Decision tree for JEE integrals:\n1. **Direct formula** — $\\int x^n, e^x, \\sin x, \\cos x, 1/x$\n2. **Substitution** — See $f'(x)$ inside? Let $u = f(x)$. $\\int f'(x)g(f(x))dx = \\int g(u)du$\n3. **Partial Fractions** — Rational function $P(x)/Q(x)$, deg(P) < deg(Q). Factor Q.\n4. **Integration by Parts** — $\\int u dv = uv - \\int v du$. LIATE for choosing u.\n5. **Trigonometric** — $\\sin^m x \\cos^n x$. Odd power → sub. Even → half-angle.\n6. **Definite Properties** — King/Queen property, $\\int_0^a f(x)dx = \\int_0^a f(a-x)dx$\n\n**JEE Context**: **King/Queen Property** appears in 2019 Main, 2021 Adv, 2022 Main. $\\int_0^{\\pi/2} \\ln(\\sin x) dx = -\\frac{\\pi}{2}\\ln 2$ is a classic result.\n\n**Practice**:\n- Q1: $\\int_0^{\\pi/2} \\frac{dx}{1+\\tan^3 x}$ (Use King property)\n- Q2: $\\int x \\sin x \\cos x dx$ (By parts + trig identity)\n\n**Self-Check**: When do you use King property vs substitution? King: limits 0 to a, f(a-x) simplifies. Sub: composite function with derivative present.",
  "organic": "**Core Issue**: Organic reaction mechanisms — how to approach systematically.\n\n**Explanation**: Every mechanism follows: **Identify → Draw Arrows → Check Stability → Predict Product**\n1. **Identify**: Electrophile (e- deficient), Nucleophile (e- rich), Leaving Group (stable anion)\n2. **Draw Arrows**: Curved arrows show e- flow. ALWAYS from nucleophile to electrophile.\n3. **Check Stability**: Carbocation stability: 3° > 2° > 1° > methyl. Resonance > inductive.\n4. **Rearrangements**: Hydride/alkyl shift ONLY if more stable carbocation forms.\n\nKey JEE mechanisms: SN1/SN2, E1/E2, Electrophilic aromatic substitution, Carbonyl nucleophilic addition, Aldol condensation, Cannizzaro, Perkin.\n\n**JEE Context**: **Multi-step Organic Mechanisms** in 2018 Adv, 2020 Main, 2021 Adv, 2023 Main. They test: stereochemistry, regioselectivity, rearrangement detection.\n\n**Practice**:\n- Q1: Mechanism of acetone + CH₃MgBr → hydrolysis (Grignard addition)\n- Q2: Benzaldehyde + Acetophenone + NaOH (Crossed aldol — which enolate forms?)\n\n**Self-Check**: In pinacol rearrangement, which group migrates? The one forming more stable carbocation.",
  "strategy": "**Core Issue**: JEE exam strategy — how to maximize marks in 3 hours.\n\n**Explanation**: Different for Main vs Advanced:\n\n**JEE MAIN (90 min, 75 Q, -1 negative)**:\n- **Round 1 (45 min)**: Solve all easy/medium you're confident in. Target: 45-50 Q.\n- **Round 2 (30 min)**: Attempt moderate Qs. Skip if >2 min stuck.\n- **Round 3 (15 min)**: Educated guesses on remaining. No negative for Integer/NNV.\n- **Order**: Chemistry (fastest) → Math → Physics. Chemistry = marks/hour king.\n\n**JEE ADVANCED (3 hr × 2 papers, 54 Q total, partial marking)**:\n- **Paper 1**: Start with strongest subject. Accuracy > speed.\n- **Integer/NNV**: Attempt ALL (no negative). Even 30% guess = net positive.\n- **Match the Column**: Solve one row completely → eliminates 3 options.\n- **Paragraph**: Read questions FIRST, then passage.\n\n**Universal**:\n- Formula sheet: Write your own. Muscle memory > reading.\n- Error log: Every mistake → classify (conceptual/careless/time/trap) → fix root cause.\n- Mocks: 1 full/week last 2 months. Analyze > solve.\n\n**Practice**: Do 3 timed mocks this week. Tag every wrong Q with mistake type.\n\n**Self-Check**: What's your accuracy on Integer type in mocks? If <60%, you're leaving marks.",
  "default": "I'm Arya, your JEE mentor. I can help with:\n\n**Concepts**: \"Explain Gauss's Law applications\", \"How does King property work in integration?\"\n**Problem Solving**: \"Guide me through this electrostatics problem\" (paste it)\n**Strategy**: \"How to attempt JEE Advanced Paper 1?\", \"Time management for Main\"\n**Weakness Analysis**: \"I keep making sign errors in definite integrals\"\n**Formulas**: \"Give me capacitance formulas with dielectrics\"\n**PYQ Patterns**: \"What's the dipole in uniform field pattern?\"\n\n**Try asking**: \"Why does dielectric insertion geometry matter for capacitors?\" or \"Walk me through a Bayes' theorem problem.\"\n\nWhat's on your mind right now?"
}

const QUICK_ACTIONS = [
  {id: 'formulas', label: '📐 Formula Sheet', prompt: "Give me the key electrostatics formulas with dielectrics"},
  {id: 'traps', label: '⚠️ Common Traps', prompt: "What are the most common traps in capacitor and dielectric problems?"},
  {id: 'patterns', label: '📊 PYQ Patterns', prompt: "Show me the PYQ patterns for electrostatics"},
  {id: 'strategy', label: '🎯 Exam Strategy', prompt: "What's the best attempt strategy for JEE Advanced Paper 1?"},
  {id: 'weakness', label: '🔍 Analyze My Weakness', prompt: "Analyze my weakness in electrostatics based on my session"},
  {id: 'plan', label: '📅 Generate Study Plan', prompt: "Generate a 1-week plan to master electrostatics"},
]

const SUGGESTIONS = [
  {text: "Explain Gauss's Law with cube example", action: "instant:gauss"},
  {text: "Common traps in capacitor problems", action: "instant:capacitor_series_parallel"},
  {text: "How to use King property in integrals?", action: "instant:integration_king_property"},
  {text: "JEE Advanced time management", action: "deep:strategy"}
]

export default function Tutor() {
  const [messages, setMessages] = useState([
    {sender: 'arya', content: DEEP_RESPONSES.default, layer: 'deep'}
  ])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    messages.forEach(m => {
      if (m.layer !== 'tool') {
        setTimeout(() => {
          const els = document.querySelectorAll('[data-message-id]')
          els.forEach(el => {
            if (!el.dataset.katexRendered) {
              renderMathInElement(el, {
                delimiters: [
                  {left: '$$', right: '$$', display: true},
                  {left: '$', right: '$', display: false},
                  {left: '\\(', right: '\\)', display: false},
                  {left: '\\[', right: '\\]', display: true}
                ],
                throwOnError: false
              })
              el.dataset.katexRendered = 'true'
            }
          })
        }, 0)
      }
    })
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSuggestion = (action) => {
    const [layer, key] = action.split(':')
    if (layer === 'instant') {
      respondInstant(key)
    } else {
      sendMessage(key)
    }
  }

  const respondInstant = (key) => {
    const data = INSTANT_KB.formulas[key] || INSTANT_KB.traps[key] || INSTANT_KB.patterns[key]
    if (!data) return

    let content = ''
    if (data.formula) {
      content = `**${data.name}**\n\n\`\`\`\n${data.formula}\n\`\`\`\n\n${data.desc}`
    } else if (data.trap) {
      content = `⚠️ **Trap: ${data.trap}**\n\n${data.desc}\n\n**Example**: ${data.example}`
    } else {
      content = `📊 **Pattern: ${data.pattern}**\n\n**Appears in**: ${data.years.join(', ')}\n\n${data.desc}`
    }
    addMessage('arya', content, 'instant', key)
  }

  const addMessage = (sender, content, layer = 'deep', source = null) => {
    const id = Date.now().toString()
    setMessages(prev => [...prev, {id, sender, content, layer, source, timestamp: Date.now()}])
  }

  const sendMessage = async (text) => {
    if (isProcessing || !text.trim()) return
    const userText = text.trim()
    addMessage('user', userText)
    setInput('')
    setIsProcessing(true)

    // Simulate processing delay
    setTimeout(() => {
      let reply = DEEP_RESPONSES.default
      const lower = userText.toLowerCase()
      if (lower.includes('electrostatic') || lower.includes('gauss') || lower.includes('flux') || lower.includes('coulomb') || lower.includes('dipole') || lower.includes('capacitor')) {
        reply = DEEP_RESPONSES.electrostatics
      } else if (lower.includes('integrat') || lower.includes('definite') || lower.includes('king') || lower.includes('by parts') || lower.includes('substitution')) {
        reply = DEEP_RESPONSES.integration
      } else if (lower.includes('organic') || lower.includes('mechanism') || lower.includes('reaction') || lower.includes('carbonyl') || lower.includes('aldol') || lower.includes('sn1') || lower.includes('sn2')) {
        reply = DEEP_RESPONSES.organic
      } else if (lower.includes('strateg') || lower.includes('time manag') || lower.includes('attempt') || lower.includes('mock') || lower.includes('paper') || lower.includes('exam')) {
        reply = DEEP_RESPONSES.strategy
      }
      addMessage('arya', reply, 'deep')
      setIsProcessing(false)
      inputRef.current?.focus()
    }, 800 + Math.random() * 600)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim() && !isProcessing) {
      sendMessage(input)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() && !isProcessing) {
        sendMessage(input)
      }
    }
  }

  const quickAsk = (type) => {
    const prompts = {
      formulas: "Give me the key electrostatics formulas with dielectrics",
      traps: "What are the most common traps in capacitor and dielectric problems?",
      patterns: "Show me the PYQ patterns for electrostatics",
      strategy: "What's the best attempt strategy for JEE Advanced Paper 1?",
      weakness: "Analyze my weakness in electrostatics based on my session",
      plan: "Generate a 1-week plan to master electrostatics"
    }
    sendMessage(prompts[type])
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            </div>
            <div>
              <h1 className="font-bold text-slate-900">Arya</h1>
              <p className="text-xs text-slate-500">JEE Mentor · Targeted Practice</p>
            </div>
          </div>
          <button className="lg:hidden p-2 rounded-lg hover:bg-slate-100" onClick={() => setShowSidebar(!showSidebar)} aria-label="Session Info">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden max-w-3xl mx-auto w-full">
        {showSidebar && (
          <aside className="fixed inset-y-0 right-0 z-50 w-72 bg-white border-l border-slate-200 lg:hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Session Info</h3>
              <button onClick={() => setShowSidebar(false)} className="p-1 rounded hover:bg-slate-100">×</button>
            </div>
            <div className="p-4 overflow-y-auto">
              <div className="space-y-3 text-sm">
                <div className="p-2 bg-white rounded border"><strong>Mode:</strong> Targeted Practice</div>
                <div className="p-2 bg-white rounded border"><strong>Current Topic:</strong> Electrostatics</div>
                <div className="p-2 bg-white rounded border"><strong>Session Qs Done:</strong> 3/10</div>
                <div className="p-2 bg-white rounded border"><strong>Accuracy:</strong> 67%</div>
                <div className="p-2 bg-white rounded border"><strong>Hints Used:</strong> 2</div>
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Quick Actions</h4>
                  <div className="space-y-2">
                    {QUICK_ACTIONS.map(a => (
                      <button key={a.id} onClick={() => {quickAsk(a.id); setShowSidebar(false);}} className="w-full px-3 py-2 text-left border border-slate-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-200 text-sm">{a.label}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}

        <main className="flex-1 flex flex-col min-w-0">
          <div id="chatArea" className="flex-1 overflow-y-auto p-4 space-y-4" role="log" aria-live="polite">
            {messages.map((msg, i) => (
              <div key={msg.id || i} className={`message flex gap-3 ${msg.layer === 'instant' ? 'bg-indigo-50/50 rounded-xl p-2' : ''}`} data-message-id={msg.id || i}>
                {msg.sender === 'user' ? (
                  <>
                    <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    </div>
                    <div className="flex-1"><div className="bg-indigo-600 text-white rounded-2xl rounded-tr-md px-4 py-3 text-sm">{msg.content}</div></div>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                    </div>
                    <div className="flex-1 min-w-0"><div className="bg-slate-100 rounded-2xl rounded-tl-md px-4 py-3 prose prose-slate max-w-none text-sm">{msg.content}</div></div>
                  </>
                )}
                {msg.layer === 'instant' && msg.source && (
                  <div className="absolute top-2 right-2 text-xs px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded">instant: {msg.source}</div>
                )}
              </div>
            ))}
            {isProcessing && (
              <div className="message flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                </div>
                <div className="bg-slate-100 rounded-2xl rounded-tl-md px-4 py-3 typing-indicator flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        <div className="border-t border-slate-200 bg-white p-4">
          <div className="flex flex-wrap gap-2 mb-2">
            {SUGGESTIONS.map(s => (
              <button key={s.text} onClick={() => handleSuggestion(s.action)} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-xs hover:bg-indigo-100 hover:text-indigo-700">{s.text}</button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className="flex-1 px-4 py-3 border border-slate-300 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="Ask Arya anything about JEE prep... (Shift+Enter for new line)"
              style={{minHeight: 48, maxHeight: 140}}
              disabled={isProcessing}
            />
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center"
              disabled={isProcessing || !input.trim()}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
            </button>
          </form>
          <p className="text-xs text-slate-400 text-center mt-2">Arya uses verified JEE content only. No medical advice. <a href="#" className="text-indigo-600 hover:underline">Privacy</a></p>
        </div>
      </div>
    </div>
  )
}