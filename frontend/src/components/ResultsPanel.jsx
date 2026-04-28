import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";
import styles from "./ResultsPanel.module.css";

const URGENCY_STYLE = {
  low:      { bg: "#EAF3DE", color: "#3B6D11" },
  medium:   { bg: "#FAEEDA", color: "#854F0B" },
  high:     { bg: "#FAECE7", color: "#993C1D" },
  critical: { bg: "#FCEBEB", color: "#A32D2D" },
};

const TYPE_STYLE = {
  Volunteer:   { bg: "#EEEDFE", color: "#534AB7" },
  Equipment:   { bg: "#E6F1FB", color: "#185FA5" },
  Funding:     { bg: "#EAF3DE", color: "#3B6D11" },
  Service:     { bg: "#E1F5EE", color: "#0F6E56" },
  Personnel:   { bg: "#FBEAF0", color: "#993556" },
  Material:    { bg: "#FAEEDA", color: "#854F0B" },
  Technology:  { bg: "#F1EFE8", color: "#5F5E5A" },
};

function ScoreBar({ score }) {
  const color = score >= 85 ? "#1D9E75" : score >= 65 ? "#EF9F27" : "#D85A30";
  return (
    <div className={styles.scoreWrap}>
      <div className={styles.scoreTrack}>
        <div className={styles.scoreFill} style={{ width: `${score}%`, background: color }} />
      </div>
      <span className={styles.scoreLabel} style={{ color }}>{score}%</span>
    </div>
  );
}

function ResourceCard({ rec, index }) {
  const [open, setOpen] = useState(index === 0);
  const typeStyle = TYPE_STYLE[rec.type] || TYPE_STYLE.Service;

  return (
    <div className={`${styles.card} ${index === 0 ? styles.topCard : ""}`}>
      {index === 0 && <div className={styles.topBadge}>Top pick</div>}
      <button className={styles.cardHeader} onClick={() => setOpen(!open)}>
        <div className={styles.rankCircle} data-rank={index}>
          {rec.rank}
        </div>
        <div className={styles.cardMain}>
          <div className={styles.cardTitle}>
            <span className={styles.resourceName}>{rec.resource}</span>
            <span className={styles.typeBadge} style={{ background: typeStyle.bg, color: typeStyle.color }}>
              {rec.type}
            </span>
          </div>
          <ScoreBar score={rec.matchScore} />
          <p className={styles.reason}>{rec.reason}</p>
        </div>
        <span className={styles.chevron}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className={styles.cardBody}>
          <div className={styles.cardMeta}>
            <div>
              <p className={styles.metaLabel}>Availability</p>
              <p className={styles.metaValue}>{rec.availability}</p>
            </div>
            <div>
              <p className={styles.metaLabel}>Expected impact</p>
              <p className={styles.metaValue}>{rec.impact}</p>
            </div>
          </div>
          {rec.conditions_met?.length > 0 && (
            <div>
              <p className={styles.metaLabel}>Conditions satisfied</p>
              <div className={styles.conditionPills}>
                {rec.conditions_met.map((c, i) => (
                  <span key={i} className={styles.conditionPill}>✓ {c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Sanitize text for jsPDF (Helvetica only supports Latin1 / cp1252)
function sanitize(str) {
  if (!str) return "";
  return String(str)
    .replace(/[\u2018\u2019\u201A]/g, "'")   // smart single quotes
    .replace(/[\u201C\u201D\u201E]/g, '"')   // smart double quotes
    .replace(/\u2026/g, "...")               // ellipsis
    .replace(/[\u2013\u2014]/g, "-")         // en/em dash
    .replace(/\u2022/g, "*")                 // bullet
    .replace(/\u00A0/g, " ")                 // non-breaking space
    .replace(/[^\x00-\xFF]/g, "");           // drop anything outside Latin1
}

function wrapText(doc, text, x, y, maxWidth, lineHeight) {
  const safe = sanitize(text);
  const words = safe.split(" ");
  let line = "";
  let curY = y;
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (doc.getTextWidth(test) > maxWidth && line) {
      doc.text(line, x, curY);
      line = word;
      curY += lineHeight;
      if (curY > 275) { doc.addPage(); curY = 20; }
    } else {
      line = test;
    }
  }
  if (line) { doc.text(line, x, curY); curY += lineHeight; }
  return curY;
}

function generatePDF(result) {
  const doc = new jsPDF();
  const W = 170; // usable text width
  let y = 20;

  // -- Header --
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(17, 19, 24);
  doc.text("Smart Resource Management Report", 20, y);
  y += 8;
  doc.setDrawColor(29, 158, 117);
  doc.setLineWidth(0.6);
  doc.line(20, y, 190, y);
  y += 10;

  // -- Date --
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 96, 112);
  doc.text("Date: " + new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), 20, y);
  y += 8;

  // -- Query --
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(17, 19, 24);
  doc.text("Query:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 96, 112);
  y = wrapText(doc, result._query || "N/A", 42, y, W - 22, 5);
  y += 6;

  // -- Overview --
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(17, 19, 24);
  doc.text("Overview", 20, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90, 96, 112);
  doc.text(sanitize("Domain: " + (result.domain || "N/A") + "      Urgency: " + (result.urgency || "N/A").toUpperCase()), 20, y);
  y += 7;
  if (result.summary) {
    y = wrapText(doc, result.summary, 20, y, W, 5);
  }
  y += 6;

  // -- Ranked Resources --
  if (y > 255) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(17, 19, 24);
  doc.text("Ranked Resources", 20, y);
  y += 8;

  (result.recommendations || []).forEach((rec) => {
    if (y > 250) { doc.addPage(); y = 20; }
    // Rank + Name + Score
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(17, 19, 24);
    const title = sanitize("#" + rec.rank + "  " + rec.resource);
    doc.text(title, 20, y);
    const scoreColor = rec.matchScore >= 85 ? [29,158,117] : rec.matchScore >= 65 ? [239,159,39] : [216,90,48];
    doc.setTextColor(...scoreColor);
    doc.text(rec.matchScore + "%", 180, y, { align: "right" });
    y += 5;
    // Reason
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 96, 112);
    y = wrapText(doc, rec.reason || "", 24, y, W - 4, 4.5);
    // Availability
    if (rec.availability) {
      doc.setFont("helvetica", "italic");
      doc.text(sanitize("Availability: " + rec.availability), 24, y);
      y += 4.5;
    }
    y += 4;
  });

  // -- Next Steps --
  if (result.next_steps?.length > 0) {
    if (y > 250) { doc.addPage(); y = 20; }
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(17, 19, 24);
    doc.text("Next Steps", 20, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90, 96, 112);
    result.next_steps.forEach((step, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      y = wrapText(doc, (i + 1) + ". " + step, 20, y, W, 5);
      y += 2;
    });
  }

  // -- Footer --
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(145, 152, 168);
    doc.text("Generated by Smart Resource Management System", 105, 290, { align: "center" });
  }

  const domain = sanitize(result.domain || "report").toLowerCase().replace(/\s+/g, "-");
  doc.save("resource-report-" + domain + ".pdf");
}

export default function ResultsPanel({ result, onActionPlan, planLoading }) {
  const urgencyStyle = URGENCY_STYLE[result.urgency] || URGENCY_STYLE.medium;

  return (
    <div className={styles.panel}>
      {/* Stat cards */}
      <div className={styles.statGrid}>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Domain</p>
          <p className={styles.statValue}>{result.domain}</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Urgency</p>
          <span className={styles.urgencyBadge} style={{ background: urgencyStyle.bg, color: urgencyStyle.color }}>
            {result.urgency?.toUpperCase()}
          </span>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Resources ranked</p>
          <p className={styles.statValue}>{result.recommendations?.length}</p>
        </div>
        <div className={styles.stat}>
          <p className={styles.statLabel}>Conditions found</p>
          <p className={styles.statValue}>{result.conditions_identified?.length}</p>
        </div>
      </div>

      {/* Summary */}
      <p className={styles.summary}>{result.summary}</p>

      {/* Conditions */}
      {result.conditions_identified?.length > 0 && (
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Conditions identified</p>
          <div className={styles.condTagRow}>
            {result.conditions_identified.map((c, i) => (
              <span key={i} className={styles.condTag}>{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* Score comparison chart */}
      {result.recommendations?.length > 0 && (
        <div className={styles.section}>
          <p className={styles.sectionLabel}>Score comparison</p>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={Math.max(180, result.recommendations.length * 36)}>
              <BarChart
                data={result.recommendations.map((r) => ({
                  name: r.resource?.length > 22 ? r.resource.slice(0, 22) + "…" : r.resource,
                  score: r.matchScore,
                }))}
                layout="vertical"
                margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
              >
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, "Match Score"]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-md)",
                  }}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} isAnimationActive={true} animationDuration={800}>
                  {result.recommendations.map((r, i) => (
                    <Cell
                      key={i}
                      fill={r.matchScore >= 85 ? "#1D9E75" : r.matchScore >= 65 ? "#EF9F27" : "#D85A30"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recommendations */}
      <div className={styles.section}>
        <p className={styles.sectionLabel}>Ranked recommendations</p>
        <div className={styles.cardList}>
          {result.recommendations?.map((rec, i) => (
            <ResourceCard key={i} rec={rec} index={i} />
          ))}
        </div>
      </div>

      {/* Next steps */}
      {result.next_steps?.length > 0 && (
        <div className={styles.nextSteps}>
          <p className={styles.sectionLabel}>Suggested next steps</p>
          <ol className={styles.stepList}>
            {result.next_steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      )}

      <div className={styles.actions}>
        <button className={styles.planBtn} onClick={onActionPlan} disabled={planLoading}>
          {planLoading ? "Generating..." : "Generate full action plan →"}
        </button>
        <button
          className={styles.pdfBtn}
          onClick={() => generatePDF(result)}
          id="download-pdf-report"
        >
          📄 Download PDF report
        </button>
      </div>
    </div>
  );
}
