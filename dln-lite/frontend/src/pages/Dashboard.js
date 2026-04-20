import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSummary, getAllShipments } from "../services/api";

// ── Helpers ────────────────────────────────────────────────────────────────

const riskColor = (score) => {
  if (score >= 0.7) return "#ef4444";  // red
  if (score >= 0.4) return "#f59e0b";  // amber
  return "#22c55e";                    // green
};

const riskLabel = (score) => {
  if (score >= 0.7) return "HIGH";
  if (score >= 0.4) return "MEDIUM";
  return "LOW";
};

// ── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = "#3b82f6" }) {
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "20px 24px", flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [summary,   setSummary]   = useState(null);
  const [shipments, setShipments] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getSummary(), getAllShipments()])
      .then(([s, all]) => {
        setSummary(s.data);
        setShipments(all.data || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageState text="Loading dashboard..." />;
  if (error)   return <PageState text={`Error: ${error}`} color="#ef4444" />;

  const highRisk = shipments
    .filter((s) => s.delayRiskScore >= 0.7 && s.status !== "DELIVERED")
    .sort((a, b) => b.delayRiskScore - a.delayRiskScore)
    .slice(0, 5);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Dashboard</h1>
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14 }}>
        Live overview of the DLN-Lite logistics network
      </p>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
        <StatCard label="Total Shipments"   value={summary.total}      color="#3b82f6" />
        <StatCard label="In Transit"        value={summary.inTransit}  color="#8b5cf6" />
        <StatCard label="Delivered"         value={summary.delivered}  color="#22c55e" />
        <StatCard label="Delayed"           value={summary.delayed}    color="#ef4444" />
        <StatCard label="High Risk"         value={summary.highRisk}   color="#f59e0b" sub="≥70% risk score" />
        <StatCard label="Avg Risk Score"    value={`${(summary.avgRiskScore * 100).toFixed(1)}%`} color="#f59e0b" />
      </div>

      {/* ── High-risk shipments table ─────────────────────────────────────── */}
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>🔴 High-Risk Shipments</h2>
          <button
            onClick={() => navigate("/shipments")}
            style={{ background: "transparent", border: "1px solid #334155", color: "#94a3b8", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}
          >
            View all
          </button>
        </div>

        {highRisk.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "#64748b" }}>No high-risk shipments right now ✅</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155" }}>
                {["Shipment ID", "Route", "Carrier", "Status", "Risk Score"].map((h) => (
                  <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 12, color: "#64748b", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {highRisk.map((s) => (
                <tr
                  key={s.shipmentId}
                  onClick={() => navigate(`/shipments/${s.shipmentId}`)}
                  style={{ borderBottom: "1px solid #1e293b", cursor: "pointer", transition: "background 0.1s" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#0f172a"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "12px 20px", fontSize: 14, color: "#3b82f6", fontWeight: 600 }}>{s.shipmentId}</td>
                  <td style={{ padding: "12px 20px", fontSize: 13, color: "#cbd5e1" }}>{s.origin} → {s.destination}</td>
                  <td style={{ padding: "12px 20px", fontSize: 13, color: "#94a3b8" }}>{s.carrier}</td>
                  <td style={{ padding: "12px 20px" }}>
                    <span style={{ background: "#1e3a5f", color: "#60a5fa", padding: "3px 10px", borderRadius: 20, fontSize: 12 }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: "#334155", borderRadius: 3, maxWidth: 80 }}>
                        <div style={{ width: `${s.delayRiskScore * 100}%`, height: "100%", background: riskColor(s.delayRiskScore), borderRadius: 3 }} />
                      </div>
                      <span style={{ color: riskColor(s.delayRiskScore), fontWeight: 600, fontSize: 13 }}>
                        {(s.delayRiskScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PageState({ text, color = "#64748b" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color, fontSize: 16 }}>
      {text}
    </div>
  );
}
