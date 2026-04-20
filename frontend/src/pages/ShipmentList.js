import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllShipments } from "../services/api";

const STATUS_CONFIG = {
  IN_TRANSIT: { bg: "rgba(96,165,250,0.12)", text: "#60a5fa", dot: "#3b82f6", label: "In Transit" },
  AT_PORT: { bg: "rgba(56,189,248,0.12)", text: "#38bdf8", dot: "#0ea5e9", label: "At Port" },
  IN_CUSTOMS: { bg: "rgba(167,139,250,0.12)", text: "#a78bfa", dot: "#8b5cf6", label: "In Customs" },
  DELAYED: { bg: "rgba(239,68,68,0.12)", text: "#f87171", dot: "#ef4444", label: "Delayed" },
  DELIVERED: { bg: "rgba(34,197,94,0.12)", text: "#4ade80", dot: "#22c55e", label: "Delivered" },
  CREATED: { bg: "rgba(148,163,184,0.12)", text: "#94a3b8", dot: "#64748b", label: "Created" },
};
const riskColor = s => s >= 0.7 ? "#ef4444" : s >= 0.4 ? "#f59e0b" : "#22c55e";
const riskLabel = s => s >= 0.7 ? "HIGH" : s >= 0.4 ? "MEDIUM" : "LOW";

export default function ShipmentList() {
  const [shipments, setShipments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const navigate = useNavigate();

  useEffect(() => { getAllShipments().then(r => { setShipments(r.data || []); setFiltered(r.data || []); }).catch(console.error).finally(() => setLoading(false)); }, []);

  useEffect(() => {
    let r = shipments;
    if (statusFilter !== "ALL") r = r.filter(s => s.status === statusFilter);
    if (search.trim()) { const q = search.toLowerCase(); r = r.filter(s => s.shipmentId.toLowerCase().includes(q) || s.origin.toLowerCase().includes(q) || s.destination.toLowerCase().includes(q) || s.carrier.toLowerCase().includes(q)); }
    setFiltered(r);
  }, [search, statusFilter, shipments]);

  const statuses = ["ALL", "CREATED", "IN_TRANSIT", "AT_PORT", "IN_CUSTOMS", "DELAYED", "DELIVERED"];

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh", color: "#64748b" }}>Loading shipments from blockchain...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#f8fafc", marginBottom: 6, letterSpacing: "-0.5px" }}>Shipments</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>{filtered.length} of {shipments.length} shipments on ledger</p>
        </div>
        <button onClick={() => navigate("/shipments/new")} style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", color: "white", border: "none", padding: "11px 22px", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14, boxShadow: "0 4px 15px rgba(59,130,246,0.3)" }}>
          + New Shipment
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
          <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} width="14" height="14" fill="none" stroke="#64748b" viewBox="0 0 24 24" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
          <input type="text" placeholder="Search by ID, route, carrier..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", padding: "10px 14px 10px 34px", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {statuses.map(s => {
            const sc = STATUS_CONFIG[s];
            const active = statusFilter === s;
            return (
              <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: "9px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid", borderColor: active ? (sc?.dot || "#3b82f6") : "rgba(255,255,255,0.08)", background: active ? (sc?.bg || "rgba(59,130,246,0.12)") : "transparent", color: active ? (sc?.text || "#60a5fa") : "#64748b", transition: "all 0.15s" }}>
                {s.replace("_", " ")}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.025) 0%,rgba(255,255,255,0.01) 100%)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden" }}>
        {filtered.length === 0
          ? <div style={{ padding: 48, textAlign: "center", color: "#475569", fontSize: 15 }}>No shipments found.</div>
          : <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)" }}>
                {["Shipment ID", "Route", "Carrier", "Cargo", "Status", "Risk", "Arrival"].map(h => (
                  <th key={h} style={{ padding: "13px 18px", textAlign: "left", fontSize: 11, color: "#475569", fontWeight: 600, letterSpacing: "0.8px", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const sc = STATUS_CONFIG[s.status] || STATUS_CONFIG.CREATED;
                const risk = s.delayRiskScore || 0;
                return (
                  <tr key={s.shipmentId} onClick={() => navigate(`/shipments/${s.shipmentId}`)} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "15px 18px" }}>
                      <div style={{ color: "#60a5fa", fontWeight: 700, fontSize: 14 }}>{s.shipmentId}</div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{s.containerId}</div>
                    </td>
                    <td style={{ padding: "15px 18px" }}>
                      <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 500 }}>{s.origin}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>→ {s.destination}</div>
                    </td>
                    <td style={{ padding: "15px 18px", fontSize: 13, color: "#94a3b8" }}>{s.carrier}</td>
                    <td style={{ padding: "15px 18px" }}>
                      <div style={{ fontSize: 13, color: "#cbd5e1" }}>{s.cargoType}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{(s.weightKg || 0).toLocaleString()} kg</div>
                    </td>
                    <td style={{ padding: "15px 18px" }}>
                      <span style={{ background: sc.bg, color: sc.text, padding: "5px 11px", borderRadius: 20, fontSize: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot }} />
                        {sc.label}
                      </span>
                    </td>
                    <td style={{ padding: "15px 18px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 56, height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${risk * 100}%`, height: "100%", background: riskColor(risk) }} />
                          </div>
                          <span style={{ color: riskColor(risk), fontWeight: 700, fontSize: 13 }}>{(risk * 100).toFixed(0)}%</span>
                        </div>
                        <span style={{ fontSize: 10, color: riskColor(risk), fontWeight: 600, letterSpacing: "0.5px" }}>{riskLabel(risk)}</span>
                      </div>
                    </td>
                    <td style={{ padding: "15px 18px", fontSize: 13, color: "#94a3b8" }}>
                      {s.estimatedArrival ? new Date(s.estimatedArrival).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
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