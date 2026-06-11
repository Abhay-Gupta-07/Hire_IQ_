import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import HireIqLogo from "./HireIqLogo";
import { 
  Plus, 
  Video, 
  Archive, 
  XCircle, 
  Search, 
  Sparkles, 
  Paperclip, 
  ChevronRight, 
  Play, 
  CheckCircle, 
  Check, 
  Mic, 
  Building2, 
  Lock, 
  Layers, 
  UserCheck, 
  TrendingUp, 
  UserX,
  Menu,
  X,
  Sun,
  Moon
} from "lucide-react";

interface LandingPageProps {
  onNavigate: (path: string) => void;
  isAuthenticated?: boolean;
  onLogout?: () => void;
  theme?: "dark" | "light";
  toggleTheme?: () => void;
}

interface MockCandidate {
  id: string;
  sender: string;
  senderInitials: string;
  subject: string;
  preview: string;
  time: string;
  isUnread: boolean;
  label: string;
  aiSummary: string;
  paragraphs: string[];
  attachment?: string;
}

export default function LandingPage({ onNavigate, isAuthenticated = false, onLogout, theme = "dark", toggleTheme }: LandingPageProps) {
  const [isYearlyBilling, setIsYearlyBilling] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCandidateId, setActiveCandidateId] = useState("1");

  // Mock candidates dataset mirroring the high-fidelity dashboard preview
  const mockCandidates: MockCandidate[] = [
    {
      id: "1",
      sender: "Raj Jaiswal",
      senderInitials: "RJ",
      subject: "Backend Engineer — Live Session",
      preview: "Active AI prompts · Timer: 18 min remaining...",
      time: "In Progress",
      isUnread: true,
      label: "Engineering",
      aiSummary: "Candidate is 65% through the session. Completed 3/5 AI questions. Current score estimate: 74/100. No proctoring flags raised.",
      paragraphs: [
        "Session started at 10:24 AM.",
        "Raj is currently on Question 3 of 5 — a system design problem involving distributed caching. Response quality is strong with clear structured thinking.",
        "Live heartbeat active. WebRTC stream stable. No tab-switch events detected.",
        "— Mock Interview AI Engine"
      ],
      attachment: "raj-jaiswal-resume.pdf"
    },
    {
      id: "2",
      sender: "Ibtessam Begum",
      senderInitials: "IB",
      subject: "Product Manager — Shortlisted",
      preview: "Score: 88/100 · Report ready for review...",
      time: "Completed",
      isUnread: true,
      label: "Product",
      aiSummary: "Ibtessam Begum scored 88/100. Strong performance on product strategy questions. Recommended for next round. Full transcript and recording available.",
      paragraphs: [
        "Interview completed at 9:58 AM.",
        "Ibtessam Begum answered all 5 questions with high clarity. Notable strength in stakeholder prioritisation and roadmap framing scenarios.",
        "AI evaluation recommends shortlisting for final round. Report and recording attached.",
        "— Mock Interview AI Engine"
      ],
      attachment: "ibtessam-begum-scorecard.pdf"
    },
    {
      id: "3",
      sender: "Sampreet Kaur",
      senderInitials: "SK",
      subject: "Operations Lead — Pending Review",
      preview: "Interview complete · Awaiting recruiter decision...",
      time: "Yesterday",
      isUnread: false,
      label: "Operations",
      aiSummary: "Sampreet completed the session with a score of 71/100. Performance was consistent but lacked depth on process optimisation questions. Recruiter action required.",
      paragraphs: [
        "Interview completed yesterday at 3:15 PM.",
        "Sampreet completed all questions. Scores were moderate — strong on team management, weaker on data-driven process improvement scenarios.",
        "Session recording and full transcript are available. Awaiting recruiter to mark as shortlisted, archived, or rejected.",
        "— Mock Interview AI Engine"
      ]
    }
  ];

  const planFeatures = [
    {
      tier: "Free Trial",
      monthly: "Free",
      yearly: "Free",
      desc: "For exploration. Get a feel for the platform before committing to a paid workspace.",
      features: ["Up to 5 interview sessions", "AI question generation", "Basic scoring reports"]
    },
    {
      tier: "BASIC",
      monthly: "₹2,499/mo",
      yearly: "₹19,999/yr",
      desc: "For hiring teams ramping up their interview operations with AI-powered workflows.",
      features: ["Up to 100 sessions/month", "Live WebRTC proctoring", "Advanced AI scoring + transcripts", "Email invite automation"]
    },
    {
      tier: "ADVANCE",
      monthly: "₹3,499/mo",
      yearly: "₹29,999/yr",
      desc: "For organisations running high-volume, multi-role hiring at scale.",
      features: ["Unlimited interview sessions", "Multi-tenant workspace support", "Custom question banks + branding", "Direct UPI billing & receipts"],
      pro: true
    }
  ];

  const activeCandidate = mockCandidates.find(c => c.id === activeCandidateId) || mockCandidates[0];

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setMobileMenuOpen(false);
  };

  const isLight = theme === "light";

  return (
    <div className={`min-h-screen font-sans overflow-x-hidden selection:bg-blue-500/30 selection:text-white transition-colors duration-500 ${isLight ? "bg-transparent text-[#131518]" : "bg-[#0c0c0c] text-white"}`}>
      {/* Decorative vertical margins guidelines matching original layout spec */}
      {!isLight && (
        <>
          <div className="hidden md:block pointer-events-none fixed inset-y-0 left-1/2 -translate-x-[calc(50%+45rem)] w-px z-40 bg-white/5" />
          <div className="hidden md:block pointer-events-none fixed inset-y-0 left-1/2  translate-x-[calc(-50%+45rem)] w-px z-40 bg-white/5" />
        </>
      )}

      {/* SVG noise filter */}
      <svg className="fixed pointer-events-none w-0 h-0" aria-hidden="true">
        <defs>
          <filter id="c3-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0" />
            <feComposite in2="SourceGraphic" operator="in" result="noise" />
            <feBlend in="SourceGraphic" in2="noise" mode="multiply" />
          </filter>
        </defs>
      </svg>

      {/* CENTRALIZED NAVIGATION HEADER */}
      <header className={`relative w-full z-50 h-24 flex items-center transition-colors duration-500 border-b ${isLight ? "bg-[#f8f8f6]/80 border-slate-200/50 backdrop-blur-md" : "bg-[#0c0c0c]/80 border-white/5 backdrop-blur-md"}`}>
        <div className="w-full max-w-[90rem] mx-auto px-6 sm:px-8 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onNavigate("/")}>
            <HireIqLogo theme={theme} className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>

          {/* Desktop Nav Links */}
          <nav className={`hidden md:flex items-center gap-8 text-xs sm:text-sm font-medium transition-colors duration-500 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
            <a href="#platform" onClick={(e) => handleSmoothScroll(e, "platform")} className={`transition-colors duration-200 ${isLight ? "hover:text-[#131518]" : "hover:text-white"}`}>Platform</a>
            <a href="#workflow" onClick={(e) => handleSmoothScroll(e, "workflow")} className={`transition-colors duration-200 ${isLight ? "hover:text-[#131518]" : "hover:text-white"}`}>Workflow</a>
            <a href="/subscription" onClick={(e) => { e.preventDefault(); onNavigate("/subscription"); }} className={`transition-colors duration-200 ${isLight ? "hover:text-[#131518]" : "hover:text-white"}`}>Pricing</a>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <button 
                  onClick={() => onNavigate("/app")} 
                  className={`inline-flex items-center gap-2 rounded-full border font-medium text-xs px-4 py-2 transition-all cursor-pointer ${
                    isLight ? "border-slate-300 text-slate-800 hover:bg-black/5" : "border-white/10 text-slate-300 hover:bg-white/5"
                  }`}
                >
                  Go to Dashboard
                </button>
                {onLogout && (
                  <button 
                    onClick={onLogout} 
                    className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/5 text-rose-500 hover:bg-rose-500/10 transition-all font-semibold text-xs px-4 py-2 cursor-pointer"
                  >
                    Sign Out
                  </button>
                )}
              </>
            ) : (
              <>
                <button 
                  onClick={() => onNavigate("/auth")} 
                  className={`inline-flex items-center gap-2 rounded-full border font-medium text-xs px-4 py-2 transition-all cursor-pointer ${
                    isLight ? "border-slate-300 text-[#131518] hover:bg-black/5" : "border-white/10 text-white hover:bg-white/5"
                  }`}
                >
                  Admin Login
                </button>
              </>
            )}
            <button 
              onClick={() => onNavigate("/subscription")} 
              className={`inline-flex items-center gap-2 rounded-full font-semibold text-xs px-4 py-2 transition-all cursor-pointer ${
                isLight ? "bg-[#3D81E3] text-white hover:bg-[#3D81E3]/90 shadow-md" : "bg-white text-black hover:bg-slate-100 shadow-[0_4px_12px_rgba(255,255,255,0.1)]"
              }`}
            >
              Start Subscription
            </button>
            {toggleTheme && (
              <button 
                onClick={toggleTheme}
                className={`p-2 rounded-full border transition-all cursor-pointer flex items-center justify-center ${
                  isLight 
                    ? "border-black/15 bg-black/5 text-[#131518] hover:bg-black/10" 
                    : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
                title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
              >
                {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
              </button>
            )}
          </div>

          {/* Theme Toggler and Mobile hamburger menu */}
          <div className="flex md:hidden items-center gap-2">
            {toggleTheme && (
              <button 
                onClick={toggleTheme}
                className={`p-2 rounded-full border transition-all cursor-pointer flex items-center justify-center ${
                  isLight 
                    ? "border-black/15 bg-black/5 text-[#131518] hover:bg-black/10" 
                    : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                }`}
                title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
              >
                {isLight ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5 text-amber-400" />}
              </button>
            )}
            <button 
              className={`p-2 transition-colors focus:outline-none ${isLight ? "text-slate-800 hover:text-black" : "text-slate-400 hover:text-white"}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE NAV DRAWER */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className={`md:hidden border-b flex flex-col p-6 gap-4 relative z-40 transition-colors duration-500 ${
              isLight ? "bg-[#f8f8f6] border-slate-200" : "bg-[#0c0c0c] border-white/5"
            }`}
          >
            <a href="#platform" onClick={(e) => handleSmoothScroll(e, "platform")} className={`text-base py-1.5 font-medium transition-colors ${isLight ? "text-slate-700 hover:text-black" : "text-slate-300 hover:text-white"}`}>Platform</a>
            <a href="#workflow" onClick={(e) => handleSmoothScroll(e, "workflow")} className={`text-base py-1.5 font-medium transition-colors ${isLight ? "text-slate-700 hover:text-black" : "text-slate-300 hover:text-white"}`}>Workflow</a>
            <a href="/subscription" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); onNavigate("/subscription"); }} className={`text-base py-1.5 font-medium transition-colors ${isLight ? "text-slate-700 hover:text-black" : "text-slate-300 hover:text-white"}`}>Pricing</a>
            <div className={`h-px my-2 ${isLight ? "bg-slate-200" : "bg-white/5"}`} />
            <div className="flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <button onClick={() => { setMobileMenuOpen(false); onNavigate("/app"); }} className={`w-full rounded-full border py-2.5 text-xs font-semibold cursor-pointer ${isLight ? "border-slate-300 text-slate-800" : "border-white/10 text-white"}`}>Go to Dashboard</button>
                  {onLogout && (
                    <button onClick={() => { setMobileMenuOpen(false); onLogout(); }} className="w-full rounded-full border border-rose-500/20 text-rose-500 py-2.5 text-xs font-semibold cursor-pointer">Sign Out</button>
                  )}
                </>
              ) : (
                <>
                  <button onClick={() => { setMobileMenuOpen(false); onNavigate("/auth"); }} className={`w-full rounded-full border py-2.5 text-xs font-semibold cursor-pointer ${isLight ? "border-slate-300 text-slate-800" : "border-white/10 text-white"}`}>Admin Login</button>
                </>
              )}
              <button onClick={() => { setMobileMenuOpen(false); onNavigate("/subscription"); }} className={`w-full rounded-full py-2.5 text-xs font-black cursor-pointer ${isLight ? "bg-[#3D81E3] text-white" : "bg-white text-black"}`}>Start Subscription</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO SECTION */}
      <section className="relative pt-16 md:pt-32 pb-20 text-center flex flex-col items-center z-20 px-6 max-w-5xl mx-auto">

        <h1 className="text-5xl sm:text-7xl md:text-9xl font-black tracking-tight leading-[1.05] whitespace-nowrap">
          <span className={isLight ? "text-[#131518]" : "text-white"}>HIRE</span>
          <span 
            className="inline-block animate-shiny ml-3 sm:ml-5 select-none"
            style={{
              backgroundImage: isLight 
                ? "linear-gradient(to right,#dcdcd5 0%,#3D81E3 12.5%,#3D81E3 32.5%,#00d2ff 50%,#3D81E3 67.5%,#dcdcd5 87.5%,#dcdcd5 100%)"
                : "linear-gradient(to right,#091020 0%,#0B2551 12.5%,#A4F4FD 32.5%,#00d2ff 50%,#0B2551 67.5%,#091020 87.5%,#091020 100%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              WebkitTextFillColor: "transparent",
              filter: "url(#c3-noise)"
            }}
          >
            IQ
          </span>
        </h1>
        <p className={`mt-8 max-w-2xl text-base sm:text-lg md:text-xl leading-[1.6] font-light transition-colors duration-500 ${isLight ? "text-slate-600/90" : "text-slate-400"}`}>
          Run AI interviews, live proctoring, and recruiter decisions from one workspace. Mock Interview helps companies evaluate candidates without juggling fragmented tools.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4">
          <button 
            onClick={() => onNavigate(isAuthenticated ? "/app" : "/auth")}
            className={`inline-flex items-center gap-2.5 rounded-full font-extrabold text-sm px-6 py-3.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-md ${
              isLight ? "bg-[#131518] text-white hover:bg-black" : "bg-white text-black hover:bg-slate-100"
            }`}
          >
            <Building2 className={`w-4 h-4 ${isLight ? "text-white" : "text-black"}`} />
            <span>{isAuthenticated ? "Go to Dashboard" : "Access Admin Console"}</span>
          </button>
          <button 
            onClick={() => onNavigate("/subscription")}
            className={`text-xs font-mono tracking-wider transition-colors uppercase cursor-pointer ${
              isLight ? "text-slate-500 hover:text-[#3D81E3]" : "text-slate-400 hover:text-[#A4F4FD]"
            }`}
          >
            View Subscription Plans &darr;
          </button>
        </div>
      </section>

      {/* PLATFORM IN-DEPTH DASHBOARD PREVIEW */}
      <section className="max-w-[90rem] mx-auto px-6 sm:px-8 py-12 md:py-20 relative z-10" id="platform">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-widest text-[#3D81E3] font-mono font-bold">Live Platform Preview</span>
            <h3 className={`text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-tight transition-colors duration-500 ${isLight ? "text-[#131518]" : "text-white"}`}>One console for interviews, scheduling, and evaluation.</h3>
          </div>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">Realtime hiring command center &mdash; monitor sessions, scores, and recruiter actions as they happen.</p>
        </div>

        {/* Browser Simulator Block */}
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0e1014]/90 backdrop-blur-2xl shadow-[0_30px_100px_rgba(0,0,0,0.8)]">
          
          {/* Header Row */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#111318] border-b border-white/5 relative select-none">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57] inline-block opacity-80" />
              <span className="w-3 h-3 rounded-full bg-[#febc2e] inline-block opacity-80" />
              <span className="w-3 h-3 rounded-full bg-[#28c840] inline-block opacity-80" />
            </div>
            <span className="text-xs font-semibold text-slate-400 absolute left-1/2 -translate-x-1/2 hidden sm:inline-block">Mock Interview &mdash; Admin Dashboard</span>
            <span className="text-[9px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded">WebRTC &bull; Live Tracker</span>
          </div>

          {/* Core grid split */}
          <div className="grid grid-cols-12 h-[600px] sm:h-[650px] divide-x divide-white/5 bg-[#090a0d]/60 text-left">
            
            {/* 1. Sidebar - Hidden on mobile, visible from medium screens */}
            <div className="col-span-3 bg-black/20 p-4 space-y-6 overflow-y-auto hidden md:block">
              <button 
                onClick={() => onNavigate(isAuthenticated ? "/app/interview/new" : "/auth#login")}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-white hover:bg-white/90 text-black text-[11px] font-bold py-2.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Create Interview</span>
              </button>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs px-3 py-2.5 rounded-lg bg-white/10 text-white font-medium">
                  <span className="flex items-center gap-2 text-slate-200">
                    <Video className="w-3.5 h-3.5 text-[#3D81E3]" />
                    Live Sessions
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-white/10 text-slate-300 font-bold">12</span>
                </div>
                <div className="flex items-center justify-between text-xs px-3 py-2.5 rounded-lg text-slate-400 hover:bg-white/5 cursor-pointer">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Shortlisted
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-white/5 text-slate-500">7</span>
                </div>
                <div className="flex items-center justify-between text-xs px-3 py-2.5 rounded-lg text-slate-400 hover:bg-white/5 cursor-pointer">
                  <span className="flex items-center gap-2">
                    <Archive className="w-3.5 h-3.5" />
                    Archived
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs px-3 py-2.5 rounded-lg text-slate-400 hover:bg-white/5 cursor-pointer">
                  <span className="flex items-center gap-2">
                    <XCircle className="w-3.5 h-3.5" />
                    Rejected
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-white/5 text-slate-500">3</span>
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 block px-3">Filter Scenario</span>
                <div className="space-y-2 px-3 text-xs text-slate-400">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#00d2ff]" />Engineering</div>
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#A4F4FD]" />Design</div>
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" />Product</div>
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" />Operations</div>
                </div>
              </div>
            </div>

            {/* 2. Candidate Inbox List */}
            <div className="col-span-12 sm:col-span-5 md:col-span-4 flex flex-col overflow-hidden h-full">
              <div className="p-3 border-b border-white/5 flex items-center gap-2 bg-black/10">
                <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <input 
                  type="text" 
                  readOnly 
                  placeholder="Interactive Filter List..." 
                  className="bg-transparent text-xs text-white outline-none placeholder-slate-500 w-full cursor-not-allowed" 
                />
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                {mockCandidates.map((c) => {
                  const isActive = c.id === activeCandidateId;
                  return (
                    <div 
                      key={c.id}
                      onClick={() => setActiveCandidateId(c.id)}
                      className={`p-4 cursor-pointer transition-all duration-150 relative select-none ${
                        isActive 
                          ? "bg-white/[0.06] border-l-2 border-blue-500" 
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white tracking-tight">{c.sender}</span>
                          {c.isUnread && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                        </div>
                        <span className={`text-[9px] font-mono font-bold ${isActive ? "text-blue-400" : "text-slate-500"}`}>
                          {c.time}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-200 truncate">{c.subject}</h4>
                      <p className="text-[10.5px] text-slate-400 truncate mt-1">{c.preview}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Candidate Report/Detail Viewer Panels */}
            <div className="col-span-12 sm:col-span-7 md:col-span-5 flex flex-col h-full overflow-hidden bg-black/15">
              <div className="p-3 border-b border-white/5 flex items-center justify-between text-slate-500 select-none text-[11px] shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="p-1 hover:bg-white/5 rounded cursor-pointer text-slate-400"><CheckCircle className="w-3.5 h-3.5" /></span>
                  <span className="p-1 hover:bg-white/5 rounded cursor-pointer text-slate-400"><XCircle className="w-3.5 h-3.5" /></span>
                  <span className="p-1 hover:bg-white/5 rounded cursor-pointer text-slate-400"><Archive className="w-3.5 h-3.5" /></span>
                </div>
                <span className="font-mono text-[10px]">Mock API Feed</span>
              </div>

              {/* Dynamic Viewer Render Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight">{activeCandidate.subject}</h4>
                  
                  <div className="flex items-center justify-between mt-4 mb-5 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#3D81E3]/20 border border-[#3D81E3]/30 flex items-center justify-center font-bold text-xs text-white">
                        {activeCandidate.senderInitials}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{activeCandidate.sender}</div>
                        <div className="text-[9px] font-mono text-slate-500 mt-0.5">To Recruiter &bull; Active Loop</div>
                      </div>
                    </div>
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded border border-[#3D81E3]/30 uppercase font-mono tracking-wider text-[#A4F4FD] bg-[#3D81E3]/10">
                      {activeCandidate.label}
                    </span>
                  </div>

                  {/* AI Evaluation Floating Sparkles Box */}
                  <div className={`rounded-xl border p-4 relative overflow-hidden mb-5 transition-colors duration-500 ${isLight ? "border-blue-200 bg-blue-50/50" : "border-blue-500/10 bg-blue-500/[0.02]"}`}>
                    <div className="flex items-center gap-1.5 text-xs text-[#3D81E3] font-bold mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#3D81E3]" />
                      <span>AI Intelligence Insights</span>
                    </div>
                    <p className={`text-[11px] leading-relaxed font-mono transition-colors duration-500 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      {activeCandidate.aiSummary}
                    </p>
                  </div>

                  {/* Document Paragraphs */}
                  <div className="space-y-3.5 text-xs font-light text-slate-300">
                    {activeCandidate.paragraphs.map((p, idx) => {
                      const isFooter = p.startsWith("—");
                      return (
                        <p 
                          key={idx}
                          className={isFooter 
                            ? "text-[10.5px] text-slate-500 font-mono mt-5 pt-2 border-t border-white/5" 
                            : "leading-relaxed"
                          }
                        >
                          {p}
                        </p>
                      );
                    })}
                  </div>

                  {/* Attachment Block */}
                  {activeCandidate.attachment && (
                    <div className="pt-4 mt-5 border-t border-white/5">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[10px] text-slate-300 font-medium">{activeCandidate.attachment}</span>
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* WORKFLOW SECTION */}
      <section className="max-w-[90rem] mx-auto px-6 sm:px-8 py-20 md:py-28 relative z-10" id="workflow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-start text-left">
          
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/[0.03] text-[10px] font-bold uppercase text-[#3D81E3] tracking-widest leading-none">
              Infrastructure
            </span>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.08]">
              Built for the real <br />
              <span className="text-slate-500">recruiting workflow.</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed font-light">
              From tenant signup through candidate reporting, the platform understands the full admin lifecycle. Your subscription page, dashboard, email invites, interview runtime, and results all stay connected.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className={`text-[11px] px-3.5 py-1.5 rounded-full border font-mono transition-colors duration-500 ${isLight ? "text-black border-slate-300/60 bg-black/5" : "text-slate-300 border-white/5 bg-white/[0.02]"}`}>Single + Bulk invites</span>
              <span className={`text-[11px] px-3.5 py-1.5 rounded-full border font-mono transition-colors duration-500 ${isLight ? "text-black border-slate-300/60 bg-black/5" : "text-slate-300 border-white/5 bg-white/[0.02]"}`}>Timed access gates</span>
              <span className={`text-[11px] px-3.5 py-1.5 rounded-full border font-mono transition-colors duration-500 ${isLight ? "text-black border-slate-300/60 bg-black/5" : "text-slate-300 border-white/5 bg-white/[0.02]"}`}>Real-time snapshots</span>
              <span className={`text-[11px] px-3.5 py-1.5 rounded-full border font-mono transition-colors duration-500 ${isLight ? "text-black border-slate-300/60 bg-black/5" : "text-slate-300 border-white/5 bg-white/[0.02]"}`}>Structure scorecard reports</span>
            </div>
          </div>

          <div className={`rounded-2xl p-6 sm:p-8 space-y-4 border shadow-2xl relative overflow-hidden transition-all duration-500 ${
            isLight ? "bg-white border-slate-200" : "liquid-glass border-white/10"
          }`}>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-transparent pointer-events-none" />
            <div className={`flex items-center justify-between border-b pb-4 ${isLight ? "border-slate-100" : "border-white/5"}`}>
              <span className={`text-xs font-bold tracking-wide ${isLight ? "text-slate-800" : "text-slate-200"}`}>Live Command Monitor</span>
              <span className="text-[10px] text-slate-500 font-mono">Active tracking session list</span>
            </div>
            
            <div className="space-y-3 relative z-10">
              
              <div className={`rounded-xl p-4 border space-y-3 transition-colors duration-500 ${isLight ? "bg-slate-50 border-slate-200/50" : "liquid-glass border-white/5"}`}>
                <div className="flex justify-between items-center text-xs font-bold mb-1">
                  <span className={isLight ? "text-slate-800" : "text-slate-200"}>Ongoing Sessions</span>
                  <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-mono text-[9px] font-extrabold uppercase">12 Active</span>
                </div>
                <div className={`flex items-start gap-3 border-t pt-3 ${isLight ? "border-slate-200/50" : "border-white/5"}`}>
                  <div className={`relative flex-shrink-0 rounded-md overflow-hidden w-14 h-10 border ${isLight ? "bg-slate-100 border-slate-300" : "bg-slate-950 border-white/10"}`}>
                    <div className="absolute bottom-0 left-50 -translate-x-1/2 w-7 h-5 bg-slate-400/20 rounded-t-full" />
                    <div className="absolute bottom-4 left-50 -translate-x-1/2 w-3.5 h-3.5 bg-slate-400/25 rounded-full" />
                    <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_#10b981]" />
                  </div>
                  <div>
                    <h5 className={`text-xs font-bold ${isLight ? "text-slate-800" : "text-slate-200"}`}>Raj Jaiswal</h5>
                    <p className="text-[10px] font-mono text-slate-500">Backend System Arc &bull; Live stream</p>
                  </div>
                </div>
              </div>

              <div className={`rounded-xl p-4 border space-y-1 transition-colors duration-500 ${isLight ? "bg-slate-50 border-slate-200/50" : "liquid-glass border-white/5"}`}>
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className={isLight ? "text-slate-800" : "text-slate-300"}>Shortlisted Recommendations</span>
                  <span className="font-mono text-[10px] text-blue-500 font-bold">7 metrics</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">Sampreet Kaur &mdash; Core logic assessment records compiled</p>
              </div>

              <div className={`rounded-xl p-4 border space-y-1 transition-colors duration-500 ${isLight ? "bg-slate-50 border-slate-200/50" : "liquid-glass border-white/5"}`}>
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className={isLight ? "text-slate-800" : "text-slate-300"}>AI Scoring Metrics</span>
                  <span className="font-mono text-[9px] text-[#3D81E3] bg-[#3D81E3]/10 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">STRUCTURED</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">Interactive transcripts &bull; Evaluation grading feedback &bull; Snapshot integrity records</p>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* THREE LAYERS SECTION */}
      <section className={`max-w-[90rem] mx-auto px-6 sm:px-8 py-20 border-t text-left relative z-10 transition-colors duration-500 ${
        isLight ? "border-slate-200" : "border-white/5"
      }`}>
        <h3 className={`text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight transition-colors duration-500 ${
          isLight ? "text-[#131518]" : "text-white"
        }`}>
          Three layers working together inside one AI interview system.
        </h3>
        <p className={`text-sm sm:text-base mb-12 max-w-2xl font-light transition-colors duration-500 ${
          isLight ? "text-black" : "text-slate-400"
        }`}>
          The product connects your admin workspace, candidate experience, and monitoring controls so teams can scale hiring without stitching tools together.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between border min-h-[250px] relative overflow-hidden group transition-all duration-300 ${
            isLight 
              ? "bg-white border-slate-300/70 shadow-md hover:border-[#3D81E3] hover:shadow-lg" 
              : "liquid-glass border-white/5 hover:border-[#3D81E3]/20"
          }`}>
            <div className="space-y-4">
              <span className="text-[10px] uppercase tracking-widest text-[#3D81E3] font-bold font-mono">Admin workflow</span>
              <h4 className={`text-lg font-bold flex items-center gap-1.5 transition-colors duration-500 ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                <Building2 className="w-4 h-4 text-[#3D81E3]" /> Orchestration
              </h4>
              <p className={`text-xs sm:text-sm leading-relaxed font-light transition-colors duration-500 ${isLight ? "text-black" : "text-slate-400"}`}>
                Create interviews, upload resumes, define scheduling windows, control email content, and manage candidate progression from a single admin console.
              </p>
            </div>
            <div className={`mt-6 pt-4 border-t flex gap-2 ${isLight ? "border-slate-200" : "border-white/5"}`}>
              <span className={`text-[10px] font-mono px-2 py-1 rounded transition-colors duration-500 ${isLight ? "bg-slate-100 text-black" : "bg-white/5 text-slate-400"}`}>Schedule + Send</span>
              <span className={`text-[10px] font-mono px-2 py-1 rounded transition-colors duration-500 ${isLight ? "bg-slate-100 text-black" : "bg-white/5 text-slate-400"}`}>Bulk Upload</span>
            </div>
          </div>

          <div className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between border min-h-[250px] relative overflow-hidden group transition-all duration-300 ${
            isLight 
              ? "bg-white border-slate-300/70 shadow-md hover:border-cyan-500 hover:shadow-lg" 
              : "liquid-glass border-white/5 hover:border-cyan-500/20"
          }`}>
            <div className="space-y-4">
              <span className="text-[10px] uppercase tracking-widest text-cyan-500 font-bold font-mono">Candidate runtime</span>
              <h4 className={`text-lg font-bold flex items-center gap-1.5 transition-colors duration-500 ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                <Layers className="w-4 h-4 text-cyan-500" /> Proctor Sandbox
              </h4>
              <p className={`text-xs sm:text-sm leading-relaxed font-light transition-colors duration-500 ${isLight ? "text-black" : "text-slate-400"}`}>
                Candidates enter only through session links, start windows are respected, and the experience combines video, transcripts, coding elements, and AI-led prompts.
              </p>
            </div>
            <div className={`mt-6 pt-4 border-t flex gap-2 ${isLight ? "border-slate-200" : "border-white/5"}`}>
              <span className={`text-[10px] font-mono px-2 py-1 rounded transition-colors duration-500 ${isLight ? "bg-slate-100 text-black" : "bg-white/5 text-slate-400"}`}>WebRTC Snapshots</span>
              <span className={`text-[10px] font-mono px-2 py-1 rounded transition-colors duration-500 ${isLight ? "bg-slate-100 text-black" : "bg-white/5 text-slate-400"}`}>Anti-Cheat Flags</span>
            </div>
          </div>

          <div className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between border min-h-[250px] relative overflow-hidden group transition-all duration-300 ${
            isLight 
              ? "bg-white border-slate-300/70 shadow-md hover:border-amber-500 hover:shadow-lg" 
              : "liquid-glass border-white/5 hover:border-amber-500/20"
          }`}>
            <div className="space-y-4">
              <span className="text-[10px] uppercase tracking-widest text-amber-500 font-bold font-mono">Recruiter insight</span>
              <h4 className={`text-lg font-bold flex items-center gap-1.5 transition-colors duration-500 ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                <UserCheck className="w-4 h-4 text-amber-500" /> Decision Appraisal
              </h4>
              <p className={`text-xs sm:text-sm leading-relaxed font-light transition-colors duration-500 ${isLight ? "text-black" : "text-slate-400"}`}>
                Hiring teams can watch live progress, inspect AI insights, score reports, shortlist candidates, and browse recordings tied directly into each interview session.
              </p>
            </div>
            <div className={`mt-6 pt-4 border-t flex gap-2 ${isLight ? "border-slate-200" : "border-white/5"}`}>
              <span className={`text-[10px] font-mono px-2 py-1 rounded transition-colors duration-500 ${isLight ? "bg-slate-100 text-black" : "bg-white/5 text-slate-400"}`}>AI Scorecards</span>
              <span className={`text-[10px] font-mono px-2 py-1 rounded transition-colors duration-500 ${isLight ? "bg-slate-100 text-black" : "bg-white/5 text-slate-400"}`}>Recordings Backup</span>
            </div>
          </div>

        </div>
      </section>

      {/* PRICING SECTION */}
      <section className="relative px-6 sm:px-8 py-20 flex flex-col items-center" id="pricing-section">
        
        {/* Background watermark */}
        <div className="w-full max-w-7xl text-center select-none relative z-0 pointer-events-none mb-4">
          <div className="font-extrabold flex flex-col items-center leading-none text-center">
            <span className={`font-extrabold tracking-tighter text-[9vw] transition-colors duration-500 ${isLight ? "text-[#131518]" : "text-slate-900"}`}>CHOOSE A</span>
            <span 
              className="font-extrabold tracking-tighter text-[13vw]"
              style={{
                backgroundImage: isLight 
                  ? "linear-gradient(to right, #cfcfca 0%, #a2c7fe 25%, #3D81E3 65%, #3D81E3 100%)"
                  : "linear-gradient(to right, #091020 0%, #0B2551 25%, #A4F4FD 65%, #00d2ff 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
                WebkitTextFillColor: "transparent",
                filter: "url(#c3-noise)"
              }}
            >
              PLAN
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-[90rem] relative z-10 mt-6 mb-12">
          {planFeatures.map((p, idx) => {
            const hasProAccent = p.pro;
            const rate = isYearlyBilling ? p.yearly : p.monthly;
            
            return (
              <div 
                key={idx}
                className={`flex flex-col justify-between p-8 min-h-[500px] rounded-[38px] border backdrop-blur-xl transition-all duration-300 relative overflow-hidden text-left ${
                  hasProAccent 
                    ? (isLight ? "bg-white border-[#3D81E3] shadow-md scale-102" : "bg-slate-950/80 border-[#00d2ff]/40 shadow-[0_15px_40px_rgba(0,180,216,0.08)] scale-102")
                    : (isLight ? "bg-white hover:bg-slate-50/80 border-slate-250 shadow-sm hover:scale-[1.01]" : "bg-slate-950/60 border-white/10 hover:border-slate-600 shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:scale-[1.01]")
                }`}
              >
                {/* Visual Accent Inner Top Light Gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />

                <div className="space-y-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold font-mono tracking-widest uppercase ${hasProAccent ? "text-[#00d2ff]" : (isLight ? "text-black" : "text-slate-400")}`}>
                      {p.tier}
                    </span>
                    {hasProAccent && (
                      <span className="text-[8px] font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-[#00d2ff]/10 text-[#00d2ff] uppercase border border-[#00d2ff]/20">
                        Popular
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className={`text-3xl sm:text-4xl font-extrabold tracking-tight leading-none ${isLight ? "text-[#131518]" : "text-white"}`}>
                      {rate}
                    </div>
                    {p.tier !== "Free Trial" && (
                      <p className={`text-[10px] font-medium font-mono uppercase tracking-widest mt-1 ${isLight ? "text-black" : "text-slate-500"}`}>
                        {isYearlyBilling ? "Billed container session annually" : "Month-to-month plan rates"}
                      </p>
                    )}
                  </div>

                  <p className={`text-xs leading-relaxed font-light min-h-[40px] ${isLight ? "text-black" : "text-slate-400"}`}>
                    {p.desc}
                  </p>

                  <ul className={`space-y-3.5 pt-4 border-t list-none m-0 p-0 text-xs ${isLight ? "border-slate-100 text-black" : "border-white/5 text-slate-300"}`}>
                    {p.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-center gap-3">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          hasProAccent 
                            ? "bg-[#00d2ff]/10 text-[#00d2ff]" 
                            : (isLight ? "bg-slate-100 text-black" : "bg-white/5 text-slate-300")
                        }`}>
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-8 relative z-10">
                  <button 
                    onClick={() => onNavigate("/subscription")}
                    className={`w-full rounded-2xl py-3 text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] ${
                      hasProAccent
                        ? "bg-gradient-to-r from-[#00b4d8] to-[#0077b6] text-white shadow-lg shadow-[#00b4d8]/20"
                        : (isLight ? "bg-[#131518] hover:bg-black text-white shadow-sm" : "bg-white hover:bg-slate-200 text-black shadow-sm")
                    }`}
                  >
                    Get Started with {p.tier}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Toggle billing option */}
        <div className="flex items-center gap-3.5 relative z-10 select-none">
          <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-black" : "text-slate-400"}`}>Yearly Billing Discount</span>
          <button 
            id="billing-frequency-toggle"
            onClick={() => setIsYearlyBilling(!isYearlyBilling)}
            className={`w-[52px] h-[28px] rounded-full border p-0.5 transition-colors relative cursor-pointer outline-none ${
              isYearlyBilling 
                ? "bg-blue-500/30 border-blue-500/20" 
                : (isLight ? "bg-slate-100 border-slate-300" : "bg-white/5 border-white/10")
            }`}
          >
            <motion.div 
              className={`w-5 h-5 rounded-full shadow-md cursor-pointer ${isLight ? "bg-[#131518]" : "bg-white"}`}
              animate={{ x: isYearlyBilling ? 22 : 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          </button>
        </div>
      </section>

      {/* FINAL CALL TO ACTION CARD */}
      <section className="max-w-[90rem] mx-auto px-6 sm:px-8 py-20 md:py-32 relative z-10">
        <div className={`rounded-[40px] px-8 py-16 md:py-24 text-center border relative overflow-hidden shadow-2xl transition-colors duration-500 ${
          isLight ? "bg-white border-slate-200/80 text-[#131518]" : "liquid-glass border-white/10 text-white"
        }`}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_0%,rgba(61,129,227,0.12),transparent_70%)] pointer-events-none" />
          
          <h2 className={`text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mb-6 leading-tight transition-colors duration-500 ${
            isLight ? "text-[#131518]" : "text-white"
          }`}>
            Close the tabs. <br />
            <span className={isLight ? "text-black" : "text-slate-500"}>Open your hiring ops.</span>
          </h2>
          <p className={`text-xs sm:text-sm md:text-base max-w-xl mx-auto mb-10 leading-relaxed font-light transition-colors duration-500 ${
            isLight ? "text-black" : "text-slate-400"
          }`}>
            Use the workspace registration page to create your company account, choose a plan, and activate your interview dashboard &mdash; without waiting on a separate billing handoff.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => onNavigate("/subscription")}
              className={`w-full sm:w-auto px-8 h-12 inline-flex items-center justify-center gap-2 rounded-full font-extrabold text-xs tracking-tight transition-all hover:scale-[1.01] cursor-pointer shadow-md ${
                isLight ? "bg-[#3d81e3] hover:bg-[#3d81e3]/90 text-white" : "bg-white text-black hover:bg-white/90 shadow-[0_5px_15px_rgba(255,255,255,0.1)]"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Open Subscription Page</span>
            </button>
            <button 
              onClick={() => onNavigate(isAuthenticated ? "/app" : "/auth#login")}
              className={`w-full sm:w-auto px-6 h-12 inline-flex items-center justify-center gap-1 text-xs font-semibold rounded-full border transition-all hover:scale-[1.01] cursor-pointer ${
                isLight 
                  ? "border-slate-300 bg-white text-black hover:bg-slate-50" 
                  : "border-white/15 bg-[#0c0c0c] hover:bg-white/5 hover:border-white/20"
              }`}
            >
              <span>{isAuthenticated ? "Go to Dashboard" : "Admin Login"}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={`w-full border-t py-12 relative z-30 text-xs text-left transition-colors duration-500 ${
        isLight ? "bg-[#f1f1ee] border-slate-200/50 text-black" : "bg-black/40 border-white/5 text-slate-505"
      }`}>
        <div className="max-w-[90rem] mx-auto px-6 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 select-none">
            <HireIqLogo theme={theme} className="w-8 h-8 transition-colors duration-500" />
            <span>&bull;</span>
            <span className="font-light">AI Voice Recruitment Platform</span>
          </div>
          <p className="font-light">&copy; 2026 Mock Interview Inc. All standard simulation templates apply. Private sandbox environment.</p>
        </div>
      </footer>
    </div>
  );
}
