import React, { useEffect, useRef, useState } from "react";
import { predictManual } from "../services/api";
import {
  Card,
  RiskBar,
  Badge,
  DataTable,
  Button,
  Skeleton,
} from "../components/ui";

const ROUTE_ALTERNATIVES = {
  "Shanghai, CN_Rotterdam, NL": [
    { mode: "Ocean (Suez Direct)", via: "Suez Canal → Mediterranean", cost: "$4,200 / TEU", transitDays: 28, distance: "19,500 km", baseRisk: 0.65 },
    { mode: "Ocean (Cape Bypass)", via: "South Africa → Atlantic", cost: "$4,850 / TEU", transitDays: 35, distance: "24,800 km", baseRisk: 0.22 },
    { mode: "Multimodal Rail (BRI)", via: "Eurasian Land Bridge", cost: "$7,900 / TEU", transitDays: 16, distance: "11,200 km", baseRisk: 0.38 },
  ],
  default: [
    { mode: "Standard Maritime", via: "Direct Hub Corridor", cost: "$3,800 / TEU", transitDays: 24, distance: "16,800 km", baseRisk: 0.55 },
    { mode: "Cape Diversion", via: "Southern Cape Bypass", cost: "$4,400 / TEU", transitDays: 31, distance: "21,500 km", baseRisk: 0.20 },
    { mode: "Air Freight Priority", via: "Direct Cargo Flight", cost: "$14,200 / TEU", transitDays: 4, distance: "9,600 km", baseRisk: 0.12 },
  ],
};

const PORTS = ["Shanghai, CN", "Mumbai, IN", "Singapore", "Rotterdam, NL", "Hamburg, DE", "Felixstowe, UK"];
const CARGO_TYPES = ["Electronics", "Textiles", "Food", "Chemicals", "Machinery", "General"];

export default function RouteOptimizer({ embedded = false }) {
  const requestRef = useRef(0);
  const [origin, setOrigin] = useState("Shanghai, CN");
  const [destination, setDestination] = useState("Rotterdam, NL");
  const [cargo, setCargo] = useState("Electronics");
  const [weight, setWeight] = useState(12500);

  // Tradeoff weightings
  const [prioritizeCost, setPrioritizeCost] = useState(50);
  const [prioritizeTime, setPrioritizeTime] = useState(50);

  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);

  const runOptimization = async () => {
    const reqId = ++requestRef.current;
    setLoading(true);

    const key = `${origin}_${destination}`;
    const baseList = ROUTE_ALTERNATIVES[key] || ROUTE_ALTERNATIVES.default;

    try {
      const enriched = await Promise.all(
        baseList.map(async (r, i) => {
          let risk = r.baseRisk;
          try {
            const res = await predictManual({
              origin_port: origin,
              destination_port: destination,
              carrier: "OceanFreight Co",
              cargo_type: cargo,
              weight_kg: weight,
              distance_km: parseInt(r.distance.replace(/[^0-9]/g, "")) || 18000,
              num_stops: 1,
              origin_congestion: 0.5,
              destination_congestion: 0.4,
              weather_severity: "moderate",
              carrier_delay_rate: 0.2,
              route_avg_delay_days: r.transitDays * 0.1,
            });
            const prob = res.prediction?.delay_probability ?? res.prediction?.riskScore;
            if (prob != null) {
              risk = prob;
            }
          } catch {
            // fallback to base risk
          }

          // Composite score factoring user sliders
          const timeScore = r.transitDays / 35;
          const costScore = parseInt(r.cost.replace(/[^0-9]/g, "")) / 15000;
          const composite = (costScore * (prioritizeCost / 100)) + (timeScore * (prioritizeTime / 100)) + (risk * 0.5);

          return { ...r, risk, composite, id: i };
        })
      );

      if (reqId !== requestRef.current) return;

      // Lowest composite score is recommended
      const sorted = [...enriched].sort((a, b) => a.composite - b.composite);
      sorted[0].recommended = true;
      setRoutes(sorted);
    } finally {
      if (reqId === requestRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(runOptimization, 150);
    return () => clearTimeout(timer);
  }, [origin, destination, cargo, weight, prioritizeCost, prioritizeTime]);

  const columns = [
    {
      header: "Routing Mode & Path",
      accessor: "mode",
      render: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {row.recommended && <Badge variant="ok">Recommended</Badge>}
          <div>
            <div style={{ fontWeight: 600 }}>{row.mode}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{row.via}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Estimated Cost",
      accessor: "cost",
      render: (row) => <span className="mn-mono">{row.cost}</span>,
    },
    {
      header: "Transit Time",
      accessor: "transitDays",
      render: (row) => <span>{row.transitDays} days</span>,
    },
    {
      header: "Distance / Carbon",
      accessor: "distance",
      render: (row) => <span style={{ color: "var(--muted)" }}>{row.distance}</span>,
    },
    {
      header: "Delay Risk Index",
      width: 140,
      render: (row) => <RiskBar score={row.risk} />,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Route & Trade-off Sliders Card */}
      <Card title="Optimization constraints & parameters">
        <div className="mn-form-grid" style={{ marginBottom: 16 }}>
          <div className="mn-field">
            <label className="mn-label">Origin Port</label>
            <select className="mn-select" value={origin} onChange={(e) => setOrigin(e.target.value)}>
              {PORTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="mn-field">
            <label className="mn-label">Destination Port</label>
            <select className="mn-select" value={destination} onChange={(e) => setDestination(e.target.value)}>
              {PORTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <div className="mn-field">
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span className="mn-label">Cost Sensitivity Weight</span>
              <span className="mn-mono">{prioritizeCost}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={prioritizeCost}
              onChange={(e) => setPrioritizeCost(parseInt(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
          </div>

          <div className="mn-field">
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span className="mn-label">Transit Speed Priority</span>
              <span className="mn-mono">{prioritizeTime}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={prioritizeTime}
              onChange={(e) => setPrioritizeTime(parseInt(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
          </div>
        </div>
      </Card>

      {/* Comparison DataTable */}
      <Card title="Multi-modal route alternatives" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton height={36} />
            <Skeleton height={36} />
            <Skeleton height={36} />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={routes}
            keyField="id"
          />
        )}
      </Card>
    </div>
  );
}
