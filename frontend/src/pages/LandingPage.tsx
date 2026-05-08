import { Link } from "react-router-dom";

const STATS = [
  { value: "500+", label: "Jobs indexed" },
  { value: "120+", label: "Skills tracked" },
  { value: "10+", label: "Live sources" },
  { value: "6 hrs", label: "Refresh cadence" },
];

const TRENDING_SKILLS = [
  { name: "Python", count: 312, hot: true },
  { name: "TypeScript", count: 289, hot: true },
  { name: "React", count: 276, hot: false },
  { name: "AWS", count: 241, hot: false },
  { name: "Docker", count: 218, hot: true },
  { name: "PostgreSQL", count: 195, hot: false },
  { name: "Node.js", count: 183, hot: false },
  { name: "Kubernetes", count: 162, hot: false },
  { name: "FastAPI", count: 147, hot: true },
  { name: "GraphQL", count: 134, hot: false },
  { name: "Redis", count: 121, hot: false },
  { name: "Terraform", count: 108, hot: false },
];

const MOCK_JOBS = [
  { title: "Senior Backend Engineer", company: "Stripe", type: "Full Time", tag: "Fintech", days: "2d ago", init: "S" },
  { title: "ML Engineer", company: "Scale AI", type: "Remote", tag: "AI/ML", days: "4d ago", init: "A" },
  { title: "Frontend Engineer", company: "Linear", type: "Full Time", tag: "Productivity", days: "1d ago", init: "L" },
];

const STEPS = [
  {
    num: "01",
    title: "Jobs get scraped",
    body: "SkillMap pulls listings from Remotive, Greenhouse, Adzuna and more on a schedule. Every posting is stored and indexed automatically.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Skills get extracted",
    body: "Each job description is scanned to identify the tools, languages, and frameworks employers are actually asking for — not what you'd guess.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "You get a ranked path",
    body: "Enter your target role. SkillMap surfaces the top skills for that role and builds a prioritised study plan with resources for each skill.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
];

const BENTO = [
  {
    wide: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
    title: "Live Jobs Feed",
    desc: "Aggregates listings across boards and keeps them fresh. Filter by role, type, and source. Never look at a stale job board again.",
    extra: (
      <div className="mt-5 space-y-2.5">
        {MOCK_JOBS.map((j) => (
          <div key={j.title} className="flex items-center gap-3 bg-surface border border-surface-border rounded-lg px-3.5 py-2.5">
            <div className="w-7 h-7 rounded-md bg-brand/15 text-brand text-xs font-bold flex items-center justify-center flex-shrink-0">{j.init}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{j.title}</p>
              <p className="text-[11px] text-gray-500">{j.company}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[10px] text-gray-500 bg-surface-tertiary px-2 py-0.5 rounded-full">{j.tag}</span>
              <span className="text-[10px] text-gray-600">{j.days}</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    wide: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M3 3v18h18" />
        <path d="M18 17V9M13 17V5M8 17v-3" />
      </svg>
    ),
    title: "Skills Dashboard",
    desc: "See which skills employers are demanding right now, ranked by weekly mention count across active listings.",
    extra: (
      <div className="mt-5 space-y-2.5">
        {[
          { name: "Python", pct: 88 },
          { name: "TypeScript", pct: 76 },
          { name: "Docker", pct: 61 },
          { name: "AWS", pct: 54 },
        ].map((s) => (
          <div key={s.name}>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-gray-400">{s.name}</span>
              <span className="text-gray-500">{s.pct}%</span>
            </div>
            <div className="h-1 rounded-full bg-surface w-full overflow-hidden">
              <div className="h-full rounded-full bg-brand" style={{ width: `${s.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    wide: false,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
    title: "Learning Path",
    desc: "Type a target role, get a ranked curriculum built from what real job postings are asking for.",
    extra: (
      <div className="mt-5 space-y-2">
        {[
          { rank: 1, skill: "TypeScript", level: "Core" },
          { rank: 2, skill: "React", level: "Core" },
          { rank: 3, skill: "Node.js", level: "Important" },
          { rank: 4, skill: "Docker", level: "Useful" },
        ].map((item) => (
          <div key={item.skill} className="flex items-center gap-2.5 text-[11px]">
            <span className="w-4 text-right text-brand/50 font-mono tabular-nums">{item.rank}</span>
            <span className="flex-1 text-gray-300">{item.skill}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
              item.level === "Core" ? "bg-brand/15 text-brand" :
              item.level === "Important" ? "bg-amber-500/15 text-amber-400" :
              "bg-surface text-gray-500 border border-surface-border"
            }`}>{item.level}</span>
          </div>
        ))}
      </div>
    ),
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface text-white">

      {/* Nav */}
      <header className="border-b border-surface-border sticky top-0 z-10 bg-surface/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-semibold text-white">SkillMap</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5">
              Sign in
            </Link>
            <Link to="/register" className="text-sm font-medium bg-brand hover:bg-brand-hover text-white px-4 py-1.5 rounded-lg transition-colors">
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-8 pt-20 pb-16">
        <div className="grid grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 text-xs text-brand border border-brand/30 bg-brand/5 px-3 py-1.5 rounded-full mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
              Live market data — updated every 6 hours
            </div>
            <h1 className="text-5xl font-bold text-white leading-[1.1] tracking-tight mb-6">
              Learn what the<br />market actually<br />wants.
            </h1>
            <p className="text-base text-gray-400 leading-relaxed mb-10">
              SkillMap scrapes real job listings, extracts what employers are hiring for, and turns that signal into a personalised learning path for your next role.
            </p>
            <div className="flex items-center gap-4">
              <Link to="/register" className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-medium px-6 py-3 rounded-lg text-sm transition-colors">
                Start for free
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <Link to="/login" className="text-sm text-gray-500 hover:text-white transition-colors">
                Already have an account →
              </Link>
            </div>
          </div>

          {/* Right — mock app panel */}
          <div className="bg-surface-secondary border border-surface-border rounded-2xl p-5 space-y-3">
            {/* Mini topbar */}
            <div className="flex items-center justify-between pb-3 border-b border-surface-border">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-brand flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-300">Jobs Feed</span>
              </div>
              <span className="text-[10px] text-brand bg-brand/10 px-2 py-0.5 rounded-full">3 new today</span>
            </div>
            {/* Mock job cards */}
            {MOCK_JOBS.map((j) => (
              <div key={j.title} className="bg-surface border border-surface-border rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand/15 text-brand text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{j.init}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{j.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{j.company}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-[10px] text-gray-400 bg-surface-secondary border border-surface-border px-2 py-0.5 rounded-full">{j.tag}</span>
                      <span className="text-[10px] text-gray-400 bg-surface-secondary border border-surface-border px-2 py-0.5 rounded-full">{j.type}</span>
                      <span className="text-[10px] text-gray-600 ml-auto">{j.days}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <div className="border-y border-surface-border bg-surface-secondary">
        <div className="max-w-6xl mx-auto px-8 py-6 grid grid-cols-4 divide-x divide-surface-border">
          {STATS.map((s) => (
            <div key={s.label} className="px-8 first:pl-0 last:pr-0">
              <p className="text-2xl font-bold text-white tabular-nums">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trending skills */}
      <section className="max-w-6xl mx-auto px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-1">Trending right now</p>
            <p className="text-lg font-semibold text-white">Skills in highest demand this week</p>
          </div>
          <Link to="/register" className="text-xs text-brand hover:underline">
            See full dashboard →
          </Link>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {TRENDING_SKILLS.map((s) => (
            <div key={s.name} className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm ${
              s.hot
                ? "bg-brand/8 border-brand/25 text-white"
                : "bg-surface-secondary border-surface-border text-gray-400"
            }`}>
              {s.hot && <span className="w-1.5 h-1.5 rounded-full bg-brand" />}
              <span>{s.name}</span>
              <span className={`text-xs tabular-nums ${s.hot ? "text-brand/70" : "text-gray-600"}`}>{s.count}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-surface-border" />

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-8 py-20">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-12">How it works</p>
        <div className="grid grid-cols-3 gap-px bg-surface-border rounded-xl overflow-hidden">
          {STEPS.map((step) => (
            <div key={step.num} className="bg-surface-secondary p-8">
              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl font-bold text-brand/25 tabular-nums">{step.num}</span>
                <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                  {step.icon}
                </div>
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-surface-border" />

      {/* Bento features */}
      <section className="max-w-6xl mx-auto px-8 py-20">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-12">What you get</p>
        <div className="grid grid-cols-3 gap-4">
          {/* Wide card */}
          <div className="col-span-2 bg-surface-secondary border border-surface-border rounded-xl p-6">
            <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center mb-4">
              {BENTO[0].icon}
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">{BENTO[0].title}</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{BENTO[0].desc}</p>
            {BENTO[0].extra}
          </div>
          {/* Stack of two narrow cards */}
          <div className="flex flex-col gap-4">
            {[BENTO[1], BENTO[2]].map((f) => (
              <div key={f.title} className="flex-1 bg-surface-secondary border border-surface-border rounded-xl p-6">
                <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                {f.extra}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="border-t border-surface-border" />

      {/* Final CTA */}
      <section className="bg-surface-secondary">
        <div className="max-w-6xl mx-auto px-8 py-24 flex flex-col items-center text-center">
          <p className="text-xs text-brand uppercase tracking-widest font-medium mb-5">No credit card required</p>
          <h2 className="text-4xl font-bold text-white tracking-tight mb-4">
            Stop guessing.<br />Start learning what gets you hired.
          </h2>
          <p className="text-gray-400 text-sm mb-10 max-w-sm leading-relaxed">
            Free to use. Powered by real job market data. Updated every 6 hours from 10+ live sources.
          </p>
          <Link to="/register" className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white font-semibold px-8 py-3.5 rounded-lg text-sm transition-colors">
            Create your free account
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border">
        <div className="max-w-6xl mx-auto px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-brand flex items-center justify-center">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-xs text-gray-600">SkillMap © 2026</span>
          </div>
          <p className="text-xs text-gray-600">Built for developers who want to stay ahead.</p>
        </div>
      </footer>

    </div>
  );
}
