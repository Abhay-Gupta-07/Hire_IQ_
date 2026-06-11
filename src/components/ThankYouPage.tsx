import React from "react";
import { motion } from "motion/react";
import { CheckCircle2, ChevronRight, Sparkles } from "lucide-react";

interface ThankYouPageProps {
  onNavigate: (path: string) => void;
  theme?: "dark" | "light";
}

export default function ThankYouPage({ onNavigate, theme = "dark" }: ThankYouPageProps) {
  const isLight = theme === "light";

  return (
    <div className={`min-h-screen font-sans flex flex-col items-center justify-center p-6 text-center transition-colors duration-500 ${
      isLight ? "bg-[#fcfcf9] text-[#131518]" : "bg-slate-950 text-slate-105"
    }`}>
      {/* Background ambient lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[90px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`max-w-md w-full p-8 rounded-2xl border backdrop-blur-md relative overflow-hidden shadow-2xl ${
          isLight ? "bg-white border-slate-200/80 shadow-slate-200" : "bg-slate-900/40 border-slate-900"
        }`}
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 animate-pulse" />

        <div className="flex flex-col items-center space-y-6">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center relative">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-teal-400 rounded-full animate-ping" />
          </div>

          <div className="space-y-2">
            <h1 className={`text-2xl font-bold font-display tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
              Interview Submitted!
            </h1>
            <p className={`text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-1.5 ${isLight ? "text-slate-500" : "text-emerald-400"}`}>
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              Session Concluded Successfully
            </p>
          </div>

          <div className={`text-sm leading-relaxed p-4 rounded-xl border ${
            isLight ? "bg-slate-50 border-slate-200/60 text-slate-650" : "bg-slate-950/50 border-slate-900 text-slate-300"
          }`}>
            Thank you for completing your virtual interview session. Your answers, biometric integrity metrics, and response transcripts have been safely analyzed and logged.
          </div>

          <p className="text-xs text-slate-550 font-light leading-relaxed">
            The hiring team has been notified of your completion. You can safely close this browser window now.
          </p>

          <div className="pt-2 w-full">
            <button
              onClick={() => onNavigate("/")}
              className="w-full h-11 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold font-mono text-xs uppercase tracking-wider hover:from-emerald-400 hover:to-teal-400 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20"
            >
              Back to Home <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
