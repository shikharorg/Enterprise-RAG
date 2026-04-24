import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMe, login } from "../services/auth";

const DEPARTMENTS = [
  {
    email: "hr@demo.com",
    password: "hr-demo-2026",
    name: "Human Resources",
    label: "Enter as HR",
    description:
      "Policies, onboarding guides, compensation bands, performance review templates, and employee handbooks.",
    accent: "from-violet-500/20 to-violet-500/5",
    border: "border-violet-500/20 hover:border-violet-500/50",
    dot: "bg-violet-400",
    btn: "bg-violet-600 hover:bg-violet-500",
    tag: "text-violet-400",
  },
  {
    email: "engineering@demo.com",
    password: "eng-demo-2026",
    name: "Engineering",
    label: "Enter as Engineering",
    description:
      "Architecture decision records, runbooks, API references, incident postmortems, and system design docs.",
    accent: "from-sky-500/20 to-sky-500/5",
    border: "border-sky-500/20 hover:border-sky-500/50",
    dot: "bg-sky-400",
    btn: "bg-sky-600 hover:bg-sky-500",
    tag: "text-sky-400",
  },
  {
    email: "finance@demo.com",
    password: "fin-demo-2026",
    name: "Finance",
    label: "Enter as Finance",
    description:
      "Quarterly reports, budget forecasts, expense policies, audit trails, and investor briefings.",
    accent: "from-emerald-500/20 to-emerald-500/5",
    border: "border-emerald-500/20 hover:border-emerald-500/50",
    dot: "bg-emerald-400",
    btn: "bg-emerald-600 hover:bg-emerald-500",
    tag: "text-emerald-400",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Select a role",
    desc: "Choose your department to authenticate as that role.",
  },
  {
    step: "02",
    title: "Ask questions",
    desc: "Query your knowledge base in plain language.",
  },
  {
    step: "03",
    title: "Get cited answers",
    desc: "Receive answers grounded in your department's documents.",
  },
];

export default function LandingPage() {
  const { setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  async function handleDemo(dept) {
    setError(null);
    setLoading(dept.email);
    try {
      await logout();
      await login(dept.email, dept.password);
      const me = await getMe();
      setUser(me);
      navigate("/chat");
    } catch {
      setError("Demo login failed. Make sure demo users are seeded.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white flex flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-white/50 tracking-wide">
            Live demo — no signup required
          </span>
        </div>

        <h1 className="mt-4 text-center text-5xl font-bold tracking-tight text-white leading-tight max-w-2xl">
          Enterprise Knowledge Base
        </h1>
        <p className="mt-4 text-center text-base text-white/40 max-w-lg leading-relaxed">
          A role-based RAG system. Each department sees only its own documents.
          Select a role to explore the knowledge base.
        </p>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl">
          {DEPARTMENTS.map((dept) => (
            <div
              key={dept.email}
              className={`relative flex flex-col rounded-2xl border bg-gradient-to-b ${dept.accent} ${dept.border} p-6 transition-all duration-200`}
            >
              <div className="flex items-center gap-2 mb-4">
                <span className={`h-2 w-2 rounded-full ${dept.dot}`} />
                <span
                  className={`text-xs font-medium uppercase tracking-widest ${dept.tag}`}
                >
                  {dept.name}
                </span>
              </div>

              <p className="text-sm text-white/50 leading-relaxed flex-1">
                {dept.description}
              </p>

              <button
                onClick={() => handleDemo(dept)}
                disabled={loading !== null}
                className={`mt-6 w-full rounded-xl py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-40 ${dept.btn}`}
              >
                {loading === dept.email ? "Signing in…" : dept.label}
              </button>
            </div>
          ))}
        </div>

        {error && <p className="mt-6 text-sm text-red-400">{error}</p>}

        <div className="mt-24 w-full max-w-4xl">
          <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-white/20 mb-10">
            How it works
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center">
                <span className="text-xs font-mono text-white/20 mb-2">{step}</span>
                <div className="h-px w-8 bg-white/10 mb-3" />
                <h3 className="text-sm font-medium text-white/60">{title}</h3>
                <p className="mt-1.5 text-xs text-white/25 leading-relaxed max-w-[180px]">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="relative pb-6 flex flex-col items-center gap-3">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1">
          <span className="text-[10px] text-white/20">
            Built with FastAPI · Qdrant · GPT-4o-mini
          </span>
        </div>
        <Link
          to="/admin"
          className="text-[11px] text-white/10 hover:text-white/25 transition-colors"
        >
          admin
        </Link>
      </footer>
    </div>
  );
}
