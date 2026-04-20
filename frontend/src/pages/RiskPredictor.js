import React, { useState } from "react";
import { predictManual } from "../services/api";

const inputStyle = {
  width: "100%", background: "#0f172a", border: "1px solid #334155", color: "#e2e8f0",
  padding: "10px 14px", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box",
};
const labelStyle = { display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6 };

const riskColor = (score) => score >= 0.7 ? "#ef4444" : score >= 0.4 ? "#f59e0b" : "#22c55e";
const riskLabel = (score) => score >= 0.7 ? "HIGH RISK" : score >= 0.4 ? "MEDIUM RISK" : "LOW RISK";

export default function RiskPredictor() {
  const [form, setForm] = useState({
    origin_port:            "Shanghai",
    destination_port:       "Rotterdam",
    carrier:                "OceanFreight Co",
    cargo_type:             "Electronics",
    weight_kg:              12500,
    distance_km:            19000,
    num_stops:              1,
    origin_congestion:      0.5,
    destination_congestion: 0.5,
    weather_severity:       "clear",
    carrier_delay_rate:     0.2,
    route_avg_delay_days:   3,
  });

  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.type === "number" ? parseFloat(e.target.value) : e.target.value });

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await predictManual(form);
      setResult(res.prediction);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Risk Predictor</h1>
      <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>
        Enter shipment parameters to get an XGBoost delay probability prediction.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Form */}
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: "#94a3b8" }}>Shipment Parameters</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <F label="Origin Port"  value={form.origin_port}  onChange={set("origin_port")}  />
            <F label="Destination Port" value={form.destination_port} onChange={set("destination_port")} />
            <F label="Carrier"       value={form.carrier}       onChange={set("carrier")}   />
            <div>
              <label style={labelStyle}>Weather</label>
              <select value={form.weather_severity} onChange={set("weather_severity")} style={inputStyle}>
                <option value="clear">Clear</option>
                <option value="moderate">Moderate</option>
                <option value="storm">Storm</option>
              </select>
            </div>
            <F label="Distance (km)"     type="number" value={form.distance_km}            onChange={set("distance_km")}            />
            <F label="Num Stops"         type="number" value={form.num_stops}              onChange={set("num_stops")}              />
            <F label="Weight (kg)"       type="number" value={form.weight_kg}              onChange={set("weight_kg")}              />
            <F label="Carrier Delay Rate (0-1)" type="number" step="0.01" value={form.carrier_delay_rate} onChange={set("carrier_delay_rate")} />
          </div>

          {/* Sliders for congestion */}
          <div style={{ marginTop: 16 }}>
            <SliderField label={`Origin Congestion: ${(form.origin_congestion * 100).toFixed(0)}%`} value={form.origin_congestion} onChange={set("origin_congestion")} />
            <SliderField label={`Destination Congestion: ${(form.destination_congestion * 100).toFixed(0)}%`} value={form.destination_congestion} onChange={set("destination_congestion")} />
            <SliderField label={`Route Avg Delay (days): ${form.route_avg_delay_days}`} value={form.route_avg_delay_days / 14} onChange={(e) => setForm({ ...form, route_avg_delay_days: parseFloat((e.target.value * 14).toFixed(1)) })} />
          </div>

          {error && <div style={{ color: "#f87171", fontSize: 13, marginTop: 12 }}>{error}</div>}

          <button
            onClick={handlePredict}
            disabled={loading}
            style={{ width: "100%", marginTop: 20, background: loading ? "#334155" : "#3b82f6", color: "white", border: "none", padding: 13, borderRadius: 10, cursor: loading ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 15 }}
          >
            {loading ? "Running XGBoost..." : "Predict Delay Risk"}
          </button>
        </div>

        {/* Result */}
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column" }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, color: "#94a3b8" }}>Prediction Result</h2>

          {!result ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 48 }}>🤖</div>
              <div>Fill in parameters and click Predict</div>
            </div>
          ) : (
            <div>
              {/* Big risk score */}
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{ fontSize: 72, fontWeight: 800, color: riskColor(result.delay_probability), lineHeight: 1 }}>
                  {(result.delay_probability * 100).toFixed(0)}%
                </div>
                <div style={{ fontSize: 18, color: riskColor(result.delay_probability), fontWeight: 700, marginTop: 8 }}>
                  {riskLabel(result.delay_probability)}
                </div>
                {result.predicted_delay_days > 0 && (
                  <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 6 }}>
                    Estimated delay: ~{result.predicted_delay_days} days
                  </div>
                )}
              </div>

              {/* Risk bar */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ height: 12, background: "#334155", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{ width: `${result.delay_probability * 100}%`, height: "100%", background: riskColor(result.delay_probability), borderRadius: 6, transition: "width 0.6s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#475569", marginTop: 4 }}>
                  <span>0% (Low)</span><span>40%</span><span>70%</span><span>100% (High)</span>
                </div>
              </div>

              {/* Top factors */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 12 }}>Top Risk Factors</div>
                {result.top_factors?.map((f, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #334155" }}>
                    <span style={{ fontSize: 14, color: "#cbd5e1" }}>{f.factor}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 60, height: 6, background: "#334155", borderRadius: 3 }}>
                        <div style={{ width: `${f.importance * 100 * 3}%`, maxWidth: "100%", height: "100%", background: "#3b82f6", borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 12, color: "#64748b", width: 36, textAlign: "right" }}>{(f.importance * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 16, padding: 12, background: "#0f172a", borderRadius: 8, fontSize: 12, color: "#475569", textAlign: "center" }}>
                Predicted by XGBoost · Trained on 10,000 synthetic shipments
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function F({ label, value, onChange, type = "text", step }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} step={step} value={value} onChange={onChange} style={inputStyle} />
    </div>
  );
}

function SliderField({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ ...labelStyle, marginBottom: 4 }}>{label}</label>
      <input type="range" min="0" max="1" step="0.01" value={value} onChange={onChange}
        style={{ width: "100%", accentColor: "#3b82f6" }} />
    </div>
  );
}
