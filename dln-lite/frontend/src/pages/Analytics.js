import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getSummary, getRiskDistribution, getTopRoutes } from "../services/api";

const RISK_COLORS = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444" };

export default function Analytics() {
  const [summary,  setSummary]  = useState(null);
  const [riskDist, setRiskDist] = useState(null);
  const [routes,   setRoutes]   = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([getSummary(), getRiskDistribution(), getTopRoutes()])
      .then(([s, r, rt]) => {
        setSummary(s.data);
        setRiskDist(r.data);
        setRoutes(rt.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Center>Loading analytics...</Center>;

  const statusData = [
    { name: "In Transit",   value: summary.inTransit,                    color: "#3b82f6" },
    { name: "Delivered",    value: summary.delivered,                    color: "#22c55e" },
    { name: "Delayed",      value: summary.delayed,                      color: "#ef4444" },
    { name: "Other",        value: summary.total - summary.inTransit - summary.delivered - summary.delayed, color: "#64748b" },
  ].filter((d) => d.value > 0);

  const riskData = [
    { name: "Low (<40%)",     value: riskDist.low,    fill: RISK_COLORS.low    },
    { name: "Medium (40-70%)", value: riskDist.medium, fill: RISK_COLORS.medium },
    { name: "High (≥70%)",    value: riskDist.high,   fill: RISK_COLORS.high   },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Analytics</h1>
      <p style={{ color: "#64748b", fontSize: 14, marginBottom: 28 }}>Network-wide performance and risk overview</p>

      {/* KPI row */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
        <KPICard label="On-Time Rate"    value={`${(summary.onTimeRate * 100).toFixed(1)}%`} color="#22c55e" />
        <KPICard label="Avg Risk Score"  value={`${(summary.avgRiskScore * 100).toFixed(1)}%`} color="#f59e0b" />
        <KPICard label="Total Shipments" value={summary.total}    color="#3b82f6" />
        <KPICard label="High Risk Now"   value={summary.highRisk} color="#ef4444" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Status distribution */}
        <ChartCard title="Shipment Status Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Risk distribution */}
        <ChartCard title="ML Risk Score Distribution (Active Shipments)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={riskData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {riskData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Top routes */}
      <ChartCard title="Top Shipping Routes">
        {routes.length === 0 ? (
          <div style={{ textAlign: "center", color: "#64748b", padding: 20 }}>No route data yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, routes.length * 40)}>
            <BarChart data={routes} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis type="category" dataKey="route" width={220} tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}

function KPICard({ label, value, color }) {
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "16px 24px", flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #334155", fontSize: 14, fontWeight: 600, color: "#94a3b8" }}>{title}</div>
      <div style={{ padding: "16px 8px" }}>{children}</div>
    </div>
  );
}

function Center({ children }) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh", color: "#64748b" }}>{children}</div>;
}
