import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Play, 
  Film, 
  MessageSquare, 
  ChevronRight, 
  AlertCircle, 
  Volume2,
  Check,
  XCircle,
  ShieldAlert,
  Sparkles,
  Activity
} from "lucide-react";
import { InterviewQuestion } from "../types";
import { mockDb } from "../lib/mockDb";
import { videoDb } from "../lib/videoDb";

interface DashboardVideoViewerProps {
  interviewId: string;
  onDecisionChange?: (id: string, decision: "pending" | "shortlisted" | "rejected") => void;
  theme?: "dark" | "light";
}

export default function DashboardVideoViewer({ interviewId, onDecisionChange, theme = "dark" }: DashboardVideoViewerProps) {
  const isLight = theme === "light";
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [videoUrls, setVideoUrls] = useState<Record<string, { url: string; isVideo: boolean }>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Recruiter action panel states
  const [interview, setInterview] = useState<any>(null);
  const [rulesAutoEvaluated, setRulesAutoEvaluated] = useState(false);
  const [evaluationFeedback, setEvaluationFeedback] = useState("");

  useEffect(() => {
    // Collect questions
    const qs = mockDb.getQuestions(interviewId);
    setQuestions(qs);

    // Current interview state
    const currentInt = mockDb.getInterviewById(interviewId);
    setInterview(currentInt);

    // Fetch local video files from IndexedDB cache
    const fetchRecordings = async () => {
      setIsLoading(true);
      try {
        const saved = await videoDb.getVideosForInterview(interviewId);
        const map: Record<string, { url: string; isVideo: boolean }> = {};
        
        saved.forEach((item) => {
          map[item.questionId] = {
            url: URL.createObjectURL(item.blob),
            isVideo: item.mimeType.startsWith("video/")
          };
        });
        setVideoUrls(map);
      } catch (err) {
        console.warn("Could not retrieve videos for dashboard preview:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecordings();
  }, [interviewId]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      Object.keys(videoUrls).forEach((key) => {
        try {
          URL.revokeObjectURL(videoUrls[key].url);
        } catch (e) {}
      });
    };
  }, [videoUrls]);

  const handleDecisionClick = (newDecision: "pending" | "shortlisted" | "rejected") => {
    if (!interview) return;
    const updated = { ...interview, decision: newDecision };
    mockDb.updateInterview(updated);
    setInterview(updated);
    if (onDecisionChange) {
      onDecisionChange(interviewId, newDecision);
    }
  };

  const handleAutoEvaluateRulesAndMarks = () => {
    if (!interview) return;
    setRulesAutoEvaluated(true);
    
    const violations = interview.violations_log?.length || 0;
    const tabSwitches = interview.tab_switch_count || 0;
    const score = interview.mcq_score !== undefined ? interview.mcq_score : 80;
    
    if (violations > 0 || tabSwitches > 1) {
      setEvaluationFeedback(`Automatic audit flag: Candidate registered ${violations} visual warning(s) and ${tabSwitches} tab-switch event(s). Verification warning suggested.`);
    } else if (score < 50) {
      setEvaluationFeedback(`Automatic audit flag: Candidate scored below average on standard warm-up MCQs (${score}%). Manual review suggested.`);
    } else {
      setEvaluationFeedback("Automatic audit flag: No proctor integrity exceptions detected. Performance metrics qualify candidate for recommended fast-track.");
    }
  };

  const activeQuestion = questions[activeQuestionIdx];
  const activeMedia = activeQuestion ? videoUrls[activeQuestion.id] : null;

  if (isLoading) {
    return (
      <div className="p-6 bg-slate-950/60 border border-slate-900 rounded-xl flex items-center justify-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
        <span className="text-xs text-slate-500 font-mono">Decoding session video logs...</span>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className={`p-6 border rounded-xl text-center text-xs font-mono transition-all ${
        isLight ? "bg-slate-50 border-slate-205 text-black" : "bg-slate-950/60 border-slate-900 text-slate-500"
      }`}>
        No question records saved for this session.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className={`mt-4 p-5 rounded-xl space-y-5 overflow-hidden text-left border transition-all ${
        isLight ? "bg-white border-slate-200 shadow-md text-black" : "bg-slate-950/80 border-slate-900 text-slate-100"
      }`}
    >
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Side: Question List Selector */}
        <div className="w-full lg:w-2/5 space-y-2">
          <span className={`text-[9px] font-mono uppercase tracking-wider font-semibold block mb-1 ${isLight ? "text-black" : "text-slate-500"}`}>
            Practice Question Playback ({questions.length})
          </span>
          
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
            {questions.map((q, qIndex) => {
              const hasVideo = !!videoUrls[q.id];
              const isActive = qIndex === activeQuestionIdx;
              
              return (
                <button
                  key={q.id}
                  onClick={() => setActiveQuestionIdx(qIndex)}
                  className={`w-full p-3 rounded-lg text-left text-xs transition-colors border block ${
                    isActive
                      ? isLight ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold" : "bg-emerald-500/5 border-emerald-500/20 text-white"
                      : isLight 
                        ? "bg-slate-50 border-slate-200 hover:bg-slate-100 text-black hover:text-black" 
                        : "bg-slate-900/40 border-slate-900/60 hover:bg-slate-900/80 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1 justify-between">
                    <span className={`text-[9px] font-mono font-bold uppercase ${
                      isActive 
                        ? isLight ? "text-emerald-700" : "text-emerald-400" 
                        : isLight ? "text-black" : "text-slate-500"
                    }`}>
                      Question {qIndex + 1}
                    </span>
                    {hasVideo ? (
                      <span className={`text-[8px] border px-1.5 py-0.5 rounded flex items-center gap-1 ${
                        isLight ? "bg-emerald-50 border-emerald-205 text-emerald-800 font-semibold" : "bg-slate-950 border-emerald-500/10 text-emerald-400"
                      }`}>
                        <Film className={`w-2.5 h-2.5 ${isLight ? "text-emerald-700" : "text-emerald-400"}`} />
                        Media Live
                      </span>
                    ) : (
                      <span className={`text-[8px] block ${isLight ? "text-black" : "text-slate-500"}`}>No video</span>
                    )}
                  </div>
                  <p className="line-clamp-2 leading-relaxed text-[11px] font-light">
                    {q.question}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Large Video/Audio Screen Player */}
        <div className="flex-1 space-y-3.5">
          {activeQuestion && (
            <div className="space-y-3">
              <div className={`p-3 border rounded-lg ${isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/30 border-slate-900"}`}>
                <p className={`text-xs font-medium leading-relaxed italic border-l pl-2.5 ${
                  isLight ? "text-slate-800 border-emerald-600" : "text-slate-200 border-emerald-500/50"
                }`}>
                  &ldquo;{activeQuestion.question}&rdquo;
                </p>
              </div>

              {activeMedia ? (
                <div className="space-y-2">
                  <div className="relative rounded-lg overflow-hidden border border-slate-850/80 bg-black aspect-video w-full max-w-md shadow-2xl">
                    {activeMedia.isVideo ? (
                      <video
                        src={activeMedia.url}
                        controls
                        playsInline
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3 p-4 bg-slate-900">
                        <Volume2 className="w-8 h-8 text-emerald-400 animate-pulse" />
                        <span className="text-[10px] text-slate-500 font-mono">Sound Only Recording Detected</span>
                        <audio
                          src={activeMedia.url}
                          controls
                          className="w-full max-w-xs accent-emerald-500 mt-2"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className={`h-44 rounded-lg border border-dashed flex flex-col items-center justify-center p-6 text-center space-y-2 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/10 border-slate-900"
                }`}>
                  <AlertCircle className="w-6 h-6 text-slate-400" />
                  <p className={`text-[11px] font-mono max-w-xs ${isLight ? "text-black" : "text-slate-500"}`}>
                    No raw practice video clip was cached for this specific answer. Only transcripts are saved when text answers or bypassed setups are triggered.
                  </p>
                </div>
              )}

              {/* Transcript context snippet */}
              {activeQuestion.answer_transcript && (
                <div className={`p-3 rounded-lg border text-[11px] leading-relaxed max-h-[80px] overflow-y-auto ${
                  isLight ? "bg-slate-50 border-slate-200 text-black" : "bg-slate-900/30 border-slate-900 text-slate-400"
                }`}>
                  <span className={`text-[9px] font-mono block uppercase mb-0.5 font-bold ${isLight ? "text-black" : "text-slate-500"}`}>Transcription Feed</span>
                  <p className="font-light italic">&ldquo;{activeQuestion.answer_transcript}&rdquo;</p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Recruiter / Evaluator Decisions Panel */}
      <div className={`pt-4 mt-2 border-t flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        isLight ? "border-slate-200" : "border-slate-900/60"
      }`}>
        <div className="space-y-1">
          <span className={`text-[9px] font-mono uppercase tracking-wider font-bold block ${isLight ? "text-black" : "text-slate-500"}`}>
            Direct Recruiting Controls
          </span>
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] ${isLight ? "text-black font-semibold" : "text-slate-400"}`}>
              Active Candidate Decision:
            </span>
            <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
              interview?.decision === "shortlisted" 
                ? isLight ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-emerald-500/10 text-emerald-400" 
                : interview?.decision === "rejected" 
                  ? isLight ? "bg-rose-100 text-rose-800 border border-rose-200" : "bg-rose-500/10 text-rose-400" 
                  : isLight ? "bg-amber-101 text-amber-800 border border-amber-200" : "bg-amber-500/10 text-amber-400"
            }`}>
              {interview?.decision || "pending"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Keep Pending */}
          <button
            type="button"
            onClick={() => handleDecisionClick("pending")}
            className={`h-8 px-3 rounded-lg border text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              interview?.decision === "pending"
                ? isLight ? "bg-amber-100 border-amber-400 text-amber-800 font-bold" : "bg-amber-500/15 border-amber-500/35 text-amber-400 font-bold"
                : isLight ? "bg-white border-slate-200 hover:bg-slate-50 text-black hover:text-black" : "border-slate-800 hover:border-slate-705 text-slate-400 hover:text-slate-300"
            }`}
          >
            Keep Pending
          </button>

          {/* Shortlist */}
          <button
            type="button"
            onClick={() => handleDecisionClick("shortlisted")}
            className={`h-8 px-3 rounded-lg border text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              interview?.decision === "shortlisted"
                ? isLight ? "bg-emerald-100 border-emerald-400 text-emerald-850 font-bold" : "bg-emerald-500/15 border-emerald-500/35 text-emerald-400 font-bold"
                : isLight ? "bg-white border-slate-200 hover:bg-slate-50 text-black hover:text-black" : "border-slate-800 hover:border-slate-705 text-slate-400 hover:text-slate-300"
            }`}
          >
            Shortlist
          </button>

          {/* Reject */}
          <button
            type="button"
            onClick={() => handleDecisionClick("rejected")}
            className={`h-8 px-3 rounded-lg border text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              interview?.decision === "rejected"
                ? isLight ? "bg-rose-100 border-rose-400 text-rose-800 font-bold" : "bg-rose-500/15 border-rose-500/35 text-rose-400 font-bold"
                : isLight ? "bg-white border-slate-200 hover:bg-slate-50 text-black hover:text-black" : "border-slate-800 hover:border-slate-705 text-slate-400 hover:text-slate-300"
            }`}
          >
            Reject Candidate
          </button>

          {/* Speed Audit Auto-evaluation trigger */}
          <button
            type="button"
            onClick={handleAutoEvaluateRulesAndMarks}
            className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-505 text-white hover:shadow-indigo-550/10 text-[10px] font-mono tracking-wider font-extrabold uppercase transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 bg-gradient-to-r from-indigo-650 to-indigo-700"
            title="Auto scan proctor violations and quiz scorecard results"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Auto Decision Index
          </button>
        </div>
      </div>

      {rulesAutoEvaluated && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 border rounded-lg text-xs flex items-center gap-2 ${
            isLight ? "bg-indigo-50 border-indigo-200 text-indigo-900" : "bg-indigo-950/20 border-indigo-900/30 text-indigo-400"
          }`}
        >
          <Activity className="w-4 h-4 text-indigo-500 shrink-0 animate-bounce" />
          <p className={`font-light font-mono leading-relaxed outline-none ${isLight ? "text-indigo-850" : "text-indigo-200"}`}>{evaluationFeedback}</p>
        </motion.div>
      )}

    </motion.div>
  );
}
