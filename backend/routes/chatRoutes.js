const express = require("express");
const axios = require("axios");
const { body, validationResult } = require("express-validator");

const logger = require("../utils/logger");

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: errors.array()[0].msg, errors: errors.array() });
  }
  next();
};

router.post(
  "/grok",
  [
    body("message").trim().isLength({ min: 1 }).withMessage("Message is required"),
    body("history").optional().isArray().withMessage("History must be an array"),
    body("role").optional().isString(),
    body("context").optional().isObject(),
  ],
  validate,
  async (req, res) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        error: "Grok chat is not configured yet. Set XAI_API_KEY on the backend.",
      });
    }

    try {
      const history = Array.isArray(req.body.history) ? req.body.history.slice(-10) : [];
      const role = req.body.role || "guest";
      const context = req.body.context || {};
      const model = process.env.XAI_MODEL || "grok-4.20-reasoning";

      const shipmentLines = Array.isArray(context.shipments)
        ? context.shipments.slice(0, 8).map((shipment) =>
            `${shipment.id}: ${shipment.origin} -> ${shipment.dest}, ${shipment.status}, carrier ${shipment.carrier}, ETA ${shipment.eta}`
          ).join("\n")
        : "No shipment context provided.";

      const systemPrompt = [
        "You are ChainFreight Copilot, an operations assistant inside a blockchain logistics portal.",
        "Give concise, practical answers.",
        `Current user role: ${role}.`,
        "Use the shipment context when relevant.",
        "If asked about shipment state, explain it in terms of shipper, carrier, and customs operations.",
        "If you are unsure, say what is missing instead of inventing details.",
        "Shipment context:",
        shipmentLines,
      ].join("\n");

      const input = [
        { role: "system", content: systemPrompt },
        ...history
          .filter((item) => item && ["user", "assistant"].includes(item.role) && item.content)
          .map((item) => ({ role: item.role, content: String(item.content) })),
        { role: "user", content: req.body.message },
      ];

      const response = await axios.post(
        "https://api.x.ai/v1/responses",
        {
          model,
          input,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 60000,
        }
      );

      const data = response.data || {};
      const text =
        data.output_text ||
        data.output?.map((item) => item?.content?.map((part) => part?.text).filter(Boolean).join(" ")).filter(Boolean).join("\n") ||
        "I could not generate a response.";

      res.json({
        success: true,
        reply: text,
        model: data.model || model,
      });
    } catch (error) {
      logger.error(`POST /chat/grok error: ${error.response?.data?.error || error.message}`);
      res.status(error.response?.status || 500).json({
        success: false,
        error:
          error.response?.data?.error?.message ||
          error.response?.data?.error ||
          error.message ||
          "Failed to reach Grok API",
      });
    }
  }
);

module.exports = router;
