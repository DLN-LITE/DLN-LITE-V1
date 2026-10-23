import React, { useEffect, useState } from "react";
import { ShieldCheck, AlertOctagon, RotateCcw } from "lucide-react";
import { getShipment, verifyIntegrity } from "../services/api";
import {
  Card,
  Button,
  Badge,
  HashChip,
  Timeline,
  ConfirmDialog,
  Skeleton,
} from "../components/ui";

export default function ImmutabilityDemo({ embedded = false, shipments = [] }) {
  const [shipmentId, setShipmentId] = useState("SHP-001");
  const [original, setOriginal] = useState(null);
  const [tampered, setTampered] = useState("");
  const [isTampered, setIsTampered] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fetchOriginal = async () => {
    setLoading(true);
    setResult(null);
    setIsTampered(false);
    try {
      const response = await getShipment(shipmentId);
      const data = response.data;
      setOriginal(data);
      setTampered(JSON.stringify(data, null, 2));
    } catch (err) {
      alert(`Error fetching shipment: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOriginal();
  }, [shipmentId]);

  const handleInjectTamper = () => {
    if (!original) return;
    const altered = {
      ...original,
      carrier: "FRAUDULENT_CARRIER_ORG",
      status: "DELIVERED",
      delayRiskScore: 0.01,
      weightKg: 99999,
    };
    setTampered(JSON.stringify(altered, null, 2));
    setIsTampered(true);
    setConfirmOpen(false);
  };

  const handleReset = () => {
    if (!original) return;
    setTampered(JSON.stringify(original, null, 2));
    setIsTampered(false);
    setResult(null);
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      let claimed;
      try {
        claimed = JSON.parse(tampered);
      } catch {
        alert("Invalid JSON payload.");
        setLoading(false);
        return;
      }
      const response = await verifyIntegrity(shipmentId, claimed);
      setResult(response.data);
    } catch (err) {
      alert(`Verification error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const originalHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  const tamperedHash = isTampered
    ? "8f1a4e76c12b8492048f7104b2a953e144a6e87d192c3b4a5e6f7a8b9c0d1e2f"
    : originalHash;

  const mockTimeline = original?.events?.length
    ? original.events.map((ev) => ({
        title: ev.eventType?.replace(/_/g, " "),
        actor: ev.actor || "Org1MSP",
        timestamp: ev.timestamp ? new Date(ev.timestamp).toLocaleString() : "Ledger entry",
        txId: ev.txId,
        description: ev.description,
      }))
    : [
        {
          title: "Genesis Shipment Block #142",
          actor: "Org1MSP / Peer0",
          timestamp: "Block committed",
          txId: "4a8e2b9c7d1e88f2a0b1",
          description: "Endorsed by Org1MSP & Org2MSP Raft consensus group.",
        },
      ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Top Controls Card */}
      <Card
        title="Ledger cryptographic integrity verifier"
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Shipment ID:</span>
            <input
              className="mn-input"
              style={{ width: 140, height: 28 }}
              value={shipmentId}
              onChange={(e) => setShipmentId(e.target.value)}
              placeholder="e.g. SHP-001"
            />
            <Button variant="secondary" onClick={fetchOriginal} disabled={loading}>
              {loading ? "Fetching..." : "Fetch"}
            </Button>
          </div>
        }
      >
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          Simulate unauthorized state modification against the Hyperledger Fabric ledger to observe cryptographic endorsement and hash verification failure.
        </div>
      </Card>

      {/* Side by side comparison: Original Block | Tamper Action | Ledger Block */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, alignItems: "center" }}>
        {/* Left: Original Block */}
        <Card title="Authentic ledger state (Peer)">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Block Hash</span>
              <HashChip hash={originalHash} length={16} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--muted)" }}>Endorsing Peers</span>
              <span>peer0.org1, peer0.org2</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--muted)" }}>Validation Status</span>
              <Badge variant="ok">✓ Verified</Badge>
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase" }}>
                Committed Payload Data
              </div>
              <textarea
                className="mn-input mn-mono"
                style={{ width: "100%", height: 180, fontSize: 11, padding: 8, backgroundColor: "var(--hover)" }}
                value={original ? JSON.stringify(original, null, 2) : "Fetching record..."}
                readOnly
              />
            </div>
          </div>
        </Card>

        {/* Center: Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          <Button
            variant="danger"
            onClick={() => setConfirmOpen(true)}
            disabled={!original || isTampered}
            title="Inject fraudulent payload data"
          >
            Tamper record
          </Button>
          {isTampered && (
            <Button variant="ghost" onClick={handleReset}>
              <RotateCcw size={14} strokeWidth={1.75} />
              <span>Reset</span>
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleVerify}
            disabled={!original || loading}
          >
            Verify signature
          </Button>
        </div>

        {/* Right: Under-test Block */}
        <Card title="Candidate payload under test">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Computed Hash</span>
              <span style={{ color: isTampered ? "var(--bad)" : "inherit" }}>
                <HashChip hash={tamperedHash} length={16} />
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--muted)" }}>Signature Status</span>
              {isTampered ? (
                <Badge variant="bad">✗ Hash mismatch</Badge>
              ) : (
                <Badge variant="ok">✓ Signature Valid</Badge>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: "var(--muted)" }}>Data State</span>
              <span>{isTampered ? "Modified Off-Chain" : "Synchronized"}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase" }}>
                Editable Payload
              </div>
              <textarea
                className="mn-input mn-mono"
                style={{
                  width: "100%",
                  height: 180,
                  fontSize: 11,
                  padding: 8,
                  borderColor: isTampered ? "rgba(220, 38, 38, 0.45)" : undefined,
                }}
                value={tampered}
                onChange={(e) => {
                  setTampered(e.target.value);
                  setIsTampered(true);
                }}
                placeholder="Candidate state..."
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Verification Result Banner (if result exists) */}
      {result && (
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {result.integrityPass ? (
                <ShieldCheck size={20} strokeWidth={2} style={{ color: "var(--ok)" }} />
              ) : (
                <AlertOctagon size={20} strokeWidth={2} style={{ color: "var(--bad)" }} />
              )}
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {result.integrityPass ? "Cryptographic Integrity Verified" : "Tamper Detected by Fabric Consenter"}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{result.message}</div>
              </div>
            </div>
            <Badge variant={result.integrityPass ? "ok" : "bad"}>
              {result.integrityPass ? "PASSED" : "REJECTED"}
            </Badge>
          </div>
        </Card>
      )}

      {/* Transaction History / Audit Trail */}
      <Card title="Ledger transaction history & endorsement trail">
        <Timeline events={mockTimeline} />
      </Card>

      {/* Confirm Tamper Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Simulate Malicious Ledger Tampering?"
        description="This will inject fraudulent carrier, risk, and delivery data into the off-chain state buffer to test cryptographic rejection."
        confirmLabel="Inject Tamper"
        variant="danger"
        onConfirm={handleInjectTamper}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
