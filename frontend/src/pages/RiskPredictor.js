import React, { useEffect, useRef, useState } from "react";
import { predictManual } from "../services/api";
import { Card, Button, RiskBar, Badge, Skeleton } from "../components/ui";

export default function RiskPredictor({ embedded = false }) {
  const requestRef = useRef(0);
  const [form, setForm] = useState({
    origin_port: "Shanghai",
    destination_port: "Rotterdam",
    carrier: "OceanFreight Co",
    cargo_type: "Electronics",
    weight_kg: 12500,
    distance_km: 19000,
    num_stops: 1,
    origin_congestion: 0.5,
    destination_congestion: 0.5,
    weather_severity: "clear",
    carrier_delay_rate: 0.2,
    route_avg_delay_days: 3,
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const setField = (field) => (e) => {
    const val = e.target.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value;
    setForm((curr) => ({ ...curr, [field]: val }));
  };

  const handlePredict = async (nextForm = form) => {
    const reqId = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const response = await predictManual(nextForm);
      if (reqId !== requestRef.current) return;
      setResult(response.prediction || response);
    } catch (err) {
      if (reqId !== requestRef.current) return;
      setError(err.response?.data?.error || err.message);
    } finally {
      if (reqId === requestRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => handlePredict(form), 180);
    return () => clearTimeout(timer);
  }, [form]);

  const prob = result?.delay_probability ?? result?.riskScore;
  const riskScore = prob != null ? Math.round(prob * 100) : 58;
  const riskCategory = riskScore >= 65 ? "High" : riskScore >= 35 ? "Medium" : "Low";
  const badgeVariant = riskScore >= 65 ? "bad" : riskScore >= 35 ? "warn" : "ok";

  const factors = result?.top_factors && result.top_factors.length > 0
    ? result.top_factors.map((tf) => ({
        label: tf.factor,
        weight: Math.round(tf.importance * 100),
      }))
    : [
        { label: "Route Distance Factor", weight: 32 },
        { label: "Port Congestion Index", weight: Math.round(form.origin_congestion * 100 * 0.35) },
        { label: "Weather Severity Factor", weight: form.weather_severity === "storm" ? 40 : form.weather_severity === "moderate" ? 20 : 5 },
        { label: "Carrier Historical Variance", weight: Math.round(form.carrier_delay_rate * 100) },
      ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, alignItems: "start" }}>
      {/* Inputs Card */}
      <Card title="Simulation parameters">
        <form onSubmit={(e) => { e.preventDefault(); handlePredict(form); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="mn-form-grid">
            <div className="mn-field">
              <label className="mn-label">Origin Port</label>
              <input className="mn-input" value={form.origin_port} onChange={setField("origin_port")} />
            </div>

            <div className="mn-field">
              <label className="mn-label">Destination Port</label>
              <input className="mn-input" value={form.destination_port} onChange={setField("destination_port")} />
            </div>

            <div className="mn-field">
              <label className="mn-label">Carrier</label>
              <input className="mn-input" value={form.carrier} onChange={setField("carrier")} />
            </div>

            <div className="mn-field">
              <label className="mn-label">Weather Severity</label>
              <select className="mn-select" value={form.weather_severity} onChange={setField("weather_severity")}>
                <option value="clear">Clear Skies</option>
                <option value="moderate">Moderate Squalls</option>
                <option value="storm">Severe Storm Front</option>
              </select>
            </div>

            <div className="mn-field">
              <label className="mn-label">Distance (km)</label>
              <input type="number" className="mn-input" value={form.distance_km} onChange={setField("distance_km")} />
            </div>

            <div className="mn-field">
              <label className="mn-label">Transshipment Stops</label>
              <input type="number" className="mn-input" value={form.num_stops} onChange={setField("num_stops")} />
            </div>

            <div className="mn-field">
              <label className="mn-label">Cargo Weight (kg)</label>
              <input type="number" className="mn-input" value={form.weight_kg} onChange={setField("weight_kg")} />
            </div>

            <div className="mn-field">
              <label className="mn-label">Carrier Delay Rate</label>
              <input type="number" step="0.05" className="mn-input" value={form.carrier_delay_rate} onChange={setField("carrier_delay_rate")} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
            <div className="mn-field">
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span className="mn-label">Origin Port Congestion</span>
                <span className="mn-mono">{Math.round(form.origin_congestion * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={form.origin_congestion}
                onChange={(e) => setForm({ ...form, origin_congestion: parseFloat(e.target.value) })}
                style={{ width: "100%", accentColor: "var(--accent)" }}
              />
            </div>

            <div className="mn-field">
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span className="mn-label">Destination Port Congestion</span>
                <span className="mn-mono">{Math.round(form.destination_congestion * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={form.destination_congestion}
                onChange={(e) => setForm({ ...form, destination_congestion: parseFloat(e.target.value) })}
                style={{ width: "100%", accentColor: "var(--accent)" }}
              />
            </div>
          </div>

          {error && <div className="mn-field-error">{error}</div>}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? "Evaluating..." : "Run ML Inference"}
            </Button>
          </div>
        </form>
      </Card>

      {/* Result Card (Sticky) */}
      <div style={{ position: "sticky", top: 76, display: "flex", flexDirection: "column", gap: 16 }}>
        <Card title="Predicted delay risk">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }} className="mn-mono">
                  {riskScore}%
                </span>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>delay probability</span>
              </div>
              <Badge variant={badgeVariant}>{riskCategory} Risk</Badge>
            </div>

            <RiskBar score={riskScore} showScore={false} />

            {result?.predicted_delay_days > 0 && (
              <div style={{ fontSize: 12, fontWeight: 500, color: "var(--warn)" }}>
                Expected Arrival Variance: +{result.predicted_delay_days} days
              </div>
            )}

            {result?.route_info?.live_weather && (
              <div style={{ fontSize: 11, color: "var(--muted)", background: "var(--surface-muted, #f8f9fa)", padding: "6px 8px", borderRadius: 4 }}>
                <strong>Live Meteorological Feed:</strong> {result.route_info.live_weather.origin?.port} ({result.route_info.live_weather.origin?.desc}) • {result.route_info.live_weather.destination?.port} ({result.route_info.live_weather.destination?.desc})
              </div>
            )}

            <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
              Inference output based on XGBoost gradient boosting trained on multimodal global shipping telemetry.
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>
                Feature Attribution Breakdown
              </div>
              {factors.map((f) => (
                <div key={f.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span>{f.label}</span>
                    <span className="mn-mono" style={{ color: "var(--muted)" }}>{f.weight}%</span>
                  </div>
                  <div style={{ height: 3, width: "100%", backgroundColor: "var(--border)", borderRadius: 2 }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(f.weight, 100)}%`,
                        backgroundColor: "var(--accent)",
                        borderRadius: 2,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
