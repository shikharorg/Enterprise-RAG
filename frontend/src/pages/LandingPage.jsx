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

export default function LandingPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  async function handleDemo(dept) {
    setError(null);
    setLoading(dept.email);
    try {
      await login(dept.email, dept.password);
      const me = await getMe();
      setUser(me);
      navigate("/chat", { replace: true });
    } catch {
      setError("Demo login failed. Make sure demo users are seeded.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
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
      </div>

      <footer className="pb-6 text-center">
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
