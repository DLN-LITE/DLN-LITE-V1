import React, { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { ArrowLeft, ShieldAlert, UserCheck } from "lucide-react";
import { createShipment, predictManual } from "../services/api";
import { Card, Button, RiskBar, Badge } from "../components/ui";

const CARGO_TYPES = ["Electronics", "Textiles", "Food", "Chemicals", "Machinery", "General", "Other"];
const CARRIERS = ["OceanFreight Co", "GlobalShip Ltd", "MarineX", "AquaLine", "SeaRoute Express"];
const PORTS = [
  "Shanghai, CN",
  "Singapore, SG",
  "Rotterdam, NL",
  "Busan, KR",
  "Los Angeles, US",
  "Hamburg, DE",
  "Dubai (Jebel Ali), UAE",
  "Mumbai (Nhava Sheva), IN",
  "Felixstowe, UK",
  "Tokyo, JP",
  "Antwerp, BE",
  "Santos, BR",
  "Hong Kong, HK",
  "Valencia, ES",
  "Sydney, AU",
];

export default function CreateShipment({ embedded = false, onCreated }) {
  const navigate = useNavigate();
  const context = useOutletContext() || {};
  const activeRole = context.activeRole || "shipper";

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    containerId: "",
    origin: PORTS[0],
    destination: PORTS[2],
    carrier: CARRIERS[0],
    cargoType: CARGO_TYPES[0],
    weightKg: "",
    estimatedArrival: "",
    notes: "",
    contactEmail: "",
  });

  const [previewRisk, setPreviewRisk] = useState(25);
  const [routeDetail, setRouteDetail] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [factors, setFactors] = useState([
    { name: "Live Maritime Distance", impact: "Calculating..." },
    { name: "Port Weather Status", impact: "Connecting..." },
    { name: "Port Berth Congestion", impact: "Evaluating..." },
  ]);

  const setField = (field) => (e) => {
    setForm((curr) => ({ ...curr, [field]: e.target.value }));
  };

  // Real ML inference with live weather & nautical distance as user updates form
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!form.origin || !form.destination) return;
      setEvaluating(true);
      try {
        const res = await predictManual({
          origin_port: form.origin,
          destination_port: form.destination,
          carrier: form.carrier,
          cargo_type: form.cargoType,
          weight_kg: parseFloat(form.weightKg) || 5000,
        });

        if (!active) return;
        const pred = res.prediction || res;
        const prob = pred?.delay_probability ?? pred?.riskScore ?? 0.25;
        const pct = Math.round(prob * 100);
        setPreviewRisk(pct);

        if (pred?.route_info) {
          setRouteDetail(pred.route_info);
        }

        if (pred?.top_factors && pred.top_factors.length > 0) {
          setFactors(
            pred.top_factors.map((tf) => ({
              name: tf.factor,
              impact: `${Math.round(tf.importance * 100)}% weight`,
            }))
          );
        } else {
          setFactors([
            { name: "Route Sea Distance", impact: pred?.route_info ? `${pred.route_info.distance_km?.toLocaleString()} km` : "Standard" },
            { name: "Live Port Weather", impact: pred?.features_used?.weather_severity || "Clear" },
            { name: "Port Congestion Index", impact: `${Math.round((pred?.features_used?.origin_congestion || 0.5) * 100)}%` },
          ]);
        }
      } catch (err) {
        if (!active) return;
        // Graceful fallback to weight/cargo heuristic if ML service is unreachable
        const weight = parseFloat(form.weightKg) || 0;
        let base = 22;
        if (weight > 15000) base += 20;
        if (form.cargoType === "Chemicals") base += 15;
        setPreviewRisk(Math.min(base, 85));
      } finally {
        if (active) setEvaluating(false);
      }
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [form.origin, form.destination, form.carrier, form.cargoType, form.weightKg]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const missing = ["containerId", "origin", "destination", "carrier", "cargoType", "weightKg", "estimatedArrival"].filter(
      (field) => !form[field]
    );

    if (missing.length) {
      setError(`Please complete all required fields: ${missing.join(", ")}`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await createShipment({
        ...form,
        weightKg: parseFloat(form.weightKg),
      });

      if (onCreated) {
        await onCreated(response.data);
      }
      navigate(`/shipments/${response.data.shipmentId}`);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (activeRole !== "shipper") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {!embedded && (
          <button
            className="mn-btn ghost"
            onClick={() => navigate("/shipments")}
            style={{ padding: "0 6px", alignSelf: "flex-start" }}
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
            <span>Back to shipments</span>
          </button>
        )}
        <Card title="Role Access Restricted">
          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "8px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ShieldAlert size={20} strokeWidth={2} style={{ color: "var(--warn)" }} />
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                Only registered Shippers can create shipments on Hyperledger Fabric.
              </div>
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
              Your current active role is <strong>{activeRole.toUpperCase()}</strong>. In DLN-Lite, the smart contract strictly enforces Attribute-Based Access Control (ABAC): <code>ctx.GetClientIdentity().AssertAttributeValue("role", "shipper")</code>.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <Button
                variant="primary"
                onClick={() => {
                  window.localStorage.setItem("dln-lite-role-session", JSON.stringify({ role: "shipper", user: "Shipper User" }));
                  window.location.reload();
                }}
              >
                <UserCheck size={14} strokeWidth={1.75} />
                <span>Switch to Shipper Role</span>
              </Button>
              <Button variant="secondary" onClick={() => navigate("/dashboard")}>
                Return to Dashboard
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {!embedded && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="mn-btn ghost"
            onClick={() => navigate("/shipments")}
            style={{ padding: "0 6px" }}
          >
            <ArrowLeft size={14} strokeWidth={1.75} />
            <span>Back to shipments</span>
          </button>
        </div>
      )}

      {/* Grid: Form Card & Live Risk Preview */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12, alignItems: "start" }}>
        {/* Left: Form Card */}
        <Card title="New shipment registration">
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="mn-form-grid">
              <div className="mn-field">
                <label className="mn-label">Origin Port *</label>
                <select className="mn-select" value={form.origin} onChange={setField("origin")} required>
                  {PORTS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mn-field">
                <label className="mn-label">Destination Port *</label>
                <select className="mn-select" value={form.destination} onChange={setField("destination")} required>
                  {PORTS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mn-field">
                <label className="mn-label">Designated Carrier *</label>
                <select className="mn-select" value={form.carrier} onChange={setField("carrier")}>
                  {CARRIERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mn-field">
                <label className="mn-label">Cargo Classification *</label>
                <select className="mn-select" value={form.cargoType} onChange={setField("cargoType")}>
                  {CARGO_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mn-field">
                <label className="mn-label">Container ID *</label>
                <input
                  className="mn-input"
                  placeholder="e.g. CONT-SHA-9842"
                  value={form.containerId}
                  onChange={setField("containerId")}
                  required
                />
              </div>

              <div className="mn-field">
                <label className="mn-label">Weight (kg) *</label>
                <input
                  type="number"
                  className="mn-input"
                  placeholder="e.g. 14200"
                  value={form.weightKg}
                  onChange={setField("weightKg")}
                  required
                />
              </div>

              <div className="mn-field">
                <label className="mn-label">Estimated Arrival *</label>
                <input
                  type="date"
                  className="mn-input"
                  value={form.estimatedArrival}
                  onChange={setField("estimatedArrival")}
                  required
                />
              </div>

              <div className="mn-field">
                <label className="mn-label">Contact Email</label>
                <input
                  type="email"
                  className="mn-input"
                  placeholder="logistics@shipper.org"
                  value={form.contactEmail}
                  onChange={setField("contactEmail")}
                />
              </div>
            </div>

            <div className="mn-field">
              <label className="mn-label">Handling Notes</label>
              <textarea
                className="mn-input"
                style={{ height: 42, padding: "6px 8px", resize: "none" }}
                placeholder="Specific customs remarks or special temperature requirements..."
                value={form.notes}
                onChange={setField("notes")}
              />
            </div>

            {error && <div className="mn-field-error">{error}</div>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
              {!embedded && (
                <Button variant="ghost" onClick={() => navigate("/shipments")}>
                  Cancel
                </Button>
              )}
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? "Writing to ledger..." : "Create shipment"}
              </Button>
            </div>
          </form>
        </Card>

        {/* Right: Live Risk Preview (Single Compact Card) */}
        <Card title="Live delay risk preview">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                {evaluating ? "Inference in progress..." : "XGBoost delay prediction"}
              </span>
              <Badge variant={previewRisk >= 65 ? "bad" : previewRisk >= 35 ? "warn" : "ok"}>
                {previewRisk}% Risk
              </Badge>
            </div>

            <RiskBar score={previewRisk} showScore={false} />

            {routeDetail && (
              <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", flexDirection: "column", gap: 2 }}>
                <div><strong>Corridor:</strong> {routeDetail.distance_km?.toLocaleString()} km nautical sea-lane (~{routeDetail.transit_days} d transit)</div>
                {routeDetail.live_weather && (
                  <div style={{ fontSize: 10, color: "var(--text-subtle, var(--muted))" }}>
                    <strong>Live Weather:</strong> {routeDetail.live_weather.origin?.port} ({routeDetail.live_weather.origin?.desc}) • {routeDetail.live_weather.destination?.port} ({routeDetail.live_weather.destination?.desc})
                  </div>
                )}
              </div>
            )}

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>
                Key Delay Factors
              </div>
              {factors.map((f) => (
                <div key={f.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span>{f.name}</span>
                  <span style={{ color: "var(--muted)" }}>{f.impact}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>
              Inference served via Python XGBoost with live Open-Meteo satellite feeds.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
