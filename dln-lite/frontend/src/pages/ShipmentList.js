import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllShipments } from "../services/api";

const riskColor = (score) => {
  if (score >= 0.7) return "#ef4444";
  if (score >= 0.4) return "#f59e0b";
  return "#22c55e";
};

const STATUS_COLORS = {
  CREATED:    { bg: "#1e293b", text: "#94a3b8" },
  IN_TRANSIT: { bg: "#1e3a5f", text: "#60a5fa" },
  AT_PORT:    { bg: "#1c3450", text: "#38bdf8" },
  IN_CUSTOMS: { bg: "#2d1f63", text: "#a78bfa" },
  DELAYED:    { bg: "#3b1e1e", text: "#f87171" },
  DELIVERED:  { bg: "#1a3028", text: "#4ade80" },
};

export default function ShipmentList() {
  const [shipments, setShipments] = useState([]);
  const [filtered,  setFiltered]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const navigate = useNavigate();

  useEffect(() => {
    getAllShipments()
      .then((r) => { setShipments(r.data || []); setFiltered(r.data || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Filter logic
  useEffect(() => {
    let result = shipments;

    if (statusFilter !== "ALL") {
      result = result.filter((s) => s.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((s) =>
        s.shipmentId.toLowerCase().includes(q) ||
        s.origin.toLowerCase().includes(q) ||
        s.destination.toLowerCase().includes(q) ||
        s.carrier.toLowerCase().includes(q)
      );
    }

    setFiltered(result);
  }, [search, statusFilter, shipments]);

  if (loading) return <PageState text="Loading shipments from blockchain..." />;

  const statuses = ["ALL", "CREATED", "IN_TRANSIT", "AT_PORT", "IN_CUSTOMS", "DELAYED", "DELIVERED"];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Shipments</h1>
          <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
            {filtered.length} of {shipments.length} shipments
          </p>
        </div>
        <button
          onClick={() => navigate("/shipments/new")}
          style={{ background: "#3b82f6", color: "white", border: "none", padding: "10px 20px", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 }}
        >
          + New Shipment
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search by ID, route, carrier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", padding: "9px 14px", borderRadius: 8, fontSize: 14, width: 280, outline: "none" }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "8px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer", border: "1px solid",
                borderColor: statusFilter === s ? "#3b82f6" : "#334155",
                background:  statusFilter === s ? "rgba(59,130,246,0.15)" : "transparent",
                color:       statusFilter === s ? "#3b82f6" : "#94a3b8",
              }}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>No shipments found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155", background: "#0f172a" }}>
                {["Shipment ID", "Route", "Carrier", "Cargo", "Status", "Risk Score", "Est. Arrival"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, color: "#64748b", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const sc = STATUS_COLORS[s.status] || STATUS_COLORS.CREATED;
                return (
                  <tr
                    key={s.shipmentId}
                    onClick={() => navigate(`/shipments/${s.shipmentId}`)}
                    style={{ borderBottom: "1px solid #334155", cursor: "pointer" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#0f172a"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "14px 16px", color: "#3b82f6", fontWeight: 600, fontSize: 14 }}>{s.shipmentId}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#cbd5e1" }}>
                      <div>{s.origin}</div>
                      <div style={{ color: "#64748b", fontSize: 12 }}>→ {s.destination}</div>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#94a3b8" }}>{s.carrier}</td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#94a3b8" }}>
                      <div>{s.cargoType}</div>
                      <div style={{ color: "#64748b", fontSize: 12 }}>{s.weightKg?.toLocaleString()} kg</div>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ background: sc.bg, color: sc.text, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                        {s.status.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 60, height: 6, background: "#334155", borderRadius: 3 }}>
                          <div style={{ width: `${(s.delayRiskScore || 0) * 100}%`, height: "100%", background: riskColor(s.delayRiskScore), borderRadius: 3 }} />
                        </div>
                        <span style={{ color: riskColor(s.delayRiskScore), fontSize: 13, fontWeight: 600 }}>
                          {((s.delayRiskScore || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", fontSize: 13, color: "#94a3b8" }}>
                      {s.estimatedArrival ? new Date(s.estimatedArrival).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PageState({ text }) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh", color: "#64748b" }}>{text}</div>;
}
