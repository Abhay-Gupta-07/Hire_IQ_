import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  ArrowLeft, 
  Mail, 
  Lock, 
  User, 
  Sparkles, 
  AlertCircle, 
  Check, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Calendar, 
  Users, 
  Backpack, 
  Star,
  Sun,
  Moon
} from "lucide-react";
import { mockDb } from "../lib/mockDb";
import HireIqLogo from "./HireIqLogo";
import { supabase } from "../lib/supabaseClient";

interface AuthPageProps {
  onNavigate: (path: string) => void;
  onLoginSuccess: () => void;
  theme?: "dark" | "light";
  toggleTheme?: () => void;
}

export default function AuthPage({ onNavigate, onLoginSuccess, theme = "dark", toggleTheme }: AuthPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Validation States for Real-time Feedback
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [pwdTouched, setPwdTouched] = useState(false);

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    setTimeout(() => {
      if (username.trim() !== "arah" || password !== "arah123") {
        setError("Access Denied: Invalid admin username or password.");
        setIsLoading(false);
        return;
      }

      // Save user details for session persistence
      const profile = mockDb.getProfile();
      profile.full_name = "Recruiter Admin";
      profile.email = "admin@hireiq.studio";
      mockDb.updateProfile(profile);

      localStorage.setItem("ai_mock_interview_auth", "true");
      setIsLoading(false);
      onLoginSuccess();
    }, 850);
  };

  const isFormValid = username.trim().length > 0 && password.length > 0;
  const isLight = theme === "light";

  return (
    <div className={`min-h-screen font-sans flex flex-col justify-start selection:bg-emerald-500/30 relative transition-colors duration-500 ${
      isLight ? "bg-transparent text-[#131518]" : "bg-[#0c0c0c] text-white"
    }`}>
      {/* Dynamic Background decorative layers (complementing Three.js canvas in App.tsx) */}
      {!isLight && (
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:5rem_5rem] pointer-events-none z-0 transition-opacity duration-500 opacity-20" />
      )}
      <div className="absolute top-1/4 right-0 w-[450px] h-[450px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 left-0 w-[450px] h-[450px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* HEADER / NAVIGATION */}
      <nav className={`relative w-full flex items-center h-24 z-20 border-b transition-colors duration-500 ${
        isLight ? "bg-[#f8f8f6]/85 border-slate-200/50 backdrop-blur-md" : "bg-white/[0.03] border-b border-white/[0.08] backdrop-blur-md"
      }`}>
        <div className="w-full max-w-[90rem] mx-auto px-6 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onNavigate("/")}>
            <HireIqLogo theme={theme} className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onNavigate("/")}
              className={`h-8 px-4 rounded-full border text-xs font-semibold font-sans tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
                isLight ? "border-slate-300 text-slate-700 hover:bg-black/5" : "border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
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
                {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* HERO & SPLIT WORKSPACE BODY */}
      <main className="relative flex-grow flex items-center justify-center py-10 md:py-16 px-6 lg:px-12 z-10 w-full max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center w-full">
          
          {/* LEFT COLUMN: HERO TEXTUAL IDENTITY */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6 md:space-y-8 max-w-xl mx-auto lg:mx-0 text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-white">
              Simple <em className="italic font-light text-transparent bg-gradient-to-r from-[#A4F4FD] to-[#3D81E3] bg-clip-text not-italic block md:inline-block">interview</em> management for your hiring team
            </h1>
            <p className="text-sm md:text-base text-slate-400 font-light leading-relaxed max-w-md">
              Launch mock interviews, schedule candidate windows, send polished invitations, and review AI-guided performance from one calm admin workspace built for fast hiring teams.
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
              <button
                onClick={() => {
                  setUsername("arah");
                  setPassword("arah123");
                }}
                className="h-12 px-8 rounded-full bg-white text-[#0c0c0c] text-xs font-extrabold tracking-wide hover:bg-slate-100 transition-all cursor-pointer flex items-center gap-2 shadow-2xl hover:scale-[1.01] hover:shadow-[0_8px_30px_rgba(255,255,255,0.15)]"
              >
                <Sparkles className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                Autofill Admin Credentials
              </button>
              <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md">
                <span className="text-[11px] font-bold text-slate-300 font-mono">1,020+ Reviews</span>
                <div className="flex text-yellow-400 font-mono leading-none tracking-widest text-[9px]">
                  ★★★★☆
                </div>
                <span className="text-[11px] text-slate-550">G in</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: HIGH-POLISHED INTERACTIVE LIQUID GLASS CARD */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto relative group">
            {/* Glowing border accent */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-[24px] blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            {/* Core Card Container */}
            <div className="relative bg-[#17171e]/70 backdrop-blur-3xl border border-white/[0.12] rounded-[24px] p-8 shadow-[0_32px_80px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.18)] text-left flex flex-col justify-between overflow-hidden">
              
              {/* Glass subtle gradient line overlay */}
              <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-[#A4F4FD] via-[#3D81E3] to-indigo-500 opacity-60" />

              {/* Card Header Shield Icon */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-11 h-11 rounded-xl bg-slate-950 border border-white/[0.08] flex items-center justify-center shadow-inner">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 fill-emerald-400/10" />
                </div>
                <div>
                  <h2 className="text-[20px] font-black tracking-tight text-white mb-0.5">
                    Admin Console
                  </h2>
                  <p className="text-[12px] text-slate-400 tracking-wide font-light">
                    Secure Sandbox Workspace for Recruiter & Creator Board.
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex gap-2.5 items-start">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* FORM SYSTEM */}
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {/* 1. USERNAME FIELD */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono font-medium tracking-widest text-slate-400 uppercase select-none">
                    Username
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-500 pointer-events-none z-10">
                      <User className="w-4 h-4" />
                    </span>
                    <input
                      id="auth_username"
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setUsernameTouched(true);
                      }}
                      onBlur={() => setUsernameTouched(true)}
                      placeholder="Username"
                      className={`w-full h-11 bg-slate-950/60 border rounded-xl pl-10 pr-4 text-xs text-white placeholder:text-slate-600 focus:outline-none transition-all font-sans ${
                        usernameTouched
                          ? username.trim() === "arah"
                            ? "border-emerald-500/40 bg-emerald-500/[0.02]"
                            : "border-rose-500/40 bg-rose-500/[0.02]"
                          : "border-white/[0.08] focus:border-blue-500/50"
                      }`}
                      required
                    />
                  </div>
                  {usernameTouched && username.trim() !== "arah" && (
                    <p className="text-[10px] text-rose-400/90 font-mono leading-none pt-0.5 pl-1 animate-fade-in">
                      Invalid admin name
                    </p>
                  )}
                </div>

                {/* 2. PASSWORD FIELD */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-mono font-medium tracking-widest text-[#94a3b8] uppercase select-none">
                      Password
                    </label>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-500 pointer-events-none z-10">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      id="auth_pass"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPwdTouched(true);
                      }}
                      onBlur={() => setPwdTouched(true)}
                      placeholder="Password"
                      className={`w-full h-11 bg-slate-950/60 border rounded-xl pl-10 pr-10 text-xs text-white placeholder:text-slate-600 focus:outline-none transition-all font-sans ${
                        pwdTouched
                          ? password === "arah123"
                            ? "border-emerald-500/40 bg-emerald-500/[0.02]"
                            : "border-rose-500/40 bg-rose-500/[0.02]"
                          : "border-white/[0.08] focus:border-blue-500/50"
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-slate-550 hover:text-slate-300 p-1 rounded-md transition-colors cursor-pointer select-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* SUBMIT HERO ACTION BUTTON */}
                <button
                  id="btn_auth_submit"
                  type="submit"
                  disabled={isLoading || !isFormValid}
                  className="w-full h-12 rounded-xl bg-white text-[#0c0c0c] text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2 select-none shadow-lg disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer hover:shadow-2xl active:translate-y-px duration-150 mt-4"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Sign In</>
                  )}
                </button>
              </form>
            </div>
          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="py-6 border-t border-white/[0.05] bg-slate-950/80 text-center text-[10px] font-mono tracking-wider text-slate-600 uppercase z-10 select-none">
        Authentic local storage persists credentials &bull; GDPR compliant sandboxed secure workspace
      </footer>
    </div>
  );
}
