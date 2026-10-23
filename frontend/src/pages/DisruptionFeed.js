import React, { useEffect, useState } from "react";
import { getDisruptions } from "../services/api";
import {
  Card,
  StatTile,
  StatusDot,
  Badge,
  Button,
  Segmented,
  EmptyState,
} from "../components/ui";

export default function DisruptionFeed({ embedded = false }) {
  const [alerts, setAlerts] = useState([]);
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const res = await getDisruptions();
      if (res?.data && Array.isArray(res.data)) {
        setAlerts(res.data);
      }
    } catch (err) {
      console.warn("Could not fetch live disruption feed:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    if (paused) return;
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, [paused]);

  const filtered = alerts.filter((a) => {
    if (severityFilter === "ALL") return true;
    return a.severity === severityFilter;
  });

  const criticalCount = alerts.filter((a) => a.severity === "CRITICAL").length;
  const warningCount = alerts.filter((a) => a.severity === "WARNING").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 4 StatTiles */}
      <div className="mn-stat-grid">
        <StatTile
          label="Active advisories"
          value={alerts.length}
          sub="Live Open-Meteo satellite & ledger"
        />
        <StatTile
          label="Critical choke incidents"
          value={criticalCount}
          sub="Severe storms & high-risk corridors"
        />
        <StatTile
          label="Weather & port alerts"
          value={warningCount}
          sub="Moderate squalls / draft advisories"
        />
        <StatTile
          label="Telemetry stream"
          value={paused ? "Paused" : "Live Feed"}
          sub={paused ? "Polling halted" : "Satellite refresh every 15s"}
        />
      </div>

      {/* Filter and Feed Card */}
      <Card
        title="Live operational disruption stream"
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Segmented
              options={[
                { value: "ALL", label: "All" },
                { value: "CRITICAL", label: "Critical" },
                { value: "WARNING", label: "Warning" },
                { value: "INFO", label: "Info" },
              ]}
              value={severityFilter}
              onChange={setSeverityFilter}
            />
            <Button
              variant="secondary"
              onClick={() => {
                if (paused) fetchAlerts();
                setPaused(!paused);
              }}
            >
              {paused ? "Resume stream" : "Pause stream"}
            </Button>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState message={loading ? "Connecting to satellite and ledger telemetry..." : "No alerts for selected severity filter."} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {filtered.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: idx === filtered.length - 1 ? "none" : "1px solid var(--border)",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ marginTop: 5 }}>
                    <StatusDot
                      status={
                        item.severity === "CRITICAL"
                          ? "bad"
                          : item.severity === "WARNING"
                          ? "warn"
                          : "ok"
                      }
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</span>
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>— {item.location}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--muted)" }}>{item.description}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                      <Badge variant={item.severity === "CRITICAL" ? "bad" : item.severity === "WARNING" ? "warn" : "neutral"}>
                        {item.severity}
                      </Badge>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>
                        Impacts ~{item.vessels} vessels (+{item.delayDays}d)
                      </span>
                    </div>
                  </div>
                </div>

                <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
