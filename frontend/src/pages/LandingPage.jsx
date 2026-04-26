import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMe, login } from "../services/auth";

const FONT = "'Inter', ui-sans-serif, system-ui, sans-serif";
const MONO = "'JetBrains Mono', 'Fira Mono', 'Consolas', monospace";
const MOCK_SPEED = 18;
const MOCK_DELAY = 600;
const HOVER_DEBOUNCE = 300;

const MOCK_CONVOS = {
  hr: {
    accent: "#8b5cf6",
    bubbleAccent: "#7c3aed",
    chipBg: "rgba(139,92,246,0.15)",
    chipBorder: "rgba(139,92,246,0.25)",
    chipText: "#a78bfa",
    label: "hr",
    email: "hr@demo.com",
    question: "What is the parental leave policy?",
    answer:
      "Apex Systems provides 16 weeks of fully paid parental leave for primary caregivers and 8 weeks for secondary caregivers. Leave may begin up to 2 weeks before the expected due date. Both birth and adoptive parents are eligible, and leave can be taken in one continuous block or split into two periods within the first year.",
    source: "leave_policy.txt",
    score: "94%",
    placeholder: "Ask about HR documents…",
  },
  engineering: {
    accent: "#0ea5e9",
    bubbleAccent: "#0284c7",
    chipBg: "rgba(14,165,233,0.15)",
    chipBorder: "rgba(14,165,233,0.25)",
    chipText: "#38bdf8",
    label: "engineering",
    email: "engineering@demo.com",
    question: "How does the deployment pipeline work?",
    answer:
      "All production deployments go through a three-stage pipeline: CI runs tests and builds the artifact, staging receives the build for smoke tests and canary validation, then a manual approval gate triggers the production rollout. Rollbacks are automated — if error rate exceeds 1% within 10 minutes of deploy, the previous artifact is redeployed without human intervention.",
    source: "deployment_runbook.txt",
    score: "91%",
    placeholder: "Ask about Engineering documents…",
  },
  finance: {
    accent: "#10b981",
    bubbleAccent: "#059669",
    chipBg: "rgba(16,185,129,0.15)",
    chipBorder: "rgba(16,185,129,0.25)",
    chipText: "#34d399",
    label: "finance",
    email: "finance@demo.com",
    question: "What is the expense reimbursement limit?",
    answer:
      "Individual contributors may approve purchases up to $500 per transaction within an approved budget line. People managers have authority up to $5,000, directors up to $25,000, and VPs up to $100,000. Any transaction exceeding $500,000 requires CEO and board approval. Approval must be obtained before committing — retroactive approval is not permitted.",
    source: "budget_policy.txt",
    score: "97%",
    placeholder: "Ask about Finance documents…",
  },
};

const DEPTS = [
  {
    email: "hr@demo.com",
    password: "hr-demo-2026",
    key: "hr",
    name: "Human Resources",
    accent: "#8b5cf6",
    tagline: "Policies, benefits, compensation, and employee handbooks.",
    redirect: "/chat",
  },
  {
    email: "engineering@demo.com",
    password: "eng-demo-2026",
    key: "engineering",
    name: "Engineering",
    accent: "#0ea5e9",
    tagline: "Runbooks, architecture decisions, and incident postmortems.",
    redirect: "/chat",
  },
  {
    email: "finance@demo.com",
    password: "fin-demo-2026",
    key: "finance",
    name: "Finance",
    accent: "#10b981",
    tagline: "Budget policy, expense guidelines, and audit documentation.",
    redirect: "/chat",
  },
  {
    email: "demo@apex-systems.com",
    password: "demo-admin-2026",
    key: "admin",
    name: "Admin Panel",
    accent: "#94a3b8",
    tagline: "Document management, user controls, and live RAGAS evaluation scores.",
    redirect: "/admin-panel",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Select your role",
    desc: "Authenticate as HR, Engineering, or Finance. Your role determines which documents are in scope.",
  },
  {
    n: "02",
    title: "Ask in plain language",
    desc: "No query syntax. No keyword matching. Ask exactly what you need to know.",
  },
  {
    n: "03",
    title: "Get cited answers",
    desc: "Every answer includes the source document and a relevance score. Nothing is made up.",
  },
];

const TECH_GROUPS = [
  {
    label: "RETRIEVAL",
    items: [
      { name: "Qdrant", desc: "Vector store" },
      { name: "BM25s", desc: "Sparse retrieval" },
      { name: "Hybrid Search", desc: "BM25 + dense fusion" },
      { name: "bge-small", desc: "Embeddings" },
    ],
  },
  {
    label: "GENERATION",
    items: [
      { name: "GPT-4o-mini", desc: "Answer generation" },
      { name: "cross-encoder", desc: "Result reranking" },
    ],
  },
  {
    label: "INFRASTRUCTURE",
    items: [
      { name: "FastAPI", desc: "Async Python API" },
      { name: "PostgreSQL", desc: "User store" },
      { name: "React", desc: "Frontend" },
    ],
  },
];

function useMockTyping(key) {
  const text = MOCK_CONVOS[key].answer;
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const idxRef = useRef(0);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    idxRef.current = 0;
    clearInterval(intervalRef.current);
    clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        idxRef.current += 1;
        setDisplayed(text.slice(0, idxRef.current));
        if (idxRef.current >= text.length) {
          clearInterval(intervalRef.current);
          setDone(true);
        }
      }, MOCK_SPEED);
    }, MOCK_DELAY);

    return () => {
      clearTimeout(timeoutRef.current);
      clearInterval(intervalRef.current);
    };
  }, [key]);

  return { displayed, done };
}

function MockChatWindow({ deptKey }) {
  const [currentKey, setCurrentKey] = useState(deptKey);
  const [opacity, setOpacity] = useState(1);
  const convo = MOCK_CONVOS[currentKey];
  const { displayed, done } = useMockTyping(currentKey);

  useEffect(() => {
    if (deptKey === currentKey) return;
    setOpacity(0);
    const t = setTimeout(() => {
      setCurrentKey(deptKey);
      setOpacity(1);
    }, 220);
    return () => clearTimeout(t);
  }, [deptKey]);

  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        height: 420,
        overflow: "hidden",
        fontFamily: FONT,
      }}
    >
      {/* header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
          transition: "opacity 0.22s",
          opacity,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: convo.accent, display: "inline-block" }} />
        <span style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: convo.accent }}>
          {convo.label}
        </span>
        <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "rgba(255,255,255,0.2)" }}>
          {convo.email}
        </span>
      </div>

      {/* messages */}
      <div
        style={{
          flex: 1,
          padding: "20px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          overflowY: "auto",
          transition: "opacity 0.22s",
          opacity,
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div
            style={{
              background: convo.bubbleAccent,
              color: "#fff",
              padding: "8px 14px",
              borderRadius: "14px 4px 14px 14px",
              fontSize: "0.8rem",
              maxWidth: "75%",
              lineHeight: 1.5,
            }}
          >
            {convo.question}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.82)",
              padding: "10px 14px",
              borderRadius: "4px 14px 14px 14px",
              fontSize: "0.8rem",
              maxWidth: "88%",
              lineHeight: 1.6,
              minHeight: 20,
            }}
          >
            {displayed || " "}
            {!done && (
              <span
                style={{
                  display: "inline-block",
                  width: 2,
                  height: "0.9em",
                  background: "rgba(255,255,255,0.5)",
                  marginLeft: 2,
                  verticalAlign: "text-bottom",
                  animation: "blink 0.8s step-end infinite",
                }}
              />
            )}
          </div>

          {done && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 10px",
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 9999,
                fontSize: "0.7rem",
                color: "rgba(255,255,255,0.5)",
                animation: "fadeIn 0.35s ease",
              }}
            >
              <span
                style={{
                  background: convo.chipBg,
                  color: convo.chipText,
                  border: `1px solid ${convo.chipBorder}`,
                  borderRadius: 9999,
                  padding: "1px 6px",
                  fontSize: "0.65rem",
                  fontWeight: 500,
                }}
              >
                {convo.label}
              </span>
              {convo.source}
              <span style={{ color: "rgba(255,255,255,0.25)" }}>{convo.score}</span>
            </div>
          )}
        </div>
      </div>

      {/* fake input */}
      <div
        style={{
          padding: "10px 14px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
          transition: "opacity 0.22s",
          opacity,
        }}
      >
        <div
          style={{
            padding: "7px 12px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            fontSize: "0.75rem",
            color: "rgba(255,255,255,0.2)",
          }}
        >
          {convo.placeholder}
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

function HeroDeptCard({ dept, onEnter, loading, active, onHover, onLeave }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <div
      onClick={() => loading === null && onEnter(dept)}
      onMouseEnter={() => { setHovered(true); onHover(); }}
      onMouseLeave={() => { setHovered(false); setPressed(false); onLeave(); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        background: "#111",
        border: `1px solid ${active ? dept.accent : "rgba(255,255,255,0.08)"}`,
        boxShadow: active ? `0 0 0 1px ${dept.accent}22, 0 0 16px ${dept.accent}18` : "none",
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        cursor: loading !== null ? "not-allowed" : "pointer",
        transition: "border-color 0.25s, box-shadow 0.25s, transform 0.1s",
        transform: pressed ? "scale(0.98)" : "scale(1)",
        opacity: loading !== null && loading !== dept.email ? 0.4 : 1,
        userSelect: "none",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: dept.accent, flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: dept.accent, letterSpacing: "-0.01em" }}>
          {loading === dept.email ? "Signing in…" : dept.name}
        </div>
        <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", marginTop: 2, lineHeight: 1.4 }}>
          {dept.tagline}
        </div>
      </div>

      <span
        style={{
          fontSize: "0.75rem",
          fontWeight: 500,
          color: dept.accent,
          opacity: hovered && loading !== dept.email ? 1 : 0,
          transition: "opacity 0.15s",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        Enter →
      </span>
    </div>
  );
}

export default function LandingPage() {
  const { setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);
  const [activeDept, setActiveDept] = useState("hr");
  const hoverTimerRef = useRef(null);

  function handleCardHover(key) {
    if (key === 'admin') return;
    clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setActiveDept(key), HOVER_DEBOUNCE);
  }

  function handleCardLeave() {
    clearTimeout(hoverTimerRef.current);
  }

  async function handleEnter(dept) {
    setError(null);
    setLoading(dept.email);
    try {
      await logout();
      await login(dept.email, dept.password);
      const me = await getMe();
      setUser(me);
      const dest = me.role === 'admin' ? '/admin-panel' : me.role === 'demo_admin' ? '/demo-admin' : '/chat';
      navigate(dest);
    } catch {
      setError("Demo login failed. Make sure demo users are seeded.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ background: "#000", color: "#fff", fontFamily: FONT, overflowX: "hidden" }}>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          maxWidth: 1160,
          margin: "0 auto",
          padding: "80px 48px",
          boxSizing: "border-box",
          gap: 80,
        }}
      >
        {/* left */}
        <div style={{ flex: "0 0 44%", display: "flex", flexDirection: "column" }}>
          <h1
            style={{
              fontSize: "clamp(2.2rem, 3.8vw, 3.2rem)",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1.08,
              margin: 0,
              color: "#fff",
            }}
          >
            The knowledge base<br />that knows<br />who's asking.
          </h1>

          <p
            style={{
              marginTop: 24,
              fontSize: "0.95rem",
              color: "rgba(255,255,255,0.38)",
              lineHeight: 1.65,
              letterSpacing: "-0.01em",
            }}
          >
            Role-based document retrieval. Every answer cited.
            Built for teams that handle sensitive information.
          </p>

          <div style={{ marginTop: 40, display: "flex", flexDirection: "column", gap: 2 }}>
            {DEPTS.map((dept) => (
              <HeroDeptCard
                key={dept.key}
                dept={dept}
                onEnter={handleEnter}
                loading={loading}
                active={activeDept === dept.key}
                onHover={() => handleCardHover(dept.key)}
                onLeave={handleCardLeave}
              />
            ))}
          </div>

          {error && (
            <p style={{ marginTop: 16, fontSize: "0.75rem", color: "#f87171" }}>{error}</p>
          )}
        </div>

        {/* right */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <MockChatWindow deptKey={activeDept} />
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <section
        style={{
          borderTop: "1px solid rgba(255,255,255,0.07)",
          padding: "120px 48px",
          maxWidth: 1160,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <p style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", margin: "0 0 56px 0" }}>
          How it works
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
          {STEPS.map((step, i) => (
            <div
              key={step.n}
              style={{
                borderLeft: i === 0 ? "none" : "1px solid rgba(255,255,255,0.07)",
                paddingLeft: i === 0 ? 0 : 40,
                paddingRight: 40,
              }}
            >
              <span style={{ display: "block", fontSize: "0.7rem", fontWeight: 500, color: "rgba(255,255,255,0.18)", letterSpacing: "0.06em", marginBottom: 18 }}>
                {step.n}
              </span>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 600, letterSpacing: "-0.02em", color: "#fff", margin: "0 0 10px 0" }}>
                {step.title}
              </h3>
              <p style={{ fontSize: "0.825rem", color: "rgba(255,255,255,0.38)", lineHeight: 1.65, margin: 0 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TECH ─────────────────────────────────────────── */}
      <section
        style={{
          borderTop: "1px solid rgba(255,255,255,0.07)",
          padding: "100px 48px",
          maxWidth: 1160,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <p style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", margin: "0 0 48px 0" }}>
          Built on
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
          {TECH_GROUPS.map((group, i) => (
            <div
              key={group.label}
              style={{
                borderLeft: i === 0 ? "none" : "1px solid rgba(255,255,255,0.07)",
                paddingLeft: i === 0 ? 0 : 40,
                paddingRight: 40,
              }}
            >
              <span
                style={{
                  display: "block",
                  fontFamily: MONO,
                  fontSize: "0.65rem",
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  color: "rgba(255,255,255,0.2)",
                  marginBottom: 24,
                }}
              >
                [{group.label}]
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {group.items.map((t) => (
                  <div key={t.name}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#fff", letterSpacing: "-0.01em" }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                      {t.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.07)",
          padding: "28px 48px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: 1160,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.18)" }}>rag.shikharjain.com</span>
      </footer>

    </div>
  );
}
