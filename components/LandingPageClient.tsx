"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  Play, LogIn, ArrowRight, LogOut, Sparkles, 
  Layers, Image as ImageIcon, Video, FileText, ChevronRight, CheckCircle2 
} from "lucide-react";
import SplitText from "@/components/reactbits/SplitText";
import ShinyText from "@/components/reactbits/ShinyText";
import SpotlightCard from "@/components/reactbits/SpotlightCard";

interface WorkflowItem {
  _id: string;
  name: string;
  updatedAt: string;
}

interface LandingPageClientProps {
  session: any;
}

export default function LandingPageClient({ session }: LandingPageClientProps) {
  const router = useRouter();
  
  const status = session ? "authenticated" : "unauthenticated";
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [demoEmail, setDemoEmail] = useState("creator@gmail.com");
  const [demoName, setDemoName] = useState("Creative Director");
  const [showDemoForm, setShowDemoForm] = useState(false);

  // Fetch user's saved workflows if logged in
  useEffect(() => {
    if (session) {
      setLoadingWorkflows(true);
      fetch("/api/workflows")
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Failed to load");
        })
        .then((data) => {
          setWorkflows(data.workflows || []);
        })
        .catch((err) => console.error(err))
        .finally(() => setLoadingWorkflows(false));
    }
  }, [session]);

  const handleGoogleLogin = async () => {
    const { signIn } = await import("next-auth/react");
    signIn("google");
  };

  const handleDemoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { signIn } = await import("next-auth/react");
    signIn("credentials", {
      email: demoEmail,
      name: demoName,
      callbackUrl: "/",
    });
  };

  const createWorkflowAndRedirect = async () => {
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Canvas #${workflows.length + 1}` }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/v1/${data.workflow._id}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const enterStudio = () => {
    if (workflows.length > 0) {
      router.push(`/v1/${workflows[0]._id}`);
    } else {
      createWorkflowAndRedirect();
    }
  };

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans overflow-x-hidden selection:bg-emerald-950 selection:text-emerald-300">
      {/* Delicate Grid Background */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#1c1917_1px,transparent_1px),linear-gradient(to_bottom,#1c1917_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" 
        aria-hidden="true" 
      />

      {/* Header */}
      <header className="relative z-10 border-b border-stone-900 bg-stone-950/90 backdrop-blur px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <Layers className="h-5 w-5 text-emerald-400" />
          <span className="font-serif text-lg font-bold tracking-wide">
            LaunchGrid
          </span>
        </div>
        
        <div>
          {session ? (
            <div className="flex items-center gap-4">
              <span className="text-xs text-stone-400 hidden sm:inline">
                Logged in as <span className="text-stone-200 font-semibold">{session.user?.name}</span>
              </span>
              <button
                onClick={async () => {
                  const { signOut } = await import("next-auth/react");
                  signOut();
                }}
                className="inline-flex items-center gap-1.5 rounded border border-stone-800 px-3 py-1.5 text-xs text-stone-400 hover:bg-stone-900 hover:text-white transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                const element = document.getElementById("auth-section");
                element?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-1.5 rounded bg-stone-900 hover:bg-stone-800 px-4 py-1.5 text-xs font-semibold tracking-wide text-white border border-stone-800 transition"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-4xl mx-auto text-center px-6 pt-20 pb-16 flex-1 flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-900/60 bg-emerald-950/15 px-3 py-1 text-[11px] font-semibold text-emerald-400 mb-6 tracking-wide">
          <Sparkles className="h-3 w-3" />
          Alibaba Cloud Qwen Hackathon Submission
        </div>

        <h1 className="font-serif text-4xl sm:text-6xl font-normal tracking-tight text-white mb-6 leading-[1.1]">
          <SplitText text="The Art of the Product Launch," className="block" delay={0.015} />
          <span className="block mt-2 italic font-light text-stone-400">
            <ShinyText text="Fully Automated." speed={3.5} />
          </span>
        </h1>

        <p className="text-sm sm:text-base text-stone-400 max-w-xl mx-auto mb-10 leading-relaxed font-light">
          A visual, node-based workspace where wires dictate agent prompt topology. Upload a raw product image, draw your logic, and let Qwen and Wan orchestrate lifestyle pictures, videos, and copywriting in seconds.
        </p>

        {loadingWorkflows && workflows.length === 0 ? (
          <div className="h-12 w-48 flex items-center justify-center text-xs text-stone-500 italic">
            Configuring studio...
          </div>
        ) : session ? (
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={enterStudio}
              className="inline-flex h-12 items-center gap-2 rounded bg-emerald-600 hover:bg-emerald-500 px-6 font-serif text-sm font-medium tracking-wide text-white shadow-lg shadow-emerald-950/40 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              Enter Workspace
              <ArrowRight className="h-4 w-4" />
            </button>
            
            {workflows.length > 0 && (
              <button
                onClick={createWorkflowAndRedirect}
                className="inline-flex h-12 items-center gap-2 rounded border border-stone-800 bg-stone-950/50 px-6 text-xs text-stone-300 hover:bg-stone-900 transition"
              >
                Create New Canvas
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => {
                const element = document.getElementById("auth-section");
                element?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex h-12 items-center gap-2 rounded bg-amber-600 hover:bg-amber-500 px-8 font-serif text-sm font-medium tracking-wide text-white shadow-lg shadow-amber-950/40 transition-all hover:-translate-y-0.5"
            >
              Begin Launch Campaign
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>

      {/* Feature Cards Grid (Spotlight Cards) */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16 w-full border-t border-stone-900">
        <h2 className="font-serif text-2xl sm:text-3xl text-center text-white mb-12">
          Orchestrated by Specialized Agent Nodes
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SpotlightCard className="!bg-stone-950 !border-stone-900" spotlightColor="rgba(16, 185, 129, 0.08)">
            <div className="h-10 w-10 rounded bg-emerald-950/40 border border-emerald-900/50 flex items-center justify-center text-emerald-400 mb-4">
              <ImageIcon className="h-5 w-5" />
            </div>
            <h3 className="font-serif text-lg text-white mb-2 font-medium">Art Director</h3>
            <p className="text-xs text-stone-400 leading-relaxed font-light">
              Transforms flat, white-background product shots into vibrant, context-rich lifestyle images using DashScope Wanx image synthesis.
            </p>
          </SpotlightCard>

          <SpotlightCard className="!bg-stone-950 !border-stone-900" spotlightColor="rgba(245, 158, 11, 0.08)">
            <div className="h-10 w-10 rounded bg-amber-950/40 border border-amber-900/50 flex items-center justify-center text-amber-400 mb-4">
              <Video className="h-5 w-5" />
            </div>
            <h3 className="font-serif text-lg text-white mb-2 font-medium">Video Director</h3>
            <p className="text-xs text-stone-400 leading-relaxed font-light">
              Generates high-definition, 2-10 second short-form Reels and TikTok loops from lifestyle outputs using async DashScope Wan video APIs.
            </p>
          </SpotlightCard>

          <SpotlightCard className="!bg-stone-950 !border-stone-900" spotlightColor="rgba(59, 130, 246, 0.08)">
            <div className="h-10 w-10 rounded bg-blue-950/40 border border-blue-900/50 flex items-center justify-center text-blue-400 mb-4">
              <FileText className="h-5 w-5" />
            </div>
            <h3 className="font-serif text-lg text-white mb-2 font-medium">SEO & Ad Strategist</h3>
            <p className="text-xs text-stone-400 leading-relaxed font-light">
              Computes metadata titles, keywords, high-conversion descriptions, and platform-native ad copy using the Qwen text engine.
            </p>
          </SpotlightCard>
        </div>
      </section>

      {/* Auth / Get Started Panel */}
      <section id="auth-section" className="relative z-10 max-w-4xl mx-auto px-6 py-20 w-full text-center">
        <div className="rounded-2xl border border-stone-800 bg-stone-950 p-8 sm:p-12 max-w-md mx-auto shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/10 blur-3xl pointer-events-none" />
          
          <h2 className="font-serif text-2xl text-white mb-2">Create Workspace</h2>
          <p className="text-xs text-stone-400 mb-8 font-light">
            Authenticate to sync workspaces and save canvases to your account.
          </p>

          {session ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-stone-800 bg-stone-900/50 p-3.5 text-left">
                {session.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="h-9 w-9 rounded-full border border-stone-700"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-800 text-xs font-bold text-stone-200">
                    {session.user?.name ? session.user.name[0].toUpperCase() : "U"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-stone-200 truncate">{session.user?.name}</p>
                  <p className="text-[10px] text-stone-500 truncate">{session.user?.email}</p>
                </div>
                <div className="ml-auto text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>

              {loadingWorkflows ? (
                <div className="py-2 text-xs text-stone-500 italic">Syncing workflows...</div>
              ) : workflows.length > 0 ? (
                <div className="text-left mt-4">
                  <p className="text-[10px] font-serif uppercase tracking-wider text-stone-500 mb-2">Your Workspaces</p>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {workflows.map((w) => (
                      <button
                        key={w._id}
                        onClick={() => router.push(`/v1/${w._id}`)}
                        className="w-full flex items-center justify-between rounded bg-stone-900 border border-stone-800 px-3 py-2 text-xs text-stone-300 hover:text-white hover:bg-stone-850 hover:border-emerald-800 transition"
                      >
                        <span className="truncate font-medium">{w.name}</span>
                        <ChevronRight className="h-3 w-3 text-stone-500" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <button
                onClick={enterStudio}
                className="w-full inline-flex h-11 items-center justify-center gap-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition mt-4"
              >
                Go to Launch Studio
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Gmail (Google OAuth) Login */}
              <button
                onClick={handleGoogleLogin}
                className="w-full inline-flex h-11 items-center justify-center gap-2 rounded bg-white hover:bg-stone-100 text-xs font-semibold text-stone-950 transition border border-stone-200"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.62 0 3.08.56 4.22 1.64l3.15-3.15C17.45 1.74 14.9 1 12 1 7.35 1 3.39 3.67 1.5 7.57l3.75 2.91c.9-2.7 3.42-4.44 6.75-4.44z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.28 1.48-1.12 2.73-2.38 3.58l3.7 2.87c2.16-1.99 3.41-4.92 3.41-8.6z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.25 14.52c-.23-.69-.36-1.43-.36-2.2s.13-1.51.36-2.2L1.5 7.21C.54 9.12 0 11.24 0 13.5s.54 4.38 1.5 6.29l3.75-2.91c-.23-.69-.36-1.43-.36-2.27z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.7-2.87c-1.03.69-2.35 1.1-4.26 1.1-3.33 0-6.15-2.24-7.15-5.34l-3.76 2.91C3.39 20.33 7.35 23 12 23z"
                  />
                </svg>
                Sign In with Google (Gmail)
              </button>

              <div className="relative my-6 flex items-center justify-center">
                <hr className="w-full border-stone-800" />
                <span className="absolute bg-stone-950 px-3 text-[10px] uppercase tracking-wider text-stone-500">
                  Or test locally
                </span>
              </div>

              {showDemoForm ? (
                <form onSubmit={handleDemoLogin} className="space-y-3 text-left">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-stone-400 mb-1">
                      Gmail Address
                    </label>
                    <input
                      type="email"
                      required
                      value={demoEmail}
                      onChange={(e) => setDemoEmail(e.target.value)}
                      placeholder="e.g. yourname@gmail.com"
                      className="w-full rounded bg-stone-900 border border-stone-850 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-stone-400 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      required
                      value={demoName}
                      onChange={(e) => setDemoName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full rounded bg-stone-900 border border-stone-850 px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 inline-flex h-9 items-center justify-center rounded bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white transition"
                    >
                      Authenticate Demo
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDemoForm(false)}
                      className="rounded border border-stone-800 px-3 text-xs text-stone-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDemoForm(true)}
                  className="w-full inline-flex h-11 items-center justify-center rounded border border-stone-800 bg-stone-900/50 hover:bg-stone-900 text-xs font-semibold text-stone-400 hover:text-stone-200 transition"
                >
                  Use Demo Account (Gmail Bypass)
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-900 py-6 text-center text-[10px] text-stone-500 relative z-10 max-w-7xl mx-auto w-full px-6">
        <p>&copy; {new Date().getFullYear()} LaunchGrid. Devised for Alibaba Cloud Qwen AI Hackathon.</p>
      </footer>
    </main>
  );
}
