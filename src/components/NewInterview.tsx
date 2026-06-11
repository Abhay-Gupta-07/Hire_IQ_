import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowLeft, Play, Sparkles, User, FileText, LayoutGrid, Award, AlertCircle, 
  Volume2, Check, Copy, ExternalLink, X, Link, Trash2, Mic, MicOff, Upload, 
  Plus, Activity, FileAudio, RefreshCw, Mail, Send
} from "lucide-react";
import { mockDb } from "../lib/mockDb";
import { Interview, ResumeData } from "../types";
import { getAppBaseUrl, isAiStudioOrigin, getQrCodeUrl } from "../lib/urlHelper";
import { supabase } from "../lib/supabaseClient";

interface NewInterviewProps {
  onNavigate: (path: string) => void;
  theme?: "dark" | "light";
}

export default function NewInterview({ onNavigate, theme = "dark" }: NewInterviewProps) {
  const isLight = theme === "light";
  const inputBg = isLight 
    ? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500" 
    : "bg-slate-950 border-slate-800 text-white placeholder:text-slate-750 focus:border-emerald-500";
  const labelColor = isLight ? "text-slate-600" : "text-slate-400";
  const panelBg = isLight ? "bg-slate-50 border-slate-200/80 shadow-sm" : "bg-slate-900/10 border-slate-850/70";
  const subPanelBg = isLight ? "bg-slate-100 border-slate-200/80" : "bg-slate-950/40 border-slate-850";
  const textColor = isLight ? "text-slate-900" : "text-slate-200";
  const textMuted = isLight ? "text-slate-500" : "text-slate-400";

  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [autoSendEmail, setAutoSendEmail] = useState(true);
  const [targetRole, setTargetRole] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(3);
  const [preferredVoice, setPreferredVoice] = useState<"female" | "male" | "replica">("female");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // New Interview Configurations
  const [currentSalary, setCurrentSalary] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [candidateLocation, setCandidateLocation] = useState("");
  const [jobDescriptionText, setJobDescriptionText] = useState("");
  const [jobDescriptionFile, setJobDescriptionFile] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [lastParsedResumeName, setLastParsedResumeName] = useState("");
  const [isJdUploading, setIsJdUploading] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [autoSendStatus, setAutoSendStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [autoSendError, setAutoSendError] = useState<string | null>(null);
  const [preGeneratedId, setPreGeneratedId] = useState(() => "int_" + Math.random().toString(36).substring(2, 11));
  const regenerateInviteId = () => {
    setPreGeneratedId("int_" + Math.random().toString(36).substring(2, 11));
  };
  const [preGeneratedCopied, setPreGeneratedCopied] = useState(false);
  const [isRegisteringLink, setIsRegisteringLink] = useState(false);
  const [customBaseUrl, setCustomBaseUrl] = useState(() => getAppBaseUrl());
  const [showUrlSettings, setShowUrlSettings] = useState(false);

  const handleUpdateCustomBaseUrl = (newUrl: string) => {
    localStorage.setItem("custom_public_origin", newUrl.trim());
    setCustomBaseUrl(getAppBaseUrl());
  };

  const getLocalSmtpConfig = () => {
    const cfg = localStorage.getItem("custom_smtp_config");
    if (cfg) {
      try {
        const parsed = JSON.parse(cfg);
        if (parsed.host && parsed.port && parsed.user && parsed.pass) {
          return parsed;
        }
      } catch(e){}
    }
    return null;
  };

  // Candidate fitment preferences states
  const [workModeEnabled, setWorkModeEnabled] = useState(true);
  const [workMode, setWorkMode] = useState<"on-site" | "remote" | "hybrid">("on-site");
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [locationType, setLocationType] = useState<"current" | "preferred">("current");
  const [bondNoticeEnabled, setBondNoticeEnabled] = useState(true);

  // Manual pre-questions state
  const [manualQuestions, setManualQuestions] = useState<string[]>([""]);

  // Replica voice clone states
  const [replicaSettings, setReplicaSettings] = useState<{
    trained: boolean;
    pitch: number;
    rate: number;
    originalFilename?: string;
  }>(() => {
    const saved = localStorage.getItem("voice_replica_settings");
    return saved ? JSON.parse(saved) : { trained: false, pitch: 1.0, rate: 0.95 };
  });

  const [isRecordingReplica, setIsRecordingReplica] = useState(false);
  const [recordingSecondsLeft, setRecordingSecondsLeft] = useState(0);
  const [replicaUploadProgress, setReplicaUploadProgress] = useState(0);
  const [isUploadingReplica, setIsUploadingReplica] = useState(false);
  
  const voiceReplicaMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceReplicaStreamRef = useRef<MediaStream | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Invite states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [generatedInterviewId, setGeneratedInterviewId] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [adminRole, setAdminRole] = useState("Super Admin");

  const [userTransactions, setUserTransactions] = useState<any[]>([]);

  useEffect(() => {
    const profile = mockDb.getProfile();
    const email = profile?.email || "abbaabhayyy@gmail.com";
    if (email) {
      fetch(`/api/upi/user-transactions?email=${encodeURIComponent(email)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.transactions) {
            setUserTransactions(data.transactions);
          }
        })
        .catch(err => console.error("Error loading user transactions in NewInterview:", err));
    }
  }, []);

  const getActivePlan = () => {
    const latestTx = userTransactions.find(tx => tx.status === "approved" || tx.status === "pending" || !tx.status);
    const tx = latestTx || userTransactions[0];
    if (!tx) return { name: "Free Trial", limit: 5, label: "Free Trial", daysLeft: 7 };
    
    const rawName = (tx.planName || "").toLowerCase();
    const createdDate = tx.created_at ? new Date(tx.created_at) : new Date();
    const isYearly = (tx.billingInterval || "").toLowerCase() === "yearly";
    const durationDays = isYearly ? 365 : 30;
    
    const expiryDate = new Date(createdDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const msLeft = expiryDate.getTime() - Date.now();
    const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

    if (rawName.includes("basic")) {
      return { name: "Basic", limit: 100, label: "Basic Plan", daysLeft };
    } else if (rawName.includes("advance") || rawName.includes("advanced") || rawName.includes("enterprise") || rawName.includes("premium")) {
      return { name: "Advance", limit: Infinity, label: "Advance Plan", daysLeft };
    } else {
      return { name: "Free Trial", limit: 5, label: "Free Trial", daysLeft: Math.min(7, daysLeft) };
    }
  };

  const activePlan = getActivePlan();

  // Manual questions logic
  const handleAddManualQuestion = () => {
    setManualQuestions([...manualQuestions, ""]);
  };

  const handleRemoveManualQuestion = (idx: number) => {
    const updated = manualQuestions.filter((_, i) => i !== idx);
    setManualQuestions(updated.length === 0 ? [""] : updated);
  };

  const handleManualQuestionChange = (idx: number, val: string) => {
    const updated = [...manualQuestions];
    updated[idx] = val;
    setManualQuestions(updated);
  };

  // Recording replica vocal profile
  const startRecordingReplica = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceReplicaStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      voiceReplicaMediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        // Formulate a fun estimated frequency based on standard voice pitch ratios
        const randomPitch = parseFloat((0.85 + Math.random() * 0.3).toFixed(2));
        const newSettings = {
          trained: true,
          pitch: randomPitch,
          rate: 0.95,
          originalFilename: `Voice_Replica_Recorded_Channel.wav`
        };
        setReplicaSettings(newSettings);
        localStorage.setItem("voice_replica_settings", JSON.stringify(newSettings));
        setPreferredVoice("replica");
      };

      mediaRecorder.start();
      setIsRecordingReplica(true);
      setRecordingSecondsLeft(5);

      const interval = setInterval(() => {
        setRecordingSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            if (mediaRecorder.state !== "inactive") {
              mediaRecorder.stop();
            }
            if (stream) {
              stream.getTracks().forEach(t => t.stop());
            }
            setIsRecordingReplica(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Recording error:", err);
      setError("Microphone permission has been rejected or is inaccessible.");
    }
  };

  // Uploading replica vocal document
  const handleVoiceUploadTrigger = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingReplica(true);
    setReplicaUploadProgress(5);

    const interval = setInterval(() => {
      setReplicaUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsUploadingReplica(false);
            const newSettings = {
              trained: true,
              pitch: parseFloat((0.9 + Math.random() * 0.25).toFixed(2)),
              rate: 0.95,
              originalFilename: file.name
            };
            setReplicaSettings(newSettings);
            localStorage.setItem("voice_replica_settings", JSON.stringify(newSettings));
            setPreferredVoice("replica");
          }, 150);
          return 100;
        }
        return prev + 15;
      });
    }, 120);
  };

  const playVoiceDemo = async (gender: "female" | "male" = "female") => {
    // Stop standard speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    // Cancel the current HTML5 audio state if playing
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }

    const text = gender === "male"
      ? "Namaste! I will be your Indian male AI recruiter for this session, right? Let's get started!"
      : "Namaste! I will be your Indian female AI recruiter for this interview session, ya? Best of luck!";
    speakSpeechSynthesisDemo(text, gender);
  };

  const speakSpeechSynthesisDemo = (text: string, gender: "female" | "male" = "female") => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const enVoices = voices.filter(v => v.lang.startsWith("en"));
    const inVoices = voices.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith("en-in"));
    
    let selectedVoice = null;
    if (inVoices.length > 0) {
      if (gender === "male") {
        const maleIN = inVoices.find(v => v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("ravi") || v.name.toLowerCase().includes("kapil") || v.name.toLowerCase().includes("mohammad") || v.name.toLowerCase().includes("kishore"));
        selectedVoice = maleIN || inVoices.find(v => v.name.toLowerCase().includes("male")) || inVoices[0];
      } else {
        const femaleIN = inVoices.find(v => v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("veena") || v.name.toLowerCase().includes("heera") || v.name.toLowerCase().includes("neerja") || v.name.toLowerCase().includes("priya"));
        selectedVoice = femaleIN || inVoices.find(v => v.name.toLowerCase().includes("female")) || inVoices[0];
      }
    } else {
      if (gender === "male") {
        const premiumMale = enVoices.find(v => v.name.toLowerCase().includes("male") && v.name.toLowerCase().includes("google"));
        if (premiumMale) {
          selectedVoice = premiumMale;
        } else {
          const maleNames = ["david", "mark", "george", "male", "microsoft david", "daniel"];
          selectedVoice = enVoices.find(v => maleNames.some(name => v.name.toLowerCase().includes(name))) || enVoices[0];
        }
      } else {
        const premiumFemale = enVoices.find(v => v.name.toLowerCase().includes("female") && v.name.toLowerCase().includes("google"));
        if (premiumFemale) {
          selectedVoice = premiumFemale;
        } else {
          const femaleNames = ["zira", "samantha", "victoria", "hazel", "female", "karen", "moira", "tessa", "veena"];
          selectedVoice = enVoices.find(v => femaleNames.some(name => v.name.toLowerCase().includes(name))) || enVoices[0];
        }
      }
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    } else if (enVoices.length > 0) {
      utterance.voice = enVoices[0];
    }
    
    utterance.rate = 0.95;
    utterance.pitch = gender === "male" ? 0.95 : 1.05;
    window.speechSynthesis.speak(utterance);
  };

  // Helper to convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const resultString = reader.result as string;
        const base64 = resultString.substring(resultString.indexOf(",") + 1);
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Helper to apply resume extracted properties & deduce smart fallbacks
  const applyResumeData = (resume: any) => {
    if (!resume) return;

    setSelectedResumeId(resume.id);
    setLastParsedResumeName(resume.filename);
    
    // Try to find full name/username from resume name or fallback
    let name = resume.parsed?.name;
    
    // If the name is missing or generic (such as "Candidate" or empty), try to extract from raw text or filename
    if (!name || name.toLowerCase() === "candidate" || name.toLowerCase() === "invited candidate" || name.trim() === "") {
      let extractedNameFromText = null;
      if (resume.raw_text) {
        const lines = resume.raw_text.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);
        for (let i = 0; i < Math.min(lines.length, 5); i++) {
          const line = lines[i];
          if (line.includes("@") || line.match(/\+?\d[\d-\s()]{7,}/)) continue;
          if (line.toLowerCase().includes("resume") || line.toLowerCase().includes("curriculum") || line.toLowerCase().includes("cv")) continue;
          if (line.match(/^(education|experience|skills|summary|objective|contact|professional|about)/i)) continue;
          
          const words = line.split(/\s+/);
          if (words.length >= 2 && words.length <= 4) {
            const isValidName = words.every((word: string) => /^[A-Z][a-zA-Z.-]*$/.test(word));
            if (isValidName) {
              extractedNameFromText = line;
              break;
            }
          }
        }
      }

      if (extractedNameFromText) {
        name = extractedNameFromText;
      } else {
        // Fallback to name from filename
        let cleanName = resume.filename
          .replace(/\.[^/.]+$/, "") // strip extension
          .replace(/[_\-]/g, " ") // replace underscores/hyphens
          .replace(/\b(2[\s-]*pages|pages?|resume|cv|v\d+|version\d+)\b/gi, "") // strip common additions
          .replace(/\s+/g, " ") // normalize spacing
          .trim();
        
        name = cleanName
          .split(" ")
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
      }
    }

    setCandidateName(name);
    
    // Try to find a real email address inside the raw resume text using regex
    let extractedEmail = "";
    if (resume.raw_text) {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const matches = resume.raw_text.match(emailRegex);
      if (matches && matches.length > 0) {
        extractedEmail = matches[0];
      }
    }

    const parsedEmail = extractedEmail || name.toLowerCase().replace(/\s+/g, ".") + "@practice.io";
    setCandidateEmail(parsedEmail);

    // Deduce target role from filename or parsed skills (Heuristic fallback)
    let inferredRole = resume.parsed?.role || "";
    if (!inferredRole) {
      inferredRole = "Software Engineer";
      const filenameLower = resume.filename.toLowerCase();
      if (filenameLower.includes("frontend") || filenameLower.includes("front-end")) {
        inferredRole = "Senior Frontend Engineer";
      } else if (filenameLower.includes("backend") || filenameLower.includes("back-end")) {
        inferredRole = "Senior Backend Engineer";
      } else if (filenameLower.includes("fullstack") || filenameLower.includes("full-stack")) {
        inferredRole = "Senior Fullstack Developer";
      } else if (filenameLower.includes("product") || filenameLower.includes("pm") || filenameLower.includes("product_manager")) {
        inferredRole = "Technical Product Manager";
      } else if (filenameLower.includes("devops")) {
        inferredRole = "Staff DevOps Engineer";
      } else if (filenameLower.includes("qa") || filenameLower.includes("quality")) {
        inferredRole = "QA Automation Lead";
      } else if (filenameLower.includes("data") || filenameLower.includes("science")) {
        inferredRole = "Data Scientist";
      } else if (resume.parsed?.skills?.some((s: string) => s.toLowerCase().includes("react") || s.toLowerCase().includes("frontend") || s.toLowerCase().includes("next.js"))) {
        inferredRole = "Senior Frontend Engineer";
      } else if (resume.parsed?.skills?.some((s: string) => s.toLowerCase().includes("node") || s.toLowerCase().includes("express") || s.toLowerCase().includes("java") || s.toLowerCase().includes("python") || s.toLowerCase().includes("backend") || s.toLowerCase().includes("go"))) {
        inferredRole = "Senior Backend Engineer";
      } else if (resume.parsed?.skills?.some((s: string) => s.toLowerCase().includes("product") || s.toLowerCase().includes("agile") || s.toLowerCase().includes("scrum"))) {
        inferredRole = "Technical Product Manager";
      }
    }
    setTargetRole(inferredRole);

    // Deduce candidate location from raw text or education keywords (Heuristic fallback with strict bounds)
    let location = resume.parsed?.location || "";
    if (!location) {
      location = "Pune, Maharashtra";
      if (resume.raw_text) {
        const textLower = resume.raw_text.toLowerCase();
        
        const hasWord = (word: string) => {
          const regex = new RegExp(`\\b${word}\\b`, 'i');
          return regex.test(textLower);
        };

        if (hasWord("seattle") || hasWord("washington")) {
          location = "Seattle, WA";
        } else if (hasWord("pittsburgh") || hasWord("carnegie") || hasWord("mellon")) {
          location = "Pittsburgh, PA";
        } else if (hasWord("san francisco") || hasWord("bay area") || hasWord("california") || hasWord("sf")) {
          location = "San Francisco, CA";
        } else if (hasWord("new york") || hasWord("manhattan") || (hasWord("ny") && !/\b(?:company|many|any|funny|synchronous|harmony|germany)\b/i.test(textLower))) {
          location = "New York, NY";
        } else if (hasWord("bangalore") || hasWord("bengaluru") || hasWord("karnataka")) {
          location = "Bengaluru, Karnataka";
        } else if (hasWord("mumbai") || hasWord("bombay")) {
          location = "Mumbai, Maharashtra";
        } else if (hasWord("delhi") || hasWord("gurgaon") || hasWord("noida")) {
          location = "Delhi NCR, India";
        } else if (hasWord("pune")) {
          location = "Pune, Maharashtra";
        } else if (hasWord("chennai") || hasWord("tamil nadu")) {
          location = "Chennai, Tamil Nadu";
        } else if (hasWord("hyderabad") || hasWord("telangana")) {
          location = "Hyderabad, Telangana";
        }
      } else if (resume.parsed?.education?.[0]) {
        const eduLower = resume.parsed.education[0].toLowerCase();
        if (eduLower.includes("seattle")) {
          location = "Seattle, WA";
        } else if (eduLower.includes("carnegie") || eduLower.includes("mellon")) {
          location = "Pittsburgh, PA";
        }
      }
    }
    setCandidateLocation(location);

    // Keep salary fields empty and do not fetch or deduce from resume per user request
    setCurrentSalary("");
    setExpectedSalary("");

    // Auto-extract candidate skills or summary to prepopulate JD block
    const skillsSnippet = resume.parsed?.skills?.join(", ") || "";
    if (skillsSnippet) {
      setJobDescriptionText(`CANDIDATE PORTFOLIO SPECIFICATIONS:\n- Candidate Name: ${name}\n- Extracted Core Skills: ${skillsSnippet}\n- Education: ${resume.parsed?.education?.[0] || "Foundational Reference"}\n\nPlease conduct an optimized practice loop testing these competencies.`);
    }
  };

  // Resume Parse handler (High Fidelity Extraction from real document)
  const handleParseResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsing(true);
    setLastParsedResumeName(file.name);
    setError("");

    try {
      const base64Content = await fileToBase64(file);
      const isTxt = file.type === "text/plain" || file.name.endsWith(".txt");
      
      const response = await fetch("/api/analyze-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isTxt 
            ? { resumeText: atob(base64Content) } 
            : { fileBase64: base64Content, filename: file.name }
        ),
      });

      if (!response.ok) {
        throw new Error(`Server returned error status ${response.status}`);
      }

      const parsedResult = await response.json();

      // Create a proper ResumeData structure to match standard portfolio items
      const newResume: ResumeData = {
        id: "res_" + Math.random().toString(36).substring(2, 11),
        user_id: "client_user",
        filename: file.name,
        raw_text: parsedResult.extractedText || "",
        ats_score: parsedResult.ats_score || 75,
        strengths: parsedResult.strengths || ["Clean resume format"],
        weaknesses: parsedResult.weaknesses || ["Add quantitative metrics"],
        suggestions: parsedResult.suggestions || ["Expand technical experience sections"],
        parsed: {
          name: parsedResult.parsed?.name || "Candidate",
          skills: parsedResult.parsed?.skills || [],
          experienceCount: parsedResult.parsed?.experienceCount || 2,
          education: parsedResult.parsed?.education || [],
        },
        created_at: new Date().toISOString(),
      };

      // Index dynamically so it shows up under the user's portfolios list as well
      mockDb.addResume(newResume);
      
      // Update local state resumes list
      const updatedList = mockDb.getResumes();
      setResumes(updatedList);

      // Populate form details using the extracted information
      applyResumeData(newResume);

    } catch (err: any) {
      console.error("NewInterview manual parse error:", err);
      setError(err.message || "Failed to parse resume properly. Falling back to structured filename fallback.");
      
      // Fallback if offline or service is restricted
      const fallbackResume: ResumeData = {
        id: "res_" + Math.random().toString(36).substring(2, 11),
        user_id: "client_user",
        filename: file.name,
        raw_text: file.name,
        ats_score: 70,
        strengths: [],
        weaknesses: [],
        suggestions: [],
        parsed: {
          name: "",
          skills: [],
          experienceCount: 1,
          education: []
        },
        created_at: new Date().toISOString()
      };
      
      mockDb.addResume(fallbackResume);
      setResumes(mockDb.getResumes());
      applyResumeData(fallbackResume);
    } finally {
      setIsParsing(false);
    }
  };

  // JD attachment handler
  const handleJdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsJdUploading(true);
    setTimeout(() => {
      setJobDescriptionFile(file.name);
      if (!jobDescriptionText) {
        setJobDescriptionText(`REQUIREMENTS FOR: ${file.name.replace(/\.[^/.]+$/, "")}\n- Proficiency in modern stack architecture and agile delivery.\n- Excellent collaborative and clear vocal communication skills.\n- Demonstrated system engineering and database persistence patterns.`);
      }
      setIsJdUploading(false);
    }, 800);
  };

  // Unified Setup Registration and Dispatcher
  const prepareAndRegisterSetup = async (action: "copy" | "send_email") => {
    if (adminRole === "Interview Observer") {
      setError("Access Restricted: Interview Observers have read-only permissions and cannot setup interview invitations.");
      return;
    }
    const currentActivePlan = getActivePlan();
    if (currentActivePlan.daysLeft === 0) {
      setError(`Subscription Expired: Your ${currentActivePlan.label} has expired. Please renew your plan on the Subscription page.`);
      return;
    }
    const existingCount = mockDb.getInterviews().length;
    if (existingCount >= currentActivePlan.limit) {
      setError(`Subscription Limit Reached: Your ${currentActivePlan.label} limits you to ${currentActivePlan.limit} interview sessions. Please upgrade your subscription on the Subscription page.`);
      return;
    }
    if (!candidateName.trim()) {
      setError("Please state the Candidate's name first so the invite setup is customized.");
      return;
    }
    if (!targetRole.trim()) {
      setError("Please specify your target role.");
      return;
    }
    if (!jobDescriptionText.trim()) {
      setError("Please provide a Job Description (JD) to customize/generate appropriate domain-specific interview questions.");
      return;
    }
    if (action === "send_email" && !candidateEmail.trim()) {
      setError("Please input a valid recipient candidate email ID to dispatch the invitation.");
      return;
    }

    setIsRegisteringLink(true);
    setError("");

    try {
      const selectedResume = resumes.find(r => r.id === selectedResumeId);
      const filteredManualQs = manualQuestions.map(q => q.trim()).filter(q => q !== "");

      // 1. Generate questions matching the totalQuestions count
      let generatedQuestionsAndMcqs: any[] = [];
      try {
        const qRes = await fetch("/api/generate-candidate-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: targetRole,
            jd: jobDescriptionText || "",
            candidateName: candidateName,
            questionsCount: totalQuestions,
            resumeText: selectedResume?.raw_text || ""
          })
        });
        if (qRes.ok) {
          const qData = await qRes.json();
          if (qData.questions && qData.questions.length > 0) {
            generatedQuestionsAndMcqs = qData.questions;
          }
        }
      } catch (qErr) {
        console.warn("Failed to generate dynamic candidate questions on invite setup:", qErr);
      }

      // Default backup questions generated up to totalQuestions
      const defaultQuestionsPool = [
        "What is the single most critical micro-optimization or performance trade-off you have made in your recent software architecture?",
        "How do you guarantee reliable state consistency and prevent race conditions when handling high-concurrency event loops?",
        "Under what clear constraints would you choose optimistic concurrency over pessimistic locking in a distributed datastore?",
        "How do you measure, diagnose, and definitively resolve complex memory leaks or reference cycle bottlenecks at scale?",
        "Tell me about a complex microservices architecture issue you solved under extreme latency and high load constraints.",
        "How do you approach database schema versioning and zero-downtime migrations in a continuous delivery pipeline?",
        "Explain the performance differences between synchronous event loops and multi-threaded processing pools in production."
      ];

      const supaQuestionsList: string[] = [];
      if (filteredManualQs.length > 0) {
        supaQuestionsList.push(...filteredManualQs);
      } else if (generatedQuestionsAndMcqs.length > 0) {
        supaQuestionsList.push(...generatedQuestionsAndMcqs.map(q => q.question));
      } else {
        // Fallback: fill up to totalQuestions using the defaultQuestionsPool
        for (let i = 0; i < totalQuestions; i++) {
          supaQuestionsList.push(defaultQuestionsPool[i % defaultQuestionsPool.length]);
        }
      }

      // If we don't have enough questions generated, pad it up to totalQuestions
      while (supaQuestionsList.length < totalQuestions) {
        const fallbackQ = defaultQuestionsPool[supaQuestionsList.length % defaultQuestionsPool.length];
        supaQuestionsList.push(fallbackQ);
      }

      // Truncate to match exact count
      if (filteredManualQs.length === 0 && supaQuestionsList.length > totalQuestions) {
        supaQuestionsList.length = totalQuestions;
      }

      // 2. Setup the full Interview object in mockDb
      const newInterview: Interview = {
        id: preGeneratedId,
        user_id: "client_user",
        resume_id: selectedResumeId || "no_resume",
        candidate_name: candidateName.trim(),
        candidate_email: candidateEmail.trim() || undefined,
        role: targetRole || "Software Engineer",
        difficulty: "medium", 
        total_questions: supaQuestionsList.length,
        current_question_idx: 0,
        status: "in_progress",
        started_at: new Date().toISOString(),
        resume_filename: selectedResume?.filename || (lastParsedResumeName ? lastParsedResumeName : "Resume Portfolio.pdf"),
        decision: "pending",
        preferred_voice: preferredVoice,
        manual_questions: filteredManualQs,
        fitment_work_mode_enabled: workModeEnabled,
        fitment_work_mode: workMode,
        fitment_location_enabled: locationEnabled,
        fitment_location_type: locationType,
        fitment_bond_notice_enabled: bondNoticeEnabled,
        expected_salary: expectedSalary || undefined,
        current_salary: currentSalary || undefined,
        location: candidateLocation || undefined,
        job_description: jobDescriptionText || undefined,
        job_description_filename: jobDescriptionFile || undefined
      };
      mockDb.createInterview(newInterview);

      // Create local seeded questions in mockDb
      const mappedDbQs = supaQuestionsList.map((qText, idx) => {
        const generatedMatch = generatedQuestionsAndMcqs.find(g => g.question === qText);
        return {
          id: `q_${Math.random().toString(36).substring(2, 11)}`,
          interview_id: preGeneratedId,
          idx,
          question: qText,
          is_mcq: generatedMatch ? (generatedMatch.is_mcq || false) : false,
          mcq_options: generatedMatch ? generatedMatch.mcq_options : undefined,
          mcq_correct_index: generatedMatch ? generatedMatch.mcq_correct_index : undefined,
          mcq_explanation: generatedMatch ? generatedMatch.mcq_explanation : undefined
        };
      });
      mockDb.saveQuestions(mappedDbQs);

      // 3. Save standard template schema to Supabase interviews table
      const supaTemplate = {
        id: preGeneratedId,
        interviewId: preGeneratedId,
        role: targetRole || "Software Engineer",
        title: targetRole || "Software Engineer",
        questions: supaQuestionsList,
        createdBy: mockDb.getProfile()?.email || "company@gmail.com",
        created_at: new Date().toISOString()
      };

      try {
        await supabase.from("interviews").insert([supaTemplate]);
      } catch (err) {
        console.warn("Supabase insert during invite setup error handled:", err);
      }

      // 4. Create secure record in Supabase interview_sessions
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 2); // 2 hours expiration

      const sessionPayload = {
        id: preGeneratedId,
        token: preGeneratedId,
        interviewId: preGeneratedId,
        candidateName: candidateName.trim(),
        candidateEmail: candidateEmail.trim(),
        expiresAt: expiryDate.toISOString(),
        expires_at: expiryDate.toISOString(),
        role: targetRole || "Software Engineer",
        preferredVoice: preferredVoice,
        questionsCount: supaQuestionsList.length,
        questions_count: supaQuestionsList.length,
        status: "pending"
      };

      try {
        const existingSessions = JSON.parse(localStorage.getItem("supabase_interview_sessions") || "[]");
        existingSessions.push(sessionPayload);
        localStorage.setItem("supabase_interview_sessions", JSON.stringify(existingSessions));
        
        await supabase.from("interview_sessions").insert([sessionPayload]);
      } catch (sessErr) {
        console.warn("Could not sync interview_sessions to Supabase during setup:", sessErr);
      }

      if (action === "copy") {
        await navigator.clipboard.writeText(`${customBaseUrl}/#/invite/${preGeneratedId}`);
        setPreGeneratedCopied(true);
        setTimeout(() => setPreGeneratedCopied(false), 2500);
      } else if (action === "send_email") {
        setEmailStatus("sending");
        const clientEmailAddress = mockDb.getProfile()?.email || "";
        const emailRes = await fetch("/api/send-invite-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: candidateEmail.trim(),
            candidateName: candidateName.trim(),
            role: targetRole,
            inviteLink: `${customBaseUrl}/#/invite/${preGeneratedId}`,
            preferredVoice: preferredVoice,
            clientEmail: clientEmailAddress,
            smtpConfig: getLocalSmtpConfig(),
            questionsCount: supaQuestionsList.length,
            questions_count: supaQuestionsList.length
          })
        });
        const data = await emailRes.json().catch(() => ({}));
        if (!emailRes.ok || data.deliveryStatus === "failed") {
          throw new Error(data.error || data.deliveryError || "Email delivery failed on server SMTP settings.");
        }
        setEmailStatus("sent");
        regenerateInviteId();
        setTimeout(() => setEmailStatus("idle"), 6000);
      }
    } catch (err: any) {
      console.error("Invite link setup/activation error:", err);
      setError(err.message || "Failed to fully activate or dispatch the pre-generated invite.");
      if (action === "send_email") {
        setEmailStatus("idle");
      }
    } finally {
      setIsRegisteringLink(false);
    }
  };

  // Direct Send Email dispatcher
  const handleSendDirectEmail = () => {
    prepareAndRegisterSetup("send_email");
  };

  useEffect(() => {
    const role = localStorage.getItem("ai_mock_interview_admin_role") || "Super Admin";
    setAdminRole(role);

    // Read resumes and profile name
    const storedResumes = mockDb.getResumes();
    setResumes(storedResumes);
    
    const preselectedId = localStorage.getItem("preselected_resume_id");
    let chosenResume = null;
    if (preselectedId) {
      chosenResume = storedResumes.find((r) => r.id === preselectedId);
      // Postpone clearing to ensure successive mounts in Strict Mode can retrieve the ID
      setTimeout(() => {
        localStorage.removeItem("preselected_resume_id");
      }, 500);
    }

    if (chosenResume) {
      applyResumeData(chosenResume);
    } else if (!preselectedId) {
      setCandidateName("");
      setCandidateEmail("");
      setSelectedResumeId("");
      setJobDescriptionText("");
      setJobDescriptionFile("");
      setLastParsedResumeName("");
      setTargetRole("");
      setCandidateLocation("");
      setCurrentSalary("");
      setExpectedSalary("");
    }

    // Fetch live global URL dynamically
    fetch("/api/public-url")
      .then(res => res.json())
      .then(data => {
        if (data && data.publicUrl) {
          localStorage.setItem("server_detected_public_origin", data.publicUrl);
          setCustomBaseUrl(data.publicUrl);
          console.log("🔗 Device-accessible public URL auto-configured:", data.publicUrl);
        }
      })
      .catch(err => {
        console.warn("Could not retrieve server-detected public origin:", err);
      });

    return () => {
      // Pause any active ElevenLabs audio on unmount
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleStartInterview = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminRole === "Interview Observer") {
      setError("Access Restricted: Interview Observers have read-only permissions and cannot launch new interviews.");
      setIsLoading(false);
      return;
    }
    const currentActivePlan = getActivePlan();
    if (currentActivePlan.daysLeft === 0) {
      setError(`Subscription Expired: Your ${currentActivePlan.label} has expired. Please renew your plan on the Subscription page.`);
      setIsLoading(false);
      return;
    }
    const existingCount = mockDb.getInterviews().length;
    if (existingCount >= currentActivePlan.limit) {
      setError(`Subscription Limit Reached: Your ${currentActivePlan.label} limits you to ${currentActivePlan.limit} interview sessions. You have already completed ${existingCount}/${currentActivePlan.limit} sessions. Please upgrade your subscription on the Subscription page.`);
      setIsLoading(false);
      return;
    }
    setError("");
    setIsLoading(true);

    if (!candidateName.trim()) {
      setError("Please specify the candidate name. It is required to open the voice session.");
      setIsLoading(false);
      return;
    }

    if (!candidateEmail.trim()) {
      setError("Please specify the candidate email. It is required to deliver status notifications and session links.");
      setIsLoading(false);
      return;
    }

    if (!jobDescriptionText.trim()) {
      setError("Please provide a Job Description (JD) to customize/generate appropriate domain-specific interview questions.");
      setIsLoading(false);
      return;
    }

    if (!targetRole.trim()) {
      setError("Please specify your target role.");
      setIsLoading(false);
      return;
    }

    // Auto-generate respected resume if none is selected
    let finalResumeId = selectedResumeId;
    if (!finalResumeId) {
      const generatedId = `res_auto_${candidateName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      const existingResumes = mockDb.getResumes();
      const existing = existingResumes.find(r => r.id === generatedId);
      if (existing) {
        finalResumeId = existing.id;
        setSelectedResumeId(existing.id);
      } else {
        const resumeFilename = `${candidateName.trim().replace(/\s+/g, "_")}_Resume.pdf`;
        const autoResumeObj: ResumeData = {
          id: generatedId,
          user_id: "client_user",
          filename: resumeFilename,
          raw_text: `${candidateName.toUpperCase()} — COMPREHENSIVE RECORD\nRole Applied: ${targetRole}\nEmail: ${candidateEmail}\n\nEXPERIENCE\nSpecialist Developer\n* Managed lifecycle components aligned with modern frameworks.\n* Reduced application latencies and designed system metrics dashboards.\n\nSKILLS\nReact, system integration, automated tests, communications.`,
          ats_score: Math.floor(Math.random() * 10) + 85,
          strengths: [`Excellent match for ${targetRole}`, "Clean professional experience timeline"],
          weaknesses: ["Could display more architectural metrics"],
          suggestions: ["Highlight testing automation and coverage percentiles"],
          parsed: {
            name: candidateName,
            skills: ["React", "frameworks", "dashboards", "testing"],
            experienceCount: 4,
            education: ["University Career Reference"],
          },
          created_at: new Date().toISOString()
        };
        mockDb.addResume(autoResumeObj);
        finalResumeId = generatedId;
        setSelectedResumeId(generatedId);
        setLastParsedResumeName(resumeFilename);
        console.log(`🤖 Auto-uploaded respected resume for setup candidate: ${candidateName}`);
      }
    }

    const initiateInterview = async (finalResumeIdParam: string) => {
      try {
        const interviewId = preGeneratedId || "int_" + Math.random().toString(36).substring(2, 11);
        const selectedResume = mockDb.getResumes().find(r => r.id === finalResumeIdParam);
        
        const filteredManualQs = manualQuestions.map(q => q.trim()).filter(q => q !== "");

        // DYNAMICS: Fetch JD-based, candidate-unique mixed MCQ & oral questions
        let generatedQuestionsAndMcqs: any[] = [];
        try {
          const qRes = await fetch("/api/generate-candidate-questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role: targetRole,
              jd: jobDescriptionText || "",
              candidateName: candidateName,
              questionsCount: totalQuestions,
              resumeText: selectedResume?.raw_text || ""
            })
          });
          if (qRes.ok) {
            const qData = await qRes.json();
            if (qData.questions && qData.questions.length > 0) {
              generatedQuestionsAndMcqs = qData.questions;
            }
          }
        } catch (qErr) {
          console.warn("Failed to generate dynamic candidate questions:", qErr);
        }

        // Formulate final questions list with index:
        // We will store the custom generated questions (which mixes MCQs at the start, followed by oral ones)
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

          generatedQuestionsAndMcqs = Array.from({ length: totalQuestions }, (_, i) => {
            const q = fallbackPool[i % fallbackPool.length];
            return { ...q };
          });
        }

        const finalQuestionsList = filteredManualQs.length > 0 
          ? filteredManualQs.map((q, idx) => ({
              id: `q_${Math.random().toString(36).substring(2, 11)}`,
              interview_id: interviewId,
              idx,
              question: q,
              is_mcq: false
            }))
          : generatedQuestionsAndMcqs.map((q, idx) => ({
              id: `q_${Math.random().toString(36).substring(2, 11)}`,
              interview_id: interviewId,
              idx,
              question: q.question,
              is_mcq: q.is_mcq || false,
              mcq_options: q.mcq_options || undefined,
              mcq_correct_index: q.mcq_correct_index !== undefined ? q.mcq_correct_index : undefined,
              mcq_explanation: q.mcq_explanation || undefined
            }));

        const finalTotalQuestions = finalQuestionsList.length;

        const newInterview: Interview = {
          id: interviewId,
          user_id: "client_user",
          resume_id: finalResumeIdParam || "no_resume",
          candidate_name: candidateName,
          candidate_email: candidateEmail.trim() || undefined,
          role: targetRole,
          difficulty: "medium", // set default difficulty level since the tier selector is removed
          total_questions: finalTotalQuestions,
          current_question_idx: 0,
          status: "in_progress",
          started_at: new Date().toISOString(),
          resume_filename: selectedResume?.filename || (lastParsedResumeName ? lastParsedResumeName : "Resume Portfolio.pdf"),
          decision: "pending",
          preferred_voice: preferredVoice,
          manual_questions: filteredManualQs,
          fitment_work_mode_enabled: workModeEnabled,
          fitment_work_mode: workMode,
          fitment_location_enabled: locationEnabled,
          fitment_location_type: locationType,
          fitment_bond_notice_enabled: bondNoticeEnabled,
          expected_salary: expectedSalary || undefined,
          current_salary: currentSalary || undefined,
          location: candidateLocation || undefined,
          job_description: jobDescriptionText || undefined,
          job_description_filename: jobDescriptionFile || undefined
        };

        // Save in mockDb
        mockDb.createInterview(newInterview);
        mockDb.saveQuestions(finalQuestionsList);

        // Step 1: Save standard template schema to Supabase interviews table
        const supaTemplate = {
          id: interviewId,
          interviewId: interviewId,
          role: targetRole,
          title: targetRole,
          questions: finalQuestionsList.map(q => q.question),
          createdBy: mockDb.getProfile()?.email || "company@gmail.com",
          created_at: new Date().toISOString()
        };

        const saveTemplateToSupa = async () => {
          try {
            const { error } = await supabase.from("interviews").insert([supaTemplate]);
            if (error) {
              console.warn("Supabase 'interviews' table insert warning (standard sandbox fallback in effect):", error);
            } else {
              console.log("✔ Supabase 'interviews' template saved successfully:", supaTemplate);
            }
          } catch (err) {
            console.warn("Supabase table exceptions handled successfully:", err);
          }
        };
        saveTemplateToSupa();
        
        // Auto Send Link to Email
        if (candidateEmail.trim() && autoSendEmail) {
          setAutoSendStatus("sending");
          setAutoSendError(null);
          const clientEmailAddress = mockDb.getProfile()?.email || "";
          fetch("/api/send-invite-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: candidateEmail.trim(),
              candidateName: candidateName.trim(),
              role: targetRole,
              inviteLink: `${customBaseUrl}/#/invite/${interviewId}`,
              preferredVoice: preferredVoice,
              clientEmail: clientEmailAddress,
              smtpConfig: getLocalSmtpConfig()
            })
          })
          .then(async (res) => {
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || "Email delivery failed on server.");
            }
            if (data.deliveryStatus === "failed") {
              throw new Error(data.deliveryError || "Mail Server failed to transmit.");
            }
            setAutoSendStatus("success");
            console.log("SMTP Link Broadcast Complete:", data);
          })
          .catch(e => {
            setAutoSendStatus("error");
            setAutoSendError(e.message || String(e));
            console.error("SMTP Broadcast Error:", e);
          });
        } else {
          setAutoSendStatus("idle");
        }

        setGeneratedInterviewId(interviewId);
        setIsLoading(false);
        setInviteCopied(false);
        setShowInviteModal(true);
        regenerateInviteId();
      } catch (err: any) {
        console.error(err);
        setError("Could not create interview session. Ensure database syncing is unobstructed.");
        setIsLoading(false);
      }
    };
    initiateInterview(finalResumeId);
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 ${isLight ? "bg-transparent text-[#131518]" : "bg-slate-950 text-slate-100"}`}>

      {/* HeaderNav */}
      <header className={`relative max-w-7xl mx-auto px-6 h-16 flex items-center justify-between border-b z-10 backdrop-blur-md transition-colors duration-500 ${
        isLight ? "border-slate-200 bg-[#f8f8f6]/30" : "border-slate-900 bg-slate-950/30"
      }`}>
        <button
          id="btn_new_int_back"
          onClick={() => onNavigate("/app")}
          className={`flex items-center gap-2 text-xs font-mono uppercase tracking-wider transition-colors ${
            isLight ? "text-slate-600 hover:text-black" : "text-slate-400 hover:text-white"
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <span className="font-mono text-[10px] text-emerald-500 uppercase tracking-widest font-semibold">New Session Setup</span>
      </header>

      {/* Main Form Context */}
      <main className="max-w-7xl mx-auto px-6 py-10 z-10 relative">
        <div className="max-w-2xl mx-auto">
          
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-8 border rounded-2xl transition-all duration-500 ${
              isLight ? "bg-white/85 border-slate-200/80 shadow-xl" : "bg-slate-900/40 border-slate-800 shadow-2xl"
            }`}
          >
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 through-teal-400 to-blue-500 rounded-t-2xl" />

            <div className="text-center space-y-2 mb-8">
              <h2 className={`text-xl font-bold font-display tracking-tight ${isLight ? "text-[#131518]" : "text-white"}`}>Configure Interview Room</h2>
              <p className={`text-xs px-4 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Personalize details below to start. The AI generates and speaks highly targeted system-level technical and behavioral questions aloud.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex gap-2.5 items-start">
                <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleStartInterview} className="space-y-6">
              
              {/* BRAND NEW COMPLEX CONFIGURATION DESK */}
              <div className={`p-6 border rounded-2xl space-y-5 transition-all duration-500 ${panelBg}`}>
                <div className="flex items-center justify-between border-b pb-3 border-slate-200/50 dark:border-slate-800/40">
                  <span className="font-mono text-[10px] text-emerald-500 uppercase tracking-widest font-black flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    Candidate Dossier & JD Desk
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider font-semibold">Integrative Setup</span>
                </div>

                {/* Name, Email ID, Resume Parse Row */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name field */}
                    <div className="space-y-1.5">
                      <label htmlFor="setup_candidate_name" className={`text-[9.5px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${labelColor}`}>
                        <User className="w-3.5 h-3.5 text-emerald-400" />
                        Candidate Full Name <span className="text-emerald-500 font-extrabold">*</span>
                      </label>
                      <input
                        id="setup_candidate_name"
                        type="text"
                        value={candidateName}
                        onChange={(e) => {
                          setCandidateName(e.target.value);
                          if (error) setError("");
                        }}
                        placeholder="e.g., John Doe"
                        className={`w-full h-11 rounded-lg px-3.5 text-xs focus:outline-none tracking-wide transition-all font-sans ${inputBg}`}
                        required
                      />
                    </div>

                    {/* Email ID field */}
                    <div className="space-y-1.5">
                      <label htmlFor="setup_candidate_email" className={`text-[9.5px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${labelColor}`}>
                        <Mail className="w-3.5 h-3.5 text-emerald-400" />
                        Candidate Email ID <span className="text-emerald-500 font-extrabold">*</span>
                      </label>
                      <input
                        id="setup_candidate_email"
                        type="email"
                        value={candidateEmail}
                        onChange={(e) => setCandidateEmail(e.target.value)}
                        placeholder="e.g., candidate@domain.com"
                        className={`w-full h-11 rounded-lg px-3.5 text-xs focus:outline-none transition-all font-sans ${inputBg}`}
                      />
                    </div>
                  </div>

                  {/* Resume Parse interactive segment */}
                  <div className="space-y-2">
                    <label className={`text-[9.5px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${labelColor}`}>
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      Resume Parse File Upload
                    </label>
                    <div className={`relative border border-dashed rounded-xl p-4 flex flex-col items-center justify-center transition-all bg-emerald-500/[0.01] hover:bg-emerald-500/[0.03] ${
                      isParsing ? "border-emerald-500/50" : isLight ? "border-slate-350 hover:border-emerald-400" : "border-slate-800 hover:border-emerald-500/50"
                    }`}>
                      <input 
                        type="file" 
                        id="resume_dossier_parse"
                        onChange={handleParseResume} 
                        className="absolute inset-0 opacity-0 cursor-pointer text-[0px]" 
                        accept=".pdf,.doc,.docx,.txt" 
                        disabled={isParsing}
                      />
                      {isParsing ? (
                        <div className="flex flex-col items-center gap-2 py-2 text-center">
                          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                          <p className="text-[10px] font-mono text-emerald-400 font-semibold uppercase animate-pulse">Scanning and extracting candidate parameters...</p>
                        </div>
                      ) : (
                        <div className="text-center space-y-1.5 py-1">
                          <Upload className="w-4.5 h-4.5 mx-auto text-emerald-500 opacity-80" />
                          <p className={`text-[11px] font-medium ${isLight ? "text-slate-800" : "text-white"}`}>Drag & Drop Portfolio Resume or click to parse</p>
                          <p className="text-[9px] text-slate-500 leading-normal">Simulates high-fidelity extraction (Name, Email, Role, Location, Salaries)</p>
                          {lastParsedResumeName && (
                            <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-mono font-bold">
                              <Check className="w-2.5 h-2.5" /> Parsed: {lastParsedResumeName}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Job Description row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-250/30 dark:border-slate-800/40 pt-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <label htmlFor="jd_text_area" className={`text-[9.5px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${labelColor}`}>
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      Job Description Requirement <span className="text-emerald-500 font-extrabold">*</span>
                    </label>
                    <textarea
                      id="jd_text_area"
                      rows={3}
                      value={jobDescriptionText}
                      onChange={(e) => setJobDescriptionText(e.target.value)}
                      placeholder="Paste the target job description or core mandates here to align questions..."
                      className={`w-full rounded-lg p-3 text-xs focus:outline-none leading-relaxed resize-none transition-all font-sans ${inputBg}`}
                    />
                  </div>

                  {/* Attach JD file */}
                  <div className="space-y-1.5 flex flex-col justify-between">
                    <div>
                      <label className={`text-[9.5px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${labelColor}`}>
                        <Plus className="w-3.5 h-3.5 text-teal-400" />
                        Attach JD File
                      </label>
                      <p className="text-[9px] text-slate-500 leading-normal">Upload JD specs as PDF or DOCX</p>
                    </div>

                    <div className="relative pt-1">
                      <input 
                        type="file" 
                        id="jd_file_loader" 
                        onChange={handleJdUpload} 
                        className="hidden text-[0px]" 
                        accept=".pdf,.doc,.docx,.txt"
                        disabled={isJdUploading}
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById("jd_file_loader")?.click()}
                        disabled={isJdUploading}
                        className={`w-full h-10 border rounded-lg font-mono text-[9px] uppercase font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isLight 
                            ? "bg-white hover:bg-slate-50 border-slate-250 text-slate-705" 
                            : "bg-slate-950 hover:bg-slate-900 border-slate-850 text-slate-305"
                        }`}
                      >
                        {isJdUploading ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                            <span>Uploading...</span>
                          </>
                        ) : jobDescriptionFile ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="truncate max-w-[120px] text-emerald-400 font-extrabold">{jobDescriptionFile}</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5 text-slate-400" />
                            <span>Browse JD</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Salary: Expected, Current */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-250/30 dark:border-slate-800/40 pt-4">
                  <div className="space-y-1.5">
                    <label htmlFor="setup_current_salary" className={`text-[9.5px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${labelColor}`}>
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      Current Salary Setup
                    </label>
                    <input
                      id="setup_current_salary"
                      type="text"
                      value={currentSalary}
                      onChange={(e) => setCurrentSalary(e.target.value)}
                      placeholder="e.g., ₹12,00,000 / year"
                      className={`w-full h-11 rounded-lg px-3.5 text-xs focus:outline-none transition-all font-sans ${inputBg}`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="setup_expected_salary" className={`text-[9.5px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${labelColor}`}>
                      <Award className="w-3.5 h-3.5 text-emerald-400" />
                      Expected Salary Setup
                    </label>
                    <input
                      id="setup_expected_salary"
                      type="text"
                      value={expectedSalary}
                      onChange={(e) => setExpectedSalary(e.target.value)}
                      placeholder="e.g., ₹18,50,050 / year"
                      className={`w-full h-11 rounded-lg px-3.5 text-xs focus:outline-none transition-all font-sans ${inputBg}`}
                    />
                  </div>
                </div>

                {/* Location Input Row */}
                <div className="space-y-1.5 border-t border-slate-250/30 dark:border-slate-800/40 pt-4">
                  <label htmlFor="setup_candidate_location" className={`text-[9.5px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${labelColor}`}>
                    <LayoutGrid className="w-3.5 h-3.5 text-teal-400" />
                    Target Candidate Location
                  </label>
                  <input
                    id="setup_candidate_location"
                    type="text"
                    value={candidateLocation}
                    onChange={(e) => setCandidateLocation(e.target.value)}
                    placeholder="e.g., Pune, Maharashtra or Remote, India"
                    className={`w-full h-11 rounded-lg px-3.5 text-xs focus:outline-none transition-all font-sans ${inputBg}`}
                  />
                </div>

                {/* Action Hub: Copy interview Link & Send Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-250/30 dark:border-slate-800/40 pt-4">
                  {/* Copy Interview Link section */}
                  <div className="space-y-2">
                    <label className="text-[9.5px] font-mono uppercase tracking-wider text-slate-550 block font-bold">
                      Pre-generated Invite Link:
                    </label>
                    <div className={`flex border rounded-lg p-0.5 items-center gap-2 ${inputBg}`}>
                      <input
                        type="text"
                        readOnly
                        value={`${customBaseUrl}/#/invite/${preGeneratedId}`}
                        className="flex-1 bg-transparent pl-3 pr-1 text-[10.5px] font-mono text-emerald-400 focus:outline-none truncate select-all"
                      />
                      <button
                        type="button"
                        disabled={isRegisteringLink}
                        onClick={() => {
                          prepareAndRegisterSetup("copy");
                        }}
                        className={`h-8 px-3 rounded-md font-mono text-[9px] uppercase font-bold tracking-wider transition-all flex items-center gap-1 shrink-0 ${
                          preGeneratedCopied 
                            ? "bg-emerald-500 text-slate-950 font-black" 
                            : isRegisteringLink
                              ? "bg-indigo-600/30 text-indigo-400 border border-indigo-500/20"
                              : "bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-slate-300 hover:text-white"
                        }`}
                      >
                        {preGeneratedCopied ? (
                          <Check className="w-3 h-3 stroke-[3]" />
                        ) : isRegisteringLink ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{isRegisteringLink ? "Activating Link..." : preGeneratedCopied ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Send Email direct button */}
                  <div className="space-y-2 flex flex-col justify-end">
                    <label className="text-[9.5px] font-mono uppercase tracking-wider text-slate-550 block font-bold">
                      Direct Messaging dispatch:
                    </label>
                    <button
                      type="button"
                      id="btn_send_direct_email"
                      onClick={handleSendDirectEmail}
                      disabled={emailStatus === "sending" || !candidateEmail.trim()}
                      className={`h-9 w-full rounded-lg font-mono text-[9.5px] uppercase font-semibold tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                        emailStatus === "sent"
                          ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                          : emailStatus === "sending"
                            ? "bg-indigo-500/10 border-indigo-500/25 text-indigo-400"
                            : "bg-indigo-500/[0.08] hover:bg-indigo-500/[0.15] border-indigo-500/25 text-indigo-400 hover:text-indigo-305"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {emailStatus === "sending" ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Delivering invite...</span>
                        </>
                      ) : emailStatus === "sent" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Invitation Sent!</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Email Invite</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* QR Settings Section */}
                  <div className="md:col-span-2 space-y-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setShowUrlSettings(!showUrlSettings)}
                      className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer select-none"
                    >
                      <span>⚙️ {showUrlSettings ? "Hide QR & Mobile Share Settings" : "Open QR Code / Mobile Share Mode"}</span>
                    </button>
                    
                    {showUrlSettings && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-3.5 rounded-lg border border-indigo-500/10 bg-indigo-950/20 space-y-3 font-sans text-[11px]"
                      >
                        <p className="font-mono text-[9px] uppercase tracking-wider text-indigo-300 font-bold">📱 Mobile Device / Multi-Device Linking Console</p>
                        <p className="text-slate-400 leading-relaxed font-light">
                          Ensure you copy and send the public link configured above. Copying the development environment's main editor address bar directly might restrict access on external mobile devices.
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
                          <div className="sm:col-span-8 space-y-2">
                            <label className="text-[9px] font-mono uppercase text-slate-405 font-bold block">
                              Configure Public App Domain (Base URL):
                            </label>
                            <input
                              type="text"
                              value={customBaseUrl}
                              onChange={(e) => handleUpdateCustomBaseUrl(e.target.value)}
                              placeholder={`e.g. ${window.location.origin}`}
                              className="w-full h-8 px-2.5 rounded text-[10px] font-mono bg-slate-900 border border-slate-800 text-indigo-300 focus:outline-none focus:border-indigo-500"
                            />
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateCustomBaseUrl(window.location.origin)}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[8px] font-mono font-medium text-slate-300"
                              >
                                Reset to Current Origin
                              </button>
                            </div>
                            <p className="text-slate-400 leading-normal text-[10px]">
                              Tip: Paste your <strong className="text-emerald-400">Shared App URL</strong> (or click "Reset to Current Origin" if this matches your Cloud Run domain) to update the invite links instantly.
                            </p>
                          </div>
                          
                          <div className="sm:col-span-4 flex flex-col items-center justify-center p-2 rounded bg-slate-950 border border-slate-900">
                            <img 
                              src={getQrCodeUrl(`${customBaseUrl}/#/invite/${preGeneratedId}`)} 
                              alt="Scan to open on other devices" 
                              className="w-24 h-24 bg-white p-0.5 rounded shadow-sm"
                            />
                            <span className="text-[8px] font-mono text-slate-405 mt-1.5 uppercase text-center font-bold">Scan to open on phone</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* LIVE COMPREHENSIVE EMAIL PREVIEW DESK */}
                <div className="mt-4 pt-4 border-t border-slate-200/40 dark:border-slate-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-mono uppercase tracking-widest text-[#64748b] dark:text-slate-400 font-bold flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-400" />
                      Live Email Notification Preview
                    </span>
                    <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 uppercase font-black tracking-wider">Candidate Template Layout</span>
                  </div>
                  
                  <div className={`p-4 rounded-xl border font-sans text-xs space-y-4 ${
                    isLight ? "bg-[#fcfcfb] border-slate-205 text-slate-705" : "bg-slate-950 border-slate-850/80 text-slate-300"
                  }`}>
                    {/* Greetings Section */}
                    <div className="border-b pb-2.5 border-slate-200/55 dark:border-slate-800/80">
                      <p className="text-[8px] font-mono uppercase tracking-widest text-slate-450 dark:text-slate-500">Greetings from Company</p>
                      <p className={`text-[11.5px] font-bold mt-1 ${isLight ? "text-slate-900" : "text-white"}`}>Greetings from HireIQ Talent Platform</p>
                    </div>

                    {/* Body text with button */}
                    <div className="space-y-3">
                      <p className="text-[8px] font-mono uppercase tracking-widest text-slate-450 dark:text-slate-500">Body & Action CTA Channel</p>
                      <p className="leading-relaxed text-[11px]">
                        Dear <strong>{candidateName || "Candidate Name"}</strong>,<br />
                        We are pleased to invite you to complete a secure AI Voice-Simulated Interview session for the position of <strong>{targetRole || "Software Engineer"}</strong>.
                      </p>
                      <div className="py-2.5 text-center">
                        <a 
                          href={`${customBaseUrl}/#/invite/${preGeneratedId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold text-[11px] tracking-wide inline-flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <span>Start Your AI Interview</span>
                          <span className="text-xs">&rarr;</span>
                        </a>
                      </div>
                    </div>

                    {/* Instructions segment */}
                    <div className="p-3.5 rounded-lg bg-purple-500/[0.02] border border-purple-500/10 space-y-2">
                      <p className="text-[8.5px] font-mono uppercase tracking-widest text-purple-600 dark:text-purple-400 font-black flex items-center gap-1">📋 Key Instructions & Guidelines</p>
                      <ul className="list-disc pl-4 space-y-1 text-[10px] text-slate-550 dark:text-slate-400 leading-relaxed">
                        <li><strong>Preparation:</strong> Secure a quiet, distraction-free room before launching.</li>
                        <li><strong>Audio Input:</strong> Grant browser microphone and camera permissions when prompted.</li>
                        <li><strong>Stability:</strong> Maintain a reliable internet connection to prevent telemetry lag.</li>
                        <li><strong>Interactive Process:</strong> Answer naturally using real-time speech. Review detailed feedback upon finishing.</li>
                      </ul>
                    </div>
                  </div>
                </div>

              </div>

              {/* 2. TARGET ROLE */}
              <div className="space-y-1.5 col-span-1">
                <label className={`text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${labelColor}`}>
                  <LayoutGrid className="w-3.5 h-3.5 text-teal-400" />
                  Target Role Setup <span className="text-emerald-500 font-extrabold">*</span>
                </label>
                <input
                  id="setup_target_role"
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="E.g., Senior Frontend Engineer"
                  className={`w-full h-11 rounded-lg px-4 text-xs focus:outline-none tracking-wide transition-all font-sans ${inputBg}`}
                  required
                />
              </div>

              {/* 3. QUESTIONS COUNT / LENGTH */}
              <div className="space-y-1.5">
                <label className={`text-[10px] font-mono uppercase tracking-wider block ${labelColor}`}>Total Interview Length</label>
                <select
                  id="setup_questions_count"
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Number(e.target.value))}
                  className={`w-full h-11 rounded-lg px-3 text-xs focus:outline-none transition-all font-sans ${inputBg}`}
                >
                  <option value={2} className={isLight ? "text-slate-900 bg-white" : "text-slate-300 bg-slate-950"}>2 Questions (Brief run)</option>
                  <option value={3} className={isLight ? "text-slate-900 bg-white" : "text-slate-300 bg-slate-950"}>3 Questions (Standard session)</option>
                  <option value={4} className={isLight ? "text-slate-900 bg-white" : "text-slate-300 bg-slate-950"}>4 Questions (Deep assessment)</option>
                  <option value={5} className={isLight ? "text-slate-900 bg-white" : "text-slate-300 bg-slate-950"}>5 Questions (Comprehensive loop)</option>
                  <option value={20} className={isLight ? "text-slate-900 bg-white" : "text-slate-300 bg-slate-950"}>20 Questions (Ultimate feedback)</option>
                </select>
              </div>

              {/* Manual Warmup Questions block */}
              <div className={`space-y-3 p-5 rounded-2xl border transition-colors duration-500 ${panelBg}`}>
                <div className="flex items-center justify-between">
                  <label className={`text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 font-bold ${labelColor}`}>
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    Manual Warmup Questions
                  </label>
                  <button
                    type="button"
                    onClick={handleAddManualQuestion}
                    className="text-[9px] font-mono uppercase tracking-wider text-emerald-500 hover:text-emerald-450 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add Slot
                  </button>
                </div>
                <p className={`text-[10px] font-light leading-relaxed ${textMuted}`}>
                  Optional. Submit custom warmup questions to ask vocally first. Once the candidate answers them, our AI resumes from there.
                </p>
                
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {manualQuestions.map((question, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="text-[10px] font-mono text-slate-500 shrink-0 select-none">#{idx + 1}</span>
                      <input
                        type="text"
                        value={question}
                        onChange={(e) => handleManualQuestionChange(idx, e.target.value)}
                        placeholder="E.g., Walk me through your design approach for implementing scalable global cache states."
                        className={`flex-1 h-9 rounded-lg px-3 text-xs focus:outline-none transition-all font-sans ${inputBg}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveManualQuestion(idx)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
                          isLight 
                            ? "bg-slate-50 border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 hover:border-rose-200" 
                            : "bg-slate-950 border-slate-900 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 hover:border-rose-900/30"
                        }`}
                        title="Remove Question Slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Interviewer Voice Persona Selection with demos */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  AI Recruiter Voice Persona <span className="text-slate-500">*</span>
                </label>
                <p className="text-[10.5px] text-slate-500 font-light leading-relaxed">
                  Select a recruiter voice persona for the voice-simulated interview room. Click the play demo icons to hear their dialect synthesis.
                </p>
                <div className="animate-fade-in grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-xl">
                  
                  {/* Indian Slang Female Persona Selection block */}
                  <div
                    onClick={() => setPreferredVoice("female")}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between h-28 text-left group cursor-pointer ${
                      preferredVoice === "female"
                        ? isLight 
                          ? "bg-slate-50/90 border-emerald-500 ring-2 ring-emerald-500/10 shadow-md" 
                          : "bg-slate-900/80 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.12)]"
                        : isLight
                          ? "bg-white border-slate-200 hover:border-slate-350 shadow-sm"
                          : "bg-slate-950/60 border-slate-850 hover:border-indigo-500/20"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 w-full mb-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                        preferredVoice === "female"
                          ? "border-emerald-500 bg-emerald-500 text-slate-950"
                          : isLight ? "border-slate-300 bg-transparent" : "border-slate-800 bg-transparent"
                      }`}>
                        {preferredVoice === "female" ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-transparent" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isLight ? "text-slate-950" : "text-slate-200"}`}>Indian Slang Female</p>
                        <p className="text-[9px] font-mono text-slate-500 truncate font-medium">Expressive Dialect Synthesis</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[8px] font-mono text-slate-500 font-medium">Local Synthesis (en-IN)</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playVoiceDemo("female");
                        }}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer shadow-sm shrink-0 border ${
                          preferredVoice === "female"
                            ? isLight ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-650" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                            : isLight ? "bg-white border-slate-200 hover:bg-slate-100 text-slate-700 hover:text-black" : "bg-slate-900 border-slate-800 hover:border-indigo-500/20 text-slate-400 hover:text-indigo-400"
                        }`}
                        title="Play Indian Female Audio Sample"
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    </div>
                  </div>

                  {/* Indian Slang Male Persona Selection block */}
                  <div
                    onClick={() => setPreferredVoice("male")}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between h-28 text-left group cursor-pointer ${
                      preferredVoice === "male"
                        ? isLight 
                          ? "bg-slate-50/90 border-emerald-500 ring-2 ring-emerald-500/10 shadow-md" 
                          : "bg-slate-900/80 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.12)]"
                        : isLight
                          ? "bg-white border-slate-200 hover:border-slate-350 shadow-sm"
                          : "bg-slate-950/60 border-slate-850 hover:border-indigo-500/20"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 w-full mb-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                        preferredVoice === "male"
                          ? "border-emerald-500 bg-emerald-500 text-slate-950"
                          : isLight ? "border-slate-300 bg-transparent" : "border-slate-800 bg-transparent"
                      }`}>
                        {preferredVoice === "male" ? (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-transparent" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isLight ? "text-slate-950" : "text-slate-200"}`}>Indian Slang Male</p>
                        <p className="text-[9px] font-mono text-slate-500 truncate font-medium">Dynamic Dialect Synthesis</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[8px] font-mono text-slate-500 font-medium font-semibold">Local Synthesis (en-IN)</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playVoiceDemo("male");
                        }}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer shadow-sm shrink-0 border ${
                          preferredVoice === "male"
                            ? isLight ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-650" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                            : isLight ? "bg-white border-slate-200 hover:bg-slate-100 text-slate-700 hover:text-black" : "bg-slate-900 border-slate-800 hover:border-indigo-500/20 text-slate-400 hover:text-indigo-400"
                        }`}
                        title="Play Indian Male Audio Sample"
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* 4. CANDIDATE FITMENT PREFERENCES */}
              <div className="space-y-4">
                {/* Candidate Fitment Preferences Container as requested from the mockup */}
                <div className={`p-5 rounded-xl space-y-4 text-left animate-fade-in shadow-inner border transition-all duration-500 ${subPanelBg}`}>
                  
                  {/* Work Mode preference */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer group select-none">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={workModeEnabled}
                          onChange={(e) => setWorkModeEnabled(e.target.checked)}
                          className={`peer appearance-none w-4 h-4 rounded border focus:outline-none cursor-pointer transition-all ${
                            isLight ? "border-slate-300 bg-white checked:bg-emerald-500 checked:border-emerald-500" : "border-slate-700 bg-slate-950 checked:bg-emerald-500 checked:border-emerald-500"
                          }`}
                        />
                        {workModeEnabled && (
                          <Check className="absolute w-3 h-3 text-slate-950 stroke-[3] pointer-events-none left-0.5 top-0.5" />
                        )}
                      </div>
                      <span className={`text-xs font-bold transition-colors ${isLight ? "text-slate-750 group-hover:text-black" : "text-slate-200 group-hover:text-white"}`}>Work Mode</span>
                    </label>

                    {workModeEnabled && (
                      <div className="pl-7 flex items-center gap-6 animate-fade-in">
                        <label className={`flex items-center gap-2 text-xs cursor-pointer transition-colors select-none ${isLight ? "text-slate-600 hover:text-black" : "text-slate-400 hover:text-white"}`}>
                          <input
                            type="radio"
                            name="workMode"
                            value="on-site"
                            checked={workMode === "on-site"}
                            onChange={() => setWorkMode("on-site")}
                            className={`appearance-none w-3.5 h-3.5 rounded-full border focus:outline-none cursor-pointer transition-all ${
                              isLight ? "border-slate-300 bg-white checked:bg-emerald-500 checked:border-emerald-500" : "border-slate-700 bg-slate-950 checked:bg-emerald-500 checked:border-emerald-500"
                            }`}
                          />
                          <span className={workMode === "on-site" ? (isLight ? "text-slate-900 font-semibold" : "text-slate-200 font-medium") : ""}>On-site</span>
                        </label>
                        <label className={`flex items-center gap-2 text-xs cursor-pointer transition-colors select-none ${isLight ? "text-slate-600 hover:text-black" : "text-slate-400 hover:text-white"}`}>
                          <input
                            type="radio"
                            name="workMode"
                            value="remote"
                            checked={workMode === "remote"}
                            onChange={() => setWorkMode("remote")}
                            className={`appearance-none w-3.5 h-3.5 rounded-full border focus:outline-none cursor-pointer transition-all ${
                              isLight ? "border-slate-300 bg-white checked:bg-emerald-500 checked:border-emerald-500" : "border-slate-700 bg-slate-950 checked:bg-emerald-500 checked:border-emerald-500"
                            }`}
                          />
                          <span className={workMode === "remote" ? (isLight ? "text-slate-900 font-semibold" : "text-slate-200 font-medium") : ""}>Remote</span>
                        </label>
                        <label className={`flex items-center gap-2 text-xs cursor-pointer transition-colors select-none ${isLight ? "text-slate-600 hover:text-black" : "text-slate-400 hover:text-white"}`}>
                          <input
                            type="radio"
                            name="workMode"
                            value="hybrid"
                            checked={workMode === "hybrid"}
                            onChange={() => setWorkMode("hybrid")}
                            className={`appearance-none w-3.5 h-3.5 rounded-full border focus:outline-none cursor-pointer transition-all ${
                              isLight ? "border-slate-300 bg-white checked:bg-emerald-500 checked:border-emerald-500" : "border-slate-700 bg-slate-950 checked:bg-emerald-500 checked:border-emerald-500"
                            }`}
                          />
                          <span className={workMode === "hybrid" ? (isLight ? "text-slate-900 font-semibold" : "text-slate-200 font-medium") : ""}>Hybrid</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Location preference */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer group select-none">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={locationEnabled}
                          onChange={(e) => setLocationEnabled(e.target.checked)}
                          className={`peer appearance-none w-4 h-4 rounded border focus:outline-none cursor-pointer transition-all ${
                            isLight ? "border-slate-300 bg-white checked:bg-emerald-500 checked:border-emerald-500" : "border-slate-700 bg-slate-950 checked:bg-emerald-500 checked:border-emerald-500"
                          }`}
                        />
                        {locationEnabled && (
                          <Check className="absolute w-3 h-3 text-slate-950 stroke-[3] pointer-events-none left-0.5 top-0.5" />
                        )}
                      </div>
                      <span className={`text-xs font-bold transition-colors ${isLight ? "text-slate-750 group-hover:text-black" : "text-slate-200 group-hover:text-white"}`}>Location</span>
                    </label>

                    {locationEnabled && (
                      <div className="pl-7 flex items-center gap-6 animate-fade-in">
                        <label className={`flex items-center gap-2 text-xs cursor-pointer transition-colors select-none ${isLight ? "text-slate-600 hover:text-black" : "text-slate-400 hover:text-white"}`}>
                          <input
                            type="radio"
                            name="locationType"
                            value="current"
                            checked={locationType === "current"}
                            onChange={() => setLocationType("current")}
                            className={`appearance-none w-3.5 h-3.5 rounded-full border focus:outline-none cursor-pointer transition-all ${
                              isLight ? "border-slate-300 bg-white checked:bg-emerald-500 checked:border-emerald-500" : "border-slate-700 bg-slate-950 checked:bg-emerald-500 checked:border-emerald-500"
                            }`}
                          />
                          <span className={locationType === "current" ? (isLight ? "text-slate-900 font-semibold" : "text-slate-200 font-medium") : ""}>Current Location</span>
                        </label>
                        <label className={`flex items-center gap-2 text-xs cursor-pointer transition-colors select-none ${isLight ? "text-slate-600 hover:text-black" : "text-slate-400 hover:text-white"}`}>
                          <input
                            type="radio"
                            name="locationType"
                            value="preferred"
                            checked={locationType === "preferred"}
                            onChange={() => setLocationType("preferred")}
                            className={`appearance-none w-3.5 h-3.5 rounded-full border focus:outline-none cursor-pointer transition-all ${
                              isLight ? "border-slate-300 bg-white checked:bg-emerald-500 checked:border-emerald-500" : "border-slate-700 bg-slate-950 checked:bg-emerald-500 checked:border-emerald-500"
                            }`}
                          />
                          <span className={locationType === "preferred" ? (isLight ? "text-slate-900 font-semibold" : "text-slate-200 font-medium") : ""}>Preferred Location</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Bond / Notice Period preference */}
                  <div className="pt-1">
                    <label className="flex items-center gap-3 cursor-pointer group select-none">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={bondNoticeEnabled}
                          onChange={(e) => setBondNoticeEnabled(e.target.checked)}
                          className={`peer appearance-none w-4 h-4 rounded border focus:outline-none cursor-pointer transition-all ${
                            isLight ? "border-slate-300 bg-white checked:bg-emerald-500 checked:border-emerald-500" : "border-slate-700 bg-slate-950 checked:bg-emerald-500 checked:border-emerald-500"
                          }`}
                        />
                        {bondNoticeEnabled && (
                          <Check className="absolute w-3 h-3 text-slate-950 stroke-[3] pointer-events-none left-0.5 top-0.5" />
                        )}
                      </div>
                      <span className={`text-xs font-bold transition-colors ${isLight ? "text-slate-750 group-hover:text-black" : "text-slate-200 group-hover:text-white"}`}>Bond / Notice Period</span>
                    </label>
                  </div>

                </div>
              </div>

              {/* FORM SUBMIT GLOW ACTION & SECURE INVITE BOX UP */}
              <div className="pt-4">
                <div className={`p-4 rounded-xl border text-left space-y-3.5 transition-all duration-300 ${isLight ? "bg-slate-50/80 border-slate-200" : "bg-slate-900/40 border-slate-800/80"}`}>
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/40 dark:border-slate-800/60">
                    <div className="flex items-center gap-1.5 matches-box">
                      <Link className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />
                      <span className={`text-[10px] font-mono tracking-wider font-extrabold uppercase ${isLight ? "text-slate-850" : "text-emerald-400/90"}`}>
                        Dynamic Secure Link Manifest
                      </span>
                    </div>
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-500 border border-pink-500/25 uppercase tracking-widest font-extrabold animate-pulse">
                      2-Hour Expiry Active
                    </span>
                  </div>

                  <p className={`text-[10.5px] leading-relaxed ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                    This candidate's secure entrance is pre-generated below. You can copy the link immediately or click the <strong className="text-emerald-400 font-bold">Send Invites</strong> button below to transmit it directly to the candidate's email box.
                  </p>

                  <div className="space-y-1.5">
                    <div className={`flex border rounded-lg p-0.5 items-center gap-2 ${inputBg}`}>
                      <input
                        type="text"
                        readOnly
                        value={`${customBaseUrl}/#/invite/${preGeneratedId}`}
                        className="flex-1 bg-transparent pl-3 pr-1 text-[10.5px] font-mono text-emerald-400 focus:outline-none truncate select-all"
                      />
                      <button
                        type="button"
                        disabled={isRegisteringLink}
                        onClick={() => {
                          prepareAndRegisterSetup("copy");
                        }}
                        className={`h-8 px-3 rounded-md font-mono text-[9px] uppercase font-bold tracking-wider transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
                          preGeneratedCopied 
                            ? "bg-emerald-500 text-slate-950 font-black" 
                            : isRegisteringLink
                              ? "bg-slate-900 border border-slate-800 text-indigo-400"
                              : "bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-350"
                        }`}
                      >
                        {preGeneratedCopied ? (
                          <Check className="w-3 h-3 stroke-[3]" />
                        ) : isRegisteringLink ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{isRegisteringLink ? "Activating..." : preGeneratedCopied ? "Copied" : "Copy link"}</span>
                      </button>
                    </div>
                  </div>

                  <button
                    id="btn_setup_start"
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10 disabled:bg-slate-800 disabled:text-slate-500"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        Dispersing & Emailing Invite...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 fill-current" />
                        Send Invites
                      </>
                    )}
                  </button>
                </div>
              </div>

            </form>
          </motion.div>

        </div>
      </main>

      {/* Pristine Candidate Invite Link Modal Overlay */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            id="blk_invite_modal_overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          >
            <motion.div
              id="blk_invite_modal_card"
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative text-left"
            >
              {/* Header decoration */}
              <div className="flex items-center justify-between border-b border-slate-850 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <Link className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">Interview Room Activated</h3>
                    <p className="text-[9.5px] font-mono uppercase tracking-wider text-slate-500">Secure Candidate Invitation Key</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="p-1 rounded-lg border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Description & metadata summary */}
              <div className="space-y-3">
                <p className="text-xs text-slate-400 leading-relaxed font-light">
                  The voice simulation room has been successfully configured. Send this secure, unique invite link to your candidate. 
                  Under security compliance rules, <strong>this link expires automatically after the session ends</strong>.
                </p>

                <div className="p-3 bg-slate-950/60 border border-slate-850/80 rounded-xl space-y-1 text-[11px] font-mono text-slate-500">
                  <div>&bull; Recipient Candidate: <span className="text-slate-300 font-bold">{candidateName}</span></div>
                  {candidateEmail && (
                    <div>&bull; Candidate Email: <span className="text-slate-300">{candidateEmail}</span></div>
                  )}
                  <div>&bull; Target Role Scenario: <span className="text-slate-350">{targetRole}</span></div>
                  <div>&bull; Configured Voice: <span className="text-slate-350 capitalize">{preferredVoice} style</span></div>
                </div>

                {candidateEmail && autoSendEmail && (
                  <div className="space-y-1.5">
                    {autoSendStatus === "sending" && (
                      <div className="p-3 bg-[#4f46e5]/[0.04] border border-[#4f46e5]/20 rounded-xl space-y-1.5 animate-pulse">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-indigo-400 flex items-center gap-1.5 font-bold">
                            <span className="flex h-1.5 w-1.5 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-505"></span>
                            </span>
                            Auto-Delivery Status: Transmitting
                          </span>
                          <span className="text-[8px] font-mono text-slate-500 uppercase font-bold">SMTP Relay</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal font-light">
                          Transmitting secure mock candidate invitation package via your SMTP credentials...
                        </p>
                      </div>
                    )}

                    {autoSendStatus === "success" && (
                      <div className="p-3 bg-emerald-500/[0.04] border border-emerald-500/20 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 font-bold">
                            <span className="flex h-1.5 w-1.5 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                            Auto-Delivery Status: Dispatched
                          </span>
                          <span className="text-[8px] font-mono text-slate-500 uppercase font-bold">Mail Gateway</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal font-light">
                          Successfully formulated secure invitation and dispatched to <strong className="text-emerald-400 font-medium">{candidateEmail}</strong>. Secure delivery TLS confirmed.
                        </p>
                      </div>
                    )}

                    {autoSendStatus === "error" && (
                      <div className="p-3 bg-rose-500/[0.04] border border-rose-500/20 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono uppercase tracking-wider text-rose-400 flex items-center gap-1.5 font-bold">
                            Auto-Delivery Warning: SMTP Failure
                          </span>
                          <span className="text-[8px] font-mono text-slate-500 uppercase font-bold">SMTP Relay</span>
                        </div>
                        <p className="text-[10px] text-rose-300 leading-normal font-light">
                          Failed to deliver session invite to candidate inbox. <br />
                          <strong className="text-rose-400 font-medium break-words block mt-1">{autoSendError || "SMTP service failed on current port connection configurations."}</strong>
                        </p>
                        
                        <div className="pt-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setAutoSendStatus("sending");
                              setAutoSendError(null);
                              const clientEmailAddress = mockDb.getProfile()?.email || "";
                              fetch("/api/send-invite-email", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  email: candidateEmail.trim(),
                                  candidateName: candidateName.trim(),
                                  role: targetRole,
                                  inviteLink: `${customBaseUrl}/#/invite/${generatedInterviewId}`,
                                  preferredVoice: preferredVoice,
                                  clientEmail: clientEmailAddress,
                                  smtpConfig: getLocalSmtpConfig()
                                })
                              })
                              .then(async (res) => {
                                const data = await res.json();
                                if (!res.ok) {
                                  throw new Error(data.error || "Email delivery failed on server.");
                                }
                                if (data.deliveryStatus === "failed") {
                                  throw new Error(data.deliveryError || "Mail Server failed to transmit.");
                                }
                                setAutoSendStatus("success");
                              })
                              .catch(e => {
                                setAutoSendStatus("error");
                                setAutoSendError(e.message || String(e));
                              });
                            }}
                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[9px] font-mono uppercase tracking-wider px-2.5 py-1 rounded border border-rose-500/20 cursor-pointer transition-all font-bold"
                          >
                            Retry SMTP Transmission
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Copy URL share deck field box */}
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-850/70">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
                    Copy Shareable Invite Link:
                  </label>
                  <div className="flex bg-slate-950 border border-slate-850 rounded-xl p-1 items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${customBaseUrl}/#/invite/${generatedInterviewId}`}
                      className="flex-1 bg-transparent px-3 text-xs font-mono text-emerald-400 focus:outline-none truncate select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${customBaseUrl}/#/invite/${generatedInterviewId}`);
                        setInviteCopied(true);
                        setTimeout(() => setInviteCopied(false), 3000);
                      }}
                      className={`h-9 px-4 rounded-lg font-mono text-[10px] uppercase font-bold tracking-wider transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                        inviteCopied 
                          ? "bg-emerald-500 text-slate-950 font-black" 
                          : "bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-slate-300 hover:text-white"
                      }`}
                    >
                      {inviteCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* QR Code and Quick help for other devices */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center pt-2 border-t border-slate-900">
                  <div className="sm:col-span-8 space-y-1 text-[11px] text-slate-400 font-sans leading-normal">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-indigo-400 block font-bold">📱 Open on other devices / Mobiles</span>
                    <p className="font-light">
                      Use this QR code or the public URL above to share the interview link directly with candidates on other devices!
                    </p>
                  </div>
                  <div className="sm:col-span-4 flex justify-center">
                    <div className="p-1.5 bg-white rounded shadow-sm">
                      <img 
                        src={getQrCodeUrl(`${customBaseUrl}/#/invite/${generatedInterviewId}`)} 
                        alt="Scan QR" 
                        className="w-20 h-20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Action Buttons footer */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-850/60">
                <button
                  type="button"
                  onClick={() => onNavigate("/app")}
                  className="flex-1 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer shadow-lg shadow-emerald-500/10"
                >
                  Return to Dashboard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
