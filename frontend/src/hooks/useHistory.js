import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "srm_history";
const MAX_ENTRIES = 10;

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function useHistory() {
  const [history, setHistory] = useState(loadHistory);

  // Keep state in sync if another tab changes localStorage
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setHistory(loadHistory());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const addEntry = useCallback((query, result) => {
    setHistory((prev) => {
      const entry = {
        query,
        result,
        timestamp: new Date().toISOString(),
      };
      const next = [entry, ...prev].slice(0, MAX_ENTRIES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  return { history, addEntry, clearHistory };
}
