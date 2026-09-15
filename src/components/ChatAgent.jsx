import { useState, useRef, useEffect } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

const TOOL_LABELS = {
  structured_outfit_match: "looked up matches in the outfit dataset",
  semantic_outfit_search: "searched the dataset by meaning",
  web_trend_search: "searched the web",
};

export default function ChatAgent({ photoContext }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! Tell me what you're dressing for and I'll figure out what to ask or look up — no form needed. For example: \"I have a wedding to attend, I'm athletic build, wheatish skin, mid-20s.\"",
    },
  ]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [errorMsg, setErrorMsg] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || status === "loading") return;

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          photo_context: photoContext
            ? { bodyType: photoContext.bodyType, skinTone: photoContext.skinTone }
            : null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.detail || "Chat agent failed.");

      setMessages([
        ...nextMessages,
        { role: "assistant", content: body.reply, toolsUsed: body.tools_used },
      ]);
      setStatus("idle");
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  };

  return (
    <div className="chat-agent">
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble chat-bubble-${m.role}`}>
            <p>{m.content}</p>
            {m.toolsUsed && m.toolsUsed.length > 0 && (
              <p className="chat-tool-trace">
                {m.toolsUsed.map((t) => TOOL_LABELS[t] ?? t).join(" · ")}
              </p>
            )}
          </div>
        ))}
        {status === "loading" && (
          <div className="chat-bubble chat-bubble-assistant chat-thinking">
            <p>Deciding what to do next…</p>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {status === "error" && (
        <p className="status-line status-error">
          {errorMsg}
          {errorMsg.includes("provider key") && " — needs an LLM provider key configured on the backend."}
        </p>
      )}

      <form onSubmit={sendMessage} className="chat-input-form">
        <input
          type="text"
          placeholder="Type your message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={status === "loading"}
        />
        <button type="submit" disabled={status === "loading" || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
