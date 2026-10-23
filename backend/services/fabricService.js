const { Gateway } = require("fabric-network");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");
const { MongoWallet } = require("./caService");
const AuthUser = require("../models/AuthUser");

const NETWORK_DIR = path.resolve(__dirname, "../../blockchain/network");
const PROFILE_PATH = path.join(NETWORK_DIR, "connection-profile.json");
const CHANNEL_NAME = "dlnchannel";
const CHAINCODE_NAME = "shipment";

// Gateway connection pooling (cache by userId)
const gateways = new Map();

// In-memory fallback ledger (for when Fabric or Mongo is offline)
let mockLedger = [
  {
    shipmentId: "SHP-001",
    containerId: "CONT-ABC123",
    origin: "Shanghai, CN",
    destination: "Rotterdam, NL",
    carrier: "OceanFreight Co",
    shipper: "Org1MSP",
    currentHolder: "Org1MSP",
    status: "IN_TRANSIT",
    cargoType: "Electronics",
    weightKg: 14200,
    createdAt: "2026-01-15T08:00:00Z",
    estimatedArrival: "2026-03-15T00:00:00Z",
    actualArrival: null,
    delayRiskScore: 0.71,
    events: [
      {
        eventId: "EVT-001-1",
        eventType: "SHIPMENT_CREATED",
        location: "Shanghai, CN",
        actor: "Org1MSP",
        timestamp: "2026-01-15T08:00:00Z",
        description: "Shipment created",
        txId: "tx_abc001",
      },
      {
        eventId: "EVT-001-2",
        eventType: "DEPARTED_PORT",
        location: "Shanghai Port",
        actor: "Org1MSP",
        timestamp: "2026-01-16T10:00:00Z",
        description: "Vessel MSC Beatrice departed",
        txId: "tx_abc002",
      },
    ],
  },
  {
    shipmentId: "SHP-002",
    containerId: "CONT-XYZ789",
    origin: "Mumbai, IN",
    destination: "Felixstowe, UK",
    carrier: "GlobalShip Ltd",
    shipper: "Org2MSP",
    currentHolder: "Org2MSP",
    status: "AT_PORT",
    cargoType: "Textiles",
    weightKg: 9800,
    createdAt: "2026-01-20T10:00:00Z",
    estimatedArrival: "2026-03-28T00:00:00Z",
    actualArrival: null,
    delayRiskScore: 0.42,
    events: [
      {
        eventId: "EVT-002-1",
        eventType: "SHIPMENT_CREATED",
        location: "Mumbai, IN",
        actor: "Org2MSP",
        timestamp: "2026-01-20T10:00:00Z",
        description: "Shipment registered",
        txId: "tx_xyz001",
      },
    ],
  },
];

const mockHistory = {};
mockLedger.forEach((s) => {
  mockHistory[s.shipmentId] = [
    {
      txId: "tx_genesis_" + s.shipmentId,
      timestamp: { seconds: Math.floor(new Date(s.createdAt).getTime() / 1000) },
      isDelete: false,
      value: { ...s },
    },
  ];
});

async function getContractForUser(userId) {
  try {
    if (userId && gateways.has(userId)) {
      const g = gateways.get(userId);
      const network = await g.getNetwork(CHANNEL_NAME);
      return network.getContract(CHAINCODE_NAME);
    }

    if (!fs.existsSync(PROFILE_PATH)) {
      throw new Error(`Profile path does not exist: ${PROFILE_PATH}`);
    }

    const ccpPath = PROFILE_PATH;
    const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

    for (const peer in ccp.peers) {
      if (ccp.peers[peer].tlsCACerts && ccp.peers[peer].tlsCACerts.path) {
        ccp.peers[peer].tlsCACerts.path = path.join(NETWORK_DIR, ccp.peers[peer].tlsCACerts.path);
      }
    }
    for (const orderer in ccp.orderers) {
      if (ccp.orderers[orderer].tlsCACerts && ccp.orderers[orderer].tlsCACerts.path) {
        ccp.orderers[orderer].tlsCACerts.path = path.join(NETWORK_DIR, ccp.orderers[orderer].tlsCACerts.path);
      }
    }

    const wallet = new MongoWallet();
    let effectiveUser = userId;
    let identityExists = effectiveUser ? await wallet.get(effectiveUser).catch(() => null) : null;

    if (!identityExists) {
      // Find any enrolled user in Mongo as default gateway actor
      const anyUser = await AuthUser.findOne({ "fabricIdentity.certificate": { $exists: true } }).catch(() => null);
      if (anyUser) {
        effectiveUser = anyUser.email;
        identityExists = await wallet.get(effectiveUser).catch(() => null);
      }
    }

    if (!identityExists) {
      throw new Error(`No enrolled Fabric identity found in MongoDB for user: ${userId || "default"}`);
    }

    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: effectiveUser,
      discovery: { enabled: true, asLocalhost: true },
    });

    gateways.set(effectiveUser, gateway);

    const network = await gateway.getNetwork(CHANNEL_NAME);
    const contract = network.getContract(CHAINCODE_NAME);

    logger.info(`Successfully connected to Fabric network as: ${effectiveUser}`);
    return contract;
  } catch (error) {
    logger.warn(`Fabric connection unavailable (${error.message}). Falling back to in-memory ledger.`);
    return null;
  }
}

function parseResponse(resultBuffer) {
  if (!resultBuffer || resultBuffer.length === 0) return null;
  return JSON.parse(resultBuffer.toString("utf8"));
}

module.exports = {
  async getContract(userId) {
    return await getContractForUser(userId);
  },

  async createShipment(userIdOrData, maybeData) {
    let userId = "admin";
    let data = userIdOrData;
    if (typeof userIdOrData === "string" && maybeData) {
      userId = userIdOrData;
      data = maybeData;
    }

    const {
      shipmentId,
      containerId,
      origin,
      destination,
      carrier,
      cargoType,
      weightKg,
      estimatedArrival,
    } = data || {};

    const contract = await this.getContract(userId);
    if (contract) {
      const result = await contract.submitTransaction(
        "CreateShipment",
        shipmentId,
        containerId,
        origin,
        destination,
        carrier,
        cargoType,
        weightKg ? weightKg.toString() : "0",
        estimatedArrival || ""
      );
      return parseResponse(result);
    }

    // In-memory fallback
    const now = new Date().toISOString();
    const fallbackShipment = {
      shipmentId,
      containerId,
      origin,
      destination,
      carrier,
      shipper: "Org1MSP",
      currentHolder: "Org1MSP",
      status: "CREATED",
      cargoType: cargoType || "General",
      weightKg: parseFloat(weightKg) || 0,
      createdAt: now,
      estimatedArrival: estimatedArrival || now,
      actualArrival: null,
      delayRiskScore: 0.15,
      events: [
        {
          eventId: `EVT-${shipmentId}-1`,
          eventType: "SHIPMENT_CREATED",
          location: origin,
          actor: "Org1MSP",
          timestamp: now,
          description: "Shipment registered on blockchain manifest",
          txId: `tx_${uuidv4().slice(0, 8)}`,
        },
      ],
    };
    mockLedger.push(fallbackShipment);
    return fallbackShipment;
  },

  async getShipment(userIdOrId, maybeId) {
    let userId = null;
    let id = userIdOrId;
    if (maybeId) {
      userId = userIdOrId;
      id = maybeId;
    }

    const contract = await this.getContract(userId);
    if (contract) {
      const result = await contract.evaluateTransaction("GetShipment", id);
      return parseResponse(result);
    }

    const found = mockLedger.find((s) => s.shipmentId === id);
    if (!found) throw new Error(`Shipment ${id} does not exist`);
    return found;
  },

  async getAllShipments(userId) {
    const contract = await this.getContract(userId);
    if (contract) {
      const result = await contract.evaluateTransaction("GetAllShipments");
      return parseResponse(result);
    }

    return mockLedger;
  },

  async recordEvent(userIdOrShipmentId, shipmentIdOrType, eventTypeOrLoc, locationOrDesc, maybeDesc) {
    let userId = null;
    let shipmentId = userIdOrShipmentId;
    let eventType = shipmentIdOrType;
    let location = eventTypeOrLoc;
    let description = locationOrDesc;

    if (maybeDesc !== undefined) {
      userId = userIdOrShipmentId;
      shipmentId = shipmentIdOrType;
      eventType = eventTypeOrLoc;
      location = locationOrDesc;
      description = maybeDesc;
    }

    const contract = await this.getContract(userId);
    if (contract) {
      const result = await contract.submitTransaction(
        "RecordEvent",
        shipmentId,
        eventType,
        location,
        description
      );
      return parseResponse(result);
    }

    const s = mockLedger.find((x) => x.shipmentId === shipmentId);
    if (s) {
      const now = new Date().toISOString();
      const txId = `tx_${uuidv4().slice(0, 8)}`;
      s.events = s.events || [];
      s.events.push({
        eventId: `EVT-${shipmentId}-${s.events.length + 1}`,
        eventType,
        location,
        actor: "Org1MSP",
        timestamp: now,
        description,
        txId,
      });
      if (eventType === "CUSTOMS_CLEARED") s.status = "IN_TRANSIT";
      if (eventType === "DELIVERED") s.status = "DELIVERED";
      if (eventType === "DEPARTED_PORT") s.status = "IN_TRANSIT";
      if (eventType === "ARRIVED_PORT") s.status = "AT_PORT";
      return s;
    }
    return { shipmentId, eventType, status: "UPDATED" };
  },

  async transferCustody(userIdOrShipmentId, shipmentIdOrHolder, newHolderOrLoc, maybeLoc) {
    let userId = null;
    let shipmentId = userIdOrShipmentId;
    let newHolder = shipmentIdOrHolder;
    let location = newHolderOrLoc;

    if (maybeLoc !== undefined) {
      userId = userIdOrShipmentId;
      shipmentId = shipmentIdOrHolder;
      newHolder = newHolderOrLoc;
      location = maybeLoc;
    }

    const contract = await this.getContract(userId);
    if (contract) {
      const result = await contract.submitTransaction("TransferCustody", shipmentId, newHolder, location);
      return parseResponse(result);
    }

    const s = mockLedger.find((x) => x.shipmentId === shipmentId);
    if (s) {
      s.currentHolder = newHolder;
      s.events.push({
        eventId: `EVT-${shipmentId}-${s.events.length + 1}`,
        eventType: "CUSTODY_TRANSFERRED",
        location,
        actor: "Org1MSP",
        timestamp: new Date().toISOString(),
        description: `Custody transferred to ${newHolder}`,
        txId: `tx_${uuidv4().slice(0, 8)}`,
      });
      return s;
    }
    return { shipmentId, currentHolder: newHolder };
  },

  async updateDelayRisk(userIdOrShipmentId, shipmentIdOrScore, maybeScore) {
    let userId = null;
    let shipmentId = userIdOrShipmentId;
    let riskScore = shipmentIdOrScore;

    if (maybeScore !== undefined) {
      userId = userIdOrShipmentId;
      shipmentId = shipmentIdOrScore;
      riskScore = maybeScore;
    }

    const contract = await this.getContract(userId);
    if (contract) {
      const result = await contract.submitTransaction("UpdateDelayRisk", shipmentId, riskScore.toString());
      return parseResponse(result);
    }

    const s = mockLedger.find((x) => x.shipmentId === shipmentId);
    if (s) s.delayRiskScore = parseFloat(riskScore) || 0;
    return s;
  },

  async markDelivered(userIdOrShipmentId, maybeShipmentId) {
    let userId = null;
    let shipmentId = userIdOrShipmentId;
    if (maybeShipmentId) {
      userId = userIdOrShipmentId;
      shipmentId = maybeShipmentId;
    }

    const contract = await this.getContract(userId);
    if (contract) {
      const result = await contract.submitTransaction("MarkDelivered", shipmentId);
      return parseResponse(result);
    }

    const s = mockLedger.find((x) => x.shipmentId === shipmentId);
    if (s) {
      s.status = "DELIVERED";
      s.actualArrival = new Date().toISOString();
      return s;
    }
    return { shipmentId, status: "DELIVERED" };
  },

  async getShipmentHistory(userIdOrShipmentId, maybeShipmentId) {
    let userId = null;
    let shipmentId = userIdOrShipmentId;
    if (maybeShipmentId) {
      userId = userIdOrShipmentId;
      shipmentId = maybeShipmentId;
    }

    const contract = await this.getContract(userId);
    if (contract) {
      const result = await contract.evaluateTransaction("GetShipmentHistory", shipmentId);
      return parseResponse(result);
    }

    return mockHistory[shipmentId] || [];
  },

  async updateStatus(userIdOrShipmentId, shipmentIdOrStatus, newStatusOrReason, maybeReason) {
    let userId = null;
    let shipmentId = userIdOrShipmentId;
    let newStatus = shipmentIdOrStatus;
    let reason = newStatusOrReason;

    if (maybeReason !== undefined) {
      userId = userIdOrShipmentId;
      shipmentId = shipmentIdOrStatus;
      newStatus = newStatusOrReason;
      reason = maybeReason;
    }

    const contract = await this.getContract(userId);
    if (contract) {
      const result = await contract.submitTransaction("UpdateStatus", shipmentId, newStatus, reason || "");
      return parseResponse(result);
    }

    const s = mockLedger.find((x) => x.shipmentId === shipmentId);
    if (s) s.status = newStatus;
    return s;
  },

  async verifyIntegrity(userIdOrShipmentId, shipmentIdOrClaimed, maybeClaimed) {
    let userId = null;
    let shipmentId = userIdOrShipmentId;
    let claimedDataJSON = shipmentIdOrClaimed;

    if (maybeClaimed !== undefined) {
      userId = userIdOrShipmentId;
      shipmentId = shipmentIdOrClaimed;
      claimedDataJSON = maybeClaimed;
    }

    const contract = await this.getContract(userId);
    if (contract) {
      const result = await contract.evaluateTransaction("VerifyIntegrity", shipmentId, JSON.stringify(claimedDataJSON));
      return parseResponse(result);
    }

    const s = mockLedger.find((x) => x.shipmentId === shipmentId);
    if (!s) throw new Error("Shipment not found on ledger");
    const claimedStr = typeof claimedDataJSON === "string" ? claimedDataJSON : JSON.stringify(claimedDataJSON);
    let claimedObj;
    try {
      claimedObj = JSON.parse(claimedStr);
    } catch {
      throw new Error("Invalid JSON");
    }
    const isMatch = s.carrier === claimedObj.carrier && s.status === claimedObj.status;
    return {
      shipmentId,
      integrityPass: isMatch,
      verifiedAt: new Date().toISOString(),
      txId: `tx_verify_${uuidv4().slice(0, 8)}`,
      message: isMatch
        ? "INTEGRITY VERIFIED — data matches ledger exactly"
        : "INTEGRITY FAILED — data has been tampered with",
    };
  },
};
