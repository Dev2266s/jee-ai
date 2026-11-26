import { useState, useEffect, useRef } from 'react'
import { Chart, registerables, BarElement, CategoryScale, LinearScale, BarController, BarChart, LineElement, PointElement, LineController, Title, Tooltip, Legend, Filler } from 'chart.js'
import Loading from '../components/Loading'

Chart.register(...registerables, BarElement, CategoryScale, LinearScale, BarController, BarChart, LineElement, PointElement, LineController, Title, Tooltip, Legend, Filler)

const RANK_DIST = {
  bins: [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30].map(b => b * 1000),
  counts: [2,5,12,28,55,89,124,156,178,185,172,145,108,72,41,23,11,5,2]
}

const DRIVERS = [
  {feature: "Physics Mastery (θ)", impact: -4200, direction: "improves rank", current: 0.82, target: 1.3, desc: "Electrostatics, EMI/AC, Modern Physics dragging down"},
  {feature: "Math Mastery (θ)", impact: -3800, direction: "improves rank", current: 1.05, target: 1.5, desc: "Definite Integration, P&C, 3D Geometry weak"},
  {feature: "Chemistry Mastery (θ)", impact: -2100, direction: "improves rank", current: 1.18, target: 1.4, desc: "Organic mechanisms, Chemical Bonding need work"},
  {feature: "Mock Test Percentile", impact: -3500, direction: "improves rank", current: 92, target: 97, desc: "Consistency across papers; time management in Adv"},
  {feature: "Weekly Study Hours", impact: -1800, direction: "improves rank", current: 18, target: 24, desc: "Quality hours > quantity. 24h with spacing optimal"},
  {feature: "Careless Error Rate", impact: 2400, direction: "worsens rank", current: 18, target: 8, desc: "Sign errors, unit mistakes, misreading questions"},
  {feature: "Formula Recall Speed", impact: 1200, direction: "worsens rank", current: 65, target: 90, desc: "Organic reagents, Physics constants, Math identities"},
  {feature: "Syllabus Coverage", impact: -900, direction: "improves rank", current: 67, target: 95, desc: "Advanced-only topics: 40% uncovered"},
]

const WHATIFS = [
  {name: "Master Electrostatics (θ: -0.2 → 1.0)", feature: "Physics Mastery", delta: 1.2, newRank: 8900, newPercentile: 97.9, effort: "High (25h focused)", confidence: 85},
  {name: "Fix Definite Integration Sign Errors", feature: "Careless Error Rate", delta: -10, newRank: 10200, newPercentile: 97.6, effort: "Medium (10h drills)", confidence: 90},
  {name: "Derive All Carbonyl Mechanisms", feature: "Chemistry Mastery", delta: 0.4, newRank: 11100, newPercentile: 97.4, effort: "High (20h)", confidence: 80},
  {name: "Increase Study to 24h/week (Quality)", feature: "Weekly Study Hours", delta: 6, newRank: 10800, newPercentile: 97.5, effort: "Medium (schedule change)", confidence: 70},
  {name: "Complete Advanced Syllabus Coverage", feature: "Syllabus Coverage", delta: 28, newRank: 11500, newPercentile: 97.3, effort: "High (40h)", confidence: 75},
  {name: "Eliminate P&C Trap Falling", feature: "Careless Error Rate", delta: -5, newRank: 11800, newPercentile: 97.2, effort: "Low (5h trap catalog)", confidence: 85},
]

const MISTAKES = {
  all: [
    {topic: "Definite Integration", type: "CARELESS", count: 12, pct: 35, trend: "stable", examples: ["Sign error in substitution (5)", "Limit reversal (4)", "King property misapplied (3)"]},
    {topic: "Electrostatics", type: "CONCEPTUAL_GAP", count: 10, pct: 29, trend: "worsening", examples: ["Flux sign confusion (4)", "Gaussian surface choice (3)", "Dipole moment direction (3)"]},
    {topic: "Carbonyl Compounds", type: "FORMULA_RECALL", count: 8, pct: 24, trend: "improving", examples: ["Reagent confusion NaBH4/LiAlH4 (4)", "Mechanism steps skipped (2)", "Stereochemistry ignored (2)"]},
    {topic: "P&C", type: "TRAP_FALLING", count: 6, pct: 18, trend: "worsening", examples: ["Identical vs distinct (3)", "Circular permutation overcount (2)", "Inclusion-exclusion missed (1)"]},
    {topic: "Rotational Motion", type: "TIME_PRESSURE", count: 5, pct: 15, trend: "stable", examples: ["MOI calculation slow (3)", "Combined motion freeze (2)"]},
    {topic: "Chemical Kinetics", type: "CONCEPTUAL_GAP", count: 4, pct: 12, trend: "improving", examples: ["Order vs molecularity (2)", "Integrated rate law wrong (2)"]},
  ],
  conceptual: [
    {topic: "Electrostatics", type: "CONCEPTUAL_GAP", count: 10, pct: 29, trend: "worsening", examples: ["Flux sign confusion (4)", "Gaussian surface choice (3)", "Dipole moment direction (3)"]},
    {topic: "Chemical Kinetics", type: "CONCEPTUAL_GAP", count: 4, pct: 12, trend: "improving", examples: ["Order vs molecularity (2)", "Integrated rate law wrong (2)"]},
    {topic: "Thermodynamics (Chem)", type: "CONCEPTUAL_GAP", count: 3, pct: 9, trend: "stable", examples: ["State function confusion (2)", "Hess's law sign (1)"]},
  ],
  careless: [
    {topic: "Definite Integration", type: "CARELESS", count: 12, pct: 35, trend: "stable", examples: ["Sign error in substitution (5)", "Limit reversal (4)", "King property misapplied (3)"]},
    {topic: "Vector Algebra", type: "CARELESS", count: 3, pct: 9, trend: "improving", examples: ["Cross product order (2)", "Dot product sign (1)"]},
    {topic: "Units & Dimensions", type: "CARELESS", count: 5, pct: 15, trend: "stable", examples: ["J vs eV (2)", "Missing 4πε₀ (2)", "Degree vs radian (1)"]},
  ],
  time: [
    {topic: "Rotational Motion", type: "TIME_PRESSURE", count: 5, pct: 15, trend: "stable", examples: ["MOI calculation slow (3)", "Combined motion freeze (2)"]},
    {topic: "3D Geometry", type: "TIME_PRESSURE", count: 4, pct: 12, trend: "worsening", examples: ["Plane intersection slow (3)", "Distance formula recall (1)"]},
    {topic: "Complex Numbers", type: "TIME_PRESSURE", count: 3, pct: 9, trend: "stable", examples: ["Polar conversion (2)", "De Moivre application (1)"]},
  ],
  formula: [
    {topic: "Carbonyl Compounds", type: "FORMULA_RECALL", count: 8, pct: 24, trend: "improving", examples: ["Reagent confusion NaBH4/LiAlH4 (4)", "Mechanism steps skipped (2)", "Stereochemistry ignored (2)"]},
    {topic: "Electrochemistry", type: "FORMULA_RECALL", count: 4, pct: 12, trend: "stable", examples: ["Nernst at non-298K (2)", "Conductivity formulas (2)"]},
    {topic: "Coordination Compounds", type: "FORMULA_RECALL", count: 3, pct: 9, trend: "improving", examples: ["CFSE calculation (2)", "Spectrochemical series (1)"]},
  ],
  trap: [
    {topic: "P&C", type: "TRAP_FALLING", count: 6, pct: 18, trend: "worsening", examples: ["Identical vs distinct (3)", "Circular permutation overcount (2)", "Inclusion-exclusion missed (1)"]},
    {topic: "Capacitors", type: "TRAP_FALLING", count: 3, pct: 9, trend: "stable", examples: ["Series vs parallel dielectric (2)", "Battery connected/disconnected (1)"]},
    {topic: "Probability", type: "TRAP_FALLING", count: 2, pct: 6, trend: "improving", examples: ["Bayes' theorem denominator (2)"]},
  ],
}

const FOCUS_RECS = [
  {topic: "Electrostatics", priority: "CRITICAL", hours: 8, reason: "θ = -0.20, weight 10/10, worsening trend. Gauss's Law + Capacitors + Dipoles.", actions: ["Gauss's Law symmetry drills (3h)", "Capacitor dielectric geometries (3h)", "Dipole in uniform field (2h)"]},
  {topic: "Definite Integration", priority: "HIGH", hours: 6, reason: "Careless errors = 35% of mistakes. Sign/limit errors are fixable with protocol.", actions: ["Verification checklist (1h)", "King/Queen property mastery (2h)", "Timed mixed practice (3h)"]},
  {topic: "Carbonyl Mechanisms", priority: "HIGH", hours: 7, reason: "Formula recall issue. Derivation > memorization for JEE.", actions: ["Mechanism derivation practice (3h)", "Reagent flowchart creation (2h)", "Crossed aldol + Cannizzaro (2h)"]},
  {topic: "P&C Traps", priority: "MEDIUM", hours: 4, reason: "Worsening trap falling. Low effort, high yield fix.", actions: ["Trap catalog review (1h)", "Identical vs distinct drills (2h)", "'What traps me' reflection (1h)"]},
  {topic: "Rotational Motion Speed", priority: "MEDIUM", hours: 5, reason: "Know concepts but slow. MOI of standard bodies must be instant.", actions: ["MOI table memorization (1h)", "Timed MOI drills (2h)", "Combined translation+rotation (2h)"]},
]

const MASTERY_TREND = {
  weeks: ["W-12","W-11","W-10","W-9","W-8","W-7","W-6","W-5","W-4","W-3","W-2","W-1","Current"],
  physics: [0.35,0.42,0.48,0.51,0.55,0.58,0.61,0.65,0.68,0.71,0.74,0.78,0.82],
  chemistry: [0.65,0.72,0.78,0.85,0.91,0.95,1.02,1.05,1.08,1.12,1.15,1.17,1.18],
  math: [0.58,0.65,0.71,0.76,0.81,0.85,0.89,0.92,0.95,0.98,1.01,1.03,1.05]
}

const PLAN_TEMPLATE = [
  {day: "Mon", blocks: ["Physics: Electrostatics Deep (2.5h)", "Math: Definite Integration Protocol (1.5h)", "Spaced Rep: Current Electricity (15m)"]},
  {day: "Tue", blocks: ["Chem: Carbonyl Mechanisms (2.5h)", "Math: P&C Trap Drills (1.5h)", "Spaced Rep: Mole Concept (15m)"]},
  {day: "Wed", blocks: ["Physics: Rotational Motion Speed (2h)", "Chem: Chemical Bonding Review (1.5h)", "Mock: Sectional Physics (1h)"]},
  {day: "Thu", blocks: ["Math: 3D Geometry + Vectors (2h)", "Physics: EMI/AC Concepts (1.5h)", "Spaced Rep: Differentiation (15m)"]},
  {day: "Fri", blocks: ["Chem: Coordination + p-block (2h)", "Math: Complex Numbers (1.5h)", "Spaced Rep: Quadratic Equations (15m)"]},
  {day: "Sat", blocks: ["FULL MOCK: JEE Advanced Paper 1 (3h)", "Error Analysis + Classification (1h)", "Formula Sheet Update (30m)"]},
  {day: "Sun", blocks: ["Weakness Re-attempt (1.5h)", "Next Week Planning with Arya (30m)", "Rest / Light Review (flexible)"]},
]

const MISTAKE_TABS = [
  {id: 'all', label: 'All'},
  {id: 'conceptual', label: 'Conceptual'},
  {id: 'careless', label: 'Careless'},
  {id: 'time', label: 'Time Pressure'},
  {id: 'formula', label: 'Formula Recall'},
  {id: 'trap', label: 'Traps'},
]

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('all')
  const [weeklyHours, setWeeklyHours] = useState(18)
  const [targetDate, setTargetDate] = useState('2025-05-18')
  const [showPlan, setShowPlan] = useState(false)
  const rankDistRef = useRef(null)
  const masteryTrendRef = useRef(null)

  useEffect(() => {
    if (rankDistRef.current) {
      new Chart(rankDistRef.current, {
        type: 'bar',
        data: {
          labels: RANK_DIST.bins.map(b => `${(b/1000).toFixed(1)}k`),
          datasets: [{
            label: 'Probability Density',
            data: RANK_DIST.counts,
            backgroundColor: RANK_DIST.bins.map(b => b < 8200 ? '#22c55e' : b < 19500 ? '#6366f1' : '#ef4444'),
            borderRadius: 3,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {legend: {display: false}, tooltip: {callbacks: {label: ctx => `Probability: ${(ctx.raw/1400*100).toFixed(1)}%`}}},
          scales: {x: {title: {display: true, text: 'Predicted AIR'}}, y: {title: {display: true, text: 'Density'}, beginAtZero: true}}
        }
      })
    }
  }, [])

  useEffect(() => {
    if (masteryTrendRef.current) {
      new Chart(masteryTrendRef.current, {
        type: 'line',
        data: {
          labels: MASTERY_TREND.weeks,
          datasets: [
            {label: 'Physics', data: MASTERY_TREND.physics, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.3},
            {label: 'Chemistry', data: MASTERY_TREND.chemistry, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', fill: true, tension: 0.3},
            {label: 'Math', data: MASTERY_TREND.math, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.3}
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {legend: {position: 'top'}},
          scales: {y: {title: {display: true, text: 'Mastery (θ)'}, min: 0, max: 2.5}, x: {title: {display: true, text: 'Week'}}}
        }
      })
    }
  }, [])

  const generatePlan = () => {
    setShowPlan(true)
  }

  const mistakeData = MISTAKES[activeTab] || MISTAKES.all

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics & What-If Scenarios</h1>
          <p className="text-slate-500 text-sm mt-1">Understand your trajectory. Test interventions. Plan smarter.</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            <option value="30">Last 30 Days</option>
            <option value="90" selected>Last 90 Days</option>
            <option value="180">Last 180 Days</option>
            <option value="all">All Time</option>
          </select>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700" onClick={() => {}}>Refresh</button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Predicted AIR (Median)</div>
          <div className="text-3xl font-bold text-slate-900 mt-1">12,847</div>
          <div className="text-xs text-slate-500 mt-1">80% CI: 8,200 – 19,500</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Percentile Estimate</div>
          <div className="text-3xl font-bold text-indigo-600 mt-1">97.2%</div>
          <div className="text-xs text-slate-500 mt-1">Target: 99.5% for AIR < 5000</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Confidence Level</div>
          <div className="text-3xl font-bold text-slate-900 mt-1">Medium</div>
          <div className="text-xs text-slate-500 mt-1">CI width: 11,300 ranks</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Weeks to Exam</div>
          <div className="text-3xl font-bold text-amber-600 mt-1">7</div>
          <div className="text-xs text-slate-500 mt-1">JEE Adv: May 18, 2025</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            Rank Prediction Distribution
          </h3>
          <div className="h-64"><canvas ref={rankDistRef} /></div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded">Median: 12,847</span>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded">P10 (Optimistic): 8,200</span>
            <span className="px-2 py-1 bg-red-100 text-red-700 rounded">P90 (Pessimistic): 19,500</span>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            Key Drivers (SHAP Impact on Rank)
          </h3>
          <div className="space-y-3">
            {DRIVERS.map((d, i) => {
              const isPositive = d.impact < 0
              const color = isPositive ? 'green' : 'red'
              const absImpact = Math.abs(d.impact)
              return (
                <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-900">{d.feature}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full bg-${color}-100 text-${color}-700`}>{isPositive ? '▲' : '▼'} {(absImpact/1000).toFixed(1)}k ranks</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-2"><div className={`h-full bg-${color}-500 rounded-full`} style={{width: `${Math.min(100, absImpact/50)}%`}} /></div>
                  <p className="text-xs text-slate-600">{d.desc}</p>
                  <p className="text-xs text-slate-500 mt-1">Current: {d.current} → Target: {d.target}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            What-If Scenarios
          </h3>
          <p className="text-sm text-slate-500 mb-4">Simulate: "What if I improve X by Y%?" — See projected rank impact.</p>
          <div className="space-y-3">
            {WHATIFS.map((w, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-slate-900 flex-1 pr-4">{w.name}</h4>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-indigo-600">{w.newRank.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">AIR | {w.newPercentile}%ile</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs mb-2">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">Effort: {w.effort}</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">Confidence: {w.confidence}%</span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded">Δ Rank: {(12847 - w.newRank).toLocaleString()}</span>
                </div>
                <p className="text-sm text-slate-600">Improves: <strong>{w.feature}</strong> by {w.delta > 0 ? '+' : ''}{w.delta}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            Mistake Pattern Analysis
          </h3>
          <div className="mb-4 flex flex-wrap gap-2">
            {MISTAKE_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {mistakeData.map((m, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-900">{m.topic}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${m.trend==='worsening'?'bg-red-100 text-red-700':m.trend==='improving'?'bg-green-100 text-green-700':'bg-slate-100 text-slate-700'}`}>{m.trend}</span>
                </div>
                <div className="flex items-center gap-2 text-sm mb-1">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">{m.type}</span>
                  <span className="text-slate-600">{m.count} mistakes ({m.pct}% of total)</span>
                </div>
                <div className="text-xs text-slate-500">{m.examples.join(' · ')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-4">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            Mastery Trend by Subject
          </h3>
          <div className="h-80"><canvas ref={masteryTrendRef} /></div>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
            Recommended Focus (Next 2 Weeks)
          </h3>
          <div className="space-y-3">
            {FOCUS_RECS.map((f, i) => (
              <div key={i} className={`p-3 bg-slate-50 rounded-lg border border-slate-200 border-l-4 ${f.priority==='CRITICAL'?'border-red-500':f.priority==='HIGH'?'border-amber-500':'border-blue-500'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-900">{f.topic}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${f.priority==='CRITICAL'?'bg-red-100 text-red-700':f.priority==='HIGH'?'bg-amber-100 text-amber-700':'bg-blue-100 text-blue-700'}`}>{f.priority}</span>
                </div>
                <p className="text-xs text-slate-600 mb-2">{f.reason}</p>
                <div className="text-xs text-slate-500 space-y-0.5">{f.actions.map((a, j) => <div key={j}>• {a}</div>)}</div>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">{f.hours}h</span>
                  <span className="text-slate-500">recommended this week</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          Study Plan Optimizer
        </h3>
        <p className="text-sm text-slate-500 mb-4">Generate an adaptive weekly schedule. Constraints: board exams, sleep, mock tests.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Weekly Hours</label>
            <input type="number" value={weeklyHours} onChange={e => setWeeklyHours(parseInt(e.target.value) || 18)} min="10" max="40" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Target Date</label>
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <button onClick={generatePlan} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 mb-4">Generate Optimized Plan</button>
        {showPlan && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {PLAN_TEMPLATE.map((d, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="font-medium text-slate-900 mb-1">{d.day}</div>
                <div className="text-sm text-slate-600 space-y-1">{d.blocks.map((b, j) => <div key={j}>• {b}</div>)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}