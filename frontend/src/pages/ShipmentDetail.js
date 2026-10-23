import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { ArrowLeft, Plus, Send, CheckCircle, X, ShieldCheck } from "lucide-react";
import {
  getShipment,
  getShipmentHistory,
  recordEvent,
  transferCustody,
  markDelivered,
} from "../services/api";
import {
  Card,
  Badge,
  RiskBar,
  Button,
  HashChip,
  Timeline,
  ConfirmDialog,
  Skeleton,
} from "../components/ui";

const EVT_TYPES = [
  "DEPARTED_PORT",
  "ARRIVED_PORT",
  "CUSTOMS_ENTRY",
  "CUSTOMS_CLEARED",
  "TRANSSHIPMENT",
  "DELAY_REPORTED",
  "INSPECTION",
];

export default function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext() || {};
  const activeRole = context.activeRole || "shipper";

  const [shipment, setShipment] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Drawers and Modals
  const [eventDrawerOpen, setEventDrawerOpen] = useState(false);
  const [transferDrawerOpen, setTransferDrawerOpen] = useState(false);
  const [deliverDialogOpen, setDeliverDialogOpen] = useState(false);

  // Forms
  const [eventForm, setEventForm] = useState({
    eventType: "DEPARTED_PORT",
    location: "",
    description: "",
  });
  const [transferForm, setTransferForm] = useState({
    newHolder: "",
    location: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const refreshData = async () => {
    try {
      const [sRes, hRes] = await Promise.all([
        getShipment(id),
        getShipmentHistory(id).catch(() => ({ data: [] })),
      ]);
      setShipment(sRes.data);
      setHistory(hRes.data || []);
    } catch (err) {
      console.error("Error refreshing shipment:", err);
    }
  };

  useEffect(() => {
    refreshData().finally(() => setLoading(false));
  }, [id]);

  const handleRecordEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.location || !eventForm.description) {
      setErrorMsg("Location and description are required.");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    try {
      await recordEvent(id, eventForm);
      await refreshData();
      setEventDrawerOpen(false);
      setEventForm({ eventType: "DEPARTED_PORT", location: "", description: "" });
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferCustody = async (e) => {
    e.preventDefault();
    if (!transferForm.newHolder || !transferForm.location) {
      setErrorMsg("New holder and location are required.");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    try {
      await transferCustody(id, transferForm);
      await refreshData();
      setTransferDrawerOpen(false);
      setTransferForm({ newHolder: "", location: "" });
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkDelivered = async () => {
    setSubmitting(true);
    try {
      await markDelivered(id);
      await refreshData();
      setDeliverDialogOpen(false);
    } catch (err) {
      alert("Error marking delivered: " + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCustomsClear = async () => {
    setSubmitting(true);
    try {
      await recordEvent(id, {
        eventType: "CUSTOMS_CLEARED",
        location: shipment?.destination || "Port of Clearance",
        description: "Customs inspection verified and cleared by customs terminal on-chain",
      });
      await refreshData();
    } catch (err) {
      alert("Error clearing customs: " + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Skeleton height={32} width={200} />
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16 }}>
          <Skeleton height={400} />
          <Skeleton height={400} />
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: 24, color: "var(--muted)" }}>
          Shipment not found.
        </div>
      </Card>
    );
  }

  // Format events for Timeline
  const timelineEvents = (shipment.events || []).map((ev) => ({
    title: ev.eventType ? ev.eventType.replace(/_/g, " ") : "Event",
    actor: ev.actor || "Org1MSP",
    timestamp: ev.timestamp ? new Date(ev.timestamp).toLocaleString() : "Ledger Record",
    txId: ev.txId,
    description: `${ev.location ? `${ev.location} — ` : ""}${ev.description || ""}`,
  }));

  const isDelivered = shipment.status === "DELIVERED";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Top Breadcrumb & Action Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            className="mn-btn ghost"
            onClick={() => navigate("/shipments")}
            style={{ padding: "0 6px" }}
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
            <span>Shipments</span>
          </button>
          <span style={{ color: "var(--border)" }}>/</span>
          <span className="mn-mono" style={{ fontSize: 15, fontWeight: 600 }}>
            {shipment.shipmentId}
          </span>
          <Badge status={shipment.status} dot>
            {shipment.status}
          </Badge>
        </div>

        {/* Action Bar (Role-Aware ABAC) */}
        {!isDelivered && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {activeRole === "carrier" && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setErrorMsg("");
                    setEventDrawerOpen(true);
                  }}
                >
                  <Plus size={14} strokeWidth={1.75} />
                  <span>Record event</span>
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setErrorMsg("");
                    setTransferDrawerOpen(true);
                  }}
                >
                  <Send size={14} strokeWidth={1.75} />
                  <span>Transfer custody</span>
                </Button>
              </>
            )}

            {activeRole === "customs" && (
              <>
                <Button
                  variant="secondary"
                  onClick={handleCustomsClear}
                  disabled={submitting}
                >
                  <ShieldCheck size={14} strokeWidth={1.75} />
                  <span>Approve & Clear</span>
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setDeliverDialogOpen(true)}
                >
                  <CheckCircle size={14} strokeWidth={1.75} />
                  <span>Mark delivered</span>
                </Button>
              </>
            )}

            {activeRole === "shipper" && (
              <span style={{ fontSize: 12, color: "var(--muted)", padding: "4px 8px" }}>
                Shipper Manifest View (Custody with Carrier)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Grid: 3fr Timeline / 2fr Details Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16, alignItems: "start" }}>
        {/* Left Column: Timeline */}
        <Card
          title="Status & event history"
          action={
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {shipment.events?.length || 0} blockchain records
            </span>
          }
        >
          <Timeline events={timelineEvents} />
        </Card>

        {/* Right Column: Sticky Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 76 }}>
          {/* Details Card */}
          <Card title="Shipment details">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                ["Origin", shipment.origin],
                ["Destination", shipment.destination],
                ["Carrier", shipment.carrier],
                ["Container ID", shipment.containerId || "—"],
                ["Cargo Type", shipment.cargoType || "General"],
                ["Weight", shipment.weightKg ? `${shipment.weightKg.toLocaleString()} kg` : "—"],
                ["Estimated Arrival", shipment.estimatedArrival || "—"],
                ["Current Holder", shipment.currentHolder || shipment.carrier || "Org1MSP"],
              ].map(([lbl, val]) => (
                <div
                  key={lbl}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: 6,
                  }}
                >
                  <span style={{ color: "var(--muted)" }}>{lbl}</span>
                  <span style={{ fontWeight: 500 }} className={lbl.includes("ID") ? "mn-mono" : ""}>
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Delay Risk Card */}
          <Card title="Delay risk prediction">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Predicted risk index</span>
                <Badge variant={(shipment.delayRiskScore || 0) >= 0.65 ? "bad" : (shipment.delayRiskScore || 0) >= 0.35 ? "warn" : "ok"}>
                  {Math.round((shipment.delayRiskScore || 0) * 100)}%
                </Badge>
              </div>
              <RiskBar score={shipment.delayRiskScore || 0} showScore={false} />
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                ML pipeline evaluates route congestion, weight constraints, and historical transfer logs.
              </div>
            </div>
          </Card>

          {/* Ledger Card */}
          <Card title="Blockchain ledger status">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Channel</span>
                <span className="mn-mono">dlnchannel</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Smart contract</span>
                <span className="mn-mono">shipment_1.0</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, alignItems: "center" }}>
                <span style={{ color: "var(--muted)" }}>Latest TX ID</span>
                <HashChip hash={shipment.txId || history[history.length - 1]?.txId || "4a8e2b9c7d1e"} length={12} />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Record Event Drawer (360px right side) ── */}
      {eventDrawerOpen && (
        <div className="mn-drawer-backdrop" onClick={() => setEventDrawerOpen(false)}>
          <div className="mn-drawer" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Record Milestone Event</div>
              <button className="mn-btn ghost" onClick={() => setEventDrawerOpen(false)}>
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>
            <form onSubmit={handleRecordEvent} style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
              <div className="mn-field">
                <label className="mn-label">Event Type</label>
                <select
                  className="mn-select"
                  value={eventForm.eventType}
                  onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })}
                >
                  {EVT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mn-field">
                <label className="mn-label">Location / Checkpoint</label>
                <input
                  className="mn-input"
                  placeholder="e.g. Port of Rotterdam Berth 4"
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  required
                />
              </div>

              <div className="mn-field">
                <label className="mn-label">Description / Inspection Notes</label>
                <textarea
                  className="mn-input"
                  style={{ height: 80, padding: "8px 10px", resize: "vertical" }}
                  placeholder="Details of physical verification or clearance..."
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  required
                />
              </div>

              {errorMsg && <div className="mn-field-error">{errorMsg}</div>}

              <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", gap: 8, paddingTop: 16 }}>
                <Button variant="ghost" onClick={() => setEventDrawerOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? "Writing to ledger..." : "Commit Event"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Transfer Custody Drawer (360px right side) ── */}
      {transferDrawerOpen && (
        <div className="mn-drawer-backdrop" onClick={() => setTransferDrawerOpen(false)}>
          <div className="mn-drawer" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Transfer Custody</div>
              <button className="mn-btn ghost" onClick={() => setTransferDrawerOpen(false)}>
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>
            <form onSubmit={handleTransferCustody} style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
              <div className="mn-field">
                <label className="mn-label">New Custodian / Carrier Org</label>
                <input
                  className="mn-input"
                  placeholder="e.g. Org2MSP or Maersk Logistics"
                  value={transferForm.newHolder}
                  onChange={(e) => setTransferForm({ ...transferForm, newHolder: e.target.value })}
                  required
                />
              </div>

              <div className="mn-field">
                <label className="mn-label">Transfer Location</label>
                <input
                  className="mn-input"
                  placeholder="e.g. Singapore Transshipment Hub"
                  value={transferForm.location}
                  onChange={(e) => setTransferForm({ ...transferForm, location: e.target.value })}
                  required
                />
              </div>

              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                This invokes the smart contract `UpdateCustody` transaction. The signature of the new holder will be verified on-chain.
              </div>

              {errorMsg && <div className="mn-field-error">{errorMsg}</div>}

              <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", gap: 8, paddingTop: 16 }}>
                <Button variant="ghost" onClick={() => setTransferDrawerOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                  {submitting ? "Signing & Transferring..." : "Confirm Transfer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ConfirmDialog for Mark Delivered (Irreversible) ── */}
      <ConfirmDialog
        isOpen={deliverDialogOpen}
        title="Confirm Shipment Delivery"
        description="Marking this shipment as DELIVERED is irreversible and finalises the lifecycle on Hyperledger Fabric ledger."
        confirmLabel={submitting ? "Committing..." : "Mark Delivered"}
        variant="primary"
        onConfirm={handleMarkDelivered}
        onCancel={() => setDeliverDialogOpen(false)}
      />
    </div>
  );
}
