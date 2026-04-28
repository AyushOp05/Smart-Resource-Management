import styles from "./ActionPlanModal.module.css";

export default function ActionPlanModal({ plan, onClose }) {
  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Full Action Plan</h2>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>
        <div className={styles.body}>
          {plan.split("\n").map((line, i) => {
            if (!line.trim()) return <div key={i} className={styles.spacer} />;
            if (/^\d+\./.test(line.trim())) return <p key={i} className={styles.numbered}>{line}</p>;
            if (line.startsWith("##") || line.startsWith("**")) return <p key={i} className={styles.heading}>{line.replace(/\*\*/g, "").replace(/##/g, "").trim()}</p>;
            if (line.startsWith("-") || line.startsWith("•")) return <p key={i} className={styles.bullet}>• {line.replace(/^[-•]\s*/, "")}</p>;
            return <p key={i} className={styles.para}>{line}</p>;
          })}
        </div>
      </div>
    </div>
  );
}
