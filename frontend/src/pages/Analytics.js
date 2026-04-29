import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { getSummary, getRiskDistribution, getTopRoutes, runBatchUpdate } from "../services/api";

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [riskDist, setRiskDist] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAnalytics = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      setError(null);
      await runBatchUpdate().catch(() => null);
      const [s, r, rt] = await Promise.all([getSummary(), getRiskDistribution(), getTopRoutes()]);
      setSummary(s.data);
      setRiskDist(r.data);
      setRoutes(rt.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics(true);
    const interval = setInterval(() => loadAnalytics(false), 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <Center>Loading analytics...</Center>;
  if (error || !summary || !riskDist) return <Center style={{ color: "#ef4444" }}>Backend error — check backend terminal is running</Center>;

  const statusData = [
    { name: "In Transit", value: summary.inTransit || 0, color: "#3b82f6" },
    { name: "Delivered", value: summary.delivered || 0, color: "#22c55e" },
    { name: "Delayed", value: summary.delayed || 0, color: "#ef4444" },
    { name: "Other", value: Math.max(0, (summary.total || 0) - (summary.inTransit || 0) - (summary.delivered || 0) - (summary.delayed || 0)), color: "#64748b" },
  ].filter(d => d.value > 0);

  const riskData = [
    { name: "Low (<40%)", value: riskDist.low || 0, fill: "#22c55e" },
    { name: "Medium (40-70%)", value: riskDist.medium || 0, fill: "#f59e0b" },
    { name: "High (≥70%)", value: riskDist.high || 0, fill: "#ef4444" },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Analytics</h1>
      <p style={{ color: "#64748b", fontSize: 14, marginBottom: 28 }}>Network-wide performance and risk overview</p>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button onClick={() => loadAnalytics(true)} style={{ background: "#3b82f6", color: "white", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 600 }}>
          Refresh Analytics
        </button>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
        <KPI label="On-Time Rate" value={`${(((summary.onTimeRate) || 0) * 100).toFixed(1)}%`} color="#22c55e" />
        <KPI label="Avg Risk Score" value={`${(((summary.avgRiskScore) || 0) * 100).toFixed(1)}%`} color="#f59e0b" />
        <KPI label="Total Shipments" value={summary.total || 0} color="#3b82f6" />
        <KPI label="High Risk Now" value={summary.highRisk || 0} color="#ef4444" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <ChartCard title="Shipment Status Distribution">
          {statusData.length === 0
            ? <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>No data yet — add shipments first</div>
            : <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                  {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }} />
              </PieChart>
            </ResponsiveContainer>
          }
        </ChartCard>

        <ChartCard title="ML Risk Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={riskData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {riskData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Top Shipping Routes">
        {routes.length === 0
          ? <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>No route data yet</div>
          : <ResponsiveContainer width="100%" height={Math.max(200, routes.length * 40)}>
            <BarChart data={routes} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis type="category" dataKey="route" width={220} tick={{ fill: "#94a3b8", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        }
      </ChartCard>
    </div>
  );
}

function KPI({ label, value, color }) {
  return <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "16px 24px", flex: 1, minWidth: 140 }}>
    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
  </div>;
}
function ChartCard({ title, children }) {
  return <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, overflow: "hidden" }}>
    <div style={{ padding: "14px 20px", borderBottom: "1px solid #334155", fontSize: 14, fontWeight: 600, color: "#94a3b8" }}>{title}</div>
    <div style={{ padding: "16px 8px" }}>{children}</div>
  </div>;
}
function Center({ children }) {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh", color: "#64748b" }}>{children}</div>;
}
