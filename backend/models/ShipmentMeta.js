// ─────────────────────────────────────────────────────────────────────────────
// ShipmentMeta — MongoDB Model
// Stores off-chain bulk metadata about shipments.
// Critical data (status, events, ownership) lives on blockchain.
// Non-critical data (notes, docs, contacts) lives here.
// ─────────────────────────────────────────────────────────────────────────────

const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  name:       { type: String, required: true },
  type:       { type: String, enum: ["BILL_OF_LADING", "CUSTOMS_FORM", "INSURANCE", "INVOICE", "OTHER"] },
  url:        { type: String },
  uploadedAt: { type: Date, default: Date.now },
});

const shipmentMetaSchema = new mongoose.Schema(
  {
    shipmentId:   { type: String, required: true, unique: true, index: true },
    notes:        { type: String, default: "" },
    documents:    [documentSchema],
    contactEmail: { type: String, default: "" },
    createdBy:    { type: String, default: "unknown" },     // org that created it
    tags:         [{ type: String }],
    // Sensor data snapshots — high frequency data stays off-chain
    latestTemp:   { type: Number },
    latestHumidity: { type: Number },
    lastSensorAt: { type: Date },
  },
  {
    timestamps: true,
    collection: "shipment_meta",
  }
);

module.exports = mongoose.model("ShipmentMeta", shipmentMetaSchema);
