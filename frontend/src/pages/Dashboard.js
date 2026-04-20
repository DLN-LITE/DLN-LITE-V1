import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSummary, getAllShipments } from "../services/api";

const riskColor = s => s >= 0.7 ? "#ef4444" : s >= 0.4 ? "#f59e0b" : "#22c55e";
const STATUS_CONFIG = {
  IN_TRANSIT: { bg: "rgba(96,165,250,0.12)", text: "#60a5fa", dot: "#3b82f6", label: "In Transit" },
  AT_PORT: { bg: "rgba(56,189,248,0.12)", text: "#38bdf8", dot: "#0ea5e9", label: "At Port" },
  IN_CUSTOMS: { bg: "rgba(167,139,250,0.12)", text: "#a78bfa", dot: "#8b5cf6", label: "In Customs" },
  DELAYED: { bg: "rgba(239,68,68,0.12)", text: "#f87171", dot: "#ef4444", label: "Delayed" },
  DELIVERED: { bg: "rgba(34,197,94,0.12)", text: "#4ade80", dot: "#22c55e", label: "Delivered" },
  CREATED: { bg: "rgba(148,163,184,0.12)", text: "#94a3b8", dot: "#64748b", label: "Created" },
};

const STAT_CARDS = [
  { key: "total", label: "Total Shipments", color: "#3b82f6", glow: "rgba(59,130,246,0.3)", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  { key: "inTransit", label: "In Transit", color: "#a78bfa", glow: "rgba(139,92,246,0.3)", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { key: "delivered", label: "Delivered", color: "#22c55e", glow: "rgba(34,197,94,0.3)", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  { key: "delayed", label: "Delayed", color: "#f87171", glow: "rgba(239,68,68,0.3)", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { key: "highRisk", label: "High Risk", color: "#fb923c", glow: "rgba(249,115,22,0.3)", icon: "M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" },
  { key: "avgRiskScore", label: "Avg Risk Score", color: "#f59e0b", glow: "rgba(245,158,11,0.3)", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10", isPercent: true },
];

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getSummary(), getAllShipments()])
      .then(([s, all]) => { setSummary(s.data); setShipments(all.data || []); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "3px solid rgba(59,130,246,0.3)", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ color: "#64748b", fontSize: 14 }}>Loading ledger data...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const highRisk = [...shipments].filter(s => (s.delayRiskScore || 0) >= 0.7 && s.status !== "DELIVERED").sort((a, b) => b.delayRiskScore - a.delayRiskScore).slice(0, 5);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#f8fafc", marginBottom: 6, letterSpacing: "-0.5px" }}>Network Overview</h1>
        <p style={{ color: "#64748b", fontSize: 14 }}>Live view of the DLN-Lite decentralised logistics ledger</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
        {STAT_CARDS.map(({ key, label, color, glow, icon, isPercent }) => (
          <div key={key} style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.03) 0%,rgba(255,255,255,0.01) 100%)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px 22px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: glow, filter: "blur(30px)" }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>{label}</div>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `rgba(${color === "#3b82f6" ? "59,130,246" : color === "#a78bfa" ? "139,92,246" : color === "#22c55e" ? "34,197,94" : color === "#f87171" ? "239,68,68" : color === "#fb923c" ? "249,115,22" : "245,158,11"},0.15)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" fill="none" stroke={color} viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d={icon} /></svg>
              </div>
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color, letterSpacing: "-1px", lineHeight: 1 }}>
              {isPercent ? `${((summary?.[key] || 0) * 100).toFixed(0)}%` : (summary?.[key] || 0)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.025) 0%,rgba(255,255,255,0.01) 100%)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 8px #ef4444" }} />
            <span style={{ fontWeight: 600, fontSize: 15, color: "#f1f5f9" }}>High-Risk Shipments</span>
            <span style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", fontSize: 12, padding: "2px 8px", borderRadius: 20, border: "1px solid rgba(239,68,68,0.2)" }}>{highRisk.length}</span>
          </div>
          <button onClick={() => navigate("/shipments")} style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", color: "#60a5fa", padding: "7px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
            View All →
          </button>
        </div>
        {highRisk.length === 0
          ? <div style={{ padding: 48, textAlign: "center", color: "#475569" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 15, color: "#64748b" }}>No high-risk shipments right now</div>
          </div>
          : <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                {["Shipment ID", "Route", "Carrier", "Status", "Risk Score", "Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, color: "#475569", fontWeight: 600, letterSpacing: "0.8px", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {highRisk.map(s => {
                const sc = STATUS_CONFIG[s.status] || STATUS_CONFIG.CREATED;
                const risk = s.delayRiskScore || 0;
                return (
                  <tr key={s.shipmentId} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{ color: "#60a5fa", fontWeight: 700, fontSize: 14, cursor: "pointer" }} onClick={() => navigate(`/shipments/${s.shipmentId}`)}>{s.shipmentId}</span>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ fontSize: 13, color: "#cbd5e1" }}>{s.origin}</div>
                      <div style={{ fontSize: 12, color: "#475569" }}>→ {s.destination}</div>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "#94a3b8" }}>{s.carrier}</td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{ background: sc.bg, color: sc.text, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot, display: "inline-block" }} />
                        {sc.label}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, maxWidth: 80, overflow: "hidden" }}>
                          <div style={{ width: `${risk * 100}%`, height: "100%", background: riskColor(risk), borderRadius: 3, boxShadow: `0 0 6px ${riskColor(risk)}` }} />
                        </div>
                        <span style={{ color: riskColor(risk), fontWeight: 700, fontSize: 13, minWidth: 32 }}>{(risk * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <button onClick={() => navigate(`/shipments/${s.shipmentId}`)} style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)", color: "#60a5fa", padding: "5px 12px", borderRadius: 7, cursor: "pointer", fontSize: 12 }}>
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        }
      </div>
    </div>
  );
}