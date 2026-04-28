import { useState, useRef, useEffect } from "react";
import styles from "./QueryPanel.module.css";

const EXAMPLES = [
  "We have a flood in a rural village. 200 people displaced. No electricity. Need help within 6 hours.",
  "NGO running a food drive for 500 families. Limited cold storage. 10 volunteers available this weekend.",
  "School in remote area needs internet connectivity. Low budget. 300 students. No technical staff on site.",
  "Hospital facing blood shortage. O-negative type urgently needed. 3 donation camps can be arranged.",
  "Wildfire evacuation. 1,200 residents. 4 buses available. Elderly and disabled need priority transport.",
];

const SpeechRecognition =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export default function QueryPanel({ query, setQuery, onAnalyze, loading }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery((prev) => (prev ? prev + " " + transcript : transcript));
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.inputWrap}>
        <textarea
          className={styles.textarea}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe your situation — include constraints (budget, time, location), scale (how many people), urgency, and any resources already available..."
          rows={5}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onAnalyze();
          }}
        />
        <div className={styles.footer}>
          <span className={styles.hint}>Ctrl+Enter to analyze</span>
          <div className={styles.footerActions}>
            {SpeechRecognition && (
              <button
                className={`${styles.micBtn} ${listening ? styles.micActive : ""}`}
                onClick={toggleListening}
                type="button"
                aria-label={listening ? "Stop listening" : "Voice input"}
                id="voice-input-toggle"
              >
                {listening && <span className={styles.pulse} />}
                <span className={styles.micIcon}>{listening ? "●" : "🎤"}</span>
                {listening ? "Listening..." : "Voice"}
              </button>
            )}
            <button
              className={styles.btn}
              onClick={() => onAnalyze()}
              disabled={loading || !query.trim()}
            >
              {loading ? "Analyzing..." : "Analyze & Rank →"}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.examples}>
        <span className={styles.examplesLabel}>Quick examples:</span>
        <div className={styles.pills}>
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              className={styles.pill}
              onClick={() => { setQuery(ex); onAnalyze(ex); }}
            >
              {ex.slice(0, 52)}…
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
