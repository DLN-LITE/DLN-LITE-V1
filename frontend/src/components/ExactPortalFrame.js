import React from "react";

export default function ExactPortalFrame() {
  const configuredApiBase = (process.env.REACT_APP_API_URL || "").trim();
  const iframeSrc = configuredApiBase
    ? `/logistics_blockchain_3d.html?apiBase=${encodeURIComponent(configuredApiBase)}`
    : "/logistics_blockchain_3d.html";

  return (
    <iframe
      title="Exact Logistics Portal"
      src={iframeSrc}
      style={{
        width: "100%",
        height: "100vh",
        border: "0",
        display: "block",
        background: "#04091a",
      }}
    />
  );
}
