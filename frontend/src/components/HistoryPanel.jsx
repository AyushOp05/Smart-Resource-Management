import { useEffect } from "react";
import styles from "./HistoryPanel.module.css";

const URGENCY_COLORS = {
  low:      { bg: "#EAF3DE", color: "#3B6D11" },
  medium:   { bg: "#FAEEDA", color: "#854F0B" },
  high:     { bg: "#FAECE7", color: "#993C1D" },
  critical: { bg: "#FCEBEB", color: "#A32D2D" },
};

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  return new Date(isoString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncate(str, max = 60) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

export default function HistoryPanel({ open, onClose, history, onSelect, onClear }) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Dark overlay */}
      <div
        className={`${styles.overlay} ${open ? styles.open : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <aside
        className={`${styles.panel} ${open ? styles.open : ""}`}
        role="dialog"
        aria-label="Query history"
      >
        {/* Header */}
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            <span className={styles.icon}>⏱</span>
            History
            {history.length > 0 && (
              <span className={styles.countBadge}>{history.length}</span>
            )}
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close history">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className={styles.panelBody}>
          {history.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>📋</span>
              <p>No queries yet</p>
              <p>Your analysis history will appear here.</p>
            </div>
          ) : (
            history.map((entry, i) => {
              const urgency = entry.result?.urgency || "medium";
              const uStyle = URGENCY_COLORS[urgency] || URGENCY_COLORS.medium;
              return (
                <div
                  key={i}
                  className={styles.card}
                  onClick={() => onSelect(entry)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(entry);
                    }
                  }}
                >
                  <div className={styles.cardQuery}>{truncate(entry.query)}</div>
                  <div className={styles.cardMeta}>
                    {entry.result?.domain && (
                      <span className={styles.domainBadge}>{entry.result.domain}</span>
                    )}
                    <span
                      className={styles.urgencyBadge}
                      style={{ background: uStyle.bg, color: uStyle.color }}
                    >
                      {urgency}
                    </span>
                    <span className={styles.timeBadge}>{timeAgo(entry.timestamp)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className={styles.panelFooter}>
            <button className={styles.clearBtn} onClick={onClear}>
              🗑 Clear history
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
