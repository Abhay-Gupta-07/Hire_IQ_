import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowLeft, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Volume2, 
  VolumeX, 
  Play, 
  Square, 
  RefreshCw, 
  Check, 
  Loader2, 
  Camera, 
  AlertCircle,
  HelpCircle,
  Sparkles,
  Award,
  ArrowRight,
  Clock,
  XCircle,
  Activity,
  CheckSquare
} from "lucide-react";
import { Interview, InterviewQuestion, ResumeData } from "../types";
import { mockDb } from "../lib/mockDb";
import { supabase } from "../lib/supabaseClient";
import { convertWebmToWav } from "../lib/wavEncoder";
import { videoDb } from "../lib/videoDb";
import { MCQQuestion, getRandomMCQSelection } from "../lib/mcqPool";

const getSupportedVideoMimeType = () => {
  if (typeof MediaRecorder === "undefined") return "";
  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4;codecs=avc1,mp4a",
    "video/mp4"
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return "";
};


interface InterviewRoomProps {
  interviewId: string;
  onNavigate: (path: string) => void;
  theme?: "dark" | "light";
}

function sendLiveStreamHeartbeat(payload: any) {
  fetch("/api/live-stream/heartbeat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(() => {});
}

export default function InterviewRoom({ interviewId, onNavigate, theme = "dark" }: InterviewRoomProps) {
  const isLight = theme === "light";
  const [interview, setInterview] = useState<Interview | null>(null);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [selectedMcqOptionIdx, setSelectedMcqOptionIdx] = useState<number | null>(null);
  
  // UI states
  const [isUnlocked, setIsUnlocked] = useState(false);
  
  // Coding MCQ states
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([]);
  const [mcqStep, setMcqStep] = useState<"not_started" | "active" | "completed">("not_started");
  const [currentMcqIdx, setCurrentMcqIdx] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number>>({});
  const [mcqSelectedOption, setMcqSelectedOption] = useState<number | null>(null);
  const [mcqFinalScore, setMcqFinalScore] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [isKeyboardFallback, setIsKeyboardFallback] = useState(false);
  
  // Timer & Session discontinuation states
  const [timeLeft, setTimeLeft] = useState(60);
  const [confirmEndInterview, setConfirmEndInterview] = useState(false);
  
  // New States for Secure Recruiter Proctoring & Biometrics
  const [selfieCaptured, setSelfieCaptured] = useState(false);
  const [candidateSelfie, setCandidateSelfie] = useState<string>("");
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [violationsLog, setViolationsLog] = useState<string[]>([]);
  const [detectionAlert, setDetectionAlert] = useState<string>("");
  const [cocoModelLoading, setCocoModelLoading] = useState(false);
  const [cocoModel, setCocoModel] = useState<any>(null);
  const [snapshotErrorText, setSnapshotErrorText] = useState("");
  const [isCheckingSnapshot, setIsCheckingSnapshot] = useState(false);

  // Fallbacks & Simulated webcam modes
  const [isOfflineFallbackMode, setIsOfflineFallbackMode] = useState(false);
  const [isSimulatedCamera, setIsSimulatedCamera] = useState(false);
  const [canUseBypass, setCanUseBypass] = useState(false);
  const [dictationFinished, setDictationFinished] = useState(false);
  const simulatedCameraLoopRef = useRef<boolean>(false);

  // Poll for external COCO-SSD script availability and gracefully load it free from bundle overheads
  useEffect(() => {
    let active = true;
    const loadModel = async () => {
      const win = window as any;
      if (!win.cocoSsd || !win.tf) {
        console.log("Waiting for TensorFlow or COCO-SSD scripts to mount...");
        return;
      }
      try {
        setCocoModelLoading(true);
        const model = await win.cocoSsd.load();
        if (active) {
          setCocoModel(model);
          console.log("Integrity Scanner: COCO-SSD model initialized successfully!");
        }
      } catch (err) {
        console.warn("Integrity Scanner: COCO-SSD loading failure, falling back: ", err);
      } finally {
        if (active) setCocoModelLoading(false);
      }
    };

    const timer = setInterval(() => {
      const win = window as any;
      if (win.cocoSsd && win.tf && !cocoModel) {
        loadModel();
        clearInterval(timer);
      }
    }, 1000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [cocoModel]);

  // Object Warning Frame Analyzer loop run on a CPU-safe periodic stream interval (1200ms)
  useEffect(() => {
    if (!cocoModel || !cameraActive || !isUnlocked || !videoRef.current) return;

    const intervalId = setInterval(async () => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        try {
          const preds = await cocoModel.detect(videoRef.current);
          const people = preds.filter((p: any) => p.class === "person");
          const phones = preds.filter((p: any) => p.class === "cell phone" || p.class === "phone" || p.class === "book" || p.class === "remote");

          let alertMsg = "";
          let violationTriggered = false;

          const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator?.userAgent || "");

          if (phones.length > 0) {
            alertMsg = "SECURITY WARNING: Cell phone / secondary device detected in camera frame!";
            violationTriggered = true;
          } else if (people.length > 1) {
            alertMsg = "SECURITY WARNING: Multiple persons detected in frame! Maintain candidate privacy.";
            violationTriggered = true;
          } else if (people.length === 0 && !isMobileDevice) {
            alertMsg = "SECURITY WARNING: Candidate not detected! Please face the webcam during questions.";
            violationTriggered = true;
          }

          if (violationTriggered && alertMsg) {
            setDetectionAlert(alertMsg);
            const timeStr = new Date().toLocaleTimeString();
            const logEntry = `[${timeStr}] ${alertMsg}`;
            
            setViolationsLog((prev) => {
              if (prev.includes(logEntry)) return prev;
              const updated = [...prev, logEntry];
              // Persist locally
              if (interview) {
                mockDb.updateInterview({
                  ...interview,
                  violations_log: updated
                });
              }
              return updated;
            });

            // Auto fade notification alert display
            setTimeout(() => {
              setDetectionAlert((curr) => curr === alertMsg ? "" : curr);
            }, 4500);
          }
        } catch (e) {
          console.warn("Webcam frame object scanning metrics bypass:", e);
        }
      }
    }, 1500);

    return () => clearInterval(intervalId);
  }, [cocoModel, cameraActive, isUnlocked, interview]);

  // User Tab switcher trigger event listener logs
  useEffect(() => {
    if (!isUnlocked || !interview) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        triggerTabSwitchViolation("Document Hidden (User navigated away / switched tabs/minimized window)");
      }
    };

    const handleWindowBlur = () => {
      triggerTabSwitchViolation("Window Blurred (User clicked out of focal window panel)");
    };

    const triggerTabSwitchViolation = (reason: string) => {
      const timeStr = new Date().toLocaleTimeString();
      const alertMsg = `ACTIVITY WARNING: Tab switch/screen activity change detected! (${reason})`;
      setDetectionAlert(alertMsg);
      
      setTabSwitchCount((c) => {
        const nextCount = c + 1;
        if (interview) {
          mockDb.updateInterview({
            ...interview,
            tab_switch_count: nextCount
          });
        }
        return nextCount;
      });

      setViolationsLog((prev) => {
        const logEntry = `[${timeStr}] ${alertMsg}`;
        const updated = [...prev, logEntry];
        if (interview) {
          mockDb.updateInterview({
            ...interview,
            violations_log: updated,
            tab_switch_count: (interview.tab_switch_count || 0) + 1
          });
        }
        return updated;
      });

      setTimeout(() => {
        setDetectionAlert((curr) => curr === alertMsg ? "" : curr);
      }, 5000);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [isUnlocked, interview]);

  // Capture static image selfie from the video feed stream with biometrics validation
  const handleCaptureSelfie = async () => {
    if (!videoRef.current || !cameraActive) return;

    setSnapshotErrorText("");
    setIsCheckingSnapshot(true);

    try {
      // 1. Ensure COCO-SSD model is loaded
      let activeModel = cocoModel;
      const win = window as any;
      if (!activeModel && win.cocoSsd) {
        try {
          console.log("On-demand loading COCO-SSD for snapshot verification...");
          activeModel = await win.cocoSsd.load();
          setCocoModel(activeModel);
        } catch (loadErr) {
          console.warn("Failed to on-demand load COCO-SSD model:", loadErr);
        }
      }

      // Create snapshot canvas
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Could not acquire 2D drawing context for canvas.");
      }

      // Draw unmirrored image
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      // 2. Perform biometrics validation if model is available and not on mobile devices
      if (activeModel && !isMobileDevice) {
        // Detect on the CANVAS instead of the raw <video> element (incredibly robust for Android!)
        const preds = await activeModel.detect(canvas);
        const people = preds.filter((p: any) => p.class === "person");

        if (people.length === 0) {
          setSnapshotErrorText("No candidate was detected in the snapshot. Please look straight into your webcam and ensure proper lighting before retaking.");
          setIsCheckingSnapshot(false);
          return;
        } else if (people.length > 1) {
          setSnapshotErrorText(`Multiple people detected in the snapshot (${people.length} persons found). Please ensure you are alone in the frame and retake the snapshot.`);
          setIsCheckingSnapshot(false);
          return;
        }
      } else {
        if (isMobileDevice) {
          console.log("Biometrics COCO-SSD person filter bypassed on mobile device selfie.");
        } else {
          console.warn("Model validation bypassed because cocoModel is not ready yet.");
        }
      }

      // 3. Complete the capture
      setCandidateSelfie(dataUrl);
      setSelfieCaptured(true);
      setSnapshotErrorText("");
      setErrorText("");

      if (interview) {
        mockDb.updateInterview({
          ...interview,
          candidate_selfie: dataUrl
        });
      }
    } catch (e) {
      console.error("Selfie image draw or validation failure:", e);
      setSnapshotErrorText("Captured frame was blocked or face validation failed. Please position yourself correctly and retry.");
    } finally {
      setIsCheckingSnapshot(false);
    }
  };

  // Skip AI matching and force capturing selfie for mobile/troubleshooting overrides
  const handleForceCaptureSelfie = () => {
    if (!videoRef.current || !cameraActive) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not acquire 2D context");
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

      setCandidateSelfie(dataUrl);
      setSelfieCaptured(true);
      setSnapshotErrorText("");
      setErrorText("");

      if (interview) {
        mockDb.updateInterview({
          ...interview,
          candidate_selfie: dataUrl
        });
      }
    } catch (err) {
      console.error("Force selfie capture error:", err);
    }
  };
  
  // Mic recording state (Idle, Listening, Transcribing, Done)
  const [recordingState, setRecordingState] = useState<"idle" | "listening" | "transcribing" | "done">("idle");
  const [recordedTranscript, setRecordedTranscript] = useState("");
  
  // Real-time speech recognition states
  const [liveSpeechText, setLiveSpeechText] = useState("");
  const [interimSpeechText, setInterimSpeechText] = useState("");

  // Synchronize MCQ option selections and auto-select via voice matches
  useEffect(() => {
    setSelectedMcqOptionIdx(null);
  }, [currentQuestion?.id]);

  useEffect(() => {
    if (currentQuestion?.is_mcq && (recordedTranscript || liveSpeechText)) {
      const lower = (recordedTranscript + " " + liveSpeechText).toLowerCase();
      if (lower.includes("option a") || lower.includes("choose a") || lower.includes("select a") || lower.includes("correct option is a") || lower.includes("correct answer is a")) {
        setSelectedMcqOptionIdx(0);
      } else if (lower.includes("option b") || lower.includes("choose b") || lower.includes("select b") || lower.includes("correct option is b") || lower.includes("correct answer is b")) {
        setSelectedMcqOptionIdx(1);
      } else if (lower.includes("option c") || lower.includes("choose c") || lower.includes("select c") || lower.includes("correct option is c") || lower.includes("correct answer is c")) {
        setSelectedMcqOptionIdx(2);
      } else if (lower.includes("option d") || lower.includes("choose d") || lower.includes("select d") || lower.includes("correct option is d") || lower.includes("correct answer is d")) {
        setSelectedMcqOptionIdx(3);
      }
    }
  }, [recordedTranscript, liveSpeechText, currentQuestion]);
  const speechRecognitionRef = useRef<any>(null);
  
  // References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const micStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const baselineTextRef = useRef("");
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const sessionFinalizedTextRef = useRef("");
  const sessionInterimTextRef = useRef("");

  // Keep camera stream playing on videoRef regardless of react state cycle race conditions
  useEffect(() => {
    if (cameraActive && cameraStreamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== cameraStreamRef.current) {
        videoRef.current.srcObject = cameraStreamRef.current;
      }
    }
  }, [cameraActive]);

  // Real-time administrator portal transmission over BroadcastChannel and central server REST API
  useEffect(() => {
    const channel = new BroadcastChannel("vocal_ai_live_stream");

    const sessionPayload = {
      type: "session_info",
      interviewId,
      candidateName: interview?.candidate_name || localStorage.getItem(`candidate_proctor_name_${interviewId}`) || "Live Candidate",
      candidateEmail: interview?.candidate_email || localStorage.getItem(`candidate_proctor_email_${interviewId}`) || "candidate@gmail.com",
      role: interview?.role || "Software Engineer",
      currentQuestion: currentQuestion?.question || "Awaiting setup...",
      currentQuestionIdx: (currentQuestion?.idx ?? 0) + 1,
      totalQuestions: interview?.total_questions || 3,
      recordingState,
      cameraActive,
      liveSpeechText,
      interimSpeechText
    };

    // Send initial notification about current step
    channel.postMessage(sessionPayload);
    sendLiveStreamHeartbeat(sessionPayload);

    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 120;
    const ctx = canvas.getContext("2d");

    const timer = setInterval(() => {
      let base64Frame = "";
      if (videoRef.current && ctx && cameraActive && videoRef.current.readyState >= 2) {
        try {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          base64Frame = canvas.toDataURL("image/jpeg", 0.35);
          
          const framePayload = {
            type: "camera_frame",
            interviewId,
            frame: base64Frame
          };
          channel.postMessage(framePayload);
          sendLiveStreamHeartbeat(framePayload);
        } catch (e) {
          // ignore offscreen or hidden canvas exceptions
        }
      }

      // High-fidelity fallback animated canvas stream if base64Frame is empty
      if (!base64Frame && ctx && cameraActive) {
        try {
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          const t = Date.now() / 300;
          const radius = 25 + Math.sin(t) * 5;
          ctx.beginPath();
          ctx.arc(canvas.width / 2, canvas.height / 2, radius, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
          ctx.stroke();
          
          ctx.beginPath();
          ctx.arc(canvas.width / 2, canvas.height / 2, 8, 0, Math.PI * 2);
          ctx.fillStyle = "#10b981";
          ctx.fill();
          
          const scanY = (canvas.height / 2) + Math.sin(Date.now() / 200) * 40;
          ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
          ctx.beginPath();
          ctx.moveTo(10, scanY);
          ctx.lineTo(canvas.width - 10, scanY);
          ctx.stroke();
          
          ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
          ctx.font = "8px monospace";
          ctx.fillText("LIVE PROCTOR", 12, 18);
          ctx.fillStyle = "#10b981";
          ctx.fillText("ON-AIR", 12, 110);
          
          base64Frame = canvas.toDataURL("image/jpeg", 0.4);
          
          const framePayload = {
            type: "camera_frame",
            interviewId,
            frame: base64Frame
          };
          channel.postMessage(framePayload);
          sendLiveStreamHeartbeat(framePayload);
        } catch (err) {
          // ignore
        }
      }

      // ALSO broadcast to standard recruiter proctoring channel
      try {
        const surveillanceChannel = new BroadcastChannel("hireiq_realtime_surveillance");
        surveillanceChannel.postMessage({
          type: "candidate_feed_update",
          interviewId,
          candidateName: interview?.candidate_name || localStorage.getItem(`candidate_proctor_name_${interviewId}`) || "Live Candidate",
          role: interview?.role || "Software Engineer",
          frame: base64Frame,
          audioLevel: recordingState === "listening" ? Math.floor(Math.random() * 45) + 15 : 4,
          liveSpeech: liveSpeechText || interimSpeechText || "",
          timestamp: Date.now()
        });
        surveillanceChannel.close();
      } catch (err) {
        // ignore
      }
    }, 500);

    return () => {
      clearInterval(timer);
      const endPayload = { type: "session_ended", interviewId };
      channel.postMessage(endPayload);
      sendLiveStreamHeartbeat(endPayload);
      channel.close();
    };
  }, [cameraActive, interview, currentQuestion, recordingState, interviewId, liveSpeechText, interimSpeechText]);

  // Real-time synchronization of candidate dynamic speaking feed
  useEffect(() => {
    const channel = new BroadcastChannel("vocal_ai_live_stream");
    const speechPayload = {
      type: "speech_update",
      interviewId,
      liveSpeechText,
      interimSpeechText
    };
    channel.postMessage(speechPayload);
    sendLiveStreamHeartbeat(speechPayload);
    return () => {
      channel.close();
    };
  }, [liveSpeechText, interimSpeechText, interviewId]);


  useEffect(() => {
    // 1. Fetch interview from DB
    const currentInt = mockDb.getInterviewById(interviewId);
    if (!currentInt) {
      setErrorText("Interview record not found in sandbox storage.");
      return;
    }
    setInterview(currentInt);
    
    // Set logged proctoring metrics
    setTabSwitchCount(currentInt.tab_switch_count || 0);
    setViolationsLog(currentInt.violations_log || []);
    if (currentInt.candidate_selfie) {
      setCandidateSelfie(currentInt.candidate_selfie);
      setSelfieCaptured(true);
    }

    // 2. Fetch associated resume
    if (currentInt.resume_id && currentInt.resume_id !== "no_resume") {
      const currentRes = mockDb.getResumeById(currentInt.resume_id);
      if (currentRes) setResume(currentRes);
    }

    // 3. Fetch pre-existing questions
    const preQuestions = mockDb.getQuestions(interviewId);
    setQuestions(preQuestions);

    // 4. Load or initialize randomized Coding MCQs for this interview (Bypassed)
    setMcqStep("completed");
    setMcqQuestions([]);
    setCurrentMcqIdx(0);
    setMcqAnswers({});
    setMcqFinalScore(100);
  }, [interviewId]);

  // Clean-up refs and streams on unmount
  useEffect(() => {
    return () => {
      stopAllMediaStreams();
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (e) {}
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
    };
  }, []);

  const stopAllMediaStreams = () => {
    simulatedCameraLoopRef.current = false;
    setIsSimulatedCamera(false);
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
      speechRecognitionRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
  };

  const cancelAllSpeakingAndAudio = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
  };

  // Speaks question text out loud using window.speechSynthesis or ElevenLabs Proxy API
  const speakQuestion = async (text: string, onEnd?: () => void) => {
    if (isMuted) {
      if (onEnd) onEnd();
      return;
    }

    cancelAllSpeakingAndAudio();

    const voiceStyle = interview?.preferred_voice || "female";

    // Standard Elevenlabs high-fidelity voice IDs
    // Rachel (female), Adam (male), Charlie (replica)
    const voiceIdMap = {
      female: "21m00Tcm4TlvDq8ikWAM", 
      male: "pNInz6obpg7Ifq7Z0473",
      replica: "IKne3meq5aBn9XLyUdCD"
    };
    const voiceId = voiceIdMap[voiceStyle as keyof typeof voiceIdMap] || "21m00Tcm4TlvDq8ikWAM";

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioURL = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioURL);
        activeAudioRef.current = audio;
        audio.onended = () => {
          if (onEnd) onEnd();
          URL.revokeObjectURL(audioURL);
        };
        audio.onerror = () => {
          console.warn("TTS Audio playback failed, falling back to Web SpeechSynthesis.");
          speakSpeechSynthesisFallback(text, voiceStyle, onEnd);
        };
        await audio.play();
        return;
      }
    } catch (err) {
      console.warn("TTS fetch request failed, falling back to local SpeechSynthesis:", err);
    }

    // Otherwise standard local speech synthesis flow fallback
    speakSpeechSynthesisFallback(text, voiceStyle, onEnd);
  };

  const speakSpeechSynthesisFallback = (text: string, voiceStyle: string, onEnd?: () => void) => {
    if (!window.speechSynthesis) {
      if (onEnd) onEnd();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const enVoices = voices.filter(v => v.lang.startsWith("en"));
    const inVoices = voices.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith("en-in"));
    
    let selectedVoice = null;
    let rate = 0.95; // clean slow pace for nice slang tone
    let pitch = voiceStyle === "male" ? 0.95 : 1.05; // lower pitched male, sweet expressive female

    if (inVoices.length > 0) {
      if (voiceStyle === "male") {
        const maleIN = inVoices.find(v => v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("ravi") || v.name.toLowerCase().includes("kapil") || v.name.toLowerCase().includes("mohammad") || v.name.toLowerCase().includes("kishore"));
        selectedVoice = maleIN || inVoices.find(v => v.name.toLowerCase().includes("male")) || inVoices[0];
      } else {
        // Find female Indian English voice
        const femaleIN = inVoices.find(v => v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("veena") || v.name.toLowerCase().includes("heera") || v.name.toLowerCase().includes("neerja"));
        selectedVoice = femaleIN || inVoices.find(v => v.name.toLowerCase().includes("female")) || inVoices[0];
      }
    } else {
      if (voiceStyle === "male") {
        const premiumMale = enVoices.find(v => v.name.toLowerCase().includes("male") && v.name.toLowerCase().includes("google"));
        if (premiumMale) {
          selectedVoice = premiumMale;
        } else {
          const maleNames = ["david", "mark", "george", "male", "microsoft david", "daniel"];
          selectedVoice = enVoices.find(v => maleNames.some(name => v.name.toLowerCase().includes(name)));
        }
      } else {
        // Fallback: regular English female voice if Indian English not supported in browser
        const premiumFemale = enVoices.find(v => v.name.toLowerCase().includes("female") && v.name.toLowerCase().includes("google"));
        if (premiumFemale) {
          selectedVoice = premiumFemale;
        } else {
          const femaleNames = ["zira", "samantha", "victoria", "hazel", "female", "karen", "moira", "tessa", "veena"];
          selectedVoice = enVoices.find(v => femaleNames.some(name => v.name.toLowerCase().includes(name)));
        }
      }
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    } else {
      const defaultVoice = enVoices.find(v => v.name.includes("Google")) || enVoices[0];
      if (defaultVoice) utterance.voice = defaultVoice;
    }

    utterance.rate = rate;
    utterance.pitch = pitch;
    
    utterance.onend = () => {
      if (onEnd) onEnd();
    };
    utterance.onerror = (e) => {
      console.error("Speech synthesis fallback utterance error:", e);
      if (onEnd) onEnd();
    };

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // TTS Unlocks gesture + Load first question
  const handleUnlockAndStart = async () => {
    // Speak empty utterance to unlock Synthesis on Safari/Chrome
    if (window.speechSynthesis) {
      const unlockUtterance = new SpeechSynthesisUtterance("");
      window.speechSynthesis.speak(unlockUtterance);
    }
    
    setIsUnlocked(true);
    
    if (questions.length > 0) {
      // Return to existing question at current state
      const targetQ = questions.find(q => q.idx === interview?.current_question_idx);
      if (targetQ) {
        setCurrentQuestion(targetQ);
        setTimeout(() => speakQuestion(targetQ.question, () => setDictationFinished(true)), 600);
      } else {
        fetchNextQuestion();
      }
    } else {
      fetchNextQuestion();
    }
  };

  // Calls server endpoint or speaks preset manual questions
  const fetchNextQuestion = async () => {
    if (!interview) return;
    setIsGeneratingQuestion(true);
    setErrorText("");

    try {
      const manualQs = interview.manual_questions || [];
      const currentIdx = interview.current_question_idx;
      const isManual = currentIdx < manualQs.length;

      let questionText = "";

      if (isManual) {
        questionText = manualQs[currentIdx];
      } else {
        const priorQA = questions.map(q => ({
          question: q.question,
          answer_transcript: q.answer_transcript
        }));

        // Adjust index so dynamic AI knows how many dynamic questions have actually elapsed
        const adjustedDynamicIdx = currentIdx - manualQs.length;

        const res = await fetch("/api/interview-question", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeText: resume ? (resume.raw_text || (resume.parsed?.skills?.join(", ") + " " + resume.parsed?.education?.[0])) : "",
            role: interview.role,
            difficulty: interview.difficulty,
            priorQA,
            index: adjustedDynamicIdx
          }),
        });

        if (!res.ok) throw new Error("Could not construct next question.");

        const data = await res.json();
        if (data.isSimulated) {
          setIsOfflineFallbackMode(true);
        }
        questionText = data.question;
      }

      const newQ: InterviewQuestion = {
        id: "q_" + Math.random().toString(36).substring(2, 11),
        interview_id: interviewId,
        idx: currentIdx,
        question: questionText
      };

      const updatedQs = [...questions, newQ];
      setQuestions(updatedQs);
      mockDb.saveQuestions(updatedQs);
      setCurrentQuestion(newQ);
      
      // Speak aloud
      setTimeout(() => speakQuestion(questionText, () => setDictationFinished(true)), 200);
    } catch (err: any) {
      console.error(err);
      setErrorText("API request failed while drafting next question. Please verify your connection.");
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  // Camera preview setup
  const startSimulatedCamera = () => {
    // If already active, stop it first
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      simulatedCameraLoopRef.current = true;
      setIsSimulatedCamera(true);
      setCameraActive(true);

      // Animation parameters
      let angle = 0;
      let gridOffset = 0;
      let statusTimer = 0;

      const drawLoop = () => {
        if (!simulatedCameraLoopRef.current) return;

        // Draw background
        ctx.fillStyle = "#0f172a"; // slate-900
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw center scanner circle
        ctx.strokeStyle = "rgba(99, 102, 241, 0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 120, 0, Math.PI * 2);
        ctx.stroke();

        // Draw face indicator outline in the center
        ctx.strokeStyle = "rgba(16, 185, 129, 0.4)"; // emerald-500
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        // Head oval
        ctx.ellipse(canvas.width / 2, canvas.height / 2 - 10, 70, 95, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Shoulders
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2 + 190, 130, Math.PI, Math.PI * 2);
        ctx.stroke();

        // Draw moving scanline
        const scanY = (canvas.height / 2) + Math.sin(angle) * 140;
        angle += 0.03;

        ctx.strokeStyle = "rgba(99, 102, 241, 0.8)"; // indigo-500
        ctx.lineWidth = 2;
        ctx.shadowColor = "rgba(99, 102, 241, 0.8)";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - 160, scanY);
        ctx.lineTo(canvas.width / 2 + 160, scanY);
        ctx.stroke();
        ctx.shadowBlur = 0; // reset shadow

        // Corner targets
        const margin = 50;
        const len = 20;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 2;

        // Top-Left
        ctx.beginPath(); ctx.moveTo(margin, margin + len); ctx.lineTo(margin, margin); ctx.lineTo(margin + len, margin); ctx.stroke();
        // Top-Right
        ctx.beginPath(); ctx.moveTo(canvas.width - margin, margin + len); ctx.lineTo(canvas.width - margin, margin); ctx.lineTo(canvas.width - margin - len, margin); ctx.stroke();
        // Bottom-Left
        ctx.beginPath(); ctx.moveTo(margin, canvas.height - margin - len); ctx.lineTo(margin, canvas.height - margin); ctx.lineTo(margin + len, canvas.height - margin); ctx.stroke();
        // Bottom-Right
        ctx.beginPath(); ctx.moveTo(canvas.width - margin, canvas.height - margin - len); ctx.lineTo(canvas.width - margin, canvas.height - margin); ctx.lineTo(canvas.width - margin - len, canvas.height - margin); ctx.stroke();

        // Header text info
        ctx.font = "bold 13px 'JetBrains Mono', Courier, monospace";
        ctx.fillStyle = "#ffffff";
        ctx.fillText("BIOMETRIC PROCTOR SCREEN", 50, 45);

        ctx.font = "bold 10px 'JetBrains Mono', Courier, monospace";
        ctx.fillStyle = "rgba(16, 185, 129, 0.9)"; // emerald
        ctx.fillText("● ENGINE_STATUS: LIVE_SYNTHETIC_SECURE", 50, 70);

        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.fillText("STREAM_ID: PROCTOR_SIM_FED_VBD_9x", 50, 90);
        ctx.fillText(`TIMESTAMP: ${new Date().toISOString()}`, 50, 110);

        // Pulsing verification indicator
        statusTimer += 1;
        if (Math.floor(statusTimer / 30) % 2 === 0) {
          ctx.fillStyle = "rgba(239, 68, 68, 0.8)"; // rose-500
          ctx.beginPath();
          ctx.arc(canvas.width - 65, 41, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.fillText("REC_LOG", canvas.width - 125, 45);
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
          ctx.fillText("REC_LOG", canvas.width - 125, 45);
        }

        // Target matching coordinates
        ctx.fillStyle = "rgba(99, 102, 241, 0.7)";
        const pulseScale = Math.sin(angle * 1.5) * 5;
        ctx.fillText("TARGET_LOCKED", canvas.width / 2 - 40, canvas.height / 2 - 130 + pulseScale);

        requestAnimationFrame(drawLoop);
      };

      // Start the animated draw loop
      drawLoop();

      // Convert the animated canvas to a media stream
      const stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : null;
      if (stream) {
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }
    } catch (e) {
      console.error("Failed to generate virtual camera canvas stream:", e);
      setErrorText("Unable to initialize virtual camera loop.");
    }
  };

  const toggleCamera = async () => {
    setErrorText("");
    if (cameraActive) {
      simulatedCameraLoopRef.current = false;
      setIsSimulatedCamera(false);
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
        cameraStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraStreamRef.current = stream;
        setIsSimulatedCamera(false);
        setCameraActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error("Camera access blocked:", err);
        const isDeviceInUse = err.name === "NotReadableError" || err.message?.toLowerCase().includes("in use") || err.message?.toLowerCase().includes("device");
        const msg = isDeviceInUse 
          ? "Camera is in use by another application. Please close other software using the camera, or activate the high-fidelity virtual camera bypass." 
          : "Webcam was blocked. Please authorize camera in browser permissions, or activate the high-fidelity virtual camera bypass.";
        setErrorText(msg);
        setCanUseBypass(true);
        // Automatically start the simulated proctoring feed as a fallback!
        startSimulatedCamera();
      }
    }
  };

  // Automatically activate camera proctoring stream on initial room mount
  useEffect(() => {
    let active = true;
    const autoStartStream = async () => {
      await new Promise(resolve => setTimeout(resolve, 800));
      if (active) {
        toggleCamera();
      }
    };
    autoStartStream();
    return () => {
      active = false;
    };
  }, [interviewId]);

  // Synchronous MIC Access & Grab on CLICK (gesture requirement constraint)
  const handleStartSpeaking = async () => {
    setErrorText("");
    audioChunksRef.current = [];
    setLiveSpeechText("");
    setInterimSpeechText("");
    setRecordingState("listening");
    
    // Track the baseline text to prevent overwriting or duplicate appends
    baselineTextRef.current = recordedTranscript;

    sessionFinalizedTextRef.current = "";
    sessionInterimTextRef.current = "";
 
    // Initialize Web Speech API for Real-Time Transcription feedback
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      try {
        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
 
        recognition.onresult = (event: any) => {
          let sessionLiveFinalized = "";
          let sessionInterim = "";
          for (let i = 0; i < event.results.length; ++i) {
            const trans = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              sessionLiveFinalized += trans + " ";
            } else {
              sessionInterim += trans;
            }
          }
 
          // Save to refs to prevent stale closure reads
          sessionFinalizedTextRef.current = sessionLiveFinalized.trim();
          sessionInterimTextRef.current = sessionInterim.trim();
 
          // Update React states for rendering/telemetry
          setLiveSpeechText(sessionLiveFinalized.trim());
          setInterimSpeechText(sessionInterim.trim());
 
          // Real-time dictation: Automatically type current finalized phrases live into the textarea
          setRecordedTranscript(() => {
            const base = baselineTextRef.current.trim();
            const addition = (sessionLiveFinalized.trim() + " " + sessionInterim.trim()).trim();
            return base ? `${base} ${addition}` : addition;
          });
        };
 
        recognition.onerror = (event: any) => {
          console.warn("Speech recognition error:", event.error);
        };
 
        recognition.onend = () => {
          console.log("Speech recognition ended.");
        };
 
        speechRecognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.warn("Speech recognition starting error:", err);
      }
    }
 
    try {
      // Get microphone audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
 
      // Check if camera is active to combine tracks for high-fidelity audio/video recording
      let recordingStream = stream;
      const isVideoRecording = cameraActive && cameraStreamRef.current;
      
      if (isVideoRecording) {
        const videoTracks = cameraStreamRef.current.getVideoTracks();
        if (videoTracks.length > 0) {
          try {
            recordingStream = new MediaStream([
              ...stream.getAudioTracks(),
              ...videoTracks
            ]);
          } catch (errCombined) {
            console.warn("Combined stream synthesis failed, defaulting to audio track only:", errCombined);
          }
        }
      }
 
      // Start recording
      let recorder: MediaRecorder;
      const mimeTypeToUse = isVideoRecording ? getSupportedVideoMimeType() : "audio/webm;codecs=opus";
      
      try {
        if (mimeTypeToUse) {
          recorder = new MediaRecorder(recordingStream, { mimeType: mimeTypeToUse });
        } else {
          recorder = new MediaRecorder(recordingStream);
        }
      } catch (e) {
        recorder = new MediaRecorder(recordingStream); // Fallback if specific WebM type is unsupported
      }
 
      mediaRecorderRef.current = recorder;
 
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
 
      recorder.onstop = async () => {
        // Run conversion & API request
        processTranscript();
      };
 
      recorder.start(250); // Get chunks every 250ms
    } catch (err: any) {
      console.error("Microphone access failed:", err);
      setErrorText(
        err.name === "NotAllowedError" 
          ? "Microphone access blocked. Please authorize microphone permissions." 
          : "Could not initialize mic recorder. Ensure mic is plugged in and active."
      );
      setRecordingState("idle");
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch (e) {}
        speechRecognitionRef.current = null;
      }
    }
  };
 
  const handleStopSpeaking = () => {
    console.log("handleStopSpeaking invoked. Current state:", recordingState);
    
    // 1. Unconditionally stop Web Speech recognition
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {
        console.warn("Speech recognition stop exception:", e);
      }
      speechRecognitionRef.current = null;
    }
 
    // 2. Unconditionally shut off microphone stream tracks
    if (micStreamRef.current) {
      try {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch (e) {
        console.warn("Microphone tracks stop exception:", e);
      }
      micStreamRef.current = null;
    }
 
    // 3. Stop MediaRecorder if actively listening/recording
    let wasRecording = false;
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state === "recording" || mediaRecorderRef.current.state === "paused") {
          mediaRecorderRef.current.stop();
          wasRecording = true;
        }
      } catch (err) {
        console.warn("MediaRecorder stop exception:", err);
      }
    }
 
    // 4. Update recording state accordingly.
    // If we successfully stopped an active recorder, its onstop event will fire processTranscript() which transitions to "done".
    // If we weren't actively recording, transition directly to "done".
    if (wasRecording) {
      setRecordingState("transcribing");
    } else {
      setRecordingState("done");
    }
  };

  // Process Recording → WAV resample → Gemini Transcription API Call
  const processTranscript = async () => {
    setIsTranscribing(true);

    try {
      const isVideoRecording = cameraActive && cameraStreamRef.current;
      const recordMimeType = mediaRecorderRef.current?.mimeType || (isVideoRecording ? (getSupportedVideoMimeType() || "video/webm") : "audio/webm");
      const mergedBlob = new Blob(audioChunksRef.current, { type: recordMimeType });

      // Save recorded video+audio stream to local IndexedDB space
      if (currentQuestion) {
        videoDb.saveVideo(
          currentQuestion.id,
          interviewId,
          recordMimeType,
          mergedBlob
        ).catch(dbErr => {
          console.error("IndexedDB video write error:", dbErr);
        });
      }
      
      // Resample client-side to 16kHz WAV PCM
      const wavBlob = await convertWebmToWav(mergedBlob);
      
      // Convert to Base64
      const reader = new FileReader();
      reader.readAsDataURL(wavBlob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(",")[1];
        
        try {
          // Send to transcription server endpoint
          const res = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio_base64: base64Data }),
          });

          if (!res.ok) throw new Error("Server transcription failure.");

          const data = await res.json();
          if (data.isSimulated) {
            setIsOfflineFallbackMode(true);
          }
          let transcript = (data.transcript || "").trim();

          // If the server didn't return a good transcript chunk but real-time detection was successful, use it!
          const capturedLiveText = (sessionFinalizedTextRef.current + (sessionInterimTextRef.current ? " " + sessionInterimTextRef.current : "")).trim();
          if (!transcript && capturedLiveText.length >= 5 && capturedLiveText.split(/\s+/).length >= 2) {
            transcript = capturedLiveText;
          }

          // Hallucination Filter: Rejects under 2 words or pure noise
          if (transcript.length < 5 || transcript.split(/\s+/).length < 2) {
            if (capturedLiveText.length >= 5 && capturedLiveText.split(/\s+/).length >= 2) {
              transcript = capturedLiveText;
            } else {
              setErrorText("No speech detected. Please align your microphone and speak clearly, or click 'Type your answer instead' to bypass voice capture.");
              setRecordingState("idle");
              return;
            }
          }

          // Set final transcript using baselineText plus the higher-fidelity transcript (or falling back to the captured live text)
          const finalSegment = transcript || capturedLiveText;
          setRecordedTranscript(() => {
            const base = baselineTextRef.current.trim();
            return base ? `${base} ${finalSegment}` : finalSegment;
          });
          setRecordingState("done");
        } catch (err: any) {
          console.error(err);
          setErrorText("Server was unable to transcribe spoken words. Please check your system configuration.");
          setRecordingState("idle");
        } finally {
          setIsTranscribing(false);
        }
      };
    } catch (err: any) {
      console.error(err);
      setErrorText("Encoding failure. Unable to compile record arrays.");
      setRecordingState("idle");
      setIsTranscribing(false);
    }
  };

  // Resets transcript so candidate can speak again
  const handleReRecord = () => {
    setRecordedTranscript("");
    setRecordingState("idle");
    setErrorText("");
  };

  // Core submission broker for evaluating and transferring to next question
  const submitTargetAnswer = async (answerText: string) => {
    if (!currentQuestion || !interview) return;
    setIsEvaluating(true);
    setErrorText("");

    try {
      const res = await fetch("/api/evaluate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQuestion.question,
          transcript: answerText
        }),
      });

      if (!res.ok) throw new Error("Evaluation failed.");

      const scoreResponse = await res.json();
      if (scoreResponse.isSimulated) {
        setIsOfflineFallbackMode(true);
      }

      // Save scored question details
      const updatedQuestion: InterviewQuestion = {
        ...currentQuestion,
        answer_transcript: answerText,
        scores: {
          communication: scoreResponse.communication || 7,
          technical: scoreResponse.technical || 7,
          confidence: scoreResponse.confidence || 7,
          score: scoreResponse.score || 72,
          feedback: scoreResponse.feedback || "Answer captured perfectly."
        }
      };

      // Map back and save in lists
      const updatedQuestions = questions.map(q => q.id === currentQuestion.id ? updatedQuestion : q);
      setQuestions(updatedQuestions);
      mockDb.saveQuestions(updatedQuestions);

      // Advance interview index
      const nextIdx = interview.current_question_idx + 1;
      const isFinished = nextIdx >= interview.total_questions;

      if (isFinished) {
        // Compile overall report
        await handleGenerateFinalReport(updatedQuestions);
      } else {
        // Update interview index locally
        const updatedInt: Interview = {
          ...interview,
          current_question_idx: nextIdx
        };
        mockDb.updateInterview(updatedInt);
        setInterview(updatedInt);

        // Prep states for next question
        setRecordedTranscript("");
        setRecordingState("idle");
        setLiveSpeechText("");
        setInterimSpeechText("");
        
        // Fetch and load next inquiry
        fetchNextQuestion();
      }
    } catch (err: any) {
      console.error(err);
      setErrorText("API evaluation failed. Please verify API connections.");
    } finally {
      setIsEvaluating(false);
    }
  };

  // Submits the transcribed answer, or processes MCQ locks locally
  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !interview) return;

    if (currentQuestion.is_mcq) {
      const chosenIdx = selectedMcqOptionIdx !== null ? selectedMcqOptionIdx : 0;
      setIsEvaluating(true);
      setErrorText("");
      try {
        const isCorrect = chosenIdx === currentQuestion.mcq_correct_index;
        const optionLetter = ["A", "B", "C", "D"][chosenIdx];
        const answerText = `Selected Option ${optionLetter}: "${currentQuestion.mcq_options?.[chosenIdx]}"`;
        
        const updatedQuestion: InterviewQuestion = {
          ...currentQuestion,
          answer_transcript: answerText,
          mcq_selected_index: chosenIdx,
          scores: {
            communication: 10,
            technical: isCorrect ? 10 : 1,
            confidence: 10,
            score: isCorrect ? 100 : 10,
            feedback: isCorrect 
              ? `Correct choice! Candidate successfully selected standard Option ${optionLetter}. ${currentQuestion.mcq_explanation || ""}`
              : `Incorrect selection. Candidate chose option ${optionLetter} ("${currentQuestion.mcq_options?.[chosenIdx]}"), but standard correct choice is Option ${["A", "B", "C", "D"][currentQuestion.mcq_correct_index || 0]} ("${currentQuestion.mcq_options?.[currentQuestion.mcq_correct_index || 0]}"). ${currentQuestion.mcq_explanation || ""}`
          }
        };

        const updatedQuestions = questions.map(q => q.id === currentQuestion.id ? updatedQuestion : q);
        setQuestions(updatedQuestions);
        mockDb.saveQuestions(updatedQuestions);

        const nextIdx = interview.current_question_idx + 1;
        const isFinished = nextIdx >= interview.total_questions;

        if (isFinished) {
          await handleGenerateFinalReport(updatedQuestions);
        } else {
          const updatedInt: Interview = {
            ...interview,
            current_question_idx: nextIdx
          };
          mockDb.updateInterview(updatedInt);
          setInterview(updatedInt);

          // Reset speech & option structures:
          setRecordedTranscript("");
          setRecordingState("idle");
          setLiveSpeechText("");
          setInterimSpeechText("");
          setSelectedMcqOptionIdx(null);
          
          fetchNextQuestion();
        }
      } catch (err: any) {
        console.error(err);
        setErrorText("Failed to submit MCQ response.");
      } finally {
        setIsEvaluating(false);
      }
    } else {
      if (!recordedTranscript || !currentQuestion || !interview) return;
      await submitTargetAnswer(recordedTranscript);
    }
  };

  // Handler when the 30-second timer hits 0
  const handleTimeExpired = async () => {
    if (!currentQuestion || !interview) return;
    
    // Stop recording if active
    if (mediaRecorderRef.current && recordingState === "listening") {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {}
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.stop(); } catch (e) {}
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
      }
    }

    if (currentQuestion.is_mcq) {
      setErrorText("Time expired! Automatically locking chosen response.");
      if (selectedMcqOptionIdx === null) {
        setSelectedMcqOptionIdx(0);
      }
      // Defer slightly to ensure the re-render registers:
      setTimeout(() => {
        handleSubmitAnswer();
      }, 500);
      return;
    }

    // Capture response: use recordedTranscript, or liveSpeechText, or default fallback
    let finalAnswer = recordedTranscript.trim();
    if (!finalAnswer) {
      const liveText = (liveSpeechText + " " + interimSpeechText).trim();
      if (liveText.length >= 2) {
        finalAnswer = liveText;
      } else {
        finalAnswer = "[Candidate did not submit any response within the 60-second time limit]";
      }
    }

    // Set an error alert so the candidate is updated
    setErrorText("Time expired! Automatically compiling and submitting your response.");
    
    await submitTargetAnswer(finalAnswer);
  };

  // Conclude active session whenever candidate wishes
  const handleEndInterviewNow = async () => {
    if (!interview) return;
    setConfirmEndInterview(false);

    // Stop active recording media tracks
    stopAllMediaStreams();

    // If there is an active question being answered, save it or treat it as skipped
    let finalQuestions = [...questions];
    if (currentQuestion && !currentQuestion.answer_transcript) {
      const skippedQuestion: InterviewQuestion = {
        ...currentQuestion,
        answer_transcript: recordedTranscript.trim() || "[Interview concluded early by candidate]",
        scores: {
          communication: 5,
          technical: 5,
          confidence: 5,
          score: 50,
          feedback: "Candidate concluded the practice session early."
        }
      };
      finalQuestions = questions.map(q => q.id === currentQuestion.id ? skippedQuestion : q);
      setQuestions(finalQuestions);
      mockDb.saveQuestions(finalQuestions);
    }

    // Ensure we have at least one question so the summarizer API won't fail
    if (finalQuestions.length === 0) {
      const placeholderQuestion: InterviewQuestion = {
        id: "q_placeholder",
        interview_id: interviewId,
        idx: 0,
        question: "General Competency",
        answer_transcript: "[Interview session ended before any questions were loaded]",
        scores: {
          communication: 5,
          technical: 5,
          confidence: 5,
          score: 50,
          feedback: "No diagnostic performance recorded."
        }
      };
      finalQuestions = [placeholderQuestion];
      setQuestions(finalQuestions);
      mockDb.saveQuestions(finalQuestions);
    }

    await handleGenerateFinalReport(finalQuestions);
  };

  // Reset dictationFinished when question changes
  useEffect(() => {
    if (currentQuestion) {
      setDictationFinished(false);
    }
  }, [currentQuestion?.id]);

  // Active question timer countdown tick (60 seconds limit)
  useEffect(() => {
    if (!isUnlocked || isGeneratingQuestion || !currentQuestion || isEvaluating) {
      return;
    }

    if (!dictationFinished) {
      setTimeLeft(60);
      return;
    }

    setTimeLeft(60);

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [currentQuestion?.id, isUnlocked, isGeneratingQuestion, isEvaluating, dictationFinished]);

  // Creates the final aggregated assessment report using `/api/generate-report`
  const handleGenerateFinalReport = async (finalQuestionsList: InterviewQuestion[]) => {
    if (!interview) return;
    setIsEvaluating(true);

    try {
      const res = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_name: interview.candidate_name,
          role: interview.role,
          difficulty: interview.difficulty,
          questions: finalQuestionsList
        }),
      });

      if (!res.ok) throw new Error("Failed to generate comprehensive summary.");

      const data = await res.json();
      if (data.isSimulated) {
        setIsOfflineFallbackMode(true);
      }

      // Calculate automated proctoring & behavior intelligence scores
      const totalDistractions = tabSwitchCount + (violationsLog ? violationsLog.length : 0);
      const computedBodyLanguage = Math.max(2, 10 - (violationsLog ? violationsLog.filter(v => v.includes("WARNING")).length * 1.5 : 0));
      const computedEyeContact = Math.max(3, 10 - tabSwitchCount * 2 - (violationsLog ? violationsLog.filter(v => v.includes("not detected")).length : 0));

      // Create permanent reports record
      const newReport = {
        id: "rep_" + Math.random().toString(36).substring(2, 11),
        interview_id: interviewId,
        overall_score: Math.max(10, Math.min(100, (data.overall_score || 75) - (totalDistractions * 2))), // subtle penalty on overall score for fraudulent behaviors
        communication: data.communication || 7,
        technical: data.technical || 7,
        confidence: data.confidence || 7,
        recommendation: data.overall_score >= 80 && totalDistractions < 3 ? "Strong Hire" : data.overall_score >= 65 && totalDistractions < 6 ? "Recommend Study" : "Reject",
        summary_md: data.summary_md || "A comprehensive review of the session.",
        created_at: new Date().toISOString(),
        body_language_score: Math.round(computedBodyLanguage),
        eye_contact_score: Math.round(computedEyeContact),
        distractions_count: totalDistractions
      };

      mockDb.saveReport(newReport);

      // Save Step 4: Write to Supabase 'results' table
      const scoreValue = Math.max(10, Math.min(100, (data.overall_score || 75) - (totalDistractions * 2)));
      // Note: communication and technical scores are usually 1-10 in the report generator, so let's scale scale to 100 or store raw gracefully! 
      // We will include raw communication score, scaled communication score, communication, technical, etc., to be 100% compliant with any schema!
      const commValue = (data.communication || 7) * 10;
      const techValue = (data.technical || 7) * 10;

      const supaResultObj = {
        sessionId: interviewId, // UUID or interview ID representation
        candidateName: interview?.candidate_name || "John Doe",
        candidateEmail: interview?.candidate_email || "candidate@gmail.com",
        score: scoreValue,
        overallScore: scoreValue,
        overall_score: scoreValue,
        interviewId: interviewId,
        interview_id: interviewId,
        communication: commValue,
        technical: techValue,
        completedAt: new Date().toISOString().split("T")[0],
        completed_at: new Date().toISOString()
      };

      const saveResultsToSupa = async () => {
        try {
          // 1. Write the results info row
          const { error: resErr } = await supabase.from("results").insert([supaResultObj]);
          if (resErr) {
            console.warn("Supabase 'results' insert warning (standard sandbox fallback in effect):", resErr);
          } else {
            console.log("✔ Supabase 'results' saved successfully:", supaResultObj);
          }

          // 2. Mark corresponding interview session token status as completed
          const { error: sessErr } = await supabase
            .from("interview_sessions")
            .update({ status: "completed" })
            .eq("token", interviewId);
          if (sessErr) {
            console.warn("Could not mark secure session token as completed in Supabase:", sessErr);
          } else {
            console.log("✔ Marked session token as completed inside Supabase database!");
          }
        } catch (ex) {
          console.warn("Supabase results insert exception handled:", ex);
        }
      };
      saveResultsToSupa();

      // Set interview completed
      const finalInterview: Interview = {
        ...interview,
        status: "completed",
        ended_at: new Date().toISOString(),
        candidate_selfie: candidateSelfie || interview.candidate_selfie,
        tab_switch_count: tabSwitchCount,
        violations_log: violationsLog
      };
      mockDb.updateInterview(finalInterview);

      setIsEvaluating(false);
      // Navigate to completed Report View, or Thank You Page if candidate bypasses auth
      const isCandidate = localStorage.getItem("invite_bypass_" + interviewId) === "true";
      if (isCandidate) {
        onNavigate("/thank-you");
      } else {
        onNavigate(`/app/interview/${interviewId}/report`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorText("Summarization report request failed. Storing uncompiled progress. Refresh and resubmit.");
      setIsEvaluating(false);
    }
  };

  const handleMuteToggle = () => {
    if (!isMuted) {
      cancelAllSpeakingAndAudio();
    } else {
      if (currentQuestion) speakQuestion(currentQuestion.question);
    }
    setIsMuted(!isMuted);
  };

  return (
    <div className={`min-h-screen font-sans overflow-x-hidden flex flex-col justify-between selection:bg-emerald-500/30 transition-colors duration-500 ${isLight ? "bg-transparent text-[#131518]" : "bg-slate-950 text-slate-100"}`}>
      
      {/* Background radial glows */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[110px] pointer-events-none" />

      {/* Nav header */}
      <header className={`relative max-w-7xl mx-auto px-6 h-16 w-full flex items-center justify-between z-10 border-b backdrop-blur-md transition-colors duration-500 ${
        isLight ? "border-slate-200 bg-[#f8f8f6]/30" : "border-slate-900 bg-slate-950/30"
      }`}>
        <button
          id="btn_room_back"
          onClick={() => {
            stopAllMediaStreams();
            const isCandidate = localStorage.getItem("invite_bypass_" + interviewId) === "true";
            if (isCandidate) {
              onNavigate("/thank-you");
            } else {
              onNavigate("/app");
            }
          }}
          className={`flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider transition-colors ${
            isLight ? "text-slate-650 hover:text-black" : "text-slate-400 hover:text-white"
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          {localStorage.getItem("invite_bypass_" + interviewId) === "true" ? "Exit Session" : "Dashboard"}
        </button>

        <div className="flex items-center gap-3">
          {isOfflineFallbackMode && (
            <div 
              className="flex items-center gap-1.5 font-mono text-[9px] uppercase font-black text-amber-500 border border-amber-950 px-2 py-1 rounded bg-amber-950/20 animate-pulse"
              title="Gemini API rate limiting or quota constraints active. A smart simulated fallback has engaged seamlessly so you can continue practicing."
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Sandbox Offline Backstop Active
            </div>
          )}
          <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase font-bold text-slate-400 border border-slate-800 px-2 py-1 rounded bg-slate-950">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Sandbox Room Live
          </div>
        </div>
      </header>

      {/* CENTRAL CORE */}
      <main className="relative flex-grow flex items-center justify-center p-6 z-10 w-full max-w-7xl mx-auto">
        <div className="w-full h-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* LEFT PANELS: Webcam Preview & Stats (Column 1) */}
          <div className="space-y-6">
            
            {/* WEBCAM PREVIEW */}
            <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-4 shadow-xl overflow-hidden relative">
              <div className="flex items-center justify-between pb-3 border-b border-slate-900 mb-4">
                <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  Candidate Preview
                </span>

                <button
                  id="btn_room_camera"
                  onClick={toggleCamera}
                  className={`h-8 px-3 rounded-lg text-[10px] font-mono tracking-wider uppercase font-bold transition-all flex items-center justify-center gap-1.5 ${
                    cameraActive 
                      ? "bg-rose-500/10 text-rose-400 hover:bg-rose-500/20" 
                      : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {cameraActive ? (
                    <>
                      <VideoOff className="w-3.5 h-3.5" /> Stop Prev
                    </>
                  ) : (
                    <>
                      <Video className="w-3.5 h-3.5" /> Start Prev
                    </>
                  )}
                </button>
              </div>

              {/* Simulation Screen container */}
              <div className="relative aspect-video rounded-xl bg-slate-950 flex items-center justify-center border border-slate-850 overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"} ${isSimulatedCamera ? "" : "scale-x-[-1]"}`}
                />
                {!cameraActive && (
                  <div className="text-center space-y-2 p-6 absolute inset-0 flex flex-col justify-center items-center">
                    <Video className="w-8 h-8 text-slate-700 mx-auto animate-pulse" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Webcam Blocked or Disabled</p>
                      <p className="text-[9px] text-slate-600 font-light mt-1 max-w-[200px] mx-auto leading-normal">
                        Your device stream is mirrored locally. If occupied or unsupported, start the simulation below.
                      </p>
                      <div className="flex gap-2 justify-center mt-3">
                        <button
                          type="button"
                          onClick={toggleCamera}
                          className="px-2.5 py-1 text-[9px] uppercase font-bold font-mono tracking-wider bg-slate-800 hover:bg-slate-700 rounded text-slate-300 cursor-pointer"
                        >
                          Enable Real Camera
                        </button>
                        <button
                          type="button"
                          onClick={startSimulatedCamera}
                          className="px-2.5 py-1 text-[9px] uppercase font-bold font-mono tracking-wider bg-indigo-550/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 rounded cursor-pointer"
                        >
                          Use Virtual Camera
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {cameraActive && isSimulatedCamera && (
                  <div className="absolute top-3 left-3 px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-[8px] font-mono font-extrabold rounded text-indigo-400 tracking-wider uppercase animate-pulse">
                     Simulated Proctor Loop
                  </div>
                )}
              </div>
            </div>

            {/* INTERVIEW SCOPE DETAILS */}
            {interview && (
              <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-5 space-y-4">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 block">Active Specification</span>
                  <h4 className="text-xs font-bold text-slate-200 block truncate">{interview.role}</h4>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900">
                    <span className="text-[8px] font-mono text-slate-500 uppercase block">Difficulty</span>
                    <span className="font-bold text-emerald-400 capitalize block mt-0.5">{interview.difficulty}</span>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900">
                    <span className="text-[8px] font-mono text-slate-500 uppercase block">Remaining</span>
                    <span className="font-bold text-slate-300 block mt-0.5">
                      {interview.current_question_idx + 1} of {interview.total_questions}
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* MAIN COLUMN AREA: Interviewing Loop Card (Column 2 & 3) */}
          <div className="md:col-span-2 space-y-6">
            
            {detectionAlert && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 bg-rose-500/15 border border-rose-500/35 rounded-xl text-rose-400 text-xs font-mono font-bold flex gap-3 items-center animate-pulse shadow-lg shadow-rose-950/20"
              >
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
                <div className="flex-1">
                  <span className="text-[9px] uppercase tracking-widest text-rose-500 block leading-none mb-1 font-extrabold">Exam proctor alarm</span>
                  <span>{detectionAlert}</span>
                </div>
              </motion.div>
            )}

            {errorText && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex justify-between items-start gap-2.5">
                <div className="flex gap-2.5 items-start">
                  <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                  <p className="leading-relaxed">{errorText}</p>
                </div>
                {!isKeyboardFallback && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsKeyboardFallback(true);
                      setErrorText("");
                    }}
                    className="font-mono text-[10px] text-emerald-400 hover:text-emerald-300 hover:underline shrink-0 cursor-pointer"
                  >
                    Type answer instead
                  </button>
                )}
              </div>
            )}

            {!isUnlocked ? (
              !selfieCaptured ? (
                /* SELFIE REQUIREMENT STEP SCREEN */
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8 sm:p-12 bg-slate-900/60 rounded-2xl border border-slate-800 shadow-2xl text-center space-y-6 relative"
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 to-indigo-500 rounded-t-2xl" />
                  
                  <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/5 animate-pulse">
                    <Camera className="w-6 h-6" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-base font-extrabold font-display text-white">Biometric Face Verification</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                      To comply with exam integrity guidelines, please activate your camera and take an identity audit selfie before formulating your interview questions.
                    </p>
                  </div>

                  {!cameraActive ? (
                    <div className="py-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={toggleCamera}
                        className="px-6 h-10 rounded-xl bg-slate-100 text-slate-950 font-bold text-xs uppercase duration-150 cursor-pointer hover:bg-white inline-flex items-center gap-1.5 shrink-0"
                      >
                        <Video className="w-4 h-4" /> Enable Webcam Frame
                      </button>
                      <button
                        type="button"
                        onClick={startSimulatedCamera}
                        className="px-6 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs uppercase duration-150 cursor-pointer hover:bg-indigo-500/20 inline-flex items-center gap-1.5 shrink-0"
                      >
                        <Play className="w-4 h-4" /> Use Virtual Camera Bypass
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {isSimulatedCamera && (
                        <p className="text-[10px] text-indigo-400 font-mono animate-pulse">
                          ⚡ Biometric Virtual Bypass Feed is active
                        </p>
                      )}
                      <div className="space-y-4">
                        {isSimulatedCamera && (
                          <p className="text-[10px] text-indigo-400 font-mono animate-pulse">
                            ⚡ Biometric Virtual Bypass Feed is active
                          </p>
                        )}
                        
                        {isCheckingSnapshot ? (
                          <div className="flex flex-col items-center gap-2 py-3">
                            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-[11px] font-mono text-indigo-400 animate-pulse">Analyzing frame biometrics with COCO-SSD neural engine...</p>
                          </div>
                        ) : (
                          <div className="flex justify-center flex-col items-center gap-2">
                            <button
                              type="button"
                              onClick={handleCaptureSelfie}
                              className="px-6 h-11 rounded-xl bg-indigo-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider hover:bg-slate-100 transition-all duration-150 cursor-pointer shadow-md shadow-indigo-500/10 inline-flex items-center gap-2"
                            >
                              <Camera className="w-4 h-4" /> Snap Verification Photo
                            </button>
                            {snapshotErrorText && (
                              <div className="flex flex-col items-center gap-2 mt-1">
                                <p className="text-[10px] text-indigo-500 hover:underline cursor-pointer font-mono" onClick={handleCaptureSelfie}>
                                  ↻ Touch here to retake snapshot
                                </p>
                                <button
                                  type="button"
                                  onClick={handleForceCaptureSelfie}
                                  className="px-4 py-2 mt-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 hover:text-emerald-350 font-mono text-[9px] uppercase font-bold tracking-widest transition-all cursor-pointer shadow-sm animate-pulse"
                                  title="Skip AI face matching and approve this captured frame anyway (useful for Android / mobile devices)"
                                >
                                  ⚡ Skip AI Check & Proceed details anyway
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {snapshotErrorText && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-red-500/10 border border-red-500/25 rounded-xl text-red-450 text-[11px] font-sans leading-relaxed max-w-md mx-auto text-center space-y-1"
                          >
                            <p className="font-bold underline text-red-400">Snapshot Validation Warning</p>
                            <p className="text-slate-200 font-light">{snapshotErrorText}</p>
                            <p className="text-[10px] font-medium text-red-400 animate-pulse uppercase tracking-wider font-mono">Retake snapshot to unlock assessment</p>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  )}

                  {cocoModelLoading && (
                    <p className="text-[10px] text-slate-500 font-mono animate-pulse">
                      Initializing local AI scanner models...
                    </p>
                  )}
                </motion.div>
              ) : (
                /* UNLOCK OVERLAY BLOCK SCREEN OR CODING MCQ SCREEN */
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8 sm:p-12 bg-slate-900/60 rounded-2xl border border-slate-850 shadow-2xl relative text-center"
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-t-2xl" />
                  
                  {mcqStep !== "completed" ? (
                    /* DYNAMIC SCORING MCQ WRAPPER */
                    <div className="space-y-5 text-left max-w-lg mx-auto py-2">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-900/40">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-emerald-400" />
                          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                            Required Technical Diagnostic Screen
                          </h4>
                        </div>
                        {mcqStep === "active" && (
                          <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">
                            Challenge {currentMcqIdx + 1} of {mcqQuestions.length}
                          </span>
                        )}
                      </div>

                      {mcqStep === "not_started" ? (
                        <div className="text-center space-y-5 py-4">
                          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-md">
                            <Award className="w-5 h-5 animate-pulse" />
                          </div>
                          
                          <div className="space-y-2 max-w-sm mx-auto">
                            <h3 className="text-base font-extrabold text-white">Randomized Coding MCQ Diagnostic</h3>
                            <p className="text-xs text-slate-400 leading-relaxed font-light">
                              Solve {mcqQuestions.length || 4} high-fidelity randomized coding multiple-choice questions to confirm target technical fundamentals before opening vocal audio channels.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setMcqStep("active");
                              const savedKey = `interview_mcqs_${interviewId}`;
                              const savedStr = localStorage.getItem(savedKey);
                              if (savedStr) {
                                const saved = JSON.parse(savedStr);
                                saved.step = "active";
                                localStorage.setItem(savedKey, JSON.stringify(saved));
                              }
                            }}
                            className="px-6 h-10 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs uppercase duration-150 cursor-pointer hover:bg-emerald-400 inline-flex items-center gap-1.5"
                          >
                            ⚡ Initiate Coding Assessment Screen
                          </button>
                        </div>
                      ) : (
                        /* MCQ ACTIVE SCREEN STATE */
                        <div className="space-y-4">
                          {mcqQuestions.length > currentMcqIdx && (
                            <>
                              <div className="space-y-2.5">
                                <p className="text-xs text-white leading-relaxed font-medium">
                                  {mcqQuestions[currentMcqIdx].question}
                                </p>
                                
                                {mcqQuestions[currentMcqIdx].codeSnippet && (
                                  <pre className="text-left font-mono text-[9px] p-3.5 bg-slate-950 border border-slate-850 rounded-lg overflow-x-auto text-emerald-400 leading-normal max-h-40">
                                    <code>{mcqQuestions[currentMcqIdx].codeSnippet}</code>
                                  </pre>
                                )}
                              </div>

                              <div className="space-y-2">
                                {mcqQuestions[currentMcqIdx].options.map((option, oIdx) => {
                                  const isSelected = mcqSelectedOption === oIdx;
                                  return (
                                    <div
                                      key={oIdx}
                                      onClick={() => setMcqSelectedOption(oIdx)}
                                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all text-[11px] flex items-center gap-3 select-none leading-normal ${
                                        isSelected
                                          ? "bg-emerald-555/10 border-emerald-500 text-white animate-fade-in"
                                          : "bg-slate-950/40 border-slate-900 text-slate-400 hover:border-slate-800 hover:text-slate-300"
                                      }`}
                                    >
                                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                        isSelected ? "border-emerald-500 bg-emerald-500" : "border-slate-800"
                                      }`}>
                                        {isSelected && <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />}
                                      </div>
                                      <span>{option}</span>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="pt-2">
                                <button
                                  type="button"
                                  disabled={mcqSelectedOption === null}
                                  onClick={() => {
                                    if (mcqSelectedOption === null) return;
                                    const currentQ = mcqQuestions[currentMcqIdx];
                                    const newAnswers = { ...mcqAnswers, [currentMcqIdx]: mcqSelectedOption };
                                    setMcqAnswers(newAnswers);
                                    
                                    const savedCorrect = Object.keys(newAnswers).filter(
                                      (idx) => newAnswers[Number(idx)] === mcqQuestions[Number(idx)].correctIndex
                                    ).length;

                                    const nextIdx = currentMcqIdx + 1;
                                    const isFinished = nextIdx >= mcqQuestions.length;

                                    const savedKey = `interview_mcqs_${interviewId}`;
                                    if (isFinished) {
                                      const score = Math.round((savedCorrect / mcqQuestions.length) * 100);
                                      setMcqFinalScore(score);
                                      setMcqStep("completed");

                                      localStorage.setItem(savedKey, JSON.stringify({
                                        questions: mcqQuestions,
                                        step: "completed",
                                        currentIdx: nextIdx,
                                        answers: newAnswers,
                                        score: score
                                      }));

                                      // Save score in database
                                      if (interview) {
                                        const updatedInt = { 
                                          ...interview, 
                                          mcq_score: score,
                                          mcq_questions: mcqQuestions,
                                          mcq_answers: newAnswers
                                        };
                                        mockDb.updateInterview(updatedInt);
                                        setInterview(updatedInt);
                                      }
                                    } else {
                                      setCurrentMcqIdx(nextIdx);
                                      setMcqSelectedOption(null);
                                      localStorage.setItem(savedKey, JSON.stringify({
                                        questions: mcqQuestions,
                                        step: "active",
                                        currentIdx: nextIdx,
                                        answers: newAnswers,
                                        score: null
                                      }));
                                    }
                                  }}
                                  className="w-full h-10 rounded-xl bg-slate-100 hover:bg-white text-slate-950 disabled:bg-slate-850 disabled:text-slate-600 font-bold text-xs uppercase duration-150 flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  {currentMcqIdx === mcqQuestions.length - 1 ? "Lock MCQ & Request Voice Key" : "Submit & Continue"}
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* MCQ COMPLETED SCREEN -> ENABLES LOBBY VERBAL UNLOCK CODES */
                    <div className="space-y-6 text-center">
                      <div className="flex justify-center items-center gap-4 py-2 border-b border-slate-900 pb-4 max-w-sm mx-auto">
                        {candidateSelfie && (
                          <div className="relative w-16 h-16 rounded-full overflow-hidden border border-emerald-500 shadow-md">
                            <img 
                              src={candidateSelfie} 
                              alt="Selfie audit verification" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute bottom-0 right-0 p-0.5 bg-emerald-500 rounded-full">
                              <Check className="w-2.5 h-2.5 text-slate-950" />
                            </div>
                          </div>
                        )}
                        <div className="text-left space-y-0.5">
                          <h4 className="text-xs font-mono font-bold text-slate-200 font-bold">Biometric Snapshot Logged</h4>
                          <span className="text-[10px] text-emerald-400 font-mono block">IDENTITY LOCK APPROVED</span>
                        </div>
                      </div>

                      {/* Score metrics box */}
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1.5 text-left max-w-sm mx-auto">
                        <span className="text-[8px] font-mono text-emerald-405 uppercase block font-bold tracking-widest">DIAGNOSTIC SCORE METRICS</span>
                        <p className="text-xs text-white font-extrabold flex items-center gap-1">
                          ✓ Coding score: {mcqFinalScore !== null ? mcqFinalScore : 100}% Passed ({mcqQuestions.filter((_, i) => mcqAnswers[i] === mcqQuestions[i].correctIndex).length} / {mcqQuestions.length} Correct)
                        </p>
                        <p className="text-[10px] text-slate-450 leading-relaxed font-light">
                          Perfect! Your code analysis indicators comply with technical criteria constraints. You are fully cleared for voice recruiter evaluation.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-base font-extrabold font-display text-white">Unlock Voice playback modules</h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed font-light">
                          Touch below to start synthesized speech generation and begin your practice session.
                        </p>
                      </div>

                      <div>
                        <button
                          id="btn_room_start_unlocked"
                          onClick={handleUnlockAndStart}
                          className="px-8 h-12 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider hover:bg-emerald-400 hover:scale-[1.01] shadow-md shadow-emerald-500/15 duration-150 cursor-pointer inline-flex items-center gap-2"
                        >
                          Unlock & Start Practice Session <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            ) : (

              /* INTERACTIVE VOCAL PRACTICE INTERCARD CONTAINER */
              <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 sm:p-8 space-y-6 relative shadow-2xl">
                
                {/* Header indicators */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-900">
                  <div className="flex items-center justify-between sm:justify-start gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-mono tracking-wider text-emerald-400 uppercase font-black">AI Voice Active</span>
                    </div>

                    {/* Clean real-time 30-second countdown indicator */}
                    {!isGeneratingQuestion && currentQuestion && (
                      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold transition-colors ${
                        timeLeft <= 10 
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse" 
                          : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                      }`} title="Time left to answer this question">
                        <Clock className="w-3.5 h-3.5 shrink-0 animate-spin-slow" />
                        <span>{timeLeft}s remaining</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-3 self-end sm:self-center">
                    {/* Speak again replay helper */}
                    {currentQuestion && !isGeneratingQuestion && (
                      <button
                        id="btn_room_replay_audio"
                        onClick={() => speakQuestion(currentQuestion.question)}
                        className="p-1.5 rounded-lg hover:bg-slate-900/80 text-slate-400 hover:text-white transition-colors"
                        title="Replay Spoken Question"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Mute/Play Synthesizer Toggle */}
                    <button
                      id="btn_room_toggle_sound"
                      onClick={handleMuteToggle}
                      className="p-1.5 rounded-lg hover:bg-slate-900/80 text-slate-400 hover:text-white transition-colors"
                      title={isMuted ? "Unmute Voice" : "Mute Voice"}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                    </button>

                    {/* End Interview / Conclude early controls */}
                    <button
                      id="btn_room_conclude_early"
                      type="button"
                      onClick={() => setConfirmEndInterview(true)}
                      className="ml-2 h-7 px-2.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-mono font-bold tracking-wider uppercase hover:bg-rose-500 hover:text-slate-950 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      title="End Interview early"
                    >
                      <XCircle className="w-3.5 h-3.5" /> End Interview
                    </button>
                  </div>
                </div>

                {/* Secure early-conclude inline confirmation overlay */}
                {confirmEndInterview && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-5 rounded-xl bg-rose-950/20 border-2 border-rose-500/35 relative overflow-hidden space-y-4 text-left"
                  >
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
                    
                    <div className="flex gap-3 items-start">
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <strong className="text-xs font-extrabold uppercase font-mono text-rose-300 block tracking-wider">Conclude Interview early?</strong>
                        <p className="text-[11px] text-slate-300 leading-normal font-light">
                          Are you sure you want to exit? Your answered questions up to now will be scored, and an automated report will be compiled immediately. Remaining unanswered questions will be marked as skipped.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 text-xs pt-1">
                      <button
                        type="button"
                        onClick={() => setConfirmEndInterview(false)}
                        className="px-4 h-8 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-mono uppercase tracking-wider cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleEndInterviewNow}
                        className="px-4 h-8 rounded-lg bg-rose-500 text-slate-950 hover:bg-rose-400 font-extrabold font-mono uppercase tracking-wider shadow-md shadow-rose-950/20 cursor-pointer"
                      >
                        Yes, End Now
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* THE QUESTION DISPLAY */}
                <div className="space-y-3 p-5 rounded-xl bg-slate-950/80 border border-slate-850 relative min-h-[160px] flex flex-col justify-between">
                  <span className="text-[9px] font-mono uppercase text-slate-500 tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    SYSTEM INTERVIEW QUESTION LISTED
                  </span>

                  {isGeneratingQuestion ? (
                    <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400 font-mono">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      Executive recruiter formulating custom inquiry...
                    </div>
                  ) : currentQuestion ? (
                    <div className="space-y-4">
                      <p className="text-sm sm:text-base text-slate-100 leading-relaxed font-sans font-medium">
                        {currentQuestion.question}
                      </p>

                      {currentQuestion.is_mcq && currentQuestion.mcq_options && (
                        <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                          {currentQuestion.mcq_options.map((option, idx) => {
                            const optionLetter = ["A", "B", "C", "D"][idx];
                            const isSelected = selectedMcqOptionIdx === idx;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedMcqOptionIdx(idx)}
                                className={`p-4 rounded-xl text-left text-xs font-sans font-medium border transition-all duration-150 flex items-start gap-3 cursor-pointer ${
                                  isSelected
                                    ? "bg-emerald-400/10 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-950/20"
                                    : "bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-300"
                                }`}
                              >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold border-2 shrink-0 ${
                                  isSelected
                                    ? "bg-emerald-400 text-slate-950 border-emerald-500 animate-pulse"
                                    : "bg-slate-950 text-slate-400 border-slate-700"
                                }`}>
                                  {optionLetter}
                                </span>
                                <span className="pt-0.5 leading-relaxed">{option}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {currentQuestion.is_mcq && (
                        <div className="pt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono flex-wrap gap-2">
                          <span className={selectedMcqOptionIdx !== null ? "text-emerald-400 font-semibold" : "text-amber-400/80 animate-pulse"}>
                            {selectedMcqOptionIdx !== null ? `✔ Selected: Option ${["A", "B", "C", "D"][selectedMcqOptionIdx]}` : "⚠ Please select an answer option above to proceed"}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 font-mono">Initiating room...</p>
                  )}
                {/* USER RECORD PANEL CARD */}
                {!currentQuestion.is_mcq ? (
                  <div id="user_record_panel_card" className="p-6 rounded-xl border border-slate-850 bg-slate-950 flex flex-col items-stretch text-left relative py-6 min-h-[300px] w-full">
                    
                    <div className="space-y-1.5 border-b border-slate-900 pb-3 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono uppercase text-emerald-400 block tracking-wider font-semibold">Response Canvas</span>
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 uppercase font-bold flex items-center gap-1.5">
                            <Sparkles className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                            Certified Google Speech-to-Text
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 block leading-tight mt-1">
                          High-precision voice answering. Powered by Google Cloud Speech-to-Text & Gemini AI.
                        </span>
                      </div>
                      <div className="flex gap-2.5 items-center self-start sm:self-center flex-wrap">
                        {recordedTranscript && (
                          <button
                            id="btn_room_clear_response"
                            onClick={handleReRecord}
                            className="text-[9px] font-mono text-slate-500 hover:text-rose-400 transition-colors uppercase tracking-wider cursor-pointer"
                          >
                            [Reset Canvas]
                          </button>
                        )}
                        <button
                          type="button"
                          id="btn_room_toggle_keyboard"
                          onClick={() => {
                            setIsKeyboardFallback(!isKeyboardFallback);
                            setErrorText("");
                          }}
                          className={`text-[9.5px] font-mono px-2 py-0.5 rounded border transition-colors uppercase tracking-wider cursor-pointer font-bold ${
                            isKeyboardFallback 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20" 
                              : "bg-slate-900 text-slate-450 border-slate-800 hover:text-white hover:border-slate-700"
                          }`}
                        >
                          {isKeyboardFallback ? "Switch to Voice Mode" : "Type Response Manually"}
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <textarea
                        id="fallback_answer_input"
                        value={recordedTranscript}
                        onChange={isKeyboardFallback ? (e) => setRecordedTranscript(e.target.value) : undefined}
                        readOnly={!isKeyboardFallback}
                        placeholder={isKeyboardFallback ? "Type your response here manually..." : "Your dictated response will appear here as a whole. Tap the microphone below to start speaking or click 'Type Response Manually' to start typing..."}
                        className={`w-full h-36 bg-slate-900/40 border rounded-lg p-3.5 text-xs font-sans tracking-wide leading-relaxed resize-none transition-all selection:bg-slate-800 focus:outline-none ${
                          isKeyboardFallback 
                            ? "border-slate-800 text-slate-200 focus:border-emerald-500/50 cursor-text" 
                            : "border-slate-880 text-slate-350 cursor-not-allowed"
                        }`}
                      />

                      {/* Live Recognition Feed floating inside or under the textarea */}
                      {recordingState === "listening" && (
                        <div className="absolute inset-x-2 bottom-2 p-2 rounded bg-slate-950/95 border border-dashed border-emerald-500/30 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-tight shrink-0 font-semibold">Real-time Recognition:</span>
                          <p className="text-[10px] text-slate-300 font-sans truncate pr-2">
                            {interimSpeechText || liveSpeechText || "Start speaking. Your words will display here in real-time..."}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Word count read-out */}
                    <div className="flex justify-between items-center bg-slate-950/40 px-3 py-1.5 rounded-md border border-slate-900/60 mt-2">
                      <span className="text-[9px] font-mono text-slate-500">
                        Word count: {recordedTranscript ? recordedTranscript.trim().split(/\s+/).filter(Boolean).length : 0}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500">
                        Characters: {recordedTranscript.length}
                      </span>
                    </div>

                    {/* MIC AND TRANSCRIBE FEED CONTROLS */}
                    <div className="mt-5 flex flex-col items-center justify-center py-4 border-t border-slate-900/60">
                      <AnimatePresence mode="wait">
                        
                        {recordingState === "listening" ? (
                          <motion.div
                            key="listening_ctrl"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center gap-3 w-full"
                          >
                            <div className="relative">
                              <div className="absolute inset-0 bg-rose-500/25 rounded-full blur-md animate-ping" />
                              <button
                                id="btn_mic_listening"
                                onClick={handleStopSpeaking}
                                className="w-12 h-12 bg-rose-500 text-white rounded-full flex items-center justify-center hover:scale-105 duration-150 cursor-pointer"
                                title="Stop Dictation & Refine Answer"
                              >
                                <Square className="w-4 h-4 fill-current text-white" />
                              </button>
                            </div>
                            <div className="text-center">
                              <span className="text-[10px] font-bold text-rose-400 block uppercase tracking-wide">DICTATING RESPONSES LIVE</span>
                              <span className="text-[9px] font-mono text-slate-500 block max-w-xs leading-normal font-light">
                                Tap the stop button to lock voice details and apply high-fidelity text filters.
                              </span>
                            </div>
                          </motion.div>
                        ) : recordingState === "transcribing" || isTranscribing ? (
                          <motion.div
                            key="transcribing_ctrl"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center gap-2 py-2"
                          >
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                            <div className="text-center">
                              <p className="text-[10px] font-bold text-slate-200 uppercase">Generating precision transcript...</p>
                              <span className="text-[9px] font-mono text-slate-500 block">WAV resampling and executive AI correction in progress</span>
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="idle_ctrl"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center gap-3 w-full text-center"
                          >
                            <button
                              id="btn_mic_activate"
                              onClick={handleStartSpeaking}
                              className="w-12 h-12 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center hover:scale-105 duration-150 transition-transform cursor-pointer shadow-md shadow-emerald-500/10 animate-pulse"
                              title="Start Spoken Dictation"
                            >
                              <Mic className="w-5 h-5 text-slate-950" />
                            </button>
                            <div>
                              <span className="text-[10px] font-bold text-white uppercase tracking-wider block">Tap to Dictate via Voice</span>
                              <span className="text-[9px] text-slate-500 max-w-sm leading-normal block font-light">
                                Speak your response. It will type into the canvas as a whole in real-time, then refine via Gemini AI!
                              </span>
                            </div>
                          </motion.div>
                        )}

                      </AnimatePresence>
                    </div>

                  </div>
                ) : (
                  <div id="user_record_panel_card_mcq" className="p-8 rounded-xl border border-slate-850 bg-slate-950 flex flex-col items-center justify-center text-center py-10 min-h-[300px] w-full">
                    <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-400 mb-4">
                      <CheckSquare className="w-8 h-8 text-emerald-400 animate-pulse" />
                    </div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Multiple Choice Option Lock</h3>
                    <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                      {selectedMcqOptionIdx !== null 
                        ? `You have selected Option ${["A", "B", "C", "D"][selectedMcqOptionIdx]}: "${currentQuestion.mcq_options?.[selectedMcqOptionIdx]}". Click below to lock in and save your selection.`
                        : "Please choose one of the options in the cards above to proceed."
                      }
                    </p>
                    
                    <button
                      id="btn_room_submit_mcq"
                      onClick={handleSubmitAnswer}
                      disabled={selectedMcqOptionIdx === null || isEvaluating}
                      className="h-11 px-8 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer disabled:bg-slate-800 disabled:text-slate-550 transition-all hover:scale-[1.02] active:scale-100"
                    >
                      {isEvaluating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Evaluating selection...
                        </>
                      ) : (
                        <>
                          Save & Continue <ArrowRight className="w-4 h-4 font-black text-slate-950" />
                        </>
                      )}
                    </button>
                  </div>
                )}

                </div>

                {/* BOTTOM OPERATIONS SUBMIT ACTIONS */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-900 w-full gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block leading-none">
                      Status: {recordingState === "listening" ? "DICTATING" : recordingState === "transcribing" ? "PROCESSING" : "COMPOSING"}
                    </span>
                    
                    <button
                      id="btn_room_emergency_end"
                      type="button"
                      onClick={handleEndInterviewNow}
                      className="h-8 px-3 rounded-lg border border-rose-950/20 bg-rose-950/10 hover:bg-rose-900/20 text-rose-450 hover:text-rose-400 font-mono text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all shrink-0"
                      title="Forcibly finalize and save intermediate interview logs"
                    >
                      <XCircle className="w-3 h-3 text-rose-400" />
                      End & Save
                    </button>
                  </div>

                  {recordedTranscript.trim().length > 0 && (
                    <button
                      id="btn_room_submit_response"
                      onClick={handleSubmitAnswer}
                      disabled={isEvaluating}
                      className="h-10 px-6 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:bg-slate-800 disabled:text-slate-500 cursor-pointer"
                    >
                      {isEvaluating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Evaluating narrative...
                        </>
                      ) : (
                        <>
                          Submit & Next <Check className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>

              </div>
            )}

          </div>

        </div>
      </main>

      <footer className="py-4 border-t border-slate-900 min-h-[40px] text-center text-[10px] text-slate-600 bg-slate-950 z-10 relative">
        All voice transcripts are aggregated on device streams. Full-stack proxy uses authentic Gemini parameters.
      </footer>

    </div>
  );
}
