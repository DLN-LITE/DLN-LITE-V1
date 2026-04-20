import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createShipment } from "../services/api";

const CARGO_TYPES = ["Electronics", "Textiles", "Food", "Chemicals", "Machinery", "General", "Other"];
const CARRIERS    = ["OceanFreight Co", "GlobalShip Ltd", "MarineX", "AquaLine", "SeaRoute Express"];

const inputStyle = {
  width: "100%", background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0",
  padding: "11px 14px", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box",
};
const labelStyle = { display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 };

export default function CreateShipment() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    containerId:       "",
    origin:            "",
    destination:       "",
    carrier:           CARRIERS[0],
    cargoType:         CARGO_TYPES[0],
    weightKg:          "",
    estimatedArrival:  "",
    notes:             "",
    contactEmail:      "",
  });

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async () => {
    // Basic validation
    const required = ["containerId", "origin", "destination", "carrier", "cargoType", "weightKg", "estimatedArrival"];
    const missing  = required.filter((f) => !form[f]);
    if (missing.length) return setError(`Please fill in: ${missing.join(", ")}`);

    setSubmitting(true);
    setError(null);
    try {
      const result = await createShipment({ ...form, weightKg: parseFloat(form.weightKg) });
      navigate(`/shipments/${result.data.shipmentId}`);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <button onClick={() => navigate("/shipments")} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: 14, marginBottom: 16 }}>
        ← Back
      </button>

      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>New Shipment</h1>
      <p style={{ color: "#64748b", fontSize: 14, marginBottom: 28 }}>
        This record will be written permanently to the Hyperledger Fabric blockchain.
      </p>

      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 28 }}>
        {/* Container & Origin/Destination */}
        <Section title="Shipment Identity">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Container ID *" placeholder="e.g. CONT-ABC123" value={form.containerId} onChange={set("containerId")} />
            <Field label="Origin Port *"  placeholder="e.g. Shanghai, CN"   value={form.origin}      onChange={set("origin")} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
            <Field label="Destination Port *" placeholder="e.g. Rotterdam, NL" value={form.destination} onChange={set("destination")} />
            <div>
              <label style={labelStyle}>Carrier *</label>
              <select value={form.carrier} onChange={set("carrier")} style={inputStyle}>
                {CARRIERS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </Section>

        {/* Cargo */}
        <Section title="Cargo Details">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelStyle}>Cargo Type *</label>
              <select value={form.cargoType} onChange={set("cargoType")} style={inputStyle}>
                {CARGO_TYPES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <Field label="Weight (kg) *" placeholder="e.g. 12500" type="number" value={form.weightKg} onChange={set("weightKg")} />
          </div>
        </Section>

        {/* Timing */}
        <Section title="Timing">
          <Field label="Estimated Arrival Date *" type="date" value={form.estimatedArrival} onChange={set("estimatedArrival")} />
        </Section>

        {/* Optional */}
        <Section title="Optional Info">
          <Field label="Contact Email" placeholder="logistics@company.com" type="email" value={form.contactEmail} onChange={set("contactEmail")} />
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Notes</label>
            <textarea value={form.notes} onChange={set("notes")} placeholder="Any additional notes..." style={{ ...inputStyle, height: 80, resize: "vertical" }} />
          </div>
        </Section>

        {/* Error */}
        {error && (
          <div style={{ background: "#3b1e1e", border: "1px solid #ef4444", color: "#f87171", padding: "12px 16px", borderRadius: 8, fontSize: 14, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ width: "100%", background: submitting ? "#334155" : "#3b82f6", color: "white", border: "none", padding: 14, borderRadius: 10, cursor: submitting ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 15, marginTop: 8 }}
        >
          {submitting ? "Writing to blockchain..." : "Create Shipment on Blockchain"}
        </button>

        <p style={{ textAlign: "center", fontSize: 12, color: "#475569", marginTop: 12 }}>
          This transaction is immutable once submitted. It will be recorded across all network nodes.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 14, paddingBottom: 8, borderBottom: "1px solid #334155" }}>{title}</div>
      {children}
    </div>
  );
}

function Field({ label, placeholder, type = "text", value, onChange }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange} style={inputStyle} />
    </div>
  );
}
