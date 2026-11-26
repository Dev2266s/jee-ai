import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import Chart from 'chart.js/auto'
import 'chartjs-chart-matrix'
import Loading, { CardSkeleton } from '../components/Loading'

Chart.register(...registerables, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, BarController, BarChart)

const TOPICS = [
  {id:"phy_mech_kin", name:"Kinematics", subject:"Physics", category:"Mechanics", theta:1.8, se:0.22, due:true, weight:8},
  {id:"phy_mech_nlm", name:"Newton's Laws", subject:"Physics", category:"Mechanics", theta:1.2, se:0.31, due:false, weight:9},
  {id:"phy_mech_wpe", name:"Work, Power, Energy", subject:"Physics", category:"Mechanics", theta:0.9, se:0.28, due:true, weight:7},
  {id:"phy_mech_rot", name:"Rotational Motion", subject:"Physics", category:"Mechanics", theta:0.3, se:0.35, due:true, weight:9},
  {id:"phy_mech_grav", name:"Gravitation", subject:"Physics", category:"Mechanics", theta:1.5, se:0.25, due:false, weight:5},
  {id:"phy_therm_ktg", name:"Kinetic Theory", subject:"Physics", category:"Thermodynamics", theta:1.1, se:0.30, due:false, weight:4},
  {id:"phy_therm_td", name:"Laws of Thermodynamics", subject:"Physics", category:"Thermodynamics", theta:0.7, se:0.33, due:true, weight:6},
  {id:"phy_elec_es", name:"Electrostatics", subject:"Physics", category:"Electrodynamics", theta:0.1, se:0.40, due:true, weight:10},
  {id:"phy_elec_curr", name:"Current Electricity", subject:"Physics", category:"Electrodynamics", theta:1.6, se:0.20, due:false, weight:8},
  {id:"phy_elec_mag", name:"Magnetism", subject:"Physics", category:"Electrodynamics", theta:0.5, se:0.32, due:true, weight:9},
  {id:"phy_elec_emi", name:"EMI + AC", subject:"Physics", category:"Electrodynamics", theta:-0.2, se:0.38, due:true, weight:10},
  {id:"phy_optics_ray", name:"Ray Optics", subject:"Physics", category:"Optics", theta:1.3, se:0.26, due:false, weight:7},
  {id:"phy_optics_wave", name:"Wave Optics", subject:"Physics", category:"Optics", theta:0.8, se:0.29, due:true, weight:6},
  {id:"phy_modern_atom", name:"Atomic Physics", subject:"Physics", category:"Modern", theta:1.0, se:0.27, due:false, weight:5},
  {id:"phy_modern_nuc", name:"Nuclear Physics", subject:"Physics", category:"Modern", theta:1.4, se:0.24, due:false, weight:4},
  {id:"chem_phys_mole", name:"Mole Concept", subject:"Chemistry", category:"Physical", theta:1.9, se:0.18, due:false, weight:9},
  {id:"chem_phys_atom", name:"Atomic Structure", subject:"Chemistry", category:"Physical", theta:1.1, se:0.28, due:true, weight:8},
  {id:"chem_phys_bond", name:"Chemical Bonding", subject:"Chemistry", category:"Physical", theta:0.6, se:0.34, due:true, weight:10},
  {id:"chem_phys_states", name:"States of Matter", subject:"Chemistry", category:"Physical", theta:1.7, se:0.21, due:false, weight:4},
  {id:"chem_phys_thermo", name:"Thermodynamics", subject:"Chemistry", category:"Physical", theta:0.4, se:0.36, due:true, weight:8},
  {id:"chem_phys_equil", name:"Equilibrium", subject:"Chemistry", category:"Physical", theta:0.2, se:0.37, due:true, weight:9},
  {id:"chem_phys_kin", name:"Chemical Kinetics", subject:"Chemistry", category:"Physical", theta:1.0, se:0.29, due:false, weight:6},
  {id:"chem_phys_electro", name:"Electrochemistry", subject:"Chemistry", category:"Physical", theta:0.8, se:0.31, due:true, weight:7},
  {id:"chem_inorg_pblock", name:"p-Block Elements", subject:"Chemistry", category:"Inorganic", theta:1.2, se:0.27, due:false, weight:7},
  {id:"chem_inorg_dblock", name:"d/f-Block Elements", subject:"Chemistry", category:"Inorganic", theta:0.9, se:0.30, due:true, weight:6},
  {id:"chem_inorg_coord", name:"Coordination Compounds", subject:"Chemistry", category:"Inorganic", theta:1.5, se:0.23, due:false, weight:8},
  {id:"chem_inorg_qual", name:"Qualitative Analysis", subject:"Chemistry", category:"Inorganic", theta:1.8, se:0.20, due:false, weight:5},
  {id:"chem_org_basic", name:"Basic Principles", subject:"Chemistry", category:"Organic", theta:0.7, se:0.32, due:true, weight:9},
  {id:"chem_org_hydro", name:"Hydrocarbons", subject:"Chemistry", category:"Organic", theta:0.3, se:0.35, due:true, weight:10},
  {id:"chem_org_halo", name:"Haloalkanes/Arenes", subject:"Chemistry", category:"Organic", theta:1.1, se:0.28, due:false, weight:7},
  {id:"chem_org_alc", name:"Alcohols, Phenols, Ethers", subject:"Chemistry", category:"Organic", theta:0.5, se:0.33, due:true, weight:8},
  {id:"chem_org_carbonyl", name:"Aldehydes, Ketones", subject:"Chemistry", category:"Organic", theta:-0.1, se:0.39, due:true, weight:10},
  {id:"chem_org_amine", name:"Amines", subject:"Chemistry", category:"Organic", theta:1.3, se:0.26, due:false, weight:6},
  {id:"chem_org_biomol", name:"Biomolecules", subject:"Chemistry", category:"Organic", theta:1.6, se:0.22, due:false, weight:4},
  {id:"chem_org_poly", name:"Polymers", subject:"Chemistry", category:"Organic", theta:1.4, se:0.25, due:false, weight:3},
  {id:"chem_org_prac", name:"Practical Organic", subject:"Chemistry", category:"Organic", theta:0.6, se:0.34, due:true, weight:5},
  {id:"math_alg_quad", name:"Quadratic Equations", subject:"Math", category:"Algebra", theta:1.8, se:0.19, due:false, weight:7},
  {id:"math_alg_seq", name:"Sequences & Series", subject:"Math", category:"Algebra", theta:1.2, se:0.27, due:true, weight:8},
  {id:"math_alg_perm", name:"Permutations & Combinations", subject:"Math", category:"Algebra", theta:0.4, se:0.36, due:true, weight:9},
  {id:"math_alg_bin", name:"Binomial Theorem", subject:"Math", category:"Algebra", theta:1.5, se:0.24, due:false, weight:5},
  {id:"math_alg_comp", name:"Complex Numbers", subject:"Math", category:"Algebra", theta:0.8, se:0.30, due:true, weight:8},
  {id:"math_calc_lim", name:"Limits & Continuity", subject:"Math", category:"Calculus", theta:1.1, se:0.28, due:false, weight:9},
  {id:"math_calc_diff", name:"Differentiation", subject:"Math", category:"Calculus", theta:1.7, se:0.21, due:false, weight:10},
  {id:"math_calc_app", name:"Application of Derivatives", subject:"Math", category:"Calculus", theta:0.6, se:0.33, due:true, weight:10},
  {id:"math_calc_int", name:"Indefinite Integration", subject:"Math", category:"Calculus", theta:0.2, se:0.37, due:true, weight:10},
  {id:"math_calc_def", name:"Definite Integration", subject:"Math", category:"Calculus", theta:-0.3, se:0.38, due:true, weight:10},
  {id:"math_calc_area", name:"Area Under Curves", subject:"Math", category:"Calculus", theta:0.9, se:0.29, due:false, weight:7},
  {id:"math_calc_de", name:"Differential Equations", subject:"Math", category:"Calculus", theta:0.5, se:0.34, due:true, weight:8},
  {id:"math_coord_line", name:"Straight Lines", subject:"Math", category:"Coordinate Geometry", theta:1.9, se:0.17, due:false, weight:6},
  {id:"math_coord_circle", name:"Circles", subject:"Math", category:"Coordinate Geometry", theta:1.4, se:0.25, due:false, weight:7},
  {id:"math_coord_par", name:"Parabola", subject:"Math", category:"Coordinate Geometry", theta:1.0, se:0.28, due:true, weight:8},
  {id:"math_coord_ell", name:"Ellipse", subject:"Math", category:"Coordinate Geometry", theta:0.7, se:0.31, due:true, weight:6},
  {id:"math_coord_hyp", name:"Hyperbola", subject:"Math", category:"Coordinate Geometry", theta:0.3, se:0.35, due:true, weight:6},
  {id:"math_vec_3d", name:"Vectors & 3D Geometry", subject:"Math", category:"Vectors/3D", theta:0.8, se:0.30, due:true, weight:9},
  {id:"math_prob_prob", name:"Probability", subject:"Math", category:"Probability", theta:1.3, se:0.26, due:false, weight:8},
  {id:"math_prob_stat", name:"Statistics", subject:"Math", category:"Probability", theta:1.6, se:0.22, due:false, weight:4},
  {id:"math_trig_rat", name:"Trigonometric Ratios", subject:"Math", category:"Trigonometry", theta:1.8, se:0.19, due:false, weight:7},
  {id:"math_trig_eq", name:"Trigonometric Equations", subject:"Math", category:"Trigonometry", theta:1.1, se:0.27, due:true, weight:8},
  {id:"math_trig_inv", name:"Inverse Trigonometry", subject:"Math", category:"Trigonometry", theta:0.9, se:0.29, due:true, weight:6},
  {id:"math_mat_det", name:"Matrices & Determinants", subject:"Math", category:"Algebra", theta:1.5, se:0.23, due:false, weight:7},
  {id:"math_reas", name:"Mathematical Reasoning", subject:"Math", category:"Logic", theta:1.7, se:0.21, due:false, weight:3},
]

const WEAKNESSES = [
  {topic:"Electrostatics (Physics)", theta:-0.2, se:0.38, type:"CONCEPTUAL_GAP", trend:"WORSENING", root:"Cannot visualize field superposition; sign errors in flux calc", intervention:"Concept review + 10 visualization drills + teaching-back", priority:1},
  {topic:"Definite Integration (Math)", theta:-0.3, se:0.38, type:"CARELESS", trend:"STABLE", root:"Sign errors in substitution; limit reversal mistakes", intervention:"Slow-down protocol + verification checklist + error log", priority:2},
  {topic:"Carbonyl Compounds (Chemistry)", theta:-0.1, se:0.39, type:"FORMULA_RECALL", trend:"IMPROVING", root:"Mechanism steps memorized not understood; reagent confusion", intervention:"Mechanism derivation practice + reagent flowchart + spaced review", priority:3},
  {topic:"Rotational Motion (Physics)", theta:0.3, se:0.35, type:"TIME_PRESSURE", trend:"STABLE", root:"Knows concepts but slow on MOI calculations; freezes on combined translation+rotation", intervention:"Timed MOI drills + pattern recognition for standard bodies", priority:4},
  {topic:"P&C (Math)", theta:0.4, se:0.36, type:"TRAP_FALLING", trend:"WORSENING", root:"Falls for 'identical vs distinct' traps; overcounts circular permutations", intervention:"Trap catalog review + 'what would trap me' reflection before solving", priority:5},
]

const STRENGTHS = [
  {topic:"Mole Concept (Chemistry)", theta:1.9, why:"Fast, accurate, applies to stoichiometry, electrochem, thermo"},
  {topic:"Straight Lines (Math)", theta:1.9, why:"Geometric intuition strong; solves locus problems visually"},
  {topic:"Current Electricity (Physics)", theta:1.6, why:"Circuit reduction fast; Kirchhoff's laws automatic"},
  {topic:"Differentiation (Math)", theta:1.7, why:"Rules mastered; chain rule + implicit diff fluent"},
  {topic:"Biomolecules (Chemistry)", theta:1.6, why:"NCERT-based recall solid; classification questions easy"},
]

const WEEKLY_PLAN = [
  {day:"Mon", focus:"Electrostatics Deep Dive", hours:2.5, tasks:["Gauss's Law applications (5 Qs)", "Capacitor combinations (3 Qs)", "Spaced Rep: Current Electricity (5 min)"]},
  {day:"Tue", focus:"Definite Integration Mastery", hours:2.5, tasks:["Properties + King/Queen rule (5 Qs)", "Area under curves mixed (4 Qs)", "Spaced Rep: Differentiation (5 min)"]},
  {day:"Wed", focus:"Carbonyl Mechanisms", hours:2.5, tasks:["Nucleophilic addition (4 Qs)", "Reduction/Oxidation reagents (3 Qs)", "Spaced Rep: Mole Concept (5 min)"]},
  {day:"Thu", focus:"Rotational Motion Speed", hours:2.0, tasks:["MOI of standard bodies (5 Qs, timed)", "Combined motion problems (3 Qs)", "Spaced Rep: Newton's Laws (5 min)"]},
  {day:"Fri", focus:"P&C Trap Avoidance", hours:2.0, tasks:["Identical vs distinct drill (5 Qs)", "Circular + garland permutations (3 Qs)", "Spaced Rep: Quadratic Equations (5 min)"]},
  {day:"Sat", focus:"Full Length Mock (Main Pattern)", hours:3.0, tasks:["75 Qs in 180 min", "Error analysis: classify every mistake", "Review formulas from weak topics"]},
  {day:"Sun", focus:"Review + Planning", hours:1.5, tasks:["Weakness re-attempt (10 Qs)", "Formula sheet update", "Next week plan with Arya"]},
]

function thetaColor(theta) {
  if (theta < 0.5) return '#fef2f2'
  if (theta < 1.0) return '#dbeafe'
  if (theta < 1.5) return '#93c5fd'
  if (theta < 2.0) return '#3b82f6'
  return '#1e3a8a'
}

function thetaTextColor(theta) {
  if (theta < 1.0) return '#991b1b'
  if (theta < 1.5) return '#1e40af'
  return '#ffffff'
}

function PriorityActions() {
  const actions = [
    {icon:"🎯", title:"Master Electrostatics", desc:"Your weakest high-weight topic (θ=-0.20). Do 5 Gauss's Law Qs today.", badge:"URGENT", badgeClass:"bg-red-100 text-red-700"},
    {icon:"📐", title:"Fix Definite Integration Sign Errors", desc:"Careless mistakes costing ~15 marks. Use verification checklist on every Q.", badge:"HIGH", badgeClass:"bg-amber-100 text-amber-700"},
    {icon:"⚗️", title:"Derive Carbonyl Mechanisms", desc:"Stop memorizing. Practice writing mechanisms from first principles 3×/week.", badge:"MEDIUM", badgeClass:"bg-blue-100 text-blue-700"},
  ]
  return (
    <div className="space-y-3">
      {actions.map((a, i) => (
        <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
          <span className="text-2xl">{a.icon}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2"><span className="font-medium text-slate-900">{a.title}</span><span className={`${a.badgeClass} px-2 py-0.5 text-xs rounded-full`}>{a.badge}</span></div>
            <p className="text-sm text-slate-600 mt-1">{a.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function WeaknessList() {
  return (
    <div className="space-y-3">
      {WEAKNESSES.map((w, i) => (
        <div key={i} className={`p-4 rounded-lg border-slate-200 ${w.priority<=2?'border-l-4 border-red-500 bg-red-50':w.priority<=3?'border-l-4 border-amber-500 bg-amber-50':'border-l-4 border-blue-500 bg-blue-50'}`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="font-medium text-slate-900">{w.topic}</p>
              <p className="text-xs text-slate-500 mt-0.5">Mastery: <span className="font-mono">{w.theta>0?'+':''}{w.theta.toFixed(2)} ± {w.se.toFixed(2)}</span> | Type: <span className="px-1.5 py-0.5 bg-slate-200 rounded text-xs">{w.type}</span> | Trend: <span className={w.trend==='WORSENING'?'text-red-600':w.trend==='IMPROVING'?'text-green-600':'text-slate-600'}>{w.trend}</span></p>
              <p className="text-sm text-slate-600 mt-1"><strong>Root:</strong> {w.root}</p>
              <p className="text-sm text-indigo-600 mt-1"><strong>Fix:</strong> {w.intervention}</p>
            </div>
            <span className="px-2 py-1 bg-indigo-600 text-white text-xs rounded-full">Priority {w.priority}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function StrengthList() {
  return (
    <div className="space-y-3">
      {STRENGTHS.map((s, i) => (
        <div key={i} className="p-3 bg-green-50 rounded-lg border border-green-100 flex items-start gap-3">
          <span className="text-xl">✅</span>
          <div>
            <p className="font-medium text-slate-900">{s.topic}</p>
            <p className="text-xs text-green-700 mt-0.5">{s.why}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function WeeklyPlan({ onRegen }) {
  return (
    <div className="space-y-2">
      {WEEKLY_PLAN.map((d, i) => (
        <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-900">{d.day}</span>
            <span className="text-xs text-slate-500">{d.hours} hrs</span>
          </div>
          <p className="text-sm text-indigo-600 font-medium mt-0.5">{d.focus}</p>
          <ul className="text-xs text-slate-600 mt-1 space-y-0.5">{d.tasks.map((t, j) => <li key={j}>• {t}</li>)}</ul>
        </div>
      ))}
      <button onClick={onRegen} className="mt-4 w-full px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-50 transition">Regenerate Plan</button>
    </div>
  )
}

function Heatmap() {
  const canvasRef = useRef(null)
  const tooltipRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const subjects = ["Physics", "Chemistry", "Math"]
    const categories = {
      Physics: ["Mechanics", "Thermodynamics", "Electrodynamics", "Optics", "Modern"],
      Chemistry: ["Physical", "Inorganic", "Organic"],
      Math: ["Algebra", "Calculus", "Coordinate Geometry", "Vectors/3D", "Probability", "Trigonometry", "Logic"]
    }
    const cellSize = 28
    const gap = 3
    const labelWidth = 160
    const topOffset = 40
    let maxCols = 0
    subjects.forEach(s => {
      let cols = 0
      categories[s].forEach(c => { cols += TOPICS.filter(t => t.subject===s && t.category===c).length })
      maxCols = Math.max(maxCols, cols)
    })
    const width = labelWidth + maxCols * (cellSize + gap) + 40
    const height = topOffset + subjects.length * 40 + TOPICS.length / 3 * (cellSize + gap)
    canvas.width = width
    canvas.height = height

    let y = topOffset
    ctx.font = '11px Inter, system-ui'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'

    subjects.forEach((subj) => {
      ctx.fillStyle = '#475569'
      ctx.fillText(subj, labelWidth - 10, y + 10)
      y += 22
      categories[subj].forEach((cat) => {
        const catTopics = TOPICS.filter(t => t.subject===subj && t.category===cat)
        ctx.fillStyle = '#94a3b8'
        ctx.font = '10px Inter, system-ui'
        ctx.fillText(cat, labelWidth - 10, y + 10)
        let x = labelWidth
        catTopics.forEach((t) => {
          const color = thetaColor(t.theta)
          ctx.fillStyle = color
          ctx.fillRect(x, y, cellSize, cellSize)
          if (t.due) {
            ctx.strokeStyle = '#f59e0b'
            ctx.lineWidth = 2
            ctx.strokeRect(x+1, y+1, cellSize-2, cellSize-2)
          }
          x += cellSize + gap
        })
        y += cellSize + gap
      })
    })

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const tooltip = tooltipRef.current
      let found = false
      y = topOffset
      subjects.forEach((subj) => {
        y += 22
        categories[subj].forEach((cat) => {
          const catTopics = TOPICS.filter(t => t.subject===subj && t.category===cat)
          let x = labelWidth
          catTopics.forEach((t) => {
            if (mx >= x && mx <= x+cellSize && my >= y && my <= y+cellSize) {
              tooltip.style.opacity = 1
              tooltip.style.left = (e.clientX + 12) + 'px'
              tooltip.style.top = (e.clientY - 40) + 'px'
              tooltip.innerHTML = `<strong>${t.name}</strong> (${subj} / ${cat})<br>Mastery: <span style="color:${thetaTextColor(t.theta)}">${t.theta.toFixed(2)}</span> ± ${t.se.toFixed(2)}<br>${t.due ? '⚠ Due for review' : '✓ Up to date'}<br>Exam Weight: ${t.weight}/10`
              found = true
            }
            x += cellSize + gap
          })
          y += cellSize + gap
        })
      })
      if (!found) tooltip.style.opacity = 0
    }

    const handleMouseLeave = () => {
      tooltipRef.current.style.opacity = 0
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <div className="relative" style={{height: 380}}>
      <canvas ref={canvasRef} />
      <div ref={tooltipRef} className="fixed bg-slate-900 text-white px-3 py-2 rounded text-xs pointer-events-none opacity-0 transition-opacity" style={{zIndex: 100}} />
    </div>
  )
}

function RankDistributionChart() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30].map(b => `${b}k`),
        datasets: [{
          label: 'Probability Density',
          data: [2,5,12,28,55,89,124,156,178,185,172,145,108,72,41,23,11,5,2],
          backgroundColor: [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30].map(b => b < 8.2 ? '#22c55e' : b < 19.5 ? '#6366f1' : '#ef4444'),
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
  }, [])
  return <canvas ref={canvasRef} className="h-64" />
}

export default function Dashboard() {
  const [examType, setExamType] = useState('BOTH')

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">JEE AI Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Arya — Your Personal JEE Mentor</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={examType} onChange={e => setExamType(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
            <option value="BOTH">JEE Main + Advanced</option>
            <option value="MAIN">JEE Main Only</option>
            <option value="ADV">JEE Advanced Only</option>
          </select>
          <div className="px-3 py-2 bg-slate-100 rounded-lg text-sm font-medium text-slate-700">47 days to JEE Adv 2025</div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 bg-gradient-to-br from-slate-50 to-white">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Predicted AIR</div>
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-3xl font-bold px-4 py-2 rounded-lg inline-block mt-1">12,847</div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <span className="text-green-600">▲ Improving</span>
            <span className="text-slate-400">|</span>
            <span>80% CI: 8,200 – 19,500</span>
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-slate-50 to-white">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Syllabus Coverage</div>
          <div className="text-3xl font-bold text-slate-900 mt-1">67%</div>
          <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 rounded-full transition-all duration-500" style={{width: '67%'}}></div>
          </div>
          <div className="text-xs text-slate-500 mt-1">Main: 72% | Adv: 58%</div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-slate-50 to-white">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Current Streak</div>
          <div className="text-3xl font-bold text-slate-900 mt-1">12 days</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-green-600">●</span> 1.8 hrs avg/day this week
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-slate-50 to-white">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mastery Velocity</div>
          <div className="text-3xl font-bold text-slate-900 mt-1">+0.18 θ/week</div>
          <div className="text-xs text-slate-500 mt-1">Target: +0.25 θ/week for AIR &lt; 5000</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-4">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            Topic Mastery Heatmap
          </h3>
          <Heatmap />
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 bg-slate-100 rounded">0.0–0.5</span>
            <span className="px-2 py-1 bg-blue-100 rounded">0.5–1.0</span>
            <span className="px-2 py-1 bg-blue-300 rounded">1.0–1.5</span>
            <span className="px-2 py-1 bg-blue-500 rounded">1.5–2.0</span>
            <span className="px-2 py-1 bg-indigo-700 rounded text-white">2.0+</span>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-slate-900 mb-4">Priority Actions</h3>
          <PriorityActions />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            Top Weaknesses (Root Cause Analysis)
          </h3>
          <WeaknessList />
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            Strengths to Leverage
          </h3>
          <StrengthList />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            Rank Prediction Distribution
          </h3>
          <RankDistributionChart />
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded">Median: 12,847</span>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded">P10: 8,200</span>
            <span className="px-2 py-1 bg-red-100 text-red-700 rounded">P90: 19,500</span>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            This Week's Adaptive Plan
          </h3>
          <WeeklyPlan onRegen={() => {}} />
        </div>
      </div>
    </div>
  )
}
