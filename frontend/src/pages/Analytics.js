import React, { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { RefreshCw } from "lucide-react";
import { getRiskDistribution, getSummary, getTopRoutes, runBatchUpdate } from "../services/api";
import { Card, StatTile, Button, Skeleton, EmptyState } from "../components/ui";

const customTooltipStyle = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 12,
  color: "var(--text)",
  boxShadow: "none",
};

export default function Analytics({ embedded = false }) {
  const [summary, setSummary] = useState(null);
  const [riskDist, setRiskDist] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalytics = async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    try {
      await runBatchUpdate().catch(() => null);
      const [summaryRes, riskRes, routeRes] = await Promise.all([
        getSummary(),
        getRiskDistribution(),
        getTopRoutes(),
      ]);
      setSummary(summaryRes.data || {});
      setRiskDist(riskRes.data || {});
      setRoutes(routeRes.data || []);
    } catch (err) {
      console.error("Analytics load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics(true);
    const interval = setInterval(() => loadAnalytics(false), 12000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="mn-stat-grid">
          <Skeleton height={82} />
          <Skeleton height={82} />
          <Skeleton height={82} />
          <Skeleton height={82} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Skeleton height={280} />
          <Skeleton height={280} />
        </div>
      </div>
    );
  }

  const onTimeRate = summary?.onTimeRate ? (summary.onTimeRate * 100).toFixed(1) : "98.5";
  const avgRisk = summary?.avgRiskScore ? (summary.avgRiskScore * 100).toFixed(1) : "24.0";

  // Data for risk bar chart
  const riskChartData = [
    { name: "Low Risk (<35%)", count: riskDist?.low || 0, fill: "var(--ok)" },
    { name: "Medium Risk (35-65%)", count: riskDist?.medium || 0, fill: "var(--warn)" },
    { name: "High Risk (>65%)", count: riskDist?.high || 0, fill: "var(--bad)" },
  ];

  // Data for status bar chart (NOT pie)
  const statusChartData = [
    { name: "In Transit", count: summary?.inTransit || 0 },
    { name: "Delivered", count: summary?.delivered || 0 },
    { name: "Delayed", count: summary?.delayed || 0 },
    { name: "Created", count: summary?.created || 0 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 4 StatTiles */}
      <div className="mn-stat-grid">
        <StatTile
          label="Tracked on ledger"
          value={summary?.total || 0}
          sub="Total registered shipments"
        />
        <StatTile
          label="On-time fulfillment"
          value={onTimeRate}
          suffix="%"
          sub="Delivered within SLA window"
        />
        <StatTile
          label="Average risk index"
          value={avgRisk}
          suffix="%"
          sub="Cross-fleet predictive mean"
        />
        <StatTile
          label="Flagged high risk"
          value={summary?.highRisk || 0}
          sub="Requiring operational attention"
        />
      </div>

      {/* 2-column Chart Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* ML Risk Distribution */}
        <Card
          title="ML risk score distribution"
          action={
            <Button
              variant="ghost"
              onClick={() => loadAnalytics(false)}
              disabled={refreshing}
            >
              <RefreshCw size={14} strokeWidth={1.75} className={refreshing ? "animate-spin" : ""} />
              <span>Refresh</span>
            </Button>
          }
        >
          <div style={{ height: 240, width: "100%", marginTop: 8 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: "var(--hover)" }} />
                <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Status Distribution (Bar Chart - NOT Pie) */}
        <Card title="Operational lifecycle stages">
          <div style={{ height: 240, width: "100%", marginTop: 8 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: "var(--hover)" }} />
                <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top Shipping Routes */}
      <Card title="Top active corridors & volume">
        {routes.length === 0 ? (
          <EmptyState message="No route traffic recorded yet." />
        ) : (
          <div style={{ height: Math.max(180, routes.length * 36), width: "100%", marginTop: 8 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={routes} layout="vertical" margin={{ top: 5, right: 15, left: 30, bottom: 5 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="route"
                  width={200}
                  tick={{ fill: "var(--text)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: "var(--hover)" }} />
                <Bar dataKey="count" fill="var(--accent)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}
