import { useState } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";
import api from "../services/api";

/* ─── Health Score Page ───────────────────────────────────────────────────── */
export default function HealthScorePage() {
  const [income, setIncome] = useState("");
  const [savingsBal, setSavingsBal] = useState("");
  const [debt, setDebt] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: d } = await api.get("/analytics/health-score", {
        params: {
          monthly_income: Number(income) || 0,
          savings_balance: Number(savingsBal) || 0,
          monthly_debt_payments: Number(debt) || 0,
        },
      });
      setData(d);
    } catch (e) {
      setError(e?.response?.data?.detail || "Could not compute health score.");
    } finally {
      setLoading(false);
    }
  };

  const radarData = data?.axes?.map((a) => ({ subject: a.name, score: a.score }));

  const gradeColor = (g) =>
    ({ A: "#22c55e", B: "#84cc16", C: "#f59e0b", D: "#f97316", F: "#ef4444" }[g] || "#94a3b8");

  return (
    <div style={s.page}>
      <header style={s.header}>
        <span style={s.headerIcon}>❤️</span>
        <div>
          <h1 style={s.title}>Financial Health Score</h1>
          <p style={s.subtitle}>Your complete financial fitness report</p>
        </div>
      </header>

      {/* ── Config bar ── */}
      <div style={s.configBar}>
        {[
          { label: "Monthly Income", val: income, set: setIncome, prefix: "$" },
          { label: "Savings Balance", val: savingsBal, set: setSavingsBal, prefix: "$" },
          { label: "Monthly Debt Payments", val: debt, set: setDebt, prefix: "$" },
        ].map(({ label, val, set, prefix }) => (
          <div key={label} style={s.inputWrap}>
            <label style={s.inputLabel}>{label}</label>
            <div style={s.inputRow}>
              <span style={s.prefix}>{prefix}</span>
              <input
                style={s.input}
                type="number" min="0"
                value={val}
                onChange={(e) => set(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        ))}
        <button
          style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
          onClick={fetch} disabled={loading}
        >
          {loading ? "Computing…" : "Calculate Score"}
        </button>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {data && (
        <div style={s.mainGrid}>
          {/* ── Left: Overall score + badges ── */}
          <div style={s.leftCol}>
            {/* Score circle */}
            <div style={s.scoreCard}>
              <ScoreRing score={data.overall_score} grade={data.grade} gradeColor={gradeColor(data.grade)} />
              <p style={{ ...s.overallLabel, color: gradeColor(data.grade) }}>
                {data.overall_label}
              </p>
              <p style={s.streakBadge}>🔥 {data.streak_days}-day logging streak</p>
            </div>

            {/* Badges */}
            {data.badges?.length > 0 && (
              <div style={s.badgesCard}>
                <p style={s.sectionLabel}>Achievements</p>
                <div style={s.badgeGrid}>
                  {data.badges.map((b) => (
                    <span key={b} style={s.badge}>{b}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Axis scores list */}
            <div style={s.axisListCard}>
              <p style={s.sectionLabel}>Axis Breakdown</p>
              {data.axes.map((a) => (
                <div key={a.name} style={s.axisRow}>
                  <span style={s.axisIcon}>{a.icon}</span>
                  <div style={s.axisInfo}>
                    <div style={s.axisTop}>
                      <span style={s.axisName}>{a.name}</span>
                      <span style={{ ...s.axisScore, color: scoreColor(a.score) }}>
                        {a.score}
                      </span>
                    </div>
                    <div style={s.barTrack}>
                      <div
                        style={{
                          ...s.barFill,
                          width: `${a.score}%`,
                          background: scoreGradient(a.score),
                        }}
                      />
                    </div>
                    <p style={s.axisInsight}>{a.insight}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Radar chart ── */}
          <div style={s.rightCol}>
            <div style={s.radarCard}>
              <p style={s.sectionLabel}>Radar View</p>
              <ResponsiveContainer width="100%" height={360}>
                <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                  <PolarGrid stroke="#2a2d3a" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 600 }}
                  />
                  <PolarRadiusAxis
                    angle={30} domain={[0, 100]}
                    tick={{ fill: "#475569", fontSize: 10 }}
                    axisLine={false}
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.25}
                    strokeWidth={2}
                    dot={{ fill: "#a5b4fc", r: 4 }}
                  />
                  <Tooltip content={<RadarTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* ── Tips ── */}
            <div style={s.tipsCard}>
              <p style={s.sectionLabel}>Improvement Tips</p>
              {data.axes
                .filter((a) => a.score < 70)
                .sort((a, b) => a.score - b.score)
                .slice(0, 3)
                .map((a) => (
                  <div key={a.name} style={s.tipRow}>
                    <span style={s.tipIcon}>{a.icon}</span>
                    <div>
                      <p style={s.tipTitle}>{a.name} — {a.label}</p>
                      <p style={s.tipText}>{a.insight}</p>
                    </div>
                  </div>
                ))}
              {data.axes.every((a) => a.score >= 70) && (
                <p style={s.allGoodText}>🎉 All axes looking healthy — keep it up!</p>
              )}
            </div>
          </div>
        </div>
      )}

      {!data && !loading && (
        <div style={s.emptyState}>
          <ScoreRingEmpty />
          <p style={s.emptyTitle}>Fill in your financial details and compute your score</p>
          <p style={s.emptySub}>
            We evaluate Savings Rate, Budget Adherence, Spending Stability,
            Debt-to-Income, and Emergency Buffer — then visualise them as an interactive radar.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Score Ring ─────────────────────────────────────────────────────────── */
function ScoreRing({ score, grade, gradeColor }) {
  const r = 70;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div style={{ position: "relative", width: 180, height: 180, margin: "0 auto" }}>
      <svg width="180" height="180" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="90" cy="90" r={r} fill="none" stroke="#2a2d3a" strokeWidth="14" />
        <circle
          cx="90" cy="90" r={r} fill="none" stroke={gradeColor}
          strokeWidth="14" strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div style={s.ringInner}>
        <p style={{ ...s.ringScore, color: gradeColor }}>{score}</p>
        <p style={{ ...s.ringGrade, color: gradeColor }}>{grade}</p>
      </div>
    </div>
  );
}

function ScoreRingEmpty() {
  return (
    <div style={{ position: "relative", width: 160, height: 160, margin: "0 auto 16px" }}>
      <svg width="160" height="160" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="80" cy="80" r={60} fill="none" stroke="#2a2d3a" strokeWidth="14" strokeDasharray="4 8" />
      </svg>
      <div style={{ ...s.ringInner, fontSize: 40 }}>❤️</div>
    </div>
  );
}

function RadarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={s.tooltip}>
      <p style={{ margin: 0, fontWeight: 700, color: "#f1f5f9", fontSize: 13 }}>{payload[0]?.payload?.subject}</p>
      <p style={{ margin: "4px 0 0", color: "#a5b4fc", fontSize: 13 }}>Score: <b>{payload[0]?.value}</b>/100</p>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const scoreColor = (s) => s >= 80 ? "#22c55e" : s >= 60 ? "#f59e0b" : "#ef4444";
const scoreGradient = (s) =>
  s >= 80 ? "linear-gradient(90deg,#059669,#22c55e)"
  : s >= 60 ? "linear-gradient(90deg,#d97706,#f59e0b)"
  : "linear-gradient(90deg,#dc2626,#ef4444)";

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const s = {
  page: { padding: "28px 32px", minHeight: "100vh", background: "#0f1117" },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 28 },
  headerIcon: { fontSize: 40 },
  title: { margin: 0, fontSize: 26, fontWeight: 700, color: "#f1f5f9" },
  subtitle: { margin: "4px 0 0", fontSize: 14, color: "#64748b" },
  configBar: {
    background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: 14,
    padding: "20px 24px", display: "flex", flexWrap: "wrap", gap: 20,
    alignItems: "flex-end", marginBottom: 28,
  },
  inputWrap: { display: "flex", flexDirection: "column", gap: 6 },
  inputLabel: { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" },
  inputRow: { display: "flex" },
  prefix: { background: "#2a2d3a", border: "1px solid #3a3d4a", borderRight: "none", borderRadius: "8px 0 0 8px", padding: "8px 10px", color: "#64748b", fontSize: 14 },
  input: { background: "#0f1117", border: "1px solid #3a3d4a", borderRadius: "0 8px 8px 0", padding: "8px 14px", color: "#f1f5f9", fontSize: 14, width: 130, outline: "none" },
  btn: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 10, padding: "10px 22px", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
  errorBox: { background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 20 },
  mainGrid: { display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 24 },
  leftCol: { display: "flex", flexDirection: "column", gap: 20 },
  rightCol: { display: "flex", flexDirection: "column", gap: 20 },
  scoreCard: { background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: 16, padding: 28, textAlign: "center" },
  ringInner: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" },
  ringScore: { margin: 0, fontSize: 36, fontWeight: 900 },
  ringGrade: { margin: 0, fontSize: 18, fontWeight: 800 },
  overallLabel: { margin: "12px 0 0", fontSize: 16, fontWeight: 700 },
  streakBadge: { margin: "8px 0 0", fontSize: 13, color: "#f97316" },
  badgesCard: { background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: 16, padding: 20 },
  sectionLabel: { margin: "0 0 12px", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" },
  badgeGrid: { display: "flex", flexWrap: "wrap", gap: 8 },
  badge: { background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 20, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: "#a5b4fc" },
  axisListCard: { background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: 16, padding: 20 },
  axisRow: { display: "flex", gap: 12, marginBottom: 18 },
  axisIcon: { fontSize: 22, flexShrink: 0, marginTop: 2 },
  axisInfo: { flex: 1 },
  axisTop: { display: "flex", justifyContent: "space-between", marginBottom: 6 },
  axisName: { fontSize: 13, fontWeight: 600, color: "#e2e8f0" },
  axisScore: { fontSize: 13, fontWeight: 800 },
  barTrack: { height: 6, background: "#2a2d3a", borderRadius: 3, overflow: "hidden", marginBottom: 6 },
  barFill: { height: "100%", borderRadius: 3, transition: "width 1s ease" },
  axisInsight: { margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.5 },
  radarCard: { background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: 16, padding: 24 },
  tipsCard: { background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: 16, padding: 24, flex: 1 },
  tipRow: { display: "flex", gap: 12, marginBottom: 16 },
  tipIcon: { fontSize: 22, flexShrink: 0 },
  tipTitle: { margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "#e2e8f0" },
  tipText: { margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.5 },
  allGoodText: { margin: 0, fontSize: 14, color: "#34d399", textAlign: "center", padding: "16px 0" },
  tooltip: { background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: 8, padding: "10px 14px" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 360, gap: 12, textAlign: "center", padding: 40 },
  emptyTitle: { margin: 0, fontSize: 17, fontWeight: 600, color: "#475569" },
  emptySub: { margin: 0, fontSize: 13, color: "#334155", maxWidth: 500, lineHeight: 1.7 },
};
