import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Tv, 
  Activity, 
  Mic, 
  Video, 
  Users, 
  X, 
  Maximize2, 
  ShieldCheck, 
  Sparkles, 
  MessageSquare,
  Volume2,
  VolumeX,
  AlertTriangle,
  Search,
  Eye,
  Settings,
  LayoutGrid,
  Layers,
  ChevronRight,
  ChevronLeft,
  Volume1,
  Cpu,
  Camera,
  Sliders,
  VideoOff,
  Link,
  Check
} from "lucide-react";
import { getAppBaseUrl } from "../lib/urlHelper";

function SharedVideoFeed({ stream, filter }: { stream: MediaStream | null; filter: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const getFilterStyle = () => {
    switch (filter) {
      case "infrared": return "brightness-[1.1] hue-rotate-180 saturate-0 scale-x-[-1] grayscale contrast-[1.1]";
      case "matrix": return "brightness-[0.95] saturate-[0.8] contrast-[1.3] grayscale sepia hue-rotate-[95deg] scale-x-[-1]";
      case "thermal": return "hue-rotate-[195deg] saturate-[3.0] contrast-[1.25] invert scale-x-[-11";
      case "biometric": return "brightness-[1.3] sepia scale-x-[-1] contrast-[1.15]";
      default: return "scale-x-[-1] object-cover";
    }
  };

  if (!stream) {
    return (
      <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-3">
        <div className="w-12 h-12 rounded-full border border-indigo-500/10 animate-[ping_1.6s_infinite] absolute" />
        <span className="text-[8px] font-mono text-indigo-400 font-extrabold tracking-widest uppercase animate-pulse">BROADCAST SIGNAL ACTIVE</span>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={`absolute inset-0 w-full h-full object-cover transition-all duration-350 ${getFilterStyle()}`}
    />
  );
}

interface AdminLiveStreamMonitorProps {
  key?: string;
  liveSession: {
    interviewId: string;
    candidateName: string;
    role: string;
    currentQuestion: string;
    currentQuestionIdx: number;
    totalQuestions: number;
    recordingState: string;
    cameraActive: boolean;
    liveSpeechText: string;
    interimSpeechText: string;
    lastActive: number;
  };
  liveCameraFrame: string | null;
  onClose: () => void;
  isBulkMode?: boolean;
  bulkCount?: number;
}

interface SimulatedCandidate {
  id: string;
  index: number;
  candidateName: string;
  role: string;
  sentence: string;
  currentText: string;
  charIdx: number;
  audioLevel: number;
  isActiveSpeaker: boolean;
  isAlerting: boolean;
  alertType: string;
  complianceScore: number;
}

export default function AdminLiveStreamMonitor({
  liveSession,
  liveCameraFrame,
  onClose,
  isBulkMode = false,
  bulkCount = 150
}: AdminLiveStreamMonitorProps) {
  const [isMaximized, setIsMaximized] = useState(isBulkMode);
  const [activeCohortTab, setActiveCohortTab] = useState<"1-100" | "101-300" | "301-500" | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [soloAudioCandidateId, setSoloAudioCandidateId] = useState<string | null>(null);
  const [focusedCandidateId, setFocusedCandidateId] = useState<string | null>(null);
  
  // Pagination inside bulk surveillance
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12; // fits extremely well in dashboard layouts

  const [monitors, setMonitors] = useState<SimulatedCandidate[]>([]);

  // Real active candidate streams from invitees opening pages concurrently
  const [activeCandidateStreams, setActiveCandidateStreams] = useState<Record<string, {
    frame: string;
    audioLevel: number;
    liveSpeech: string;
    candidateName: string;
    role: string;
    lastActive: number;
  }>>({});

  useEffect(() => {
    const channel = new BroadcastChannel("hireiq_realtime_surveillance");
    
    channel.onmessage = (event) => {
      if (event.data && event.data.type === "candidate_feed_update") {
        const { interviewId, candidateName, role, frame, audioLevel, liveSpeech } = event.data;
        
        setActiveCandidateStreams(prev => ({
          ...prev,
          [interviewId]: {
            frame,
            audioLevel,
            liveSpeech,
            candidateName: candidateName || "Live Invitee",
            role: role || "Consultant",
            lastActive: Date.now()
          }
        }));

        // Dynamic candidate inject / override
        setMonitors(prev => {
          const exists = prev.some(m => m.id === interviewId);
          if (exists) {
            return prev.map(m => {
              if (m.id === interviewId) {
                return {
                  ...m,
                  candidateName: candidateName || m.candidateName,
                  role: role || m.role,
                  isActiveSpeaker: audioLevel > 18,
                  audioLevel: audioLevel,
                  currentText: liveSpeech || m.currentText
                };
              }
              return m;
            });
          } else {
            return [
              {
                id: interviewId,
                index: prev.length + 1,
                candidateName: candidateName || "Live Candidate",
                role: role || "Standard Ingress",
                sentence: "Real-time surveillance link opened. Transcribing raw vocal metrics...",
                currentText: liveSpeech || "",
                charIdx: 0,
                audioLevel: audioLevel,
                isActiveSpeaker: audioLevel > 18,
                isAlerting: false,
                alertType: "",
                complianceScore: 100
              },
              ...prev
            ];
          }
        });
      }
    };

    return () => {
      channel.close();
    };
  }, []);

  // State maps for individual virtual webcams
  const [camerasMuted, setCamerasMuted] = useState<Record<string, boolean>>({});
  const [cameraFilters, setCameraFilters] = useState<Record<string, "normal" | "infrared" | "matrix" | "thermal" | "biometric">>({});
  const [capturedSelfies, setCapturedSelfies] = useState<Record<string, string>>({});
  const [capturedFlashing, setCapturedFlashing] = useState<Record<string, boolean>>({});
  const [realMediaStream, setRealMediaStream] = useState<MediaStream | null>(null);
  const [broadcastRealCam, setBroadcastRealCam] = useState(false);
  const [copiedBulkInviteId, setCopiedBulkInviteId] = useState<string | null>(null);
  const [copiedCohortInvite, setCopiedCohortInvite] = useState(false);

  // Stop camera tracks on unmount gracefully
  useEffect(() => {
    return () => {
      if (realMediaStream) {
        realMediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [realMediaStream]);

  const toggleRealBroadcast = async () => {
    if (broadcastRealCam) {
      if (realMediaStream) {
        realMediaStream.getTracks().forEach(track => track.stop());
      }
      setRealMediaStream(null);
      setBroadcastRealCam(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setRealMediaStream(stream);
        setBroadcastRealCam(true);
      } catch (err) {
        console.warn("Could not get user camera for broadcast mapping:", err);
        // Fall back gracefully to active simulation stream representation
        setBroadcastRealCam(true);
      }
    }
  };

  const candidateNames = [
    "Alexander Mercer", "Sofia Sterling", "Liam Henderson", "Amara Vance", "Ethan Thorne",
    "Isabella Croft", "Marcus Vance", "Elena Rostova", "Devon Lane", "Priya Nair",
    "Kenji Tanaka", "Zara Patel", "Lucas Silva", "Chloe Dupont", "Gabriel Russo",
    "Amina Diop", "Oliver Bennett", "Yasmine Al-Farsi", "Ryan Gallagher", "Maya Lin",
    "Siddharth Roy", "Helena Berg", "Xavier Moreau", "Naomi Tsang", "Julian Vance"
  ];

  const technicalRoles = [
    "Lead React Architect", "Data Solution Analyst", "Python Security Engineer", "Cloud SRE DevOps",
    "AI Inference Dev", "Product Experience Lead", "Full Stack Integrations Expert", "Staff Architect"
  ];

  const answerSentences = [
    "In React 18, concurrent features like useTransition allow us to mark heavy state updates without jamming the main browser render core.",
    "Distributed locking overheads are mitigated by running atomic cluster cache layers paired with mutual exclusion routines.",
    "We leverage AST tree evaluations on incoming files to execute parsed sandboxed previews cleanly inside client container shells.",
    "Implementing exponential backoff with a random delay jitter prevents servers from hit spikes caused by cascading retry loops.",
    "I optimize local build configurations to cache static libraries to speed up subsequent server cold run triggers.",
    "Excellent layout typography pairs sans-serif fonts with monospaced data grids to structure rich console alerts.",
    "Our real-time biometric pipelines compile audio packages concurrently using state-of-the-art secure browser context nodes."
  ];

  // Initialize simulated candidates once on mount
  useEffect(() => {
    if (!isBulkMode) return;
    
    let excelList: Array<{ name?: string; email?: string; role?: string }> = [];
    try {
      const saved = localStorage.getItem("excel_candidates_imported");
      if (saved) {
        excelList = JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }

    const targetCount = Math.max(excelList.length, bulkCount);
    const generated: SimulatedCandidate[] = [];
    
    for (let i = 1; i <= targetCount; i++) {
      let customName = "";
      let customRole = "";
      
      if (excelList.length > 0 && excelList[i - 1]) {
        const item = excelList[i - 1];
        customName = item.name || `Candidate #${i}`;
        customRole = item.role || technicalRoles[((i - 1) * 3) % technicalRoles.length];
      } else {
        const nameIndex = (i - 1) % candidateNames.length;
        customName = candidateNames[nameIndex];
        customRole = technicalRoles[((i - 1) * 3) % technicalRoles.length];
      }
      
      const sentenceIndex = ((i - 1) * 7) % answerSentences.length;
      
      generated.push({
        id: `sim-candidate-${i}`,
        index: i,
        candidateName: customName,
        role: customRole,
        sentence: answerSentences[sentenceIndex],
        currentText: "",
        charIdx: 0,
        audioLevel: 5,
        isActiveSpeaker: Math.random() > 0.4,
        isAlerting: Math.random() > 0.94,
        alertType: Math.random() > 0.5 ? "Tab focus switched" : "Facial alignment drift",
        complianceScore: Math.floor(Math.random() * 20) + 80 // 80 - 99 range
      });
    }

    setMonitors(generated);
    if (generated.length > 0) {
      setFocusedCandidateId(generated[0].id);
    }
  }, [isBulkMode, bulkCount]);

  // Handle active speech typing simulator loop
  useEffect(() => {
    if (!isBulkMode || monitors.length === 0) return;

    const interval = setInterval(() => {
      setMonitors((prev) =>
        prev.map((m) => {
          let nextCharIdx = m.charIdx;
          let nextText = m.currentText;
          let nextSpeaker = m.isActiveSpeaker;
          
          if (Math.random() > 0.96) {
            nextSpeaker = !nextSpeaker;
          }
          
          let nextLevel = 2;
          if (nextSpeaker) {
            nextLevel = Math.floor(Math.random() * 45) + 5;
            
            if (nextCharIdx < m.sentence.length) {
              const increment = Math.floor(Math.random() * 5) + 2;
              nextCharIdx = Math.min(m.sentence.length, nextCharIdx + increment);
              nextText = m.sentence.substring(0, nextCharIdx);
            } else {
              if (Math.random() > 0.85) {
                nextCharIdx = 0;
                nextText = "";
              }
            }
          } else {
            // fading level
            nextLevel = Math.max(2, Math.floor(m.audioLevel * 0.4));
          }

          let nextAlert = m.isAlerting;
          if (Math.random() > 0.99) {
            nextAlert = !nextAlert;
          }

          return {
            ...m,
            charIdx: nextCharIdx,
            currentText: nextText,
            isActiveSpeaker: nextSpeaker,
            audioLevel: nextLevel,
            isAlerting: nextAlert
          };
        })
      );
    }, 200);

    return () => clearInterval(interval);
  }, [isBulkMode, monitors.length]);

  // Clean up speech synthesis on close or unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Update TTS speak when solo focus speaking text changes
  const lastSpokenRef = useRef<string>("");
  useEffect(() => {
    if (!isBulkMode || !soloAudioCandidateId) return;
    
    const target = monitors.find(m => m.id === soloAudioCandidateId);
    if (!target || !target.isActiveSpeaker || !target.currentText) return;

    // Speak periodically or when sentence restarts to avoid cutting off letters instantly
    const textToSpeak = target.sentence;
    if (lastSpokenRef.current !== textToSpeak && typeof window !== "undefined" && window.speechSynthesis) {
      lastSpokenRef.current = textToSpeak;
      
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1.05;
      utterance.pitch = 0.95 + ((target.index % 4) * 0.05);
      
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }, [isBulkMode, soloAudioCandidateId, monitors]);

  // TTS Speak loop for real candidate streams inside AdminLiveStreamMonitor
  const lastRealSpokenRef = useRef<string>("");
  useEffect(() => {
    // Check if there is an active solo candidate or we are listening to the main live session
    const targetId = soloAudioCandidateId || (liveSession ? liveSession.interviewId : null);
    if (!targetId) return;

    const realStream = activeCandidateStreams[targetId];
    if (realStream && realStream.liveSpeech) {
      const activeText = realStream.liveSpeech;
      if (lastRealSpokenRef.current !== activeText && typeof window !== "undefined" && window.speechSynthesis) {
        lastRealSpokenRef.current = activeText;
        const utterance = new SpeechSynthesisUtterance(activeText);
        utterance.rate = 1.0;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
    } else if (liveSession && liveSession.interviewId === targetId && liveSession.liveSpeechText) {
      // Fallback for direct props liveSession if not through channel
      const activeText = liveSession.liveSpeechText;
      if (lastRealSpokenRef.current !== activeText && typeof window !== "undefined" && window.speechSynthesis) {
        lastRealSpokenRef.current = activeText;
        const utterance = new SpeechSynthesisUtterance(activeText);
        utterance.rate = 1.0;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [soloAudioCandidateId, activeCandidateStreams, liveSession]);

  // Speech triggers based on deliberate clicked Solo actions
  const handleSoloVoice = (candidateId: string, name: string, activeText: string) => {
    if (soloAudioCandidateId === candidateId) {
      setSoloAudioCandidateId(null);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } else {
      setSoloAudioCandidateId(candidateId);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const speechText = activeText || `Solo audio stream activated for candidate ${name}. Listening to active interview responses.`;
        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // Turn off single single simulation if requested
  const getRecordingStatePill = (state: string) => {
    switch (state) {
      case "listening":
        return {
          text: "Speaking / Listening",
          class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          dot: "bg-emerald-400 animate-ping"
        };
      case "transcribing":
        return {
          text: "Compiling Transcription",
          class: "bg-teal-500/10 text-teal-400 border-teal-500/20",
          dot: "bg-teal-400 animate-spin"
        };
      case "done":
        return {
          text: "Evaluating Answer",
          class: "bg-purple-500/10 text-purple-400 border-purple-500/20",
          dot: "bg-purple-400"
        };
      default:
        return {
          text: "Awaiting Statement",
          class: "bg-slate-800 text-slate-400 border-slate-700",
          dot: "bg-slate-500"
        };
    }
  };

  // Determine filtering of arrays according to requested ranges (1-100, 101-300, 301-500)
  const getFilteredMonitors = () => {
    let result = monitors;
    
    // Cohort bounds filtering
    if (activeCohortTab === "1-100") {
      result = result.filter(m => m.index >= 1 && m.index <= 100);
    } else if (activeCohortTab === "101-300") {
      result = result.filter(m => m.index >= 101 && m.index <= 300);
    } else if (activeCohortTab === "301-500") {
      result = result.filter(m => m.index >= 301 && m.index <= 500);
    }

    // Search query filtering
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        m => m.candidateName.toLowerCase().includes(query) || m.role.toLowerCase().includes(query)
      );
    }

    return result;
  };

  const filteredMonitors = getFilteredMonitors();
  const totalItems = filteredMonitors.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  
  // Dynamic page slice
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedMonitors = filteredMonitors.slice(startIndex, startIndex + pageSize);

  // Retrieve focused candidate coordinates or details
  const focusedCandidate = monitors.find(m => m.id === focusedCandidateId) || (monitors.length > 0 ? monitors[0] : null);

  // Generate warning badges counters
  const alertCount = monitors.filter(m => m.isAlerting).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`relative w-full rounded-2xl bg-slate-900/95 border border-slate-850 shadow-2xl backdrop-blur-md overflow-hidden ${
        isMaximized ? "border-indigo-500/30 ring-1 ring-indigo-500/10" : ""
      }`}
    >
      {/* Visual Terminal Scanning line element */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] pointer-events-none ${isBulkMode ? "bg-indigo-500/30" : "bg-emerald-500/20"} animate-pulse`} />

      {/* Header bar */}
      <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <span className={`absolute inset-0 rounded-full animate-ping opacity-60 w-2.5 h-2.5 m-auto ${isBulkMode ? "bg-indigo-500" : "bg-rose-500"}`} />
            <span className={`w-2.5 h-2.5 rounded-full block relative ${isBulkMode ? "bg-indigo-500" : "bg-rose-500"}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-extrabold text-white uppercase tracking-wider">
                {isBulkMode ? "Biometric Surveillance Matrix Center" : "Recruiter Command Room"}
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold uppercase tracking-widest animate-pulse ${
                isBulkMode ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/25" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              }`}>
                {isBulkMode ? `Massive Cohort Deploy (${bulkCount} Streams)` : "Live Broadcast"}
              </span>
            </div>
            <p className="text-[9px] font-mono text-slate-400 mt-0.5">
              Secure monitor system • Audio transcript pipelines synced using standard web timers
            </p>
          </div>
        </div>

        {/* Aggregate metric overlay inside header block */}
        {isBulkMode && (
          <div className="flex items-center gap-3 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-850 text-slate-400 font-mono text-[10px] select-none flex-wrap">
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              Processing: <strong className="text-white">{bulkCount} Channels</strong>
            </span>
            <span className="text-slate-800">|</span>
            <span className="flex items-center gap-1 text-amber-400/90 font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              Deviations: <strong>{alertCount} Flagged</strong>
            </span>
            <span className="text-slate-800">|</span>
            <span className="text-emerald-400 font-bold">
              Averages: 97.4% Reliable
            </span>
          </div>
        )}

        {/* Global panel tools */}
        <div className="flex items-center gap-3 shrink-0">
          {isBulkMode && (
            <button
              id="btn_cockpit_copy_general_invite"
              onClick={() => {
                navigator.clipboard.writeText(`${getAppBaseUrl()}/#/invite/bulk-sim-session`);
                setCopiedCohortInvite(true);
                setTimeout(() => setCopiedCohortInvite(false), 2000);
              }}
              className={`h-8 px-3 rounded-lg font-mono text-[9px] uppercase font-bold tracking-wider transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                copiedCohortInvite 
                  ? "bg-emerald-500 text-slate-950 font-black animate-pulse" 
                  : "bg-slate-900 border border-slate-850 hover:border-slate-800 text-indigo-400 hover:text-indigo-300"
              }`}
              title="Copy general shareable invitation link for real candidates to join this cockpit"
            >
              {copiedCohortInvite ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  Copied Invite!
                </>
              ) : (
                <>
                  <Link className="w-3.5 h-3.5" />
                  Copy Cohort Invite
                </>
              )}
            </button>
          )}

          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 rounded-lg border border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Toggle size mode"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-850 hover:bg-slate-900 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Close monitoring cockpit"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* RENDER BULK MODE INTERFACES */}
      {isBulkMode ? (
        <div className="flex flex-col xl:flex-row h-full min-h-[580px] bg-slate-950/25">
          
          {/* LEFT AREA: GRID MATRIX DASHBOARD FRAME (8 spans equivalent) */}
          <div className="flex-1 p-5 space-y-4 border-r border-slate-900 text-left">
            
            {/* Filter toolbar and range preset categories */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 p-3.5 rounded-xl border border-slate-900">
              
              {/* Cohort range split tabs - ONE is 1-100, 101-300, 301-500 */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 font-bold block">Surveillance Cohort Filter:</span>
                
                <div className="flex bg-slate-950 border border-slate-850 p-0.5 rounded-lg text-[10px] font-mono gap-0.5">
                  <button
                    onClick={() => { setActiveCohortTab("all"); setCurrentPage(1); }}
                    className={`px-2.5 h-7 rounded uppercase font-bold tracking-tight transition-colors ${
                      activeCohortTab === "all"
                        ? "bg-indigo-650 text-white font-extrabold shadow"
                        : "text-slate-400 hover:text-white hover:bg-slate-900"
                    }`}
                  >
                    All Channels ({monitors.length})
                  </button>

                  <button
                    onClick={() => { setActiveCohortTab("1-100"); setCurrentPage(1); }}
                    className={`px-2.5 h-7 rounded uppercase font-bold tracking-tight transition-colors ${
                      activeCohortTab === "1-100"
                        ? "bg-indigo-650 text-white font-extrabold shadow"
                        : "text-slate-400 hover:text-white hover:bg-slate-900"
                    }`}
                    title="Filter candidates index 1 - 100"
                  >
                    1-100 Range
                  </button>

                  <button
                    onClick={() => { setActiveCohortTab("101-300"); setCurrentPage(1); }}
                    className={`px-2.5 h-7 rounded uppercase font-bold tracking-tight transition-colors ${
                      activeCohortTab === "101-300"
                        ? "bg-indigo-650 text-white font-extrabold shadow"
                        : "text-slate-400 hover:text-white hover:bg-slate-900"
                    }`}
                    title="Filter candidates index 101 - 300"
                  >
                    101-300 Range
                  </button>

                  <button
                    onClick={() => { setActiveCohortTab("301-500"); setCurrentPage(1); }}
                    className={`px-2.5 h-7 rounded uppercase font-bold tracking-tight transition-colors ${
                      activeCohortTab === "301-500"
                        ? "bg-indigo-650 text-white font-extrabold shadow"
                        : "text-slate-400 hover:text-white hover:bg-slate-900"
                    }`}
                    title="Filter candidates index 301 - 500"
                  >
                    301-500 Range
                  </button>
                </div>
              </div>

              {/* Broadcast and search tools */}
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleRealBroadcast(); }}
                  className={`h-9 px-3 rounded-lg border text-[10px] font-mono uppercase font-black tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                      broadcastRealCam
                        ? "bg-rose-500/10 border-rose-500/25 text-rose-450 animate-pulse"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700 text-indigo-400 hover:text-indigo-300 shadow-sm"
                  }`}
                  title={broadcastRealCam ? "Turn off real video broadcast" : "Stream your administrator camera feed directly into simulated candidate feeds!"}
                >
                  <Video className="w-3.5 h-3.5" />
                  {broadcastRealCam ? "On-Air Feed" : "Broadcast Cam"}
                </button>

                {/* Live search input filter */}
                <div className="w-full sm:w-56 relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search stream / role..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full h-9 pl-9 pr-4 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-550 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

            </div>

            {/* Simulated Live Webcam Grid streams */}
            {paginatedMonitors.length === 0 ? (
              <div className="py-24 rounded-2xl border border-dashed border-slate-850 text-center space-y-3 bg-slate-900/10">
                <AlertTriangle className="w-8 h-8 text-slate-650 mx-auto" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-300">No matching channels found</h4>
                  <p className="text-xs text-slate-550 max-w-sm mx-auto mt-1">Adjust your search query or verify your selected cohort subset range button triggers.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedMonitors.map((m) => {
                  const isSoloAudio = soloAudioCandidateId === m.id;
                  const isCurrentlyFocused = focusedCandidateId === m.id;

                  return (
                    <div
                      key={m.id}
                      onClick={() => setFocusedCandidateId(m.id)}
                      className={`p-3.5 bg-slate-900/60 rounded-xl border transition-all relative flex flex-col justify-between gap-3 text-left cursor-pointer ${
                        isCurrentlyFocused 
                          ? "border-indigo-500/50 bg-indigo-950/10 shadow-lg shadow-indigo-950/20" 
                          : "border-slate-850 hover:border-slate-800"
                      }`}
                    >
                      {/* Interactive alerts on cards */}
                      {m.isAlerting && (
                        <div className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-amber-500 to-red-600 text-slate-950 text-[7px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded shadow z-40 animate-bounce flex items-center gap-1 border border-amber-400/20">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {m.alertType}
                        </div>
                      )}

                      {/* Video Stream Preview Display Box */}
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-950 border border-slate-850 flex items-center justify-center select-none">
                        
                        {/* High-tech matrix scanning overlay */}
                        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-[size:16px_16px] opacity-15 pointer-events-none z-10" />
                        
                        {/* Camera flash photographic capture overlay */}
                        {capturedFlashing[m.id] && (
                          <div className="absolute inset-0 bg-white z-50 animate-pulse pointer-events-none" />
                        )}

                        {/* Mini camera header details */}
                        <div className="absolute top-1.5 left-1.5 z-20 flex items-center justify-between w-[calc(100%-12px)] pointer-events-none text-[7px] font-mono text-slate-500 uppercase">
                          <span>CAM_NODE_{m.index}</span>
                          <span className={`${m.isActiveSpeaker ? "text-indigo-400 font-bold" : ""} flex items-center gap-1`}>
                            {cameraFilters[m.id] && cameraFilters[m.id] !== "normal" && (
                              <span className="text-[6.5px] bg-indigo-505/20 text-indigo-400 px-1 py-0.2 rounded font-mono uppercase">{cameraFilters[m.id]}</span>
                            )}
                            {m.isActiveSpeaker ? "VOCAL FEED" : "SILENT"}
                          </span>
                        </div>

                        {/* Active rendering block based on camera status */}
                        {camerasMuted[m.id] ? (
                          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-1.5 z-15 transition-all">
                            <VideoOff className="w-5 h-5 text-red-500/80" />
                            <span className="text-[7.5px] font-mono text-red-400 font-extrabold uppercase tracking-widest leading-none">C-NODE SUSPENDED</span>
                          </div>
                        ) : activeCandidateStreams[m.id]?.frame ? (
                          <div className="absolute inset-0 w-full h-full bg-slate-950">
                            <img 
                              src={activeCandidateStreams[m.id].frame} 
                              alt="Live Stream" 
                              referrerPolicy="no-referrer"
                              className={`w-full h-full object-cover transition-all duration-300 scale-x-[-1] ${
                                cameraFilters[m.id] === "infrared" ? "brightness-[1.15] grayscale contrast-[1.1]" :
                                cameraFilters[m.id] === "matrix" ? "brightness-[0.9] saturate-[0.8] contrast-[1.3] sepia hue-rotate-[90deg]" :
                                cameraFilters[m.id] === "thermal" ? "hue-rotate-[190deg] saturate-[2.4] contrast-[1.2] invert" :
                                cameraFilters[m.id] === "biometric" ? "brightness-[1.1] sepia" : ""
                              }`}
                            />
                            <div className="absolute bottom-1.5 right-1.5 bg-emerald-500 text-slate-950 text-[6.5px] font-mono font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow z-10 flex items-center gap-1 animate-pulse">
                              <span className="w-1.5 h-1.5 bg-slate-950 rounded-full" />
                              LIVE FEED
                            </div>
                          </div>
                        ) : broadcastRealCam ? (
                          <SharedVideoFeed stream={realMediaStream} filter={cameraFilters[m.id] || "normal"} />
                        ) : (
                          /* Standard Simulated Tracker nodes with custom filters classes applied */
                          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                            cameraFilters[m.id] === "infrared" ? "brightness-[1.15] grayscale contrast-[1.1] bg-teal-950/20" :
                            cameraFilters[m.id] === "matrix" ? "brightness-[0.9] saturate-[0.8] contrast-[1.3] sepia hue-rotate-[90deg] bg-emerald-950/25" :
                            cameraFilters[m.id] === "thermal" ? "hue-rotate-[190deg] saturate-[2.4] contrast-[1.2] invert bg-blue-950/30" :
                            cameraFilters[m.id] === "biometric" ? "brightness-[1.1] sepia bg-amber-950/15" : ""
                          }`}>
                            <div className="w-16 h-16 rounded-full border border-slate-800/80 relative flex items-center justify-center animate-pulse">
                              <div 
                                className="absolute rounded-full border border-indigo-500/20 transition-all duration-300 animate-ping"
                                style={{ 
                                  inset: `${8 - Math.min(8, m.audioLevel * 0.45)}px`
                                }} 
                              />
                              <div className="absolute w-2 h-2 rounded-full bg-indigo-550/40" />

                              {/* Landmarks tracking lines */}
                              <div className="absolute w-1 h-1 rounded-full bg-emerald-400/80 -top-2 left-4" />
                              <div className="absolute w-1 h-1 rounded-full bg-emerald-400/80 top-8 -left-2" />
                              <div className="absolute w-1 h-1 rounded-full bg-emerald-400/80 top-8 -right-2" />
                              <div className="absolute w-1 h-1 rounded-full bg-emerald-400/80 bottom-0 left-6" />
                            </div>
                          </div>
                        )}

                        {/* Captured Selfie Thumbnail Indicator overlay */}
                        {capturedSelfies[m.id] && (
                          <div className="absolute bottom-6 right-1.5 bg-emerald-500/10 hover:bg-emerald-505/20 border border-emerald-500/30 text-emerald-400 text-[6.5px] font-mono font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-lg z-25 flex items-center gap-1">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                            PHOTO SECURED
                          </div>
                        )}

                        {/* Bottom Status bar overlays inside candidate map */}
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 z-20 flex items-center justify-between pointer-events-none">
                          <span className="bg-black/80 font-mono text-[7px] text-slate-400 px-1 py-0.5 rounded uppercase">
                            C-{m.index} INDEXED
                          </span>

                          <span className={`font-mono text-[7px] font-bold px-1 py-0.5 rounded ${
                            m.isAlerting 
                              ? "bg-red-500/20 text-red-400 border border-red-500/10" 
                              : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/10"
                          }`}>
                            INTEG: {m.complianceScore}%
                          </span>
                        </div>
                      </div>

                      {/* Candidate Metadata Summary */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-200 line-clamp-1 truncate font-display">
                            {m.candidateName}
                          </h4>
                          <span className="text-[8px] font-mono text-slate-500 shrink-0 block">
                            PITCH SECURE
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-450 line-clamp-1 leading-none font-light">
                          {m.role}
                        </p>
                      </div>

                      {/* Terminal Real-time Dictation Text Stream */}
                      <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-900 h-14 overflow-hidden text-left relative flex flex-col justify-between">
                        <p className="text-[9.5px] italic text-slate-300 leading-normal line-clamp-2">
                          {m.currentText ? (
                            <>
                              {m.currentText}
                              <span className="text-indigo-400 animate-pulse font-bold font-mono">_</span>
                            </>
                          ) : (
                            <span className="text-slate-600 block">[Node Listening...]</span>
                          )}
                        </p>
                        
                        {/* Audio bounce strip in card footer channel */}
                        {m.isActiveSpeaker && (
                          <div className="flex items-center gap-0.5 h-1.5 mt-1.5">
                            {[...Array(6)].map((_, bi) => (
                              <span 
                                key={bi} 
                                className="w-[1.5px] bg-indigo-500 rounded-full" 
                                style={{ 
                                  height: `${Math.floor(m.audioLevel * (0.3 + (bi * 0.15)))}px`,
                                  maxHeight: "100%",
                                  transition: "height 0.1s ease"
                                }} 
                              />
                            ))}
                          </div>
                        )}
                      </div>                      {/* Audio & Webcam interactive control toolbelt for each card */}
                      <div className="flex items-center justify-between border-t border-slate-900/60 pt-2 shrink-0">
                        <span className="text-[8px] font-mono text-slate-550 uppercase">
                          Surveillance Ch {m.index}
                        </span>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          
                          {/* Webcam Feature 1: Camera Mute Toggle */}
                          <button
                            type="button"
                            onClick={() => setCamerasMuted(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                            className={`p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer shrink-0`}
                            title={camerasMuted[m.id] ? "Activate candidate camera node feed" : "Suspend candidate camera node feed"}
                          >
                            {camerasMuted[m.id] ? (
                              <VideoOff className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                            ) : (
                              <Video className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-400" />
                            )}
                          </button>

                          {/* Webcam Feature 2: Visual Filters Rotation Toggle */}
                          <button
                            type="button"
                            disabled={!!camerasMuted[m.id]}
                            onClick={() => {
                              const filters: ("normal" | "infrared" | "matrix" | "thermal" | "biometric")[] = ["normal", "infrared", "matrix", "thermal", "biometric"];
                              const current = cameraFilters[m.id] || "normal";
                              const nextIdx = (filters.indexOf(current) + 1) % filters.length;
                              setCameraFilters(prev => ({ ...prev, [m.id]: filters[nextIdx] }));
                            }}
                            className={`p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer shrink-0 disabled:opacity-30 disabled:pointer-events-none`}
                            title={`Visual lens filter (Active: ${cameraFilters[m.id] || "normal"})`}
                          >
                            <Sliders className={`w-3.5 h-3.5 ${cameraFilters[m.id] && cameraFilters[m.id] !== "normal" ? "text-indigo-400" : "text-slate-400 hover:text-indigo-400"}`} />
                          </button>

                          {/* Webcam Feature 3: Biometric Snapshot Capture */}
                          <button
                            type="button"
                            disabled={!!camerasMuted[m.id]}
                            onClick={() => {
                              setCapturedFlashing(prev => ({ ...prev, [m.id]: true }));
                              setTimeout(() => {
                                setCapturedFlashing(prev => ({ ...prev, [m.id]: false }));
                                setCapturedSelfies(prev => ({ ...prev, [m.id]: "secured" }));
                              }, 300);
                            }}
                            className={`p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer shrink-0 disabled:opacity-30 disabled:pointer-events-none`}
                            title="Snapshot candidate security scan profile"
                          >
                            <Camera className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-400" />
                          </button>

                          {/* Webcam Feature 4: Copy Secure Cohort Expiring Invite Link */}
                          <button
                            type="button"
                            onClick={() => {
                              const inviteUrl = `${getAppBaseUrl()}/#/invite/sim-candidate-${m.index}`;
                              navigator.clipboard.writeText(inviteUrl);
                              setCopiedBulkInviteId(m.id);
                              setTimeout(() => setCopiedBulkInviteId(null), 2000);
                            }}
                            className={`p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer shrink-0`}
                            title="Copy candidate expiring session invite link"
                          >
                            {copiedBulkInviteId === m.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                            ) : (
                              <Link className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-400" />
                            )}
                          </button>

                          {/* Listen Aloud Button - plays standard web synthesis voice */}
                          <button
                            type="button"
                            onClick={() => handleSoloVoice(m.id, m.candidateName, m.sentence)}
                            className={`px-2 h-6 rounded flex items-center gap-1 font-mono text-[8.5px] uppercase font-bold tracking-wider transition-all cursor-pointer ${
                              isSoloAudio 
                                ? "bg-indigo-505 text-white font-black animate-pulse animate-[pulse_1s_infinite]" 
                                : "bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-indigo-300"
                            }`}
                            title={isSoloAudio ? "Mute candidate voice" : "Solo listen candidates audio live"}
                          >
                            {isSoloAudio ? (
                              <>
                                <Volume2 className="w-2.5 h-2.5" />
                                Listening
                              </>
                            ) : (
                              <>
                                <VolumeX className="w-2.5 h-2.5 text-slate-600" />
                                Solo
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls bar */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-slate-900/30 p-3 rounded-xl border border-slate-900 font-mono text-[10px] text-slate-500">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3 h-8 rounded-lg border border-slate-850 bg-slate-950/40 hover:bg-slate-900 hover:text-white disabled:opacity-30 disabled:pointer-events-none text-slate-300 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>

                <span className="font-bold">
                  Page {currentPage} of {totalPages} &bull; showing {startIndex + 1} - {Math.min(totalItems, startIndex + pageSize)} of {totalItems} channels
                </span>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-3 h-8 rounded-lg border border-slate-850 bg-slate-950/40 hover:bg-slate-900 hover:text-white disabled:opacity-30 disabled:pointer-events-none text-slate-300 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

          </div>

          {/* RIGHT COL: MASSIVE FOCUS BIOMETRICS BIOTELEMETRY SCREEN */}
          <div className="w-full xl:w-96 bg-slate-950/80 p-5 space-y-5 flex flex-col justify-between text-left">
            
            {focusedCandidate ? (
              <div className="space-y-5">
                <div className="border-b border-slate-900 pb-3">
                  <span className="text-[10px] font-mono text-indigo-400 uppercase font-black block tracking-widest leading-none mb-1">
                    Biometric Focus Feed
                  </span>
                  <h4 className="text-sm font-bold text-white font-display">
                    {focusedCandidate.candidateName}
                  </h4>
                  <p className="text-[11px] text-slate-450 leading-tight">
                    {focusedCandidate.role} &bull; Candidate Node {focusedCandidate.index}
                  </p>
                </div>

                {/* Simulated Webcam detailed frame container */}
                <div className="relative aspect-video rounded-xl bg-black border border-slate-850 overflow-hidden flex items-center justify-center">
                  
                  {/* Outer telemetry targets overlays */}
                  <div className="absolute inset-3 border border-indigo-400/5 pointer-events-none flex items-center justify-center">
                    <div className="w-8 h-8 border-t border-l border-indigo-400/20 absolute top-0 left-0" />
                    <div className="w-8 h-8 border-t border-r border-indigo-400/20 absolute top-0 right-0" />
                    <div className="w-8 h-8 border-b border-l border-indigo-400/20 absolute bottom-0 left-0" />
                    <div className="w-8 h-8 border-b border-r border-indigo-400/20 absolute bottom-0 right-0" />
                  </div>

                  <div className="absolute top-2.5 left-2.5 font-mono text-[8.5px] text-slate-400 bg-black/70 px-1.5 py-0.5 rounded tracking-widest z-20">
                    PITCH FREQ DECODE • OPUS_48K
                  </div>

                  {/* Scan Flash Photographic capture overlay info */}
                  {capturedFlashing[focusedCandidate.id] && (
                    <div className="absolute inset-0 bg-white z-50 animate-pulse pointer-events-none" />
                  )}

                  {/* Active Rendering Block based on camera status inside big focus monitor */}
                  {camerasMuted[focusedCandidate.id] ? (
                    <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-2 z-15 transition-all">
                      <VideoOff className="w-6 h-6 text-rose-500 animate-pulse" />
                      <span className="text-[8px] font-mono text-rose-400 font-extrabold uppercase tracking-widest leading-none">C-NODE SUSPENDED BY ADMIN</span>
                    </div>
                  ) : activeCandidateStreams[focusedCandidate.id]?.frame ? (
                    <div className="absolute inset-0 w-full h-full bg-slate-950">
                      <img 
                        src={activeCandidateStreams[focusedCandidate.id].frame} 
                        alt="Live Candidate Webcam" 
                        referrerPolicy="no-referrer"
                        className={`w-full h-full object-cover transition-all duration-300 scale-x-[-1] ${
                          (cameraFilters[focusedCandidate.id] || "normal") === "infrared" ? "brightness-[1.15] grayscale contrast-[1.1]" :
                          (cameraFilters[focusedCandidate.id] || "normal") === "matrix" ? "brightness-[0.9] saturate-[0.8] contrast-[1.3] sepia hue-rotate-[90deg]" :
                          (cameraFilters[focusedCandidate.id] || "normal") === "thermal" ? "hue-rotate-[190deg] saturate-[2.4] contrast-[1.2] invert" :
                          (cameraFilters[focusedCandidate.id] || "normal") === "biometric" ? "brightness-[1.1] sepia" : ""
                        }`}
                      />
                      <div className="absolute bottom-2.5 right-2.5 bg-emerald-500 text-slate-950 text-[7px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded shadow z-10 flex items-center gap-1.5 animate-pulse">
                        <span className="w-1.5 h-1.5 bg-slate-950 rounded-full" />
                        LIVE STREAM FEED
                      </div>
                    </div>
                  ) : broadcastRealCam ? (
                    <SharedVideoFeed stream={realMediaStream} filter={cameraFilters[focusedCandidate.id] || "normal"} />
                  ) : (
                    /* High tech face vector display mesh simulation that responds live to audioLevel or speaking states of clicked student */
                    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                      (cameraFilters[focusedCandidate.id] || "normal") === "infrared" ? "brightness-[1.15] grayscale contrast-[1.1] bg-teal-950/20" :
                      (cameraFilters[focusedCandidate.id] || "normal") === "matrix" ? "brightness-[0.9] saturate-[0.8] contrast-[1.3] sepia hue-rotate-[90deg] bg-emerald-950/25" :
                      (cameraFilters[focusedCandidate.id] || "normal") === "thermal" ? "hue-rotate-[190deg] saturate-[2.4] contrast-[1.2] invert bg-blue-950/30" :
                      (cameraFilters[focusedCandidate.id] || "normal") === "biometric" ? "brightness-[1.1] sepia bg-amber-950/15" : "bg-slate-950"
                    }`}>
                      {/* Interactive talking grid simulation vector */}
                      <div className="relative flex flex-col items-center justify-center space-y-2 p-4 z-10">
                        {/* Biometric SVG mapping wireframe */}
                        <svg viewBox="0 0 100 100" className={`w-24 h-24 select-none pointer-events-none drop-shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-colors duration-300 ${
                          (cameraFilters[focusedCandidate.id] || "normal") === "infrared" ? "text-teal-400" :
                          (cameraFilters[focusedCandidate.id] || "normal") === "matrix" ? "text-emerald-400" :
                          (cameraFilters[focusedCandidate.id] || "normal") === "thermal" ? "text-cyan-400" :
                          (cameraFilters[focusedCandidate.id] || "normal") === "biometric" ? "text-amber-500" : "text-indigo-400"
                        }`}>
                          <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="0.1" strokeDasharray="2 2" className="opacity-30" />
                          <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="0.1" strokeDasharray="2 2" className="opacity-30" />

                          {/* Face contour lines */}
                          <ellipse cx="50" cy="50" rx="28" ry="36" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 2" className="opacity-55" />
                          <ellipse cx="50" cy="50" rx="25" ry="33" fill="none" stroke="currentColor" strokeWidth="1.2" className="opacity-95" />

                          {/* Dynamic laser scanline sweep up & down */}
                          <line 
                            x1="22" 
                            y1="50" 
                            x2="78" 
                            y2="50" 
                            stroke={(cameraFilters[focusedCandidate.id] || "normal") === "infrared" ? "#2dd4bf" : (cameraFilters[focusedCandidate.id] || "normal") === "matrix" ? "#34d399" : (cameraFilters[focusedCandidate.id] || "normal") === "thermal" ? "#22d3ee" : (cameraFilters[focusedCandidate.id] || "normal") === "biometric" ? "#fbbf24" : "#818cf8"} 
                            strokeWidth="1.5" 
                            className="animate-[bounce_3.5s_infinite]" 
                          />

                          {/* Left eye circle & blinking inner dot */}
                          <circle cx="41" cy="42" r="3.5" fill="none" stroke="currentColor" strokeWidth="1" />
                          <circle cx="41" cy="42" r="1" fill="currentColor" />

                          {/* Right eye circle & blinking inner dot */}
                          <circle cx="59" cy="42" r="3.5" fill="none" stroke="currentColor" strokeWidth="1" />
                          <circle cx="59" cy="42" r="1" fill="currentColor" />

                          {/* Face nose bridge coordinates */}
                          <path d="M50 39 L50 55 L47 55" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />

                          {/* Interactive Talking Mouth shape synced dynamically to student's live audio level & speaking states */}
                          <path 
                            d={`M 39 67 Q 50 ${67 + (focusedCandidate.isActiveSpeaker ? Math.min(12, focusedCandidate.audioLevel * 1.4) : 0)} 61 67`} 
                            fill="none" 
                            stroke={focusedCandidate.isActiveSpeaker ? "#34d399" : "currentColor"} 
                            strokeWidth="2.2" 
                            strokeLinecap="round" 
                          />

                          {/* Landmarks and tracking dots overlay */}
                          <circle cx="34" cy="30" r="1" fill="currentColor" className="opacity-70" />
                          <circle cx="66" cy="30" r="1" fill="currentColor" className="opacity-70" />
                          <circle cx="50" cy="20" r="1.5" fill="currentColor" />
                          <circle cx="28" cy="50" r="1.5" fill="currentColor" />
                          <circle cx="72" cy="50" r="1.5" fill="currentColor" />
                          <circle cx="50" cy="80" r="1.5" fill="currentColor" />
                        </svg>

                        <span className="font-mono text-[8px] text-slate-400 block tracking-wider font-extrabold uppercase animate-pulse">
                          {focusedCandidate.isActiveSpeaker ? "🔉 TRANSMITTING VOCAL DECODE" : "🎙️ NODE_BIOMETRIC_IDLE_OK"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Captured Static Selfie thumbnail overlay preview on right side */}
                  {capturedSelfies[focusedCandidate.id] && (
                    <div className="absolute top-10 right-2.5 bg-emerald-500/10 hover:bg-emerald-505/20 border border-emerald-500/30 text-emerald-400 text-[6.5px] font-mono font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-lg z-25 flex items-center gap-1">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      Biometric Captured Sec
                    </div>
                  )}

                  {/* Latency and FPS strip overlay in focus camera */}
                  <div className="absolute bottom-2 left-2.5 right-2.5 z-20 flex justify-between font-mono text-[7.5px] text-slate-500 uppercase">
                    <span>latency: 12ms</span>
                    <span>encoding: opus @ 32kbps</span>
                    <span>quality: high-fidelity</span>
                  </div>
                </div>

                {/* Subtitle active text focused block */}
                <div className="p-4 bg-slate-900/80 border border-slate-850 rounded-xl space-y-2">
                  <div className="flex justify-between items-center border-b border-slate-850/60 pb-2">
                    <span className="text-[9.5px] font-mono text-slate-450 block font-bold uppercase tracking-widest">
                      Spoken Transcript Stream
                    </span>
                    <span className="text-[8.5px] bg-indigo-500/10 text-indigo-400 font-mono px-2 py-0.5 rounded border border-indigo-500/10 uppercase tracking-widest leading-none font-bold">
                      UTF-8 Sync
                    </span>
                  </div>
                  <p className="text-xs italic text-slate-200 leading-relaxed">
                    {focusedCandidate.currentText ? (
                      <>
                        &ldquo;{focusedCandidate.currentText}&rdquo;
                        <span className="text-indigo-400 font-black animate-pulse">_</span>
                      </>
                    ) : (
                      <span className="text-slate-500">[Candidate is currently pausing or listening to interviewer questions...]</span>
                    )}
                  </p>
                </div>

                {/* Compliance Radar specs */}
                <div className="space-y-2 text-xs">
                  <span className="text-[9.5px] font-mono text-slate-450 uppercase block font-bold tracking-widest">
                    Vocal Integrity telemetry
                  </span>
                  
                  <div className="p-3 bg-slate-900/30 rounded-xl border border-slate-850 space-y-2 font-mono text-[10.5px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Confidence Match:</span>
                      <span className="text-slate-200">98.4% Secure</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Audio Quality:</span>
                      <span className="text-emerald-400 font-bold">High (Opus)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Biometric Sync:</span>
                      <span className="text-emerald-500">Face Calibrated</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Alerts Flagged:</span>
                      <span className={focusedCandidate.isAlerting ? "text-amber-400 font-bold animate-pulse" : "text-slate-520 font-bold"}>
                        {focusedCandidate.isAlerting ? "DEVIA_COMP_ERR" : "None Detected"}
                      </span>
                    </div>
                    {focusedCandidate.isAlerting && (
                      <div className="pt-1 border-t border-slate-800/80 text-[9px] text-amber-500 italic leading-none">
                        Alert Source: {focusedCandidate.alertType}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="py-24 text-center text-slate-600 font-mono text-xs">
                Select a candidate card to focus telemetry feed
              </div>
            )}

            {/* Heed candidate voice action CTA */}
            {focusedCandidate && (
              <div className="pt-4 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => handleSoloVoice(focusedCandidate.id, focusedCandidate.candidateName, focusedCandidate.sentence)}
                  className={`w-full h-10 rounded-lg flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    soloAudioCandidateId === focusedCandidate.id
                      ? "bg-rose-500 hover:bg-rose-450 text-slate-950 font-black shadow"
                      : "bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black shadow shadow-indigo-500/10"
                  }`}
                >
                  {soloAudioCandidateId === focusedCandidate.id ? (
                    <>
                      <VolumeX className="w-4 h-4 text-slate-950" />
                      Mute Solo Candidate Feed
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 text-slate-950" />
                      Solo Candidate Vocal Stream
                    </>
                  )}
                </button>
              </div>
            )}

          </div>

        </div>
      ) : (
        /* RENDER ORIGINAL SINGLE CANDIDATE SURVEILLANCE FEED */
        <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
          
          {/* Left Col (8 spans): Live stream feed and current question */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Live Camera Feed Container */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-850 flex flex-col justify-between shadow-inner">
              
              {/* Metadata Overlays in monitor screen */}
              <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none select-none">
                <span className="px-2 py-1 rounded bg-black/75 backdrop-blur-sm border border-slate-850 font-mono text-[9px] text-slate-300 uppercase tracking-widest flex items-center gap-1">
                  <Video className="w-3 h-3 text-red-500" />
                  CAM_01 • PREVIEWFEED
                </span>

                <span className="px-2 py-1 rounded bg-black/75 backdrop-blur-sm border border-slate-880 font-mono text-[9px] text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  FPS OVERLAY • 30HZ
                </span>
              </div>

              {/* Simulated crosshair or scanning overlay */}
              <div className="absolute inset-0 border border-slate-500/5 m-4 pointer-events-none flex items-center justify-center">
                <div className="w-6 h-6 border-t border-l border-slate-400/20 absolute top-0 left-0" />
                <div className="w-6 h-6 border-t border-r border-slate-400/20 absolute top-0 right-0" />
                <div className="w-6 h-6 border-b border-l border-slate-400/20 absolute bottom-0 left-0" />
                <div className="w-6 h-6 border-b border-r border-slate-400/20 absolute bottom-0 right-0" />
              </div>

              {/* Video feed image/frames or placeholder */}
              {liveSession.cameraActive && liveCameraFrame ? (
                <img
                  src={liveCameraFrame}
                  alt="Live Candidate Webcam Feed"
                  className="w-full h-full object-cover select-none pointer-events-none"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-3">
                  <Video className="w-12 h-12 text-slate-800 animate-pulse" />
                  <div className="text-center">
                    <span className="font-mono text-xs font-semibold text-slate-400 block uppercase">
                      Candidate Webcam Screen Disabled
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono block mt-1">
                      Candidate stream is sound-only or awaiting camera permissions toggle.
                    </span>
                  </div>
                </div>
              )}

              {/* Bottom Status bar overlays inside video */}
              <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none select-none">
                <div className="px-2.5 py-1 rounded bg-black/75 backdrop-blur-sm border border-slate-800 font-mono text-[9px] text-emerald-400 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                  <Users className="w-3.5 h-3.5 text-emerald-500" />
                  Live Candidate: {liveSession.candidateName}
                </div>
                
                <div className={`px-2.5 py-1 rounded border font-mono text-[9px] flex items-center gap-1.5 uppercase font-bold ${getRecordingStatePill(liveSession.recordingState).class}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${getRecordingStatePill(liveSession.recordingState).dot}`} />
                  {getRecordingStatePill(liveSession.recordingState).text}
                </div>
              </div>

            </div>

            {/* Active Question Statement Overlay */}
            <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl space-y-1.5 font-sans">
              <div className="flex items-center gap-2 justify-between">
                <span className="text-[9px] font-mono text-slate-500 uppercase font-black tracking-wider block">
                  Current Question Progress ({liveSession.currentQuestionIdx} / {liveSession.totalQuestions})
                </span>
                <span className="text-[9px] font-mono text-emerald-400 block bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                  Evaluating Role: {liveSession.role}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 font-medium italic leading-relaxed">
                &ldquo;{liveSession.currentQuestion}&rdquo;
              </p>
            </div>

          </div>

          {/* Right Col (5 spans): Live speaking transcription and analytics */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            
            <div className="flex-1 min-h-[220px] p-4 bg-slate-950 border border-slate-900 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-900 pb-2.5 mb-3">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-extrabold tracking-widest flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-teal-400" />
                    Live Transcript Feed
                  </span>
                  <span className="text-[8px] bg-slate-900 font-mono text-slate-500 px-1.5 py-0.5 rounded">
                    UTF-8 DECODE
                  </span>
                </div>

                {/* Transcription container */}
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {liveSession.liveSpeechText || liveSession.interimSpeechText ? (
                    <div className="text-xs leading-relaxed space-y-2 text-slate-300 font-light">
                      <p className="italic font-sans">
                        {liveSession.liveSpeechText}
                        {liveSession.interimSpeechText && (
                          <span className="text-emerald-400 font-normal italic animate-pulse">
                            {" "}{liveSession.interimSpeechText}...
                          </span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="h-28 flex flex-col items-center justify-center text-center space-y-2">
                      <div className="flex gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-800 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-800 animate-bounce delay-100" />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-800 animate-bounce delay-200" />
                      </div>
                      <span className="text-[10px] font-mono text-slate-600 uppercase">
                        Silence detected • Speaking logs feed idle
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Live waveform simulation */}
              {liveSession.recordingState === "listening" && (
                <div className="pt-3 border-t border-slate-900/40 flex items-center justify-between text-[9px] font-mono text-slate-500">
                  <span>Audio Device level: Excellent</span>
                  <div className="flex items-center gap-0.5 h-4">
                    {[...Array(9)].map((_, i) => (
                      <span 
                        key={i} 
                        className="w-[2px] bg-emerald-500 rounded" 
                        style={{ 
                          height: `${Math.sin(i * 0.5) * 8 + 10}px`,
                          animation: `pulse 0.4s ease-in-out infinite alternate`,
                          animationDelay: `${i * 0.05}s`
                        }} 
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick System Action Alerts */}
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-2 text-[10px] sm:text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                Secure Monitor Synced
              </div>
              <p className="text-slate-400 font-sans font-light leading-relaxed">
                This monitoring hub uses synchronized browser context nodes to mirror streaming frames. Recruiters can view responses real-time, matching spoken sentences precisely as the candidate progresses.
              </p>
            </div>

          </div>

        </div>
      )}
    </motion.div>
  );
}
