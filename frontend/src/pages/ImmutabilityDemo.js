import React, { useState } from "react";
import { getShipment, verifyIntegrity } from "../services/api";

const inputStyle = { width:"100%", background:"#0f172a", border:"1px solid #334155", color:"#e2e8f0", padding:"10px 14px", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box" };

export default function ImmutabilityDemo() {
  const [shipmentId, setShipmentId]     = useState("SHP-001");
  const [original,   setOriginal]       = useState(null);
  const [tampered,   setTampered]       = useState("");
  const [result,     setResult]         = useState(null);
  const [loading,    setLoading]        = useState(false);
  const [step,       setStep]           = useState(1);

  // Step 1: fetch the real on-chain record
  const fetchOriginal = async () => {
    setLoading(true); setResult(null);
    try {
      const res = await getShipment(shipmentId);
      const data = res.data;
      setOriginal(data);
      setTampered(JSON.stringify(data, null, 2));
      setStep(2);
    } catch(e) { alert("Error: " + e.message); }
    finally { setLoading(false); }
  };

  // Step 3: verify the (possibly tampered) data against the ledger
  const verifyData = async () => {
    setLoading(true);
    try {
      let claimed;
      try { claimed = JSON.parse(tampered); }
      catch(e) { alert("Invalid JSON — fix the tampered data first"); setLoading(false); return; }
      const res = await verifyIntegrity(shipmentId, claimed);
      setResult(res.data);
      setStep(4);
    } catch(e) { alert("Verify error: " + e.message); }
    finally { setLoading(false); }
  };

  const injectTamper = () => {
    if (!original) return;
    const tamper = { ...original, carrier: "HACKED_CARRIER", delayRiskScore: 0.01, status: "DELIVERED" };
    setTampered(JSON.stringify(tamper, null, 2));
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize:22, fontWeight:700, marginBottom:6 }}>Immutability Demo</h1>
      <p style={{ color:"#64748b", fontSize:14, marginBottom:24 }}>
        Demonstrates that blockchain records cannot be silently altered. Any modification to
        off-chain data is detectable by comparing against the ledger hash.
        <span style={{ color:"#f59e0b" }}> (Academic requirement — tamper detection)</span>
      </p>

      {/* Steps indicator */}
      <div style={{ display:"flex", gap:8, marginBottom:28 }}>
        {["1. Fetch Record","2. Tamper Data","3. Verify","4. Result"].map((s,i) => (
          <div key={i} style={{ flex:1, padding:"8px 4px", textAlign:"center", borderRadius:8, fontSize:12, fontWeight:600,
            background: step > i+1 ? "#1a3028" : step === i+1 ? "rgba(59,130,246,0.2)" : "#1e293b",
            color:       step > i+1 ? "#4ade80"  : step === i+1 ? "#3b82f6" : "#475569",
            border:      step === i+1 ? "1px solid #3b82f6" : "1px solid #334155" }}>
            {step > i+1 ? "✓ " : ""}{s}
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        {/* Left — Controls */}
        <div>
          {/* Step 1 */}
          <Card title="Step 1 — Fetch On-Chain Record">
            <label style={{ fontSize:12, color:"#94a3b8", display:"block", marginBottom:6 }}>Shipment ID</label>
            <input value={shipmentId} onChange={e => setShipmentId(e.target.value)} style={inputStyle} placeholder="e.g. SHP-001" />
            <button onClick={fetchOriginal} disabled={loading} style={btnStyle("#3b82f6")}>
              {loading && step===1 ? "Fetching from ledger..." : "Fetch from Blockchain"}
            </button>
            {original && <div style={{ marginTop:10, fontSize:12, color:"#22c55e" }}>✓ Record fetched — {Object.keys(original).length} fields from ledger</div>}
          </Card>

          {/* Step 2 */}
          <Card title="Step 2 — Tamper with the Data">
            <p style={{ fontSize:13, color:"#94a3b8", marginBottom:12 }}>
              Edit the JSON below to simulate an attacker modifying data off-chain,
              or click "Inject Tamper" to auto-modify key fields.
            </p>
            <button onClick={injectTamper} disabled={!original} style={btnStyle("#f59e0b")}>
              ⚠️ Inject Tamper (auto-modify carrier, status, risk)
            </button>
          </Card>

          {/* Step 3 */}
          <Card title="Step 3 — Verify Against Ledger">
            <p style={{ fontSize:13, color:"#94a3b8", marginBottom:12 }}>
              Submit the (possibly tampered) data to the blockchain for verification.
              The ledger will compare the submitted record against its immutable copy.
            </p>
            <button onClick={verifyData} disabled={!original || loading} style={btnStyle("#8b5cf6")}>
              {loading && step===3 ? "Verifying on ledger..." : "Verify Against Blockchain"}
            </button>
          </Card>
        </div>

        {/* Right — JSON editor + result */}
        <div>
          <Card title="Data Under Test (editable)">
            <textarea
              value={tampered}
              onChange={e => setTampered(e.target.value)}
              disabled={!original}
              style={{ ...inputStyle, height:280, fontFamily:"monospace", fontSize:12, resize:"vertical" }}
              placeholder="Fetch a record first..."
            />
          </Card>

          {/* Result */}
          {result && (
            <Card title="Step 4 — Verification Result">
              <div style={{ textAlign:"center", padding:"20px 0" }}>
                <div style={{ fontSize:64, marginBottom:8 }}>
                  {result.integrityPass ? "✅" : "🚨"}
                </div>
                <div style={{ fontSize:18, fontWeight:700, color: result.integrityPass ? "#22c55e" : "#ef4444", marginBottom:12 }}>
                  {result.integrityPass ? "INTEGRITY VERIFIED" : "TAMPER DETECTED"}
                </div>
                <div style={{ fontSize:13, color:"#94a3b8", marginBottom:16, padding:"0 16px" }}>
                  {result.message}
                </div>
                <div style={{ background:"#0f172a", borderRadius:8, padding:12, fontSize:12, fontFamily:"monospace", textAlign:"left", color:"#64748b" }}>
                  <div>Shipment: <span style={{ color:"#e2e8f0" }}>{result.shipmentId}</span></div>
                  <div>Verified at: <span style={{ color:"#e2e8f0" }}>{result.verifiedAt}</span></div>
                  <div>TX ID: <span style={{ color:"#3b82f6" }}>{result.txId}</span></div>
                </div>
                {!result.integrityPass && (
                  <div style={{ marginTop:16, background:"#3b1e1e", border:"1px solid #ef4444", borderRadius:8, padding:12, fontSize:13, color:"#f87171" }}>
                    The blockchain ledger rejected this data. This proves the record stored on-chain
                    cannot be silently modified — any alteration is immediately detectable.
                    This is the core immutability guarantee of Hyperledger Fabric.
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:12, overflow:"hidden", marginBottom:16 }}>
      <div style={{ padding:"12px 16px", borderBottom:"1px solid #334155", fontSize:13, fontWeight:600, color:"#94a3b8" }}>{title}</div>
      <div style={{ padding:16 }}>{children}</div>
    </div>
  );
}

function btnStyle(color) {
  return { width:"100%", marginTop:10, background:color, color:"white", border:"none", padding:"10px", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:14 };
}
