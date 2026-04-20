// ─────────────────────────────────────────────────────────────────────────────
// Analytics Routes
// Aggregated data endpoints used by the dashboard.
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();
const fabricService = require("../services/fabricService");
const logger = require("../utils/logger");

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/summary
// Dashboard headline numbers
// ─────────────────────────────────────────────────────────────────────────────
router.get("/summary", async (req, res) => {
  try {
    const shipments = await fabricService.getAllShipments();

    const total = shipments.length;
    const inTransit = shipments.filter((s) => s.status === "IN_TRANSIT").length;
    const delivered = shipments.filter((s) => s.status === "DELIVERED").length;
    const delayed = shipments.filter((s) => s.status === "DELAYED").length;
    const highRisk = shipments.filter((s) => s.delayRiskScore >= 0.7).length;

    const avgRiskScore =
      shipments.length > 0
        ? (shipments.reduce((sum, s) => sum + (s.delayRiskScore || 0), 0) / shipments.length).toFixed(3)
        : 0;

    res.json({
      success: true,
      data: {
        total,
        inTransit,
        delivered,
        delayed,
        highRisk,
        avgRiskScore: parseFloat(avgRiskScore),
        onTimeRate: total > 0 ? ((total - delayed) / total).toFixed(3) : 1,
      },
    });
  } catch (error) {
    logger.error(`Analytics summary error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/risk-distribution
// How many shipments fall in each risk band
// ─────────────────────────────────────────────────────────────────────────────
router.get("/risk-distribution", async (req, res) => {
  try {
    const shipments = await fabricService.getAllShipments();
    const active = shipments.filter((s) => s.status !== "DELIVERED");

    const distribution = {
      low:    active.filter((s) => s.delayRiskScore < 0.4).length,   // < 40%
      medium: active.filter((s) => s.delayRiskScore >= 0.4 && s.delayRiskScore < 0.7).length,
      high:   active.filter((s) => s.delayRiskScore >= 0.7).length,  // ≥ 70%
    };

    res.json({ success: true, data: distribution });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/analytics/top-routes
// Most active shipping routes on the platform
// ─────────────────────────────────────────────────────────────────────────────
router.get("/top-routes", async (req, res) => {
  try {
    const shipments = await fabricService.getAllShipments();

    const routeCounts = {};
    for (const s of shipments) {
      const key = `${s.origin} → ${s.destination}`;
      routeCounts[key] = (routeCounts[key] || 0) + 1;
    }

    const topRoutes = Object.entries(routeCounts)
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({ success: true, data: topRoutes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
