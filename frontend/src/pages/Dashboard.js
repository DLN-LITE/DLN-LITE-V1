import React, { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Plus, ShieldCheck } from "lucide-react";
import { getAllShipments, getSummary, recordEvent } from "../services/api";
import {
  Card,
  StatTile,
  StatusDot,
  Badge,
  RiskBar,
  DataTable,
  Button,
  Skeleton,
  EmptyState,
} from "../components/ui";

export default function Dashboard() {
  const context = useOutletContext() || {};
  const activeRole = context.activeRole || "shipper";

  const [summary, setSummary] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const navigate = useNavigate();

  const reloadData = async () => {
    try {
      const [summaryRes, shipmentRes] = await Promise.all([getSummary(), getAllShipments()]);
      setSummary(summaryRes.data || {});
      setShipments(shipmentRes.data || []);
    } catch (err) {
      console.error("Dashboard data load error:", err);
    }
  };

  useEffect(() => {
    reloadData().finally(() => setLoading(false));
  }, []);

  const handleCustomsApprove = async (e, shipmentId, destination) => {
    e.stopPropagation();
    setActionLoading(shipmentId);
    try {
      await recordEvent(shipmentId, {
        eventType: "CUSTOMS_CLEARED",
        location: destination || "Inspection Port",
        description: "Customs verified on-chain and cleared by port terminal",
      });
      await reloadData();
    } catch (err) {
      alert("Customs approval error: " + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCarrierDepart = async (e, shipmentId, origin) => {
    e.stopPropagation();
    setActionLoading(shipmentId);
    try {
      await recordEvent(shipmentId, {
        eventType: "DEPARTED_PORT",
        location: origin || "Origin Berth",
        description: "Carrier departure confirmed on blockchain ledger",
      });
      await reloadData();
    } catch (err) {
      alert("Carrier milestone error: " + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="mn-stat-grid">
          <Skeleton height={68} />
          <Skeleton height={68} />
          <Skeleton height={68} />
          <Skeleton height={68} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: 12 }}>
          <Skeleton height={320} />
          <Skeleton height={320} />
        </div>
      </div>
    );
  }

  // 1. SHIPPER perspective
  const shipperCreated = shipments.filter((s) => s.status === "CREATED");
  const shipperInMotion = shipments.filter((s) => s.status === "IN_TRANSIT");
  const shipperDelayed = shipments.filter((s) => s.status === "DELAYED");
  const shipperTableData = shipments
    .filter((s) => s.status !== "DELIVERED")
    .sort((a, b) => (b.delayRiskScore || 0) - (a.delayRiskScore || 0));

  // 2. CARRIER perspective
  const carrierUnderCustody = shipments.filter((s) => s.status === "IN_TRANSIT" || s.status === "AT_PORT");
  const carrierAtPort = shipments.filter((s) => s.status === "AT_PORT");
  const carrierDelayed = shipments.filter((s) => (s.delayRiskScore || 0) >= 0.5 || s.status === "DELAYED");
  const carrierTableData = shipments.filter(
    (s) => s.status === "IN_TRANSIT" || s.status === "AT_PORT" || s.status === "CREATED"
  );

  // 3. CUSTOMS perspective
  const customsQueue = shipments.filter((s) => s.status === "IN_CUSTOMS" || s.status === "AT_PORT");
  const customsCleared = shipments.filter((s) => s.status === "DELIVERED");
  const customsHighRisk = shipments.filter((s) => (s.delayRiskScore || 0) >= 0.5);
  const customsTableData = shipments
    .filter((s) => s.status === "IN_CUSTOMS" || s.status === "AT_PORT" || (s.delayRiskScore || 0) >= 0.4)
    .sort((a, b) => (b.delayRiskScore || 0) - (a.delayRiskScore || 0));

  // Columns for Shipper
  const shipperColumns = [
    {
      header: "Shipment ID",
      accessor: "shipmentId",
      render: (row) => <span className="mn-mono">{row.shipmentId}</span>,
    },
    {
      header: "Destination",
      render: (row) => (
        <span>
          {row.origin} → <strong>{row.destination}</strong>
        </span>
      ),
    },
    {
      header: "Carrier",
      accessor: "carrier",
      render: (row) => <span style={{ color: "var(--muted)" }}>{row.carrier}</span>,
    },
    {
      header: "Status",
      render: (row) => <Badge status={row.status} dot>{row.status}</Badge>,
    },
    {
      header: "Delay Risk",
      width: 130,
      render: (row) => <RiskBar score={row.delayRiskScore || 0} />,
    },
  ];

  // Columns for Carrier
  const carrierColumns = [
    {
      header: "Shipment ID",
      accessor: "shipmentId",
      render: (row) => <span className="mn-mono">{row.shipmentId}</span>,
    },
    {
      header: "Corridor",
      render: (row) => (
        <span>
          {row.origin} → {row.destination}
        </span>
      ),
    },
    {
      header: "Holder",
      accessor: "currentHolder",
      render: (row) => <span className="mn-mono">{row.currentHolder || row.carrier || "Org1MSP"}</span>,
    },
    {
      header: "Status",
      render: (row) => <Badge status={row.status} dot>{row.status}</Badge>,
    },
    {
      header: "Risk",
      width: 110,
      render: (row) => <RiskBar score={row.delayRiskScore || 0} />,
    },
    {
      header: "Action",
      width: 120,
      render: (row) =>
        row.status === "CREATED" ? (
          <Button
            variant="secondary"
            onClick={(e) => handleCarrierDepart(e, row.shipmentId, row.origin)}
            disabled={actionLoading === row.shipmentId}
          >
            {actionLoading === row.shipmentId ? "Signing..." : "Depart Port"}
          </Button>
        ) : (
          <Button
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/shipments/${row.shipmentId}`);
            }}
          >
            Transfer
          </Button>
        ),
    },
  ];

  // Columns for Customs
  const customsColumns = [
    {
      header: "Manifest ID",
      accessor: "containerId",
      render: (row) => (
        <div>
          <span className="mn-mono">{row.containerId || row.shipmentId}</span>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>Cargo: {row.cargoType}</div>
        </div>
      ),
    },
    {
      header: "Entry Port",
      render: (row) => <span>{row.destination}</span>,
    },
    {
      header: "Weight",
      render: (row) => (
        <span className="mn-mono">
          {row.weightKg ? `${row.weightKg.toLocaleString()} kg` : "—"}
        </span>
      ),
    },
    {
      header: "Status",
      render: (row) => <Badge status={row.status} dot>{row.status}</Badge>,
    },
    {
      header: "Clearance Action",
      width: 130,
      render: (row) =>
        row.status === "DELIVERED" ? (
          <Badge variant="ok">✓ Cleared</Badge>
        ) : (
          <Button
            variant="primary"
            onClick={(e) => handleCustomsApprove(e, row.shipmentId, row.destination)}
            disabled={actionLoading === row.shipmentId}
          >
            {actionLoading === row.shipmentId ? "Clearing..." : "Approve"}
          </Button>
        ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* ── Compact Role Banner ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          backgroundColor: "var(--surface)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Badge variant={activeRole === "shipper" ? "ok" : activeRole === "carrier" ? "warn" : "neutral"} dot>
            {activeRole.toUpperCase()} OPERATIONS
          </Badge>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            {activeRole === "shipper" && "Warehouse dispatch, outbound consignments, and manifest creation."}
            {activeRole === "carrier" && "In-transit voyage monitoring, custody handoffs, and checkpoint updates."}
            {activeRole === "customs" && "Port terminal clearance, manifest audit, and regulatory inspection."}
          </span>
        </div>

        {activeRole === "shipper" && (
          <Button variant="primary" onClick={() => navigate("/shipments/new")}>
            <Plus size={13} strokeWidth={1.75} />
            <span>Create Shipment</span>
          </Button>
        )}
      </div>

      {/* ── Compact StatTiles ── */}
      {activeRole === "shipper" && (
        <div className="mn-stat-grid">
          <StatTile label="Outbound total" value={shipments.length} sub="Registered on ledger" />
          <StatTile label="Awaiting dispatch" value={shipperCreated.length} sub="Status CREATED" />
          <StatTile label="In motion" value={shipperInMotion.length} sub="Under carrier transit" />
          <StatTile label="Delayed handoffs" value={shipperDelayed.length} sub="SLA escalation" />
        </div>
      )}

      {activeRole === "carrier" && (
        <div className="mn-stat-grid">
          <StatTile label="Fleet under custody" value={carrierUnderCustody.length || shipments.length} sub="Active custody" />
          <StatTile label="Sailing in transit" value={carrierUnderCustody.filter((s) => s.status === "IN_TRANSIT").length} sub="En route" />
          <StatTile label="At port transfers" value={carrierAtPort.length} sub="Terminal exchange" />
          <StatTile label="Weather / risk alerts" value={carrierDelayed.length} sub="High-risk voyages" />
        </div>
      )}

      {activeRole === "customs" && (
        <div className="mn-stat-grid">
          <StatTile label="In customs queue" value={customsQueue.length} sub="Awaiting clearance" />
          <StatTile label="Audit holds" value={customsHighRisk.length} sub="Risk >= 50%" />
          <StatTile label="Cleared & delivered" value={customsCleared.length} sub="Finalized on ledger" />
          <StatTile label="Audited cargo" value={shipments.length} sub="Full manifest register" />
        </div>
      )}

      {/* ── Main Operations Grid: 1.8fr Primary Table / 1fr Watchlist ── */}
      {/* ── Main Operations Grid: Primary Action Table & Priority Watchlist ── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.9fr) minmax(310px, 1fr)", gap: 12, alignItems: "start" }}>
        {/* Left: Role-Specific Action Table */}
        <Card
          className="flush"
          title={
            activeRole === "shipper"
              ? "Outbound dispatch queue"
              : activeRole === "carrier"
              ? "Transit fleet under custody"
              : "Port terminal inspection queue"
          }
          action={
            <span style={{ fontSize: 11, color: "var(--muted)" }}>
              {activeRole === "shipper" && `${shipperTableData.length} dispatches`}
              {activeRole === "carrier" && `${carrierTableData.length} vessels`}
              {activeRole === "customs" && `${customsTableData.length} pending`}
            </span>
          }
        >
          <DataTable
            columns={
              activeRole === "shipper"
                ? shipperColumns
                : activeRole === "carrier"
                ? carrierColumns
                : customsColumns
            }
            data={
              activeRole === "shipper"
                ? shipperTableData.slice(0, 5)
                : activeRole === "carrier"
                ? carrierTableData.slice(0, 5)
                : customsTableData.slice(0, 5)
            }
            keyField="shipmentId"
            onRowClick={(row) => navigate(`/shipments/${row.shipmentId}`)}
          />
        </Card>

        {/* Right: Compact Priority Watchlist */}
        <Card
          title={
            <span style={{ whiteSpace: "nowrap" }}>
              {activeRole === "shipper"
                ? "Outbound risk alerts"
                : activeRole === "carrier"
                ? "Voyage disruptions"
                : "Inspection holds"}
            </span>
          }
          action={<span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>Priority</span>}
        >
          {shipments.filter((s) => (s.delayRiskScore || 0) >= 0.35 && s.status !== "DELIVERED").length === 0 ? (
            <EmptyState message="All shipments within parameters." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {shipments
                .filter((s) => (s.delayRiskScore || 0) >= 0.35 && s.status !== "DELIVERED")
                .sort((a, b) => (b.delayRiskScore || 0) - (a.delayRiskScore || 0))
                .slice(0, 4)
                .map((s) => {
                  const riskPct = Math.round((s.delayRiskScore || 0) * 100);
                  return (
                    <div
                      key={s.shipmentId}
                      onClick={() => navigate(`/shipments/${s.shipmentId}`)}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                        padding: "7px 9px",
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                        cursor: "pointer",
                        transition: "background-color 150ms var(--ease)",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <StatusDot status={s.status} />
                          <span style={{ fontWeight: 600, fontSize: 12 }} className="mn-mono">
                            {s.shipmentId}
                          </span>
                        </div>
                        <Badge variant={riskPct >= 65 ? "bad" : "warn"}>
                          {riskPct}%
                        </Badge>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--muted)",
                          paddingLeft: 14,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={`${s.origin} → ${s.destination}`}
                      >
                        {s.origin} → {s.destination}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
