import { useState } from "react";
import QueryPanel from "./components/QueryPanel";
import ResultsPanel from "./components/ResultsPanel";
import ActionPlanModal from "./components/ActionPlanModal";
import HistoryPanel from "./components/HistoryPanel";
import { analyzeResources, getActionPlan } from "./api";
import useHistory from "./hooks/useHistory";
import styles from "./App.module.css";

export default function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [lastQuery, setLastQuery] = useState("");
  const [planLoading, setPlanLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { history, addEntry, clearHistory } = useHistory();

  const handleAnalyze = async (q) => {
    const text = (q || query).trim();
    if (!text) return;
    setLastQuery(text);
    setLoading(true);
    setError(null);
    setResult(null);
    setPlan(null);
    try {
      const data = await analyzeResources(text);
      const fullResult = { ...data, _query: text };
      setResult(fullResult);
      addEntry(text, fullResult);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleActionPlan = async () => {
    if (!result) return;
    setPlanLoading(true);
    try {
      const { _query, ...analysis } = result;
      const data = await getActionPlan(_query, analysis);
      setPlan(data.plan);
    } catch (e) {
      setError(e.message);
    } finally {
      setPlanLoading(false);
    }
  };

  const handleHistorySelect = (entry) => {
    setResult(entry.result);
    setLastQuery(entry.query);
    setQuery(entry.query);
    setError(null);
    setPlan(null);
    setHistoryOpen(false);
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>◈</span>
            <span>SmartResource</span>
          </div>
          <div className={styles.headerRight}>
            <button
              className={styles.historyBtn}
              onClick={() => setHistoryOpen(true)}
              aria-label="Open query history"
              id="history-toggle"
            >
              <span className={styles.historyIcon}>⏱</span>
              History
              {history.length > 0 && (
                <span className={styles.historyCount}>{history.length}</span>
              )}
            </button>
            <span className={styles.badge}>Solution Challenge 2026</span>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>Smart Resource Management</h1>
          <p className={styles.subtitle}>
            Describe any situation — get AI-ranked resource recommendations
            based on your specific conditions and constraints.
          </p>
        </div>

        <QueryPanel
          query={query}
          setQuery={setQuery}
          onAnalyze={handleAnalyze}
          loading={loading}
        />

        {error && (
          <div className={styles.error}>
            <span>{error}</span>
            <button
              className={styles.retryBtn}
              onClick={() => handleAnalyze(lastQuery)}
              disabled={loading}
            >
              Retry →
            </button>
          </div>
        )}

        {loading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Identifying conditions and ranking resources...</p>
          </div>
        )}

        {result && (
          <ResultsPanel
            result={result}
            onActionPlan={handleActionPlan}
            planLoading={planLoading}
          />
        )}
      </main>

      {plan && <ActionPlanModal plan={plan} onClose={() => setPlan(null)} />}

      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        onSelect={handleHistorySelect}
        onClear={clearHistory}
      />
    </div>
  );
}
