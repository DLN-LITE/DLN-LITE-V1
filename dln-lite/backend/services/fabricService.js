// ─────────────────────────────────────────────────────────────────────────────
// fabricService.js
// Real Hyperledger Fabric implementation — core project requirement.
// Set MOCK_FABRIC=true in backend/.env to run without a live network.
// All real Fabric code is preserved — mock is only a local dev fallback.
// ─────────────────────────────────────────────────────────────────────────────

const logger = require("../utils/logger");
const { v4: uuidv4 } = require("uuid");

const USE_MOCK = process.env.MOCK_FABRIC === "true";
if (USE_MOCK) logger.warn("⚠️  MOCK_FABRIC=true — using in-memory ledger. Real Fabric NOT connected.");

// ══════════════════════════════════════════════════════════════════════════════
// REAL HYPERLEDGER FABRIC (active when MOCK_FABRIC=false)
// ══════════════════════════════════════════════════════════════════════════════

async function getRealContract() {
  const { Gateway, Wallets } = require("fabric-network");
  const path = require("path");
  const fs   = require("fs");
  const CONNECTION_PROFILE_PATH = path.resolve(__dirname, "../../blockchain/network/connection-profile.json");
  const WALLET_PATH             = path.resolve(__dirname, "../wallet");
  const connectionProfile = JSON.parse(fs.readFileSync(CONNECTION_PROFILE_PATH, "utf8"));
  const wallet            = await Wallets.newFileSystemWallet(WALLET_PATH);
  const identity          = await wallet.get("admin");
  if (!identity) throw new Error("Admin identity not found. Run scripts/enrollAdmin.js first.");
  const gateway = new Gateway();
  await gateway.connect(connectionProfile, { wallet, identity: "admin", discovery: { enabled: true, asLocalhost: true } });
  const network  = await gateway.getNetwork(process.env.FABRIC_CHANNEL  || "dlnchannel");
  const contract = network.getContract(process.env.FABRIC_CHAINCODE || "shipment");
  return { contract, gateway };
}

const realFabric = {
  async createShipment(data) {
    const { contract, gateway } = await getRealContract();
    try {
      const { shipmentId, containerId, origin, destination, carrier, cargoType, weightKg, estimatedArrival } = data;
      const result = await contract.submitTransaction("CreateShipment", shipmentId, containerId, origin, destination, carrier, cargoType, weightKg.toString(), estimatedArrival);
      return JSON.parse(result.toString());
    } finally { gateway.disconnect(); }
  },
  async getShipment(id) {
    const { contract, gateway } = await getRealContract();
    try { return JSON.parse((await contract.evaluateTransaction("GetShipment", id)).toString()); }
    finally { gateway.disconnect(); }
  },
  async getAllShipments() {
    const { contract, gateway } = await getRealContract();
    try { return JSON.parse((await contract.evaluateTransaction("GetAllShipments")).toString()); }
    finally { gateway.disconnect(); }
  },
  async recordEvent(shipmentId, eventType, location, description) {
    const { contract, gateway } = await getRealContract();
    try { return JSON.parse((await contract.submitTransaction("RecordEvent", shipmentId, eventType, location, description)).toString()); }
    finally { gateway.disconnect(); }
  },
  async transferCustody(shipmentId, newHolder, location) {
    const { contract, gateway } = await getRealContract();
    try { return JSON.parse((await contract.submitTransaction("TransferCustody", shipmentId, newHolder, location)).toString()); }
    finally { gateway.disconnect(); }
  },
  async updateDelayRisk(shipmentId, riskScore) {
    const { contract, gateway } = await getRealContract();
    try { return JSON.parse((await contract.submitTransaction("UpdateDelayRisk", shipmentId, riskScore.toString())).toString()); }
    finally { gateway.disconnect(); }
  },
  async markDelivered(shipmentId) {
    const { contract, gateway } = await getRealContract();
    try { return JSON.parse((await contract.submitTransaction("MarkDelivered", shipmentId)).toString()); }
    finally { gateway.disconnect(); }
  },
  async getShipmentHistory(shipmentId) {
    const { contract, gateway } = await getRealContract();
    try { return JSON.parse((await contract.evaluateTransaction("GetShipmentHistory", shipmentId)).toString()); }
    finally { gateway.disconnect(); }
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// MOCK LEDGER (active when MOCK_FABRIC=true)
// Same data structure as real chaincode — Shipment, ShipmentEvent, status codes
// ══════════════════════════════════════════════════════════════════════════════

let mockLedger = [
  { shipmentId:"SHP-001", containerId:"CONT-ABC123", origin:"Shanghai, CN", destination:"Rotterdam, NL", carrier:"OceanFreight Co", shipper:"Org1MSP", currentHolder:"Org1MSP", status:"IN_TRANSIT", cargoType:"Electronics", weightKg:14200, createdAt:"2024-01-15T08:00:00Z", estimatedArrival:"2024-03-15T00:00:00Z", actualArrival:null, delayRiskScore:0.71,
    events:[
      { eventId:"EVT-001-1", eventType:"SHIPMENT_CREATED", location:"Shanghai, CN",  actor:"Org1MSP", timestamp:"2024-01-15T08:00:00Z", description:"Shipment created and container sealed",      txId:"tx_abc001" },
      { eventId:"EVT-001-2", eventType:"DEPARTED_PORT",    location:"Shanghai Port", actor:"Org1MSP", timestamp:"2024-01-16T10:00:00Z", description:"Vessel MSC Beatrice departed Shanghai",       txId:"tx_abc002" },
    ]},
  { shipmentId:"SHP-002", containerId:"CONT-XYZ789", origin:"Mumbai, IN", destination:"Felixstowe, UK", carrier:"GlobalShip Ltd", shipper:"Org2MSP", currentHolder:"Org2MSP", status:"AT_PORT", cargoType:"Textiles", weightKg:9800, createdAt:"2024-01-20T10:00:00Z", estimatedArrival:"2024-03-28T00:00:00Z", actualArrival:null, delayRiskScore:0.85,
    events:[
      { eventId:"EVT-002-1", eventType:"SHIPMENT_CREATED", location:"Mumbai, IN",          actor:"Org2MSP", timestamp:"2024-01-20T10:00:00Z", description:"Shipment registered",                    txId:"tx_xyz001" },
      { eventId:"EVT-002-2", eventType:"DEPARTED_PORT",    location:"Nhava Sheva, Mumbai", actor:"Org2MSP", timestamp:"2024-01-22T06:00:00Z", description:"All containers loaded, vessel departed", txId:"tx_xyz002" },
      { eventId:"EVT-002-3", eventType:"ARRIVED_PORT",     location:"Port Said, Egypt",    actor:"Org2MSP", timestamp:"2024-01-29T14:30:00Z", description:"Arrived at Suez transit port",           txId:"tx_xyz003" },
    ]},
  { shipmentId:"SHP-003", containerId:"CONT-SG003", origin:"Singapore", destination:"Los Angeles, US", carrier:"MarineX", shipper:"Org1MSP", currentHolder:"Org1MSP", status:"IN_TRANSIT", cargoType:"Machinery", weightKg:22000, createdAt:"2024-02-01T09:00:00Z", estimatedArrival:"2024-04-02T00:00:00Z", actualArrival:null, delayRiskScore:0.34,
    events:[
      { eventId:"EVT-003-1", eventType:"SHIPMENT_CREATED", location:"Singapore",      actor:"Org1MSP", timestamp:"2024-02-01T09:00:00Z", description:"Heavy lift equipment containerised", txId:"tx_sg001" },
      { eventId:"EVT-003-2", eventType:"DEPARTED_PORT",    location:"Singapore Port", actor:"Org1MSP", timestamp:"2024-02-03T12:00:00Z", description:"Vessel departed for Los Angeles",  txId:"tx_sg002" },
    ]},
  { shipmentId:"SHP-004", containerId:"CONT-DU004", origin:"Dubai, UAE", destination:"Hamburg, DE", carrier:"AquaLine", shipper:"Org2MSP", currentHolder:"Org2MSP", status:"DELIVERED", cargoType:"Food", weightKg:6500, createdAt:"2024-01-10T07:00:00Z", estimatedArrival:"2024-02-20T00:00:00Z", actualArrival:"2024-02-18T14:00:00Z", delayRiskScore:0.12,
    events:[
      { eventId:"EVT-004-1", eventType:"SHIPMENT_CREATED", location:"Dubai, UAE",     actor:"Org2MSP", timestamp:"2024-01-10T07:00:00Z", description:"Perishable goods loaded — cold chain active", txId:"tx_du001" },
      { eventId:"EVT-004-2", eventType:"DEPARTED_PORT",    location:"Jebel Ali Port", actor:"Org2MSP", timestamp:"2024-01-12T08:00:00Z", description:"Reefer containers departed",                 txId:"tx_du002" },
      { eventId:"EVT-004-3", eventType:"CUSTOMS_CLEARED",  location:"Hamburg, DE",    actor:"Org2MSP", timestamp:"2024-02-18T10:00:00Z", description:"Customs clearance completed",                txId:"tx_du003" },
      { eventId:"EVT-004-4", eventType:"DELIVERED",        location:"Hamburg, DE",    actor:"Org2MSP", timestamp:"2024-02-18T14:00:00Z", description:"Shipment delivered to consignee",            txId:"tx_du004" },
    ]},
  { shipmentId:"SHP-005", containerId:"CONT-BS005", origin:"Busan, KR", destination:"Rotterdam, NL", carrier:"SeaRoute Express", shipper:"Org1MSP", currentHolder:"Org1MSP", status:"DELAYED", cargoType:"Chemicals", weightKg:11000, createdAt:"2024-01-25T11:00:00Z", estimatedArrival:"2024-03-10T00:00:00Z", actualArrival:null, delayRiskScore:0.91,
    events:[
      { eventId:"EVT-005-1", eventType:"SHIPMENT_CREATED", location:"Busan, KR",       actor:"Org1MSP", timestamp:"2024-01-25T11:00:00Z", description:"Hazmat class 3 — MSDS attached",       txId:"tx_bs001" },
      { eventId:"EVT-005-2", eventType:"DEPARTED_PORT",    location:"Busan Port",      actor:"Org1MSP", timestamp:"2024-01-27T09:00:00Z", description:"Vessel departed",                      txId:"tx_bs002" },
      { eventId:"EVT-005-3", eventType:"DELAY_REPORTED",   location:"South China Sea", actor:"Org1MSP", timestamp:"2024-02-05T16:00:00Z", description:"Storm — rerouted, ETA +8 days",        txId:"tx_bs003" },
    ]},
];

const mockHistory = {};
mockLedger.forEach((s) => {
  mockHistory[s.shipmentId] = [{ txId:"tx_genesis_"+s.shipmentId, timestamp:{ seconds: Math.floor(new Date(s.createdAt).getTime()/1000) }, isDelete:false, value:{...s} }];
});

function mockFind(id) {
  const s = mockLedger.find((x) => x.shipmentId === id);
  if (!s) throw new Error(`Shipment ${id} does not exist`);
  return s;
}

const STATUS_MAP = { DEPARTED_PORT:"IN_TRANSIT", ARRIVED_PORT:"AT_PORT", CUSTOMS_ENTRY:"IN_CUSTOMS", CUSTOMS_CLEARED:"IN_TRANSIT", DELIVERED:"DELIVERED" };

const mockFabric = {
  async createShipment(data) {
    const { shipmentId, containerId, origin, destination, carrier, cargoType, weightKg, estimatedArrival } = data;
    const now = new Date().toISOString();
    const shipment = { shipmentId, containerId, origin, destination, carrier, shipper:"Org1MSP", currentHolder:"Org1MSP", status:"CREATED", cargoType, weightKg, createdAt:now, estimatedArrival, actualArrival:null, delayRiskScore:0,
      events:[{ eventId:`EVT-${shipmentId}-1`, eventType:"SHIPMENT_CREATED", location:origin, actor:"Org1MSP", timestamp:now, description:"Shipment created on blockchain (mock ledger)", txId:`tx_${uuidv4().slice(0,8)}` }] };
    mockLedger.push(shipment);
    mockHistory[shipmentId] = [{ txId:`tx_${uuidv4().slice(0,8)}`, timestamp:{ seconds:Math.floor(Date.now()/1000) }, isDelete:false, value:{...shipment} }];
    logger.info(`[MOCK FABRIC] Shipment ${shipmentId} written to mock ledger`);
    return shipment;
  },
  async getShipment(id)      { return mockFind(id); },
  async getAllShipments()     { return mockLedger; },
  async recordEvent(shipmentId, eventType, location, description) {
    const s = mockFind(shipmentId);
    const now = new Date().toISOString();
    const txId = `tx_${uuidv4().slice(0,8)}`;
    s.events.push({ eventId:`EVT-${shipmentId}-${s.events.length+1}`, eventType, location, actor:"Org1MSP", timestamp:now, description, txId });
    if (STATUS_MAP[eventType]) s.status = STATUS_MAP[eventType];
    mockHistory[shipmentId]?.push({ txId, timestamp:{ seconds:Math.floor(Date.now()/1000) }, isDelete:false, value:{...s} });
    return s;
  },
  async transferCustody(shipmentId, newHolder, location) {
    const s = mockFind(shipmentId);
    const prev = s.currentHolder; s.currentHolder = newHolder;
    const now = new Date().toISOString();
    s.events.push({ eventId:`EVT-${shipmentId}-${s.events.length+1}`, eventType:"CUSTODY_TRANSFERRED", location, actor:"Org1MSP", timestamp:now, description:`Custody transferred from ${prev} to ${newHolder}`, txId:`tx_${uuidv4().slice(0,8)}` });
    return s;
  },
  async updateDelayRisk(shipmentId, riskScore) {
    const s = mockFind(shipmentId);
    s.delayRiskScore = riskScore;
    if (riskScore >= 0.85 && s.status === "IN_TRANSIT") s.status = "DELAYED";
    return s;
  },
  async markDelivered(shipmentId) {
    const s = mockFind(shipmentId);
    s.status = "DELIVERED"; s.actualArrival = new Date().toISOString();
    s.events.push({ eventId:`EVT-${shipmentId}-${s.events.length+1}`, eventType:"DELIVERED", location:s.destination, actor:"Org1MSP", timestamp:s.actualArrival, description:"Shipment delivered to final destination", txId:`tx_${uuidv4().slice(0,8)}` });
    return s;
  },
  async getShipmentHistory(shipmentId) { return mockHistory[shipmentId] || []; },
};



// updateStatus and verifyIntegrity added to both implementations

realFabric.updateStatus = async function(shipmentId, newStatus, reason) {
  const { contract, gateway } = await getRealContract();
  try { return JSON.parse((await contract.submitTransaction("UpdateStatus", shipmentId, newStatus, reason)).toString()); }
  finally { gateway.disconnect(); }
};
realFabric.verifyIntegrity = async function(shipmentId, claimedDataJSON) {
  const { contract, gateway } = await getRealContract();
  try { return JSON.parse((await contract.submitTransaction("VerifyIntegrity", shipmentId, claimedDataJSON)).toString()); }
  finally { gateway.disconnect(); }
};

const VALID_STATUSES = ["CREATED","IN_TRANSIT","AT_PORT","IN_CUSTOMS","DELIVERED","DELAYED"];
mockFabric.updateStatus = async function(shipmentId, newStatus, reason) {
  if (!VALID_STATUSES.includes(newStatus)) throw new Error(`Invalid status: ${newStatus}`);
  const s = mockFind(shipmentId);
  const oldStatus = s.status;
  s.status = newStatus;
  const now = new Date().toISOString();
  const txId = `tx_${uuidv4().slice(0,8)}`;
  s.events.push({ eventId:`EVT-${shipmentId}-${s.events.length+1}`, eventType:"STATUS_UPDATED", location:"N/A", actor:"Org1MSP", timestamp:now, description:`Status changed ${oldStatus} → ${newStatus}. Reason: ${reason}`, txId });
  mockHistory[shipmentId]?.push({ txId, timestamp:{ seconds:Math.floor(Date.now()/1000) }, isDelete:false, value:{...s} });
  logger.info(`[MOCK FABRIC] Status of ${shipmentId} updated to ${newStatus}`);
  return s;
};
mockFabric.verifyIntegrity = async function(shipmentId, claimedDataJSON) {
  const s = mockFind(shipmentId);
  const onChainJSON = JSON.stringify(s);
  let claimedObj;
  try { claimedObj = JSON.parse(claimedDataJSON); } catch(e) { throw new Error("Invalid JSON in claimedData"); }
  const isMatch = JSON.stringify(claimedObj) === JSON.stringify(s);
  return {
    shipmentId,
    integrityPass: isMatch,
    verifiedAt: new Date().toISOString(),
    txId: `tx_verify_${uuidv4().slice(0,8)}`,
    onChainFields: Object.keys(s).length,
    message: isMatch
      ? "INTEGRITY VERIFIED — data matches ledger exactly"
      : "INTEGRITY FAILED — data has been tampered with or modified",
  };
};

module.exports = USE_MOCK ? mockFabric : realFabric;
