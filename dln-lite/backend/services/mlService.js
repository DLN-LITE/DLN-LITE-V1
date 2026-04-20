// ─────────────────────────────────────────────────────────────────────────────
// ML Service
// Communicates with the Python Flask ML prediction service.
// Formats features, sends request, returns structured prediction.
// ─────────────────────────────────────────────────────────────────────────────

const axios = require("axios");
const logger = require("../utils/logger");

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:5000";

const mlService = {
  /**
   * Get delay prediction for a shipment.
   * Sends relevant features to the Python ML service.
   *
   * @param {Object} shipment - Shipment data from blockchain
   * @param {Object} enrichment - Additional data (port congestion, weather)
   * @returns {Object} prediction result with risk score and factors
   */
  async predictDelay(shipment, enrichment = {}) {
    try {
      // Build the feature vector the ML model expects
      const features = {
        origin_port:            shipment.origin,
        destination_port:       shipment.destination,
        carrier:                shipment.carrier,
        cargo_type:             shipment.cargoType,
        weight_kg:              shipment.weightKg,
        num_stops:              enrichment.numStops || 1,
        distance_km:            enrichment.distanceKm || 8000,
        origin_congestion:      enrichment.originCongestion || 0.5,       // 0–1
        destination_congestion: enrichment.destinationCongestion || 0.5,  // 0–1
        weather_severity:       enrichment.weatherSeverity || "clear",    // clear/moderate/storm
        month:                  new Date().getMonth() + 1,
        carrier_delay_rate:     enrichment.carrierDelayRate || 0.2,       // historical 0–1
        route_avg_delay_days:   enrichment.routeAvgDelayDays || 2.0,
      };

      const response = await axios.post(`${ML_URL}/predict`, features, {
        timeout: 5000,
        headers: { "Content-Type": "application/json" },
      });

      logger.info(`ML prediction for ${shipment.shipmentId}: ${response.data.delay_probability}`);
      return response.data;
    } catch (error) {
      // If ML service is down, return a neutral score — don't break the whole app
      logger.warn(`ML service unavailable: ${error.message}. Returning default score.`);
      return {
        delay_probability: 0.5,
        risk_level: "UNKNOWN",
        top_factors: [],
        error: "ML service temporarily unavailable",
      };
    }
  },

  /**
   * Batch predict delays for multiple shipments (used for dashboard overview)
   */
  async batchPredict(shipmentsWithEnrichment) {
    try {
      const response = await axios.post(
        `${ML_URL}/batch-predict`,
        { shipments: shipmentsWithEnrichment },
        { timeout: 15000 }
      );
      return response.data.predictions;
    } catch (error) {
      logger.warn(`Batch ML prediction failed: ${error.message}`);
      return shipmentsWithEnrichment.map((s) => ({
        shipmentId: s.shipmentId,
        delay_probability: 0.5,
        risk_level: "UNKNOWN",
        error: "ML service unavailable",
      }));
    }
  },

  /**
   * Check if the ML service is healthy
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${ML_URL}/health`, { timeout: 3000 });
      return { status: "ok", details: response.data };
    } catch (error) {
      return { status: "down", error: error.message };
    }
  },
};

module.exports = mlService;
