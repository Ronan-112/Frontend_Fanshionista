import { useState } from "react";
import PhotoCapture from "./components/PhotoCapture";
import ProfileForm from "./components/ProfileForm";
import Recommendations from "./components/Recommendations";
import SemanticSearch from "./components/SemanticSearch";
import ChatAgent from "./components/ChatAgent";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export default function App() {
  const [mode, setMode] = useState("form"); // "form" | "agent"
  const [photoAnalysis, setPhotoAnalysis] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [lastProfile, setLastProfile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  const handleSubmit = async (profile) => {
    setIsSubmitting(true);
    setApiError("");
    setRecommendations(null);
    try {
      const res = await fetch(`${API_BASE}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Couldn't fetch recommendations.");
      }
      const data = await res.json();
      setRecommendations(data);
      setLastProfile(profile);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <p className="eyebrow">Fashion AI Stylist</p>
        <h1>Styled for your build, your skin tone, your world.</h1>
        <p className="subhead">
          Upload a photo for on-device body and skin-tone analysis, or set your details manually —
          then get outfit picks spanning Indian ethnic wear, global fashion, and Indo-Western fusion.
        </p>

        <p className="purpose-statement">
          This tool recommends outfits that actually fit you — matched to your body type, skin tone,
          and occasion — in under a minute, no styling knowledge needed.
        </p>

        <div className="how-it-works">
          <div className="how-it-works-step">
            <span className="how-it-works-number">1</span>
            <div>
              <p className="how-it-works-title">Share your details</p>
              <p className="how-it-works-desc">Upload a photo (analyzed on your device) or fill a 30-second form.</p>
            </div>
          </div>
          <div className="how-it-works-step">
            <span className="how-it-works-number">2</span>
            <div>
              <p className="how-it-works-title">Get matched outfits</p>
              <p className="how-it-works-desc">See 2-3 picks with clear reasoning — why the fit, color, and style work for you.</p>
            </div>
          </div>
          <div className="how-it-works-step">
            <span className="how-it-works-number">3</span>
            <div>
              <p className="how-it-works-title">Explore further</p>
              <p className="how-it-works-desc">Search in your own words, ask what's trending, or find real places to buy it.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="mode-toggle">
          <button
            className={mode === "form" ? "mode-btn mode-btn-active" : "mode-btn"}
            onClick={() => setMode("form")}
          >
            Guided form
          </button>
          <button
            className={mode === "agent" ? "mode-btn mode-btn-active" : "mode-btn"}
            onClick={() => setMode("agent")}
          >
            Chat with an agent
          </button>
        </div>
        <p className="mode-hint">
          {mode === "form"
            ? "Fixed pipeline: photo/form → dataset match → optional AI narration, in that order every time."
            : "The AI decides for itself what to ask and which tool to use next, based on the conversation."}
        </p>

        {mode === "form" ? (
          <>
            <section className="panel">
              <h2>1. Photo analysis <span className="optional-tag">optional</span></h2>
              <p className="panel-hint">
                Runs entirely in your browser using MediaPipe pose detection and k-means color clustering —
                your photo is never sent to a server.
              </p>
              <PhotoCapture onAnalysisComplete={setPhotoAnalysis} />
            </section>

            <section className="panel">
              <h2>2. Your details</h2>
              <ProfileForm
                prefillFromPhoto={photoAnalysis}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
              {apiError && <p className="status-line status-error">{apiError}</p>}
            </section>

            {recommendations && (
              <section className="panel">
                <h2>3. Your recommendations</h2>
                <Recommendations data={recommendations} occasion={lastProfile?.occasion} />
              </section>
            )}

            <section className="panel">
              <h2>Or search in your own words <span className="optional-tag">semantic search</span></h2>
              <p className="panel-hint">
                Describe what you're picturing and this searches the outfit dataset by meaning,
                not just exact tags — e.g. "something breezy for a summer day out" or
                "rich colors for a winter wedding".
              </p>
              <SemanticSearch />
            </section>
          </>
        ) : (
          <>
            <section className="panel">
              <h2>Photo analysis <span className="optional-tag">optional, speeds things up</span></h2>
              <p className="panel-hint">
                If you share a photo, the agent will use your detected build and skin tone
                automatically instead of asking for them in the chat.
              </p>
              <PhotoCapture onAnalysisComplete={setPhotoAnalysis} />
            </section>

            <section className="panel">
              <h2>Chat with your stylist</h2>
              <ChatAgent photoContext={photoAnalysis} />
            </section>
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>Built with MediaPipe (body landmarks) + k-means (skin tone) + a curated styling dataset.</p>
      </footer>
    </div>
  );
}
