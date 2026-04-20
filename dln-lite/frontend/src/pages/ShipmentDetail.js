import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getShipment, getShipmentHistory, recordEvent, markDelivered } from "../services/api";

const riskColor = (score) => score >= 0.7 ? "#ef4444" : score >= 0.4 ? "#f59e0b" : "#22c55e";

export default function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [shipment, setShipment] = useState(null);
  const [history,  setHistory]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventForm, setEventForm] = useState({ eventType: "DEPARTED_PORT", location: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const EVENT_TYPES = ["DEPARTED_PORT", "ARRIVED_PORT", "CUSTOMS_ENTRY", "CUSTOMS_CLEARED", "TRANSSHIPMENT", "DELAY_REPORTED", "INSPECTION"];

  useEffect(() => {
    Promise.all([getShipment(id), getShipmentHistory(id)])
      .then(([s, h]) => { setShipment(s.data); setHistory(h.data || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleRecordEvent = async () => {
    if (!eventForm.location || !eventForm.description) return alert("Please fill all fields.");
    setSubmitting(true);
    try {
      const updated = await recordEvent(id, eventForm);
      setShipment(updated.data);
      setShowEventForm(false);
      setEventForm({ eventType: "DEPARTED_PORT", location: "", description: "" });
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeliver = async () => {
    if (!window.confirm("Mark this shipment as DELIVERED?")) return;
    try {
      const updated = await markDelivered(id);
      setShipment(updated.data);
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  if (loading)  return <Center>Loading shipment from blockchain...</Center>;
  if (!shipment) return <Center>Shipment not found.</Center>;

  const risk = shipment.delayRiskScore || 0;

  return (
    <div>
      {/* Back */}
      <button onClick={() => navigate("/shipments")} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14, marginBottom: 16 }}>
        ← Back to shipments
      </button>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#3b82f6" }}>{shipment.shipmentId}</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>{shipment.origin} → {shipment.destination}</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {shipment.status !== "DELIVERED" && (
            <>
              <button onClick={() => setShowEventForm(true)} style={{ background: "#3b82f6", color: "white", border: "none", padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                + Record Event
              </button>
              <button onClick={handleDeliver} style={{ background: "#22c55e", color: "white", border: "none", padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                Mark Delivered
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Info card */}
        <InfoCard title="Shipment Details">
          <Row label="Container ID"    value={shipment.containerId} />
          <Row label="Carrier"         value={shipment.carrier} />
          <Row label="Cargo Type"      value={shipment.cargoType} />
          <Row label="Weight"          value={`${shipment.weightKg?.toLocaleString()} kg`} />
          <Row label="Status"          value={shipment.status.replace("_", " ")} />
          <Row label="Current Holder"  value={shipment.currentHolder} />
          <Row label="Est. Arrival"    value={shipment.estimatedArrival ? new Date(shipment.estimatedArrival).toLocaleDateString() : "—"} />
          {shipment.actualArrival && <Row label="Actual Arrival" value={new Date(shipment.actualArrival).toLocaleDateString()} />}
        </InfoCard>

        {/* Risk card */}
        <InfoCard title="ML Delay Risk Score">
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 56, fontWeight: 800, color: riskColor(risk) }}>
              {(risk * 100).toFixed(0)}%
            </div>
            <div style={{ fontSize: 16, color: riskColor(risk), fontWeight: 600, marginTop: 4 }}>
              {risk >= 0.7 ? "HIGH RISK" : risk >= 0.4 ? "MEDIUM RISK" : "LOW RISK"}
            </div>
            <div style={{ margin: "16px auto", width: "80%", height: 10, background: "#334155", borderRadius: 5 }}>
              <div style={{ width: `${risk * 100}%`, height: "100%", background: riskColor(risk), borderRadius: 5, transition: "width 0.5s" }} />
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Predicted by XGBoost model</div>
          </div>
        </InfoCard>
      </div>

      {/* Event Timeline */}
      <InfoCard title={`Event Timeline (${shipment.events?.length || 0} events — stored on blockchain)`}>
        <div style={{ position: "relative", paddingLeft: 24 }}>
          <div style={{ position: "absolute", left: 7, top: 0, bottom: 0, width: 2, background: "#334155" }} />
          {(shipment.events || []).map((ev, i) => (
            <div key={ev.eventId} style={{ position: "relative", marginBottom: 20 }}>
              <div style={{ position: "absolute", left: -20, top: 4, width: 12, height: 12, borderRadius: "50%", background: "#3b82f6", border: "2px solid #0f172a" }} />
              <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "#3b82f6", fontWeight: 600, fontSize: 13 }}>{ev.eventType.replace(/_/g, " ")}</span>
                  <span style={{ color: "#64748b", fontSize: 12 }}>{new Date(ev.timestamp).toLocaleString()}</span>
                </div>
                <div style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 4 }}>{ev.description}</div>
                <div style={{ color: "#64748b", fontSize: 12 }}>📍 {ev.location} &nbsp;|&nbsp; 🏢 {ev.actor}</div>
                <div style={{ color: "#475569", fontSize: 11, marginTop: 4, fontFamily: "monospace" }}>
                  TX: {ev.txId}
                </div>
              </div>
            </div>
          ))}
        </div>
      </InfoCard>

      {/* Blockchain history */}
      {history.length > 0 && (
        <InfoCard title={`Immutable Blockchain History (${history.length} transactions)`}>
          {history.map((h, i) => (
            <div key={h.txId} style={{ borderBottom: "1px solid #334155", padding: "10px 0", fontSize: 13 }}>
              <span style={{ color: "#64748b", fontFamily: "monospace", marginRight: 12 }}>{h.txId?.slice(0, 20)}...</span>
              <span style={{ color: "#94a3b8" }}>{new Date(h.timestamp?.seconds * 1000).toLocaleString()}</span>
              {h.isDelete && <span style={{ color: "#ef4444", marginLeft: 8 }}>[DELETED]</span>}
            </div>
          ))}
        </InfoCard>
      )}

      {/* Record event modal */}
      {showEventForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 16, padding: 32, width: 440 }}>
            <h2 style={{ marginBottom: 20, fontSize: 18, fontWeight: 700 }}>Record Blockchain Event</h2>

            <label style={labelStyle}>Event Type</label>
            <select value={eventForm.eventType} onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })} style={inputStyle}>
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>

            <label style={labelStyle}>Location</label>
            <input placeholder="e.g. Port of Rotterdam" value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} style={inputStyle} />

            <label style={labelStyle}>Description</label>
            <textarea placeholder="What happened?" value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} style={{ ...inputStyle, height: 80, resize: "vertical" }} />

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button onClick={handleRecordEvent} disabled={submitting} style={{ flex: 1, background: "#3b82f6", color: "white", border: "none", padding: 12, borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
                {submitting ? "Submitting to blockchain..." : "Submit to Blockchain"}
              </button>
              <button onClick={() => setShowEventForm(false)} style={{ flex: 1, background: "#334155", color: "#e2e8f0", border: "none", padding: 12, borderRadius: 8, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────

function InfoCard({ title, children }) {
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #334155", fontSize: 14, fontWeight: 600, color: "#94a3b8" }}>{title}</div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
      <span style={{ color: "#64748b", fontSize: 13 }}>{label}</span>
      <span style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function Center({ children }) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh", color: "#64748b" }}>{children}</div>;
}

const labelStyle = { display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6, marginTop: 14 };
const inputStyle = {
  width: "100%", background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0",
  padding: "10px 12px", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box",
};
