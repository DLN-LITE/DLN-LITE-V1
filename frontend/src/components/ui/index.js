import React, { useState, useEffect } from "react";
import { Check, Copy } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// StatTile count-up hook
// ─────────────────────────────────────────────────────────────────────────────
function useCountUp(endVal, duration = 600) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // If not a number (e.g. string with % or null), do not animate
    const numeric = typeof endVal === "number" ? endVal : parseFloat(endVal);
    if (isNaN(numeric)) {
      setCount(endVal);
      return;
    }

    let start = 0;
    const startTime = performance.now();

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutQuad
      const easedProgress = progress * (2 - progress);
      const current = Math.floor(easedProgress * numeric);
      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setCount(numeric);
      }
    }

    requestAnimationFrame(step);
  }, [endVal, duration]);

  return count;
}

// ─────────────────────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────────────────────
export function Card({ title, action, children, className = "", style = {} }) {
  return (
    <div className={`mn-card ${className}`} style={style}>
      {(title || action) && (
        <div className="mn-card-header">
          {title && <div className="mn-card-title">{title}</div>}
          {action && <div className="mn-card-actions">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatTile
// ─────────────────────────────────────────────────────────────────────────────
export function StatTile({ label, value, sub, suffix = "", prefix = "" }) {
  const animatedNumber = useCountUp(typeof value === "number" ? value : parseFloat(value) || 0);
  const isNumeric = typeof value === "number" || (!isNaN(parseFloat(value)) && String(value).trim().endsWith("%"));

  return (
    <div className="mn-stat-tile">
      <div className="mn-stat-label">{label}</div>
      <div className="mn-stat-value">
        {prefix}
        {isNumeric ? animatedNumber : value}
        {suffix}
      </div>
      {sub && <div className="mn-stat-sub">{sub}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatusDot
// ─────────────────────────────────────────────────────────────────────────────
export function StatusDot({ status = "neutral", className = "", style = {} }) {
  // Map standard statuses to dot variants
  let variant = "neutral";
  const s = String(status).toUpperCase();
  if (["DELIVERED", "CLEARED", "OK", "LOW", "VERIFIED", "ACTIVE"].includes(s)) {
    variant = "ok";
  } else if (["IN_TRANSIT", "AT_PORT", "IN_CUSTOMS", "WARN", "MEDIUM", "WARNING"].includes(s)) {
    variant = "warn";
  } else if (["DELAYED", "BAD", "HIGH", "CRITICAL", "FAILED", "TAMPERED"].includes(s)) {
    variant = "bad";
  }

  return <span className={`mn-status-dot ${variant} ${className}`} style={style} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Badge
// ─────────────────────────────────────────────────────────────────────────────
export function Badge({ label, variant = "neutral", dot = false, status, children, className = "", style = {} }) {
  const displayLabel = label || children;
  return (
    <span className={`mn-badge ${variant} ${className}`} style={style}>
      {dot && <StatusDot status={status || variant} />}
      {displayLabel}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RiskBar
// ─────────────────────────────────────────────────────────────────────────────
export function RiskBar({ score = 0, showScore = true }) {
  // score between 0 and 100 (or 0 and 1)
  const pct = score <= 1 && score > 0 ? Math.round(score * 100) : Math.round(score);
  let variant = "ok";
  if (pct >= 65) {
    variant = "bad";
  } else if (pct >= 35) {
    variant = "warn";
  }

  return (
    <div className="mn-risk-bar-wrap">
      <div className="mn-risk-track">
        <div className={`mn-risk-fill ${variant}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      {showScore && <span className="mn-risk-val">{pct}%</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Button
// ─────────────────────────────────────────────────────────────────────────────
export function Button({
  variant = "secondary",
  children,
  onClick,
  type = "button",
  disabled = false,
  className = "",
  style = {},
  title,
}) {
  return (
    <button
      type={type}
      className={`mn-btn ${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={style}
      title={title}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Segmented
// ─────────────────────────────────────────────────────────────────────────────
export function Segmented({ options = [], value, onChange }) {
  return (
    <div className="mn-segmented">
      {options.map((opt) => {
        const key = typeof opt === "string" ? opt : opt.value;
        const label = typeof opt === "string" ? opt : opt.label;
        const isActive = value === key;
        return (
          <button
            key={key}
            type="button"
            className={`mn-segmented-item${isActive ? " active" : ""}`}
            onClick={() => onChange(key)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────
export function Skeleton({ width = "100%", height = 20, style = {}, className = "" }) {
  return (
    <div
      className={`mn-skeleton ${className}`}
      style={{ width, height, ...style }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────────────────────────────────────
export function EmptyState({ message = "No data available", action, children }) {
  return (
    <div className="mn-empty-state">
      <div>{message || children}</div>
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ConfirmDialog
// ─────────────────────────────────────────────────────────────────────────────
export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="mn-modal-backdrop" onClick={onCancel}>
      <div className="mn-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="mn-dialog-title">{title}</div>
        <div className="mn-dialog-desc">{description}</div>
        <div className="mn-dialog-actions">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HashChip
// ─────────────────────────────────────────────────────────────────────────────
export function HashChip({ hash = "", length = 12 }) {
  const [copied, setCopied] = useState(false);

  if (!hash) return <span className="mn-mono" style={{ color: "var(--muted)", fontSize: 12 }}>—</span>;

  let display = hash;
  if (hash.length > length + 2) {
    const half = Math.floor(length / 2);
    display = `${hash.slice(0, half)}…${hash.slice(-half)}`;
  }

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <span
      className={`mn-hash-chip${copied ? " copied" : ""}`}
      onClick={handleCopy}
      title="Click to copy full hash"
    >
      {display}
      {copied ? <Check size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={1.5} />}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline
// ─────────────────────────────────────────────────────────────────────────────
export function Timeline({ events = [] }) {
  if (!events || events.length === 0) {
    return <EmptyState message="No timeline events recorded yet." />;
  }

  return (
    <div className="mn-timeline">
      {events.map((ev, idx) => (
        <div key={idx} className="mn-timeline-item">
          <div className="mn-timeline-dot" />
          <div className="mn-timeline-content">
            <div className="mn-timeline-title">{ev.title || ev.status || ev.eventType}</div>
            <div className="mn-timeline-meta">
              <span>{ev.actor || ev.org || ev.recordedBy || "Org1MSP"}</span>
              <span>•</span>
              <span>{ev.timestamp || ev.date || "Just now"}</span>
              {ev.txId && (
                <>
                  <span>•</span>
                  <HashChip hash={ev.txId} length={10} />
                </>
              )}
            </div>
            {ev.description && (
              <div style={{ fontSize: 12, color: "var(--text)", marginTop: 2 }}>{ev.description}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DataTable
// ─────────────────────────────────────────────────────────────────────────────
export function DataTable({ columns = [], data = [], onRowClick, keyField = "id" }) {
  return (
    <div className="mn-table-wrap">
      <table className="mn-table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} style={{ width: col.width, textAlign: col.align || "left" }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: "center", padding: 24 }}>
                <EmptyState message="No matching records found." />
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={row[keyField] || rowIdx}
                className={onRowClick ? "clickable" : ""}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((col, colIdx) => (
                  <td key={colIdx} style={{ textAlign: col.align || "left" }}>
                    {col.render ? col.render(row, rowIdx) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
