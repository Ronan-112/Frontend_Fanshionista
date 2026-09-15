import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export default function SemanticSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [errorMsg, setErrorMsg] = useState("");

  const runSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE}/search-outfits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, top_n: 5 }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.detail || "Search failed.");
      setResults(body.results);
      setStatus("done");
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  };

  return (
    <div className="semantic-search">
      <form onSubmit={runSearch} className="semantic-search-form">
        <input
          type="text"
          placeholder='Try: "something elegant in navy for a winter wedding"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Searching…" : "Search"}
        </button>
      </form>

      {status === "error" && (
        <p className="status-line status-error">
          {errorMsg}{" "}
          {errorMsg.includes("GEMINI_API_KEY") && (
            <span>— this feature needs a free Gemini API key set on the backend.</span>
          )}
        </p>
      )}

      {status === "done" && results && (
        <div className="semantic-results">
          {results.length === 0 && <p className="panel-hint">No matches found — try rephrasing.</p>}
          {results.map((outfit) => (
            <div className="semantic-result-card" key={outfit.id}>
              <div className="semantic-result-header">
                <h4>{outfit.name}</h4>
                <span className="similarity-badge">{Math.round(outfit.similarity * 100)}% match</span>
              </div>
              <p>{outfit.fit_reasoning}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
