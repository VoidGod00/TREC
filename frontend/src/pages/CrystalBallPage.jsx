import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, CartesianGrid,
} from "recharts";
import api from "../services/api";

/* ─── Predictive Budgeting Page ───────────────────────────────────────────── */
export default function CrystalBallPage() {
  const [income, setIncome] = useState("");
  const [savings, setSavings] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: d } = await api.get("/analytics/forecast", {
        params: {
          monthly_income: Number(income) || 0,
          savings_balance: Number(savings) || 0,
        },
      });
      setData(d);
    } catch (e) {
      setError(e?.response?.data?.detail || "Forecast failed.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = data?.category_forecasts?.map((f) => ({
    name: f.category,
    spent: f.current_month_spent,
    predicted: f.predicted_month_total - f.current_month_spent,
    budget: f.monthly_budget,
    total: f.predicted_month_total,
    risk: f.overspend_risk,
  }));

  return (
    <div style={s.page}>
      <header style={s.header}>
        <span style={s.headerIcon}>🔮</span>
        <div>
          <h1 style={s.title}>Crystal Ball</h1>
          <p style={s.subtitle}>AI-powered spending forecast for this month</p>
        </div>
      </header>

      {/* ── Config bar ── */}
      <div style={s.configBar}>
        <InputField
          label="Monthly Income"
          value={income}
          onChange={setIncome}
          placeholder="e.g. 5000"
          prefix="$"
        />
        <InputField
          label="Savings Balance"
          value={savings}
          onChange={setSavings}
          placeholder="e.g. 8000"
          prefix="$"
        />
        <button style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }} onClick={fetch} disabled={loading}>
          {loading ? "🔮 Forecasting…" : "Generate Forecast"}
        </button>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {data && (
        <>
          {/* ── KPI strip ── */}
          <div style={s.kpiRow}>
            <KpiCard label="Spent So Far" value={`$${data.total_spent_so_far.toLocaleString()}`} icon="💸" />
            <KpiCard
              label="Predicted Total"
              value={`$${data.predicted_month_total.toLocaleString()}`}
              icon="📈"
              accent={data.predicted_month_total > data.monthly_income_estimate}
            />
            <KpiCard
              label="Predicted Savings"
              value={`$${data.predicted_savings.toLocaleString()}`}
              icon="💰"
              positive={data.predicted_savings >= 0}
            />
            <KpiCard label="Savings Rate" value={`${data.savings_rate_pct}%`} icon="📊" />
            <KpiCard label="Days Remaining" value={data.days_remaining_in_month} icon="📅" />
            {data.burnout_date && (
              <KpiCard
                label="Funds Last Until"
                value={new Date(data.burnout_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                icon="⚠️"
                accent
              />
            )}
          </div>

          {/* ── AI narrative ── */}
          <div style={s.narrativeBox}>
            <span style={s.narrativeIcon}>🤖</span>
            <p style={s.narrativeText}>{data.ai_narrative}</p>
          </div>

          {/* ── Bar chart ── */}
          <div style={s.card}>
            <h2 style={s.cardTitle}>Category Forecast</h2>
            <p style={s.cardSub}>
              <span style={s.legendDot("#6366f1")} /> Spent so far &nbsp;
              <span style={s.legendDot("#a5b4fc")} /> Predicted remaining &nbsp;
              <span style={s.legendDot("#f59e0b")} /> Budget limit
            </p>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="spent" stackId="a" fill="#6366f1" radius={[0, 0, 4, 4]} />
                <Bar dataKey="predicted" stackId="a" radius={[4, 4, 0, 0]}>
                  {chartData?.map((entry, i) => (
                    <Cell key={i} fill={entry.risk ? "#ef444480" : "#a5b4fc80"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Category table ── */}
          <div style={s.card}>
            <h2 style={s.cardTitle}>Category Breakdown</h2>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Category", "Spent", "Predicted Total", "Budget", "Status"].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.category_forecasts.map((f) => (
                  <tr key={f.category} style={s.tr}>
                    <td style={s.td}>{f.category}</td>
                    <td style={s.td}>${f.current_month_spent.toFixed(0)}</td>
                    <td style={s.td}>${f.predicted_month_total.toFixed(0)}</td>
                    <td style={s.td}>{f.monthly_budget ? `$${f.monthly_budget}` : "—"}</td>
                    <td style={s.td}>
                      {f.overspend_risk ? (
                        <span style={s.badgeRed}>⚠️ Over by ${f.overspend_amount?.toFixed(0)}</span>
                      ) : (
                        <span style={s.badgeGreen}>✅ On track</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!data && !loading && (
        <div style={s.emptyState}>
          <span style={{ fontSize: 72 }}>🔮</span>
          <p style={s.emptyTitle}>Enter your income and click Generate Forecast</p>
          <p style={s.emptySub}>
            Prophet analyses your last 6 months of spending to predict this month's totals,
            then Gemini explains what it means for your finances.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function KpiCard({ label, value, icon, accent, positive }) {
  const valueColor = accent ? "#f87171" : positive === false ? "#f87171" : positive === true ? "#34d399" : "#f1f5f9";
  return (
    <div style={s.kpiCard}>
      <span style={s.kpiIcon}>{icon}</span>
      <p style={{ ...s.kpiValue, color: valueColor }}>{value}</p>
      <p style={s.kpiLabel}>{label}</p>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, prefix }) {
  return (
    <div style={s.inputWrap}>
      <label style={s.inputLabel}>{label}</label>
      <div style={s.inputRow}>
        {prefix && <span style={s.inputPrefix}>{prefix}</span>}
        <input
          style={s.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type="number"
          min="0"
        />
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const spent = payload.find((p) => p.dataKey === "spent")?.value || 0;
  const pred = payload.find((p) => p.dataKey === "predicted")?.value || 0;
  return (
    <div style={s.tooltip}>
      <p style={s.tooltipTitle}>{label}</p>
      <p style={s.tooltipRow}>Spent: <b>${spent.toFixed(0)}</b></p>
      <p style={s.tooltipRow}>Remaining predicted: <b>${pred.toFixed(0)}</b></p>
      <p style={s.tooltipRow}>Projected total: <b>${(spent + pred).toFixed(0)}</b></p>
    </div>
  );
}

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
    alignItems: "flex-end", marginBottom: 24,
  },
  inputWrap: { display: "flex", flexDirection: "column", gap: 6 },
  inputLabel: { fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" },
  inputRow: { display: "flex", alignItems: "center" },
  inputPrefix: { background: "#2a2d3a", border: "1px solid #3a3d4a", borderRight: "none", borderRadius: "8px 0 0 8px", padding: "8px 10px", color: "#64748b", fontSize: 14 },
  input: {
    background: "#0f1117", border: "1px solid #3a3d4a", borderRadius: "0 8px 8px 0",
    padding: "8px 14px", color: "#f1f5f9", fontSize: 14, width: 130,
    outline: "none",
  },
  btn: {
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    border: "none", borderRadius: 10, padding: "10px 22px",
    color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
  },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
  errorBox: {
    background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444",
    borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13, marginBottom: 16,
  },
  kpiRow: { display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 24 },
  kpiCard: {
    background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: 14,
    padding: "16px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: "1 1 140px",
  },
  kpiIcon: { fontSize: 22 },
  kpiValue: { margin: 0, fontSize: 20, fontWeight: 800, color: "#f1f5f9" },
  kpiLabel: { margin: 0, fontSize: 11, color: "#475569", textAlign: "center" },
  narrativeBox: {
    background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))",
    border: "1px solid rgba(99,102,241,0.3)", borderRadius: 14,
    padding: "18px 24px", display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 24,
  },
  narrativeIcon: { fontSize: 28, flexShrink: 0 },
  narrativeText: { margin: 0, fontSize: 14, lineHeight: 1.7, color: "#c7d2fe" },
  card: { background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: 16, padding: 24, marginBottom: 24 },
  cardTitle: { margin: "0 0 4px", fontSize: 17, fontWeight: 700, color: "#f1f5f9" },
  cardSub: { margin: "0 0 20px", fontSize: 12, color: "#64748b" },
  legendDot: (color) => ({
    display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, marginRight: 4,
  }),
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #2a2d3a" },
  tr: { borderBottom: "1px solid #1e2130" },
  td: { padding: "12px", fontSize: 13, color: "#94a3b8" },
  badgeRed: { background: "rgba(239,68,68,0.15)", color: "#f87171", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 },
  badgeGreen: { background: "rgba(16,185,129,0.15)", color: "#34d399", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 600 },
  tooltip: { background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: 8, padding: "10px 14px" },
  tooltipTitle: { margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "#f1f5f9" },
  tooltipRow: { margin: "2px 0", fontSize: 12, color: "#94a3b8" },
  emptyState: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    minHeight: 320, gap: 12, textAlign: "center", padding: 40,
  },
  emptyTitle: { margin: 0, fontSize: 17, fontWeight: 600, color: "#475569" },
  emptySub: { margin: 0, fontSize: 13, color: "#334155", maxWidth: 480 },
};
