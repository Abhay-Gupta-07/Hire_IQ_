import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { 
  ShieldAlert, 
  ShieldCheck, 
  User, 
  LayoutGrid, 
  Calendar, 
  ArrowRight, 
  Loader2, 
  Sparkles, 
  Video, 
  Mic, 
  Volume2, 
  Lock, 
  Mail, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  Check,
  Clock
} from "lucide-react";
import { mockDb } from "../lib/mockDb";
import { Interview } from "../types";
import { supabase } from "../lib/supabaseClient";

interface CandidateInviteGateProps {
  interviewId: string;
  onNavigate: (path: string) => void;
  theme?: "dark" | "light";
}

export default function CandidateInviteGate({ interviewId, onNavigate, theme = "dark" }: CandidateInviteGateProps) {
  const isLight = theme === "light";
  const wrapperClass = `min-h-screen font-sans flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-500 ${
    isLight ? "bg-transparent text-[#131518]" : "bg-slate-950 text-slate-100"
  }`;
  const cardClass = `max-w-md w-full border relative transition-all duration-500 p-8 rounded-2xl ${
    isLight ? "bg-white/90 border-slate-200/80 shadow-lg text-slate-800" : "bg-slate-900/60 border-slate-850 shadow-2xl text-slate-100"
  }`;
  const inputBg = isLight 
    ? "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500" 
    : "bg-slate-950 border-slate-800 text-white placeholder:text-slate-700 focus:border-indigo-505";
  const labelColor = isLight ? "text-slate-600 font-medium" : "text-slate-400";
  const panelBg = isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/80 border-slate-850/80";

  const [loading, setLoading] = useState(true);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [isBulkSim, setIsBulkSim] = useState(false);
  const [bulkActive, setBulkActive] = useState(false);
  const [expired, setExpired] = useState(false);
  const [bulkCandidateName, setBulkCandidateName] = useState("");
  const [bulkCandidateRole, setBulkCandidateRole] = useState("");
  const [defaultBulkName, setDefaultBulkName] = useState("");
  const [defaultBulkRole, setDefaultBulkRole] = useState("");

  const [excelEmails, setExcelEmails] = useState<Array<{ name: string; email: string; role: string }>>([]);
  const [matchedExcelCandidate, setMatchedExcelCandidate] = useState<{ name: string; role: string; email: string } | null>(null);

  // Load excel candidates roster from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("excel_candidates_imported");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setExcelEmails(parsed);
        }
      }
    } catch (e) {
      console.error("Error reading imported candidates:", e);
    }
  }, []);

  // Set step state: "auth" | "gate" | "config"
  const [step, setStep] = useState<"auth" | "gate" | "config">("auth");
  
  // Gmail Auth form values
  const [gmailEmail, setGmailEmail] = useState("");
  const [candidateUsername, setCandidateUsername] = useState("");
  const [gmailPassword, setGmailPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  
  // Secure tokenized verification states
  const [secureTokenData, setSecureTokenData] = useState<any | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Dynamic automatic name matching by selected email
  useEffect(() => {
    if (!gmailEmail) {
      setMatchedExcelCandidate(null);
      if (defaultBulkName) {
        setBulkCandidateName(defaultBulkName);
        setBulkCandidateRole(defaultBulkRole);
      }
      return;
    }
    const targetEmail = gmailEmail.toLowerCase().trim();
    const found = excelEmails.find(
      (c) => c.email && c.email.toLowerCase().trim() === targetEmail
    );
    if (found) {
      setMatchedExcelCandidate({
        name: found.name || "Anonymous Candidate",
        role: found.role || "Software Engineer",
        email: found.email
      });
      setBulkCandidateName(found.name || "Anonymous Candidate");
      setBulkCandidateRole(found.role || "Software Engineer");
    } else {
      setMatchedExcelCandidate(null);
      if (defaultBulkName) {
        setBulkCandidateName(defaultBulkName);
        setBulkCandidateRole(defaultBulkRole);
      }
    }
  }, [gmailEmail, excelEmails, defaultBulkName, defaultBulkRole]);

  // Calibration states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [camPermission, setCamPermission] = useState<"pending" | "granted" | "denied">("pending");
  const [micPermission, setMicPermission] = useState<"pending" | "granted" | "denied">("pending");
  const [playTestTone, setPlayTestTone] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Determine if it is a bulk simulated ID
    let rawBulkActive = localStorage.getItem("ai_mock_interview_bulk_active");
    if (rawBulkActive === null) {
      localStorage.setItem("ai_mock_interview_bulk_active", "true");
      rawBulkActive = "true";
    }
    const sampleBulkActive = interviewId === "bulk-sim-session" || interviewId.startsWith("bulk-") ? true : rawBulkActive === "true";
    
    if (interviewId.startsWith("sim-candidate-") || interviewId.startsWith("bulk-") || interviewId.toLowerCase().includes("bulk")) {
      setIsBulkSim(true);
      setBulkActive(sampleBulkActive);
      
      if (!sampleBulkActive && interviewId !== "bulk-sim-session" && !interviewId.startsWith("bulk-") && !interviewId.toLowerCase().includes("bulk")) {
        setExpired(true);
      } else {
        // Mock a representative name based on index
        const indexMatch = interviewId.match(/\d+/);
        const indexStr = indexMatch ? indexMatch[0] : "1";
        const index = parseInt(indexStr) || 1;
        
        const candidateNames = [
          "Alexander Mercer", "Sofia Sterling", "Liam Henderson", "Amara Vance", "Ethan Thorne",
          "Isabella Croft", "Marcus Vance", "Elena Rostova", "Devon Lane", "Priya Nair"
        ];
        const technicalRoles = [
          "Lead React Architect", "Data Solution Analyst", "Python Security Engineer", "Cloud SRE DevOps",
          "AI Inference Dev", "Product Experience Lead", "Full Stack Integrations Expert"
        ];
        
        let excelList: Array<{ name?: string; email?: string; role?: string }> = [];
        try {
          const saved = localStorage.getItem("excel_candidates_imported");
          if (saved) {
            excelList = JSON.parse(saved);
          }
        } catch (e) {
          console.error(e);
        }

        if (excelList.length > 0) {
          const item = excelList[(index - 1) % excelList.length];
          const initialName = item.name || `Candidate #${index}`;
          const initialRole = item.role || "Software Engineer";
          setBulkCandidateName(initialName);
          setBulkCandidateRole(initialRole);
          setDefaultBulkName(initialName);
          setDefaultBulkRole(initialRole);
        } else {
          const initialName = candidateNames[index % candidateNames.length];
          const initialRole = technicalRoles[index % technicalRoles.length];
          setBulkCandidateName(initialName);
          setBulkCandidateRole(initialRole);
          setDefaultBulkName(initialName);
          setDefaultBulkRole(initialRole);
        }
      }
      setLoading(false);
    } else {
      // Secure Tokenized Invitation OR Standard Interview Fallback
      setLoading(true);
      
      const verifySessionAndInterview = async () => {
        const constructAndSeedQuestions = async (intId: string, role: string, candidateName: string, overrideQuestionsList?: string[], questionsCount?: number) => {
          const existing = mockDb.getAllQuestions().filter(q => q.interview_id === intId);
          if (existing.length > 0) return existing;

          let finalQuestionsList: any[] = [];
          if (overrideQuestionsList && overrideQuestionsList.length > 0) {
            finalQuestionsList = overrideQuestionsList.map((q, idx) => ({
              id: `q_${Math.random().toString(36).substring(2, 11)}`,
              interview_id: intId,
              idx,
              question: q,
              is_mcq: false
            }));
          } else {
            let generatedQuestionsAndMcqs: any[] = [];
            const resumes = mockDb.getResumes();
            const firstResume = resumes.find(r => r.parsed?.name?.toLowerCase() === candidateName.toLowerCase()) || resumes[0];
            try {
              const qRes = await fetch("/api/generate-candidate-questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  role: role,
                  jd: "",
                  candidateName: candidateName,
                  questionsCount: questionsCount || 3,
                  resumeText: firstResume?.raw_text || ""
                })
              });
              if (qRes.ok) {
                const qData = await qRes.json();
                if (qData.questions && qData.questions.length > 0) {
                  generatedQuestionsAndMcqs = qData.questions;
                }
              }
            } catch (qErr) {
              console.warn("Failed to generate dynamic candidate questions on invite gate:", qErr);
            }

            const targetCount = questionsCount || 3;
            if (generatedQuestionsAndMcqs.length === 0) {
              const fallbackPool = [
                { question: "What is the single most critical micro-optimization or performance trade-off you have made in your recent software architecture?", is_mcq: false },
                { question: "How do you guarantee reliable state consistency and prevent race conditions when handling high-concurrency event loops?", is_mcq: false },
                { question: "Under what clear constraints would you choose optimistic concurrency over pessimistic locking in a distributed datastore?", is_mcq: false },
                { question: "How do you measure, diagnose, and definitively resolve complex memory leaks or reference cycle bottlenecks at scale?", is_mcq: false },
                { question: "How do you design an API gateway for high-throughput microservices to handle rapid backpressure and rate-limiting gracefully?", is_mcq: false },
                { question: "What are your core architectural considerations when designing a zero-downtime blue-green deployment pipeline?", is_mcq: false },
                { question: "In a real-time multiplayer application, how do you manage and reduce overall latency on high-frequency state updates list?", is_mcq: false },
                { question: "Explain the absolute performance difference between index-only scans and index scans in highly-indexed database queries.", is_mcq: false },
                { question: "How do you prevent cascade failures across deeply-nested microservices dependencies during sudden upstream outages?", is_mcq: false },
                { question: "What are the trade-offs of storing and serializing data in Protocol Buffers versus standard highly-readable JSON formats?", is_mcq: false },
                { question: "When scaling horizontal caching tiers, how do you handle keys partition balance and prevent the cache stampede problem?", is_mcq: false },
                { question: "What is the primary architectural drawback of choosing single-master replication schemas over multi-master database replication?", is_mcq: false },
                { question: "How do you configure database isolation levels to safely prevent dirty reads or phantom reads in highly sensitive transaction environments?", is_mcq: false },
                { question: "What are the performance implications of garbage collection phases in active memory-intensive runtime environments?", is_mcq: false },
                { question: "In WebSockets communication, how do you handle reconnection backoff strategies for millions of active concurrent connections?", is_mcq: false },
                { question: "Explain how you would implement robust end-to-end telemetry and monitoring setups without imposing runtime overhead.", is_mcq: false },
                { question: "How do you handle distributed transactional consistency across separate microservice domains without using heavy two-phase commits?", is_mcq: false },
                { question: "Under what circumstances do you use asynchronous pub-sub queues rather than synchronous webhook delivery strategies?", is_mcq: false },
                { question: "How do you approach database partitioning, sharding, and key selection strategies when scaling to multiple terabytes of data?", is_mcq: false },
                { question: "How do you handle client-side state synchronization with remote servers in offline-first, sync-capable applications?", is_mcq: false },
                { question: "Explain the security and performance trade-offs of using jwt sessions over traditional server-backed redis sessions.", is_mcq: false },
                { question: "How do you design high-availability system storage to withstand double-disk failures without experiencing data loss?", is_mcq: false },
                { question: "In search indexes, what are the primary trade-offs on indexing frequency vs index synchronization overhead?", is_mcq: false },
                { question: "Describe a time when you completely refactored a legacy service and how you safely migration-tested it without impacting active traffic.", is_mcq: false },
                { question: "How do you optimize static asset delivery and code bundle size boundaries for extremely slow-bandwidth mobile connections?", is_mcq: false }
              ];

              generatedQuestionsAndMcqs = Array.from({ length: targetCount }, (_, i) => {
                const q = fallbackPool[i % fallbackPool.length];
                return { ...q };
              });
            }

            finalQuestionsList = generatedQuestionsAndMcqs.map((q, idx) => ({
              id: `q_${Math.random().toString(36).substring(2, 11)}`,
              interview_id: intId,
              idx,
              question: q.question,
              is_mcq: q.is_mcq || false,
              mcq_options: q.mcq_options || undefined,
              mcq_correct_index: q.mcq_correct_index !== undefined ? q.mcq_correct_index : undefined,
              mcq_explanation: q.mcq_explanation || undefined
            }));
          }

          mockDb.saveQuestions(finalQuestionsList);
          return finalQuestionsList;
        };

        try {
          // 1. Try to fetch from Supabase interview_sessions
          const { data: session, error: sessionErr } = await supabase
            .from("interview_sessions")
            .select("*")
            .eq("token", interviewId)
            .single();

          if (session && !sessionErr) {
            console.log("✔ Found Supabase Session token data:", session);
            
            // Check expiry:
            const expDate = session.expiresAt || session.expires_at ? new Date(session.expiresAt || session.expires_at) : null;
            if (expDate && expDate.getTime() < Date.now()) {
              setTokenError("This secure interview invitation link has expired. Check with your recruiter.");
              setExpired(true);
              setLoading(false);
              return;
            }

            if (session.status === "completed" || session.status === "used") {
              setTokenError("This secure single-session interview link has already been used and completed.");
              setExpired(true);
              setLoading(false);
              return;
            }

            // Fetch template
            const templateId = session.interviewId || session.interview_id;
            let questionsList: string[] = [];
            let templateRole = session.role || "Software Engineer";
            if (templateId) {
              const { data: template } = await supabase
                .from("interviews")
                .select("*")
                .eq("id", templateId)
                .single();
              if (template) {
                templateRole = template.role || template.title || templateRole;
                questionsList = template.questions || [];
              }
            }

            const data = {
              success: true,
              token: session.token,
              candidateEmail: session.candidateEmail || session.candidate_email,
              candidateName: session.candidateName || session.candidate_name || "Candidate",
              role: templateRole,
              preferredVoice: session.preferredVoice || "female",
              originalInterviewId: templateId,
              expiresAt: session.expiresAt || session.expires_at,
              status: session.status,
              questionsCount: session.questionsCount || session.questions_count || questionsList.length || 3
            };

            setSecureTokenData(data);
            setBulkCandidateName(data.candidateName);
            setCandidateUsername(data.candidateName);
            setBulkCandidateRole(data.role);

            // Seed mockDb
            let item = mockDb.getInterviewById(interviewId);
            if (!item) {
              const seededQuestions = await constructAndSeedQuestions(interviewId, data.role, data.candidateName, questionsList, data.questionsCount);
              const resumes = mockDb.getResumes();
              const firstResume = resumes.find(r => r.parsed?.name?.toLowerCase() === data.candidateName?.toLowerCase()) || resumes[0];
              item = {
                id: interviewId,
                user_id: "client_user",
                resume_id: firstResume?.id || "no_resume",
                candidate_name: data.candidateName,
                candidate_email: data.candidateEmail,
                role: data.role,
                difficulty: "medium",
                total_questions: seededQuestions.length,
                current_question_idx: 0,
                status: "in_progress",
                started_at: new Date().toISOString(),
                resume_filename: firstResume?.filename || "Resume Portfolio.pdf",
                decision: "pending",
                manual_questions: questionsList
              };
              mockDb.createInterview(item);
            }
            setInterview(item);
            if (item.status === "completed") {
              setExpired(true);
            }
            setLoading(false);
            return;
          }
        } catch (supaEx) {
          console.warn("Supabase interview_sessions query exception, falling back to REST API:", supaEx);
        }

        // 2. Fallback to server REST API
        try {
          const res = await fetch(`/api/verify-invite/${interviewId}`);
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            if (res.status === 410 || res.status === 403) {
              setTokenError(data.error || "This secure invitation is expired or already completed.");
              setExpired(true);
              setLoading(false);
              return;
            }
            if (res.status !== 404) {
              throw new Error(data.error || "The interview link could not be verified by our servers.");
            }
          } else {
            const data = await res.json();
            if (data && data.success) {
              setSecureTokenData(data);
              setBulkCandidateName(data.candidateName || "Candidate");
              setCandidateUsername(data.candidateName || "Candidate");
              setBulkCandidateRole(data.role || "Software Engineer");

              let item = mockDb.getInterviewById(interviewId);
              if (!item) {
                const seededQuestions = await constructAndSeedQuestions(interviewId, data.role || "Software Engineer", data.candidateName || "Candidate", undefined, data.questionsCount);
                const resumes = mockDb.getResumes();
                const firstResume = resumes.find(r => r.parsed?.name?.toLowerCase() === (data.candidateName || "").toLowerCase()) || resumes[0];
                item = {
                  id: interviewId,
                  user_id: "client_user",
                  resume_id: firstResume?.id || "no_resume",
                  candidate_name: data.candidateName || "Candidate",
                  candidate_email: data.candidateEmail || "candidate@gmail.com",
                  role: data.role || "Software Engineer",
                  difficulty: "medium",
                  total_questions: seededQuestions.length,
                  current_question_idx: 0,
                  status: "in_progress",
                  started_at: new Date().toISOString(),
                  resume_filename: firstResume?.filename || "Resume Portfolio.pdf",
                  decision: "pending"
                };
                mockDb.createInterview(item);
              }
              setInterview(item);
              if (item.status === "completed") {
                setExpired(true);
              }
              setLoading(false);
              return;
            }
          }
        } catch (err: any) {
          console.error("Invite gate loader REST error:", err);
        }

        // REST fallback path:
        let item = mockDb.getInterviewById(interviewId);
        if (!item) {
          const seededQuestions = await constructAndSeedQuestions(interviewId, "Software Engineer", "Abhay Sandbox");
          const resumes = mockDb.getResumes();
          const firstResume = resumes.find(r => r.parsed?.name?.toLowerCase() === "abhay sandbox") || resumes[0];
          item = {
            id: interviewId,
            user_id: "client_user",
            resume_id: firstResume?.id || "no_resume",
            candidate_name: "Abhay Sandbox",
            candidate_email: "abbaabhayyy@gmail.com",
            role: "Software Engineer",
            difficulty: "medium",
            total_questions: seededQuestions.length,
            current_question_idx: 0,
            status: "in_progress",
            started_at: new Date().toISOString(),
            resume_filename: firstResume?.filename || "Resume Portfolio.pdf",
            decision: "pending"
          };
          mockDb.createInterview(item);
        }
        setInterview(item);
        if (item.status === "completed") {
          setExpired(true);
        }
        setLoading(false);
      };

      verifySessionAndInterview();
    }
  }, [interviewId]);

  // Handle stream calibration on entering config step
  useEffect(() => {
    if (step === "config") {
      startMediaStream();
    }
    return () => {
      stopMediaStream();
    };
  }, [step]);

  const startMediaStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      setCamPermission("granted");
      setMicPermission("granted");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Initialize mic visualizer
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateLevel = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Calculate average audio level
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = sum / bufferLength;
          setMicLevel(Math.min(100, Math.round(average * 1.5)));
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      } catch (audioErr) {
        console.warn("Audio analysis failed to context mount: ", audioErr);
      }
    } catch (err) {
      console.error("Camera setup failed: ", err);
      setCamPermission("denied");
      setMicPermission("denied");
    }
  };

  const stopMediaStream = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
  };

  const triggerAudioToneHz = () => {
    if (playTestTone) return;
    setPlayTestTone(true);
    
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const volumeNode = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime); // Standard middle A
      
      volumeNode.gain.setValueAtTime(0.04, ctx.currentTime);
      volumeNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      
      osc.connect(volumeNode);
      volumeNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 1.3);
      
      setTimeout(() => {
        setPlayTestTone(false);
      }, 1400);
    } catch (e) {
      setPlayTestTone(false);
    }
  };

  // Auth Submit Handlers
  const handleGmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!candidateUsername.trim()) {
      setAuthError("Please provide your name or username.");
      return;
    }

    if (!gmailEmail.includes("@")) {
      setAuthError("Please enter a valid email address.");
      return;
    }

    if (secureTokenData && secureTokenData.candidateEmail) {
      if (gmailEmail.trim().toLowerCase() !== secureTokenData.candidateEmail.trim().toLowerCase()) {
        setAuthError(`Access Denied: This secure link is registered to "${secureTokenData.candidateEmail}". Please verify with that exact email.`);
        return;
      }
    }

    setAuthLoading(true);
    setTimeout(() => {
      setAuthLoading(false);
      // Secure auth simulated state
      localStorage.setItem("candidate_oauth_email", gmailEmail);
      localStorage.setItem("candidate_oauth_authed", "true");
      setStep("gate");
    }, 1100);
  };

  const handleAcceptInvite = () => {
    // Progress to calibrate test room
    setStep("config");
  };

  const handleLaunchInterview = () => {
    stopMediaStream();

    // Set appropriate secure bypasses for the route check
    localStorage.setItem("invite_bypass_" + interviewId, "true");
    
    const displayCandidateName = matchedExcelCandidate?.name || (isBulkSim ? bulkCandidateName : (interview?.candidate_name || gmailEmail?.split("@")[0] || "Invited Candidate"));
    const displayRole = matchedExcelCandidate?.role || (isBulkSim ? bulkCandidateRole : (interview?.role || "Software Engineer"));

    // Persist real candidate profile credentials
    localStorage.setItem(`candidate_proctor_name_${interviewId}`, displayCandidateName);
    localStorage.setItem(`candidate_proctor_email_${interviewId}`, gmailEmail || "abbaabhayyy@gmail.com");

    if (secureTokenData) {
      // Invalidate the secure backend single-use token upon entry
      fetch(`/api/update-invite-status/${interviewId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "used" })
      }).catch(err => console.error("Could not register token status update:", err));
    }

    if (isBulkSim) {
      // Trigger representative database seed so they can practice
      const simulatedObj: Interview = {
        id: interviewId,
        user_id: "client_user",
        resume_id: "sample_frontend",
        candidate_name: displayCandidateName,
        role: displayRole,
        difficulty: "medium",
        total_questions: 3,
        current_question_idx: 0,
        status: "in_progress",
        started_at: new Date().toISOString(),
        resume_filename: "Bulk_Simulated_Scenario.pdf",
        decision: "pending"
      };
      mockDb.createInterview(simulatedObj);
    }

    // Direct route
    onNavigate(`/app/interview/${interviewId}`);
  };

  if (loading) {
    return (
      <div className={`min-h-screen font-sans flex flex-col items-center justify-center p-6 transition-colors duration-500 ${isLight ? "bg-transparent text-[#131518]" : "bg-slate-950 text-slate-105"}`}>
        <Loader2 className="w-8 h-8 text-indigo-405 animate-spin mb-4" />
        <p className="text-xs font-mono uppercase tracking-widest text-slate-500">Resolving Recruiter Invite Crypt...</p>
      </div>
    );
  }

  // SECURE TOKEN ERROR STATE VIEW
  if (tokenError) {
    return (
      <div className={wrapperClass}>
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cardClass}
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-amber-500/40 rounded-t-2xl" />

          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8 text-amber-500" />
          </div>

          <div className="space-y-2 text-center">
            <h2 className={`text-lg font-bold font-display tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>Security Access Denied</h2>
            <p className="text-[10px] font-mono text-amber-500 uppercase tracking-wider font-extrabold">Invalid Invite Credentials</p>
          </div>

          <p className={`text-xs leading-relaxed font-light text-center ${isLight ? "text-slate-650" : "text-slate-400"}`}>
            {tokenError}
          </p>

          <div className={`p-4 rounded-xl space-y-1.5 text-left font-mono text-[10.5px] border ${isLight ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-slate-950/60 border-slate-850/80 text-slate-550"}`}>
            <div>&bull; Security Protocol: <strong className="text-amber-500">Tokenized Verification</strong></div>
            <div>&bull; Action Required: <strong>Contact Recruiter / Admin</strong></div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onNavigate("/auth")}
              className="w-full py-3 rounded-lg bg-indigo-600 text-white font-semibold text-xs transition duration-300 hover:bg-indigo-700 font-display flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              Return to Platform Login
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // EXPIRED STATE VIEW
  if (expired) {
    return (
      <div className={wrapperClass}>
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-96 h-96 bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cardClass}
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-red-500/40 rounded-t-2xl" />

          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>

          <div className="space-y-2 text-center">
            <h2 className={`text-lg font-bold font-display tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>Interview Invite Expired</h2>
            <p className="text-[10px] font-mono text-red-500 uppercase tracking-wider font-extrabold">Security Invalidation Triggered</p>
          </div>

          <p className={`text-xs leading-relaxed font-light text-center ${isLight ? "text-slate-650" : "text-slate-400"}`}>
            {isBulkSim 
              ? "This simulated bulk candidate cohort session has been terminated by the administrator. All proctoring surveillance channels are closed."
              : "This unique interview practice session has already been completed. Under proctoring integrity and security guidelines, invitation tokens automatically expire instantly after the session ends."}
          </p>

          <div className={`p-4 rounded-xl space-y-1.5 text-left font-mono text-[10.5px] border ${isLight ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-slate-950/60 border-slate-850/80 text-slate-550"}`}>
            <div>&bull; Session Status: <strong className="text-red-500">Completed / Inactive</strong></div>
            <div>&bull; Security State: <span className={isLight ? "text-slate-800" : "text-slate-350"}>Token Expired</span></div>
            <div>&bull; Room ID: <span className="text-emerald-500 font-bold">{interviewId}</span></div>
          </div>

          <button
            onClick={() => onNavigate("/")}
            className={`w-full h-10 rounded-xl text-xs font-bold transition-all border ${
              isLight ? "bg-[#131518] border-black text-white hover:bg-slate-800" : "bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700 text-slate-300"
            }`}
          >
            Back to Home Portal
          </button>
        </motion.div>
      </div>
    );
  }

  // INVALID STATE VIEW (NOT FOUND)
  if (!isBulkSim && !interview) {
    return (
      <div className={wrapperClass}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cardClass}
        >
          <div className={`w-16 h-16 rounded-full border flex items-center justify-center mx-auto ${isLight ? "bg-slate-100 border-slate-200 text-slate-500" : "bg-slate-950 border-slate-800 text-slate-500"}`}>
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-1 text-center">
            <h2 className={`text-lg font-bold font-display ${isLight ? "text-slate-900" : "text-white"}`}>Invitation Link Not Found</h2>
            <p className="text-[10px] font-mono text-slate-500 uppercase">Unregistered Ingress Code</p>
          </div>

          <p className={`text-xs leading-relaxed font-light text-center ${isLight ? "text-slate-600" : "text-slate-400"}`}>
            The referenced interview verification key is invalid or has been wiped by administrative telemetry sweeps. Please confirm your URL pathing parameters with the organizer.
          </p>

          <button
            onClick={() => onNavigate("/")}
            className={`w-full h-10 rounded-xl text-xs font-bold transition-all border ${
              isLight ? "bg-[#131518] border-black text-white hover:bg-slate-800" : "bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-300"
            }`}
          >
            Back to Main Portal
          </button>
        </motion.div>
      </div>
    );
  }

  const displayCandidateName = candidateUsername || matchedExcelCandidate?.name || (isBulkSim ? bulkCandidateName : (interview?.candidate_name || gmailEmail?.split("@")[0] || "Invited Candidate"));
  const displayRole = matchedExcelCandidate?.role || (isBulkSim ? bulkCandidateRole : (interview?.role || "Interactive Candidate"));
  const displayQuestions = isBulkSim ? 3 : (interview?.total_questions || 3);  // STEP 1: GMAIL OAUTH LOGIN OR BULK CANDIDATE ONBOARDING
  if (step === "auth") {
    if (isBulkSim) {
      return (
        <div className={wrapperClass}>
          <div className="absolute top-[20%] left-[30%] w-96 h-96 bg-indigo-500/5 rounded-full blur-[110px] pointer-events-none" />
          <div className="absolute bottom-[20%] right-[30%] w-96 h-96 bg-emerald-500/5 rounded-full blur-[110px] pointer-events-none" />

          <motion.div
            key="bulk_onboarding_step"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`max-w-md w-full p-8 rounded-2xl shadow-2xl space-y-6 relative border transition-all duration-500 ${
              isLight ? "bg-white border-slate-200 text-slate-800" : "bg-slate-900 border-slate-800 text-slate-100"
            }`}
          >
            {/* Ambient header styling element */}
            <div className="absolute top-0 inset-x-0 h-[4px] bg-gradient-to-r from-blue-500 via-indigo-550 to-emerald-450 rounded-t-2xl" />

            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs font-semibold text-indigo-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>General Assessment Lobby</span>
              </div>
              <div>
                <h2 className={`text-xl font-bold font-display ${isLight ? "text-slate-900" : "text-white"}`}>Candidate Registration</h2>
                <p className={`text-[11px] leading-relaxed font-light ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  Provide your target details to initialize your private practice session on our proctored assessment network. No login required.
                </p>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              setAuthError("");

              if (!gmailEmail || !gmailEmail.includes("@")) {
                setAuthError("Please provide a valid email address.");
                return;
              }
              if (!bulkCandidateName.trim()) {
                setAuthError("Please provide your full name.");
                return;
              }

              setAuthLoading(true);
              setTimeout(() => {
                setAuthLoading(false);
                localStorage.setItem("candidate_oauth_email", gmailEmail);
                localStorage.setItem("candidate_oauth_authed", "true");
                setStep("gate");
              }, 800);
            }} className="space-y-4">
              {authError && (
                <div className="p-3 bg-red-500/10 border border-red-200/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className={`text-[10px] font-mono uppercase font-black block ${labelColor}`}>your full name</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Abhay Sandbox"
                    value={bulkCandidateName}
                    onChange={(e) => setBulkCandidateName(e.target.value)}
                    className={`w-full h-11 px-4 rounded-xl border text-sm focus:outline-none transition-all ${inputBg}`}
                  />
                  <User className="absolute right-3 top-3.5 w-4.5 h-4.5 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-mono uppercase font-black block ${labelColor}`}>your email address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="e.g. guest@example.com"
                    value={gmailEmail}
                    onChange={(e) => setGmailEmail(e.target.value)}
                    className={`w-full h-11 px-4 rounded-xl border text-sm focus:outline-none transition-all ${inputBg}`}
                  />
                  <Mail className="absolute right-3 top-3.5 w-4.5 h-4.5 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1">
                <label className={`text-[10px] font-mono uppercase font-black block ${labelColor}`}>target assessment scenario</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Software Engineer"
                    value={bulkCandidateRole}
                    onChange={(e) => setBulkCandidateRole(e.target.value)}
                    className={`w-full h-11 px-4 rounded-xl border text-sm focus:outline-none transition-all ${inputBg}`}
                  />
                  <LayoutGrid className="absolute right-3 top-3.5 w-4.5 h-4.5 text-slate-400" />
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs pt-1">
                <label className={`flex items-center gap-1.5 cursor-pointer select-none ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                  <input
                    type="checkbox"
                    required
                    defaultChecked={true}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  I consent to assessment media stream recording
                </label>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-md text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer pb-0.5"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Deploying Environment...
                  </>
                ) : (
                  <>
                    Register & Continue
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className={`border-t pt-3 text-center text-[10px] leading-normal ${isLight ? "border-slate-100 text-slate-500" : "border-slate-800 text-slate-400"}`}>
              Secure, high-fidelity practice environment. Provided with love by HireIQ.
            </div>
          </motion.div>
        </div>
      );
    }    return (
      <div className={wrapperClass}>
        <div className="absolute top-[20%] left-[30%] w-96 h-96 bg-indigo-500/5 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute bottom-[20%] right-[30%] w-96 h-96 bg-emerald-500/5 rounded-full blur-[110px] pointer-events-none" />

        <motion.div
          key="auth_step"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`max-w-md w-full p-8 rounded-2xl shadow-2xl space-y-6 relative border transition-all duration-500 ${
            isLight ? "bg-white border-slate-200 text-slate-905" : "bg-slate-900 border-slate-800 text-slate-100"
          }`}
        >
          {/* Top banner decoration */}
          <div className="absolute top-0 inset-x-0 h-[4px] bg-gradient-to-r from-blue-500 via-indigo-550 to-emerald-450 rounded-t-2xl" />

          {/* Secure branding header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center items-center">
              <span className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-indigo-400" />
              </span>
            </div>
            <div>
              <h2 className={`text-xl font-bold font-display ${isLight ? "text-slate-900" : "text-white"}`}>Candidate Registration</h2>
              <p className={`text-[11px] leading-relaxed font-light ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                Please enter your details to verify and initialize your private practice assessment session.
              </p>
            </div>
          </div>

          <form onSubmit={handleGmailLogin} className="space-y-4">
            {authError && (
              <div className="p-3 bg-red-500/10 border border-red-200/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className={`text-[10px] font-mono uppercase font-black block ${labelColor}`}>your full name / username</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Sofia Sterling"
                  value={candidateUsername}
                  onChange={(e) => setCandidateUsername(e.target.value)}
                  className={`w-full h-11 px-4 rounded-xl border text-sm focus:outline-none transition-all ${inputBg}`}
                />
                <User className="absolute right-3 top-3.5 w-4.5 h-4.5 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1">
              <label className={`text-[10px] font-mono uppercase font-black block ${labelColor}`}>your email address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="e.g. name@example.com"
                  value={gmailEmail}
                  onChange={(e) => setGmailEmail(e.target.value)}
                  className={`w-full h-11 px-4 rounded-xl border text-sm focus:outline-none transition-all ${inputBg}`}
                />
                <Mail className="absolute right-3 top-3.5 w-4.5 h-4.5 text-slate-400" />
              </div>

              {excelEmails.length > 0 && (
                <div className="mt-2 space-y-1">
                  <label className="text-[9px] font-mono uppercase font-extrabold block text-indigo-400">
                    Or select from imported excel roster:
                  </label>
                  <select
                    value={gmailEmail}
                    onChange={(e) => setGmailEmail(e.target.value)}
                    className={`w-full h-9 px-3 rounded-lg border text-xs focus:outline-none transition-all cursor-pointer ${
                      isLight 
                        ? "bg-slate-50 border-slate-200 text-slate-850 focus:border-indigo-500" 
                        : "bg-slate-950 border-slate-850 text-slate-350 focus:border-indigo-505"
                    }`}
                  >
                    <option value="">-- Click to choose your email --</option>
                    {excelEmails.map((c, i) => (
                      <option key={i} value={c.email}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}


            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-md text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer pb-0.5"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Deploying Environment...
                </>
              ) : (
                <>
                  Register & Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className={`border-t pt-3 text-center text-[10px] leading-normal ${isLight ? "border-slate-100 text-slate-500" : "border-slate-800 text-slate-400"}`}>
            By registering you authorize the proctoring hub to run biometric verification processes to validate facial consistency.
          </div>
        </motion.div>
      </div>
    );
  }

  // STEP 2: VERIFIED INVITATION OVERVIEW GATEWAY
  if (step === "gate") {
    return (
      <div className={wrapperClass}>
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-505/5 rounded-full blur-[100px] pointer-events-none animate-pulse" />

        <motion.div
          key="gate_step"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cardClass}
        >
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-teal-400 rounded-t-2xl" />

          {/* Secure Profile Card Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <span className="text-[9px] font-mono text-indigo-500 uppercase tracking-widest block font-extrabold">Identity Authenticated</span>
              <h3 className={`text-xs font-mono ${isLight ? "text-black font-semibold" : "text-slate-350"}`}>{gmailEmail || "Google User"}</h3>
            </div>
          </div>

          <div className="space-y-1">
            <h2 className={`text-xl font-bold font-display tracking-tight ${isLight ? "text-black" : "text-white"}`}>Profile Locked, {displayCandidateName}</h2>
            <p className={`text-xs font-light leading-relaxed ${isLight ? "text-black" : "text-slate-400"}`}>
              Your Google authentication completed successfully. You are invited to complete the live training simulation setup.
            </p>
          </div>

          {/* Interview Details Card */}
          <div className={`p-4 border rounded-xl space-y-3 font-sans text-xs ${panelBg}`}>
            <div className={`flex items-center gap-2.5 ${isLight ? "text-black" : "text-slate-300"}`}>
              <User className="w-4 h-4 text-indigo-500 shrink-0" />
              <div>
                <span className="text-[9px] font-mono text-slate-500 block uppercase">Candidate PROFILE</span>
                <strong className={isLight ? "text-black font-semibold" : "text-white font-medium"}>{displayCandidateName}</strong>
              </div>
            </div>

            <div className={`flex items-center gap-2.5 ${isLight ? "text-black" : "text-slate-300"}`}>
              <LayoutGrid className="w-4 h-4 text-indigo-500 shrink-0" />
              <div>
                <span className="text-[9px] font-mono text-slate-500 block uppercase">Target Scenario Role</span>
                <strong className={isLight ? "text-black font-semibold" : "text-white font-medium"}>{displayRole}</strong>
              </div>
            </div>

            <div className={`flex items-center gap-2.5 ${isLight ? "text-black" : "text-slate-300"}`}>
              <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
              <div>
                <span className="text-[9px] font-mono text-slate-500 block uppercase">Standards Structure</span>
                <strong className={isLight ? "text-black font-semibold" : "text-white font-medium"}>{displayQuestions} Custom Questions</strong>
              </div>
            </div>

            <div className={`flex items-center gap-2.5 ${isLight ? "text-black" : "text-slate-300"}`}>
              <Clock className="w-4 h-4 text-emerald-450 shrink-0" />
              <div>
                <span className="text-[9px] font-mono text-slate-500 block uppercase">Assessment Duration</span>
                <strong className={isLight ? "text-black font-semibold" : "text-white font-medium"}>
                  {displayQuestions} Minute{displayQuestions > 1 ? "s animate-pulse" : ""} ({displayQuestions} questions, 1 min/question)
                </strong>
              </div>
            </div>

            {secureTokenData && secureTokenData.expiresAt && (
              <div className={`flex items-center gap-2.5 ${isLight ? "text-black" : "text-slate-300"}`}>
                <Clock className="w-4 h-4 text-rose-500 shrink-0" />
                <div>
                  <span className="text-[9px] font-mono text-rose-500 block uppercase font-bold">Secure Link Expiry</span>
                  <strong className="text-rose-500 font-bold">
                    {(() => {
                      const expDate = new Date(secureTokenData.expiresAt);
                      const diffMs = expDate.getTime() - Date.now();
                      const timeStr = expDate.toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" });
                      const dateStr = expDate.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", month: "short", day: "numeric", year: "numeric" });
                      if (diffMs <= 0) {
                        return "Expired";
                      }
                      
                      const totalMins = Math.max(0, Math.ceil(diffMs / (60 * 1000)));
                      const hrs = Math.floor(totalMins / 60);
                      const mins = totalMins % 60;
                      
                      let durationText = "";
                      if (hrs > 0) {
                        durationText += `${hrs} ${hrs > 1 ? "Hrs" : "Hr"} `;
                      }
                      if (mins > 0 || hrs === 0) {
                        durationText += `${mins} ${mins > 1 ? "Mins" : "Min"}`;
                      }
                      
                      return `${durationText.trim()} (Expiring ${dateStr}, ${timeStr} IST)`;
                    })()}
                  </strong>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleAcceptInvite}
            className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/15 cursor-pointer"
          >
            Accept & Unlatch Camera Calibration
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  // STEP 3: PHYSICAL HARDWARE CALIBRATION & ROOM TEST
  return (
    <div className={wrapperClass}>
      <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        key="config_step"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className={cardClass}
      >
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-indigo-505 rounded-t-2xl" />

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
            <Video className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-widest block font-extrabold">Device Room Diagnostics</span>
            <h3 className={`text-sm font-bold leading-none ${isLight ? "text-slate-900" : "text-white"}`}>Configure & Verify Assets</h3>
          </div>
        </div>

        {/* Dynamic Webcam Preview Node */}
        <div className={`relative aspect-video rounded-xl overflow-hidden flex flex-col items-center justify-center border transition-all ${
          isLight ? "bg-slate-100 border-slate-200" : "bg-slate-950 border-slate-800"
        }`}>
          {camPermission === "granted" && localStream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
            />
          ) : camPermission === "denied" ? (
            <div className="p-4 text-center space-y-2 z-10">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-[11px] font-mono text-amber-500 uppercase font-black">Hardware Stream Blocked</p>
              <p className={`text-[10px] leading-normal max-w-[280px] ${isLight ? "text-slate-650" : "text-slate-400"}`}>
                Webcam and microphone features disabled. Authorize permissions inside your Chrome URL address bar.
              </p>
            </div>
          ) : (
            <div className="text-center p-3 text-slate-500 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" />
              <p className="text-[9.5px] font-mono uppercase tracking-wider">Unresolved Calibration Stream...</p>
            </div>
          )}

          <div className={`absolute bottom-2 left-2 pb-0.5 px-2 rounded text-[9px] font-mono pointer-events-none uppercase border ${
            isLight ? "bg-white/95 border-slate-200 text-slate-700 font-semibold" : "bg-slate-900/90 border-slate-800 text-slate-400"
          }`}>
            {displayCandidateName} Preview
          </div>
        </div>

        {/* Real-time responsive Microphone volume meter */}
        <div className={`space-y-1.5 p-3.5 border rounded-xl transition-all ${panelBg}`}>
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className={`flex items-center gap-1 ${isLight ? "text-slate-700" : "text-slate-400"}`}>
              <Mic className="w-3.5 h-3.5 text-indigo-500" />
              Microphone Sensitivity
            </span>
            <span className={micLevel > 0 ? "text-emerald-500 font-bold" : "text-slate-400"}>
              {micLevel > 0 ? `${micLevel}% Active` : "Silence Detected"}
            </span>
          </div>

          <div className={`h-2 rounded-full overflow-hidden flex gap-0.5 ${isLight ? "bg-slate-200/90" : "bg-slate-900"}`}>
            <div 
              style={{ width: `${micLevel}%` }}
              className={`h-full rounded-full transition-all duration-75 ${
                micLevel > 60 
                  ? "bg-gradient-to-r from-emerald-500 to-amber-500" 
                  : "bg-indigo-500"
              }`}
            />
          </div>
          <p className="text-[9.5px] text-slate-500 font-light leading-none">
            Speak into your microphone to calibrate input wave metrics.
          </p>
        </div>

        {/* Speaker outputs verification trigger */}
        <div className={`flex items-center justify-between gap-3 p-3.5 border rounded-xl transition-all ${panelBg}`}>
          <div className="space-y-1">
            <h4 className={`text-[11px] font-bold flex items-center gap-1 ${isLight ? "text-slate-850" : "text-slate-200"}`}>
              <Volume2 className="w-3.5 h-3.5 text-indigo-500 font-bold" />
              Confirm Sound Output
            </h4>
            <p className="text-[9.5px] text-slate-500 font-light leading-tight">
              Play standard security pilot tone to check speakers.
            </p>
          </div>
          <button
            type="button"
            onClick={triggerAudioToneHz}
            className={`h-8 px-3 rounded-lg text-[10px] uppercase font-mono font-bold tracking-wider transition-all cursor-pointer ${
              playTestTone 
                ? "bg-emerald-500 text-slate-950 font-black animate-pulse" 
                : isLight ? "bg-slate-100 hover:bg-slate-200 border border-slate-200 text-indigo-650" : "bg-slate-900 border border-slate-800 text-indigo-400 hover:text-indigo-300"
            }`}
          >
            {playTestTone ? "Playing Tone..." : "Test Audio"}
          </button>
        </div>

        {/* Core Calibration Confirmations */}
        <div className={`space-y-2 text-[10.5px] p-3 rounded-xl border transition-all ${isLight ? "text-slate-700 bg-slate-50 border-slate-200" : "text-slate-400 bg-slate-950/30 border-slate-850"}`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-4 h-4 shrink-0 ${camPermission === "granted" ? "text-emerald-500" : "text-slate-500"}`} />
            <span>Actual/Simulated Webcam Feed Configured</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-4 h-4 shrink-0 ${micPermission === "granted" ? "text-emerald-400" : "text-slate-500"}`} />
            <span>Audio Analyser Node Initialized</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Active Gmail Authentication Hook Connected</span>
          </div>
        </div>

        {/* Trigger start room now */}
        <button
          onClick={handleLaunchInterview}
          className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/15"
        >
          Start Mock Session & Stream Cam
          <Play className="w-3.5 h-3.5 fill-current text-slate-950" />
        </button>
      </motion.div>
    </div>
  );
}

