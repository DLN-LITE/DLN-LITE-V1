import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { getAllShipments } from "../services/api";
import {
  Card,
  Badge,
  RiskBar,
  Segmented,
  DataTable,
  Skeleton,
  EmptyState,
} from "../components/ui";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "CREATED", label: "Created" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "AT_PORT", label: "At Port" },
  { value: "IN_CUSTOMS", label: "Customs" },
  { value: "DELAYED", label: "Delayed" },
  { value: "DELIVERED", label: "Delivered" },
];

export default function ShipmentList() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const navigate = useNavigate();

  useEffect(() => {
    getAllShipments()
      .then((response) => setShipments(response.data || []))
      .catch((error) => console.error("Error loading shipments:", error))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return shipments.filter((shipment) => {
      const matchesStatus =
        statusFilter === "ALL" || shipment.status === statusFilter;
      if (!matchesStatus) return false;
      if (!search.trim()) return true;
      const query = search.toLowerCase();
      return [
        shipment.shipmentId,
        shipment.origin,
        shipment.destination,
        shipment.carrier,
        shipment.containerId,
        shipment.cargoType,
      ]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(query));
    });
  }, [shipments, search, statusFilter]);

  const columns = [
    {
      header: "Status",
      width: 120,
      render: (row) => <Badge status={row.status} dot>{row.status}</Badge>,
    },
    {
      header: "ID",
      width: 110,
      accessor: "shipmentId",
      render: (row) => <span className="mn-mono">{row.shipmentId}</span>,
    },
    {
      header: "Origin → Destination",
      render: (row) => (
        <span>
          {row.origin} → {row.destination}
        </span>
      ),
    },
    {
      header: "Carrier",
      accessor: "carrier",
      render: (row) => <span style={{ color: "var(--muted)" }}>{row.carrier}</span>,
    },
    {
      header: "Cargo",
      accessor: "cargoType",
      render: (row) => (
        <span>
          {row.cargoType} {row.weightKg ? `(${row.weightKg}kg)` : ""}
        </span>
      ),
    },
    {
      header: "Risk",
      width: 130,
      render: (row) => <RiskBar score={row.delayRiskScore || 0} />,
    },
    {
      header: "ETA / Updated",
      width: 130,
      render: (row) => (
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          {row.estimatedArrival || row.updatedAt || "Scheduled"}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toolbar row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {/* Search Input with Icon */}
          <div style={{ position: "relative", width: 280 }}>
            <Search
              size={15}
              strokeWidth={1.75}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
              }}
            />
            <input
              type="text"
              className="mn-input"
              style={{ width: "100%", paddingLeft: 32 }}
              placeholder="Search by ID, route, carrier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Segmented status filter */}
          <Segmented
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>

        {/* Count at far right */}
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          {filtered.length} {filtered.length === 1 ? "shipment" : "shipments"}
        </span>
      </div>

      {/* Main Table Card */}
      <Card style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <Skeleton height={32} />
            <Skeleton height={32} />
            <Skeleton height={32} />
            <Skeleton height={32} />
            <Skeleton height={32} />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            keyField="shipmentId"
            onRowClick={(row) => navigate(`/shipments/${row.shipmentId}`)}
          />
        )}
      </Card>
    </div>
  );
}
