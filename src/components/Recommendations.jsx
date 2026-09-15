import { useState } from "react";
import ColorSwatch from "./ColorSwatch";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

const CATEGORY_LABELS = {
  indian_ethnic: "Indian Ethnic",
  global: "Global",
  indo_western: "Indo-Western Fusion",
};

function ShopButton({ outfit }) {
  const [status, setStatus] = useState("idle");
  const [results, setResults] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchLinks = async () => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE}/shop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outfit_name: outfit.name, category: outfit.category }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.detail || "Couldn't search for shopping links.");
      setResults(body.results);
      setStatus("done");
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  };

  if (status === "idle") {
    return (
      <button type="button" className="trend-btn" onClick={fetchLinks}>
        Where can I find this?
      </button>
    );
  }
  if (status === "loading") {
    return <p className="status-line status-loading">Searching the web…</p>;
  }
  if (status === "error") {
    return <p className="status-line status-error">{errorMsg}</p>;
  }
  if (results && results.length === 0) {
    return <p className="panel-hint">No live results found for this search right now — try a general search yourself.</p>;
  }
  return (
    <div className="shop-links">
      {results.map((r, i) => (
        <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="shop-link">
          <span className="shop-link-title">{r.title}</span>
          <span className="shop-link-snippet">{r.snippet}</span>
        </a>
      ))}
      <p className="shop-disclaimer">Live web results — not verified listings or guaranteed prices.</p>
    </div>
  );
}

function TrendButton({ outfit, occasion }) {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [insight, setInsight] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchTrend = async () => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE}/trends`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outfit_name: outfit.name,
          category: outfit.category,
          occasion,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.detail || "Couldn't fetch trend insight.");
      setInsight(body.insight);
      setStatus("done");
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  };

  if (status === "idle") {
    return (
      <button type="button" className="trend-btn" onClick={fetchTrend}>
        Is this trending right now?
      </button>
    );
  }

  if (status === "loading") {
    return <p className="status-line status-loading">Checking current trends…</p>;
  }

  if (status === "error") {
    return (
      <p className="status-line status-error">
        {errorMsg}
        {errorMsg.includes("provider key") && " — needs an LLM provider key configured on the backend."}
      </p>
    );
  }

  return (
    <p className="ai-tip">
      <span className="ai-badge">Trend agent</span>
      {insight}
    </p>
  );
}

export default function Recommendations({ data, occasion }) {
  if (!data) return null;

  return (
    <div className="recommendations">
      <p className="profile-summary">{data.profile_summary}</p>

      {data.ai_narrative && (
        <p className="ai-narrative">
          <span className="ai-badge">{data.ai_provider === "gemini" ? "Gemini" : "Claude"}</span>
          {data.ai_narrative}
        </p>
      )}

      <div className="outfit-list">
        {data.recommendations.map((outfit, idx) => (
          <article className="outfit-card" key={outfit.id}>
            <div className="outfit-card-header">
              <span className="outfit-rank">{idx + 1}</span>
              <div>
                <h3>{outfit.name}</h3>
                <span className="outfit-category">{CATEGORY_LABELS[outfit.category] ?? outfit.category}</span>
              </div>
            </div>

            <div className="outfit-colors">
              {outfit.colors.map((c) => (
                <span key={c} className="color-chip">
                  <ColorSwatch name={c} />
                  {c}
                </span>
              ))}
            </div>

            {outfit.separates && (
              <div className="separates-block">
                <div className="separates-piece">
                  <span className="separates-label">{outfit.separates.upper_piece}</span>
                  <div className="separates-colors">
                    {outfit.separates.upper_colors.map((c) => (
                      <span key={c} className="color-chip">
                        <ColorSwatch name={c} />
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="separates-piece">
                  <span className="separates-label">{outfit.separates.lower_piece}</span>
                  <div className="separates-colors">
                    {outfit.separates.lower_colors.map((c) => (
                      <span key={c} className="color-chip">
                        <ColorSwatch name={c} />
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="pairing-tip">
                  <span className="pairing-tip-label">Pairing tip</span>
                  {outfit.separates.pairing_tip}
                </p>
              </div>
            )}

            <dl className="outfit-reasoning">
              <div>
                <dt>Why this fit works</dt>
                <dd>{outfit.fit_reasoning}</dd>
              </div>
              <div>
                <dt>Why these colors</dt>
                <dd>{outfit.color_reasoning}</dd>
              </div>
              <div>
                <dt>Cultural / occasion fit</dt>
                <dd>{outfit.cultural_reasoning}</dd>
              </div>
              {outfit.fabric && (
                <div>
                  <dt>Recommended fabric — {outfit.fabric}</dt>
                  <dd>{outfit.fabric_reasoning}</dd>
                </div>
              )}
            </dl>

            {outfit.ai_styling_tip && (
              <p className="ai-tip">
                <span className="ai-badge">{data.ai_provider === "gemini" ? "Gemini" : "Claude"}</span>
                {outfit.ai_styling_tip}
              </p>
            )}

            <div className="trend-section">
              <TrendButton outfit={outfit} occasion={occasion} />
            </div>
            <div className="trend-section">
              <ShopButton outfit={outfit} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}