import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createShipment } from "../services/api";

const CARGO_TYPES = ["Electronics", "Textiles", "Food", "Chemicals", "Machinery", "General", "Other"];
const CARRIERS = ["OceanFreight Co", "GlobalShip Ltd", "MarineX", "AquaLine", "SeaRoute Express"];
const inputStyle = { width: "100%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", padding: "11px 14px", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" };
const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 7, letterSpacing: "0.5px", textTransform: "uppercase" };

export default function CreateShipment() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ containerId: "", origin: "", destination: "", carrier: CARRIERS[0], cargoType: CARGO_TYPES[0], weightKg: "", estimatedArrival: "", notes: "", contactEmail: "" });
  const set = f => e => setForm({ ...form, [f]: e.target.value });

  const handleSubmit = async () => {
    const missing = ["containerId", "origin", "destination", "carrier", "cargoType", "weightKg", "estimatedArrival"].filter(f => !form[f]);
    if (missing.length) return setError(`Please fill in: ${missing.join(", ")}`);
    setSubmitting(true); setError(null);
    try { const r = await createShipment({ ...form, weightKg: parseFloat(form.weightKg) }); navigate(`/shipments/${r.data.shipmentId}`); }
    catch (e) { setError(e.response?.data?.error || e.message); } finally { setSubmitting(false); }
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <button onClick={() => navigate("/shipments")} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        Back
      </button>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#f8fafc", marginBottom: 6, letterSpacing: "-0.5px" }}>New Shipment</h1>
        <p style={{ color: "#64748b", fontSize: 14 }}>This record will be written permanently to the Hyperledger Fabric blockchain</p>
      </div>

      <div style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 32 }}>
        <Section title="Shipment Identity" color="#3b82f6">
          <Grid>
            <F label="Container ID *" placeholder="e.g. CONT-ABC123" value={form.containerId} onChange={set("containerId")} />
            <F label="Origin Port *" placeholder="e.g. Shanghai, CN" value={form.origin} onChange={set("origin")} />
            <F label="Destination Port *" placeholder="e.g. Rotterdam, NL" value={form.destination} onChange={set("destination")} />
            <div><label style={labelStyle}>Carrier *</label><select value={form.carrier} onChange={set("carrier")} style={inputStyle}>{CARRIERS.map(c => <option key={c}>{c}</option>)}</select></div>
          </Grid>
        </Section>
        <Section title="Cargo Details" color="#a78bfa">
          <Grid>
            <div><label style={labelStyle}>Cargo Type *</label><select value={form.cargoType} onChange={set("cargoType")} style={inputStyle}>{CARGO_TYPES.map(c => <option key={c}>{c}</option>)}</select></div>
            <F label="Weight (kg) *" placeholder="e.g. 12500" type="number" value={form.weightKg} onChange={set("weightKg")} />
          </Grid>
        </Section>
        <Section title="Timing" color="#34d399">
          <F label="Estimated Arrival Date *" type="date" value={form.estimatedArrival} onChange={set("estimatedArrival")} />
        </Section>
        <Section title="Optional Info" color="#f59e0b">
          <Grid>
            <F label="Contact Email" placeholder="logistics@company.com" type="email" value={form.contactEmail} onChange={set("contactEmail")} />
            <div><label style={labelStyle}>Notes</label><textarea value={form.notes} onChange={set("notes")} placeholder="Additional notes..." style={{ ...inputStyle, height: 80, resize: "vertical" }} /></div>
          </Grid>
        </Section>

        {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", padding: "12px 16px", borderRadius: 10, fontSize: 14, marginBottom: 20 }}>{error}</div>}

        <button onClick={handleSubmit} disabled={submitting} style={{ width: "100%", background: submitting ? "rgba(59,130,246,0.3)" : "linear-gradient(135deg,#3b82f6,#8b5cf6)", color: "white", border: "none", padding: 15, borderRadius: 12, cursor: submitting ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 15, boxShadow: "0 4px 20px rgba(59,130,246,0.4)", transition: "all 0.2s" }}>
          {submitting ? "Writing to Blockchain..." : "Create Shipment on Blockchain →"}
        </button>
        <p style={{ textAlign: "center", fontSize: 12, color: "#334155", marginTop: 12 }}>This transaction is immutable once submitted and recorded across all network nodes.</p>
      </div>
    </div>
  );
}

function Section({ title, color, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ width: 4, height: 16, borderRadius: 2, background: color }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.5px", textTransform: "uppercase" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}
function Grid({ children }) { return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>{children}</div>; }
function F({ label, placeholder, type = "text", value, onChange }) {
  const labelStyle2 = { display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 7, letterSpacing: "0.5px", textTransform: "uppercase" };
  const inputStyle2 = { width: "100%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0", padding: "11px 14px", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box" };
  return <div><label style={labelStyle2}>{label}</label><input type={type} placeholder={placeholder} value={value} onChange={onChange} style={inputStyle2} /></div>;
}