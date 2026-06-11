import React, { useState, useRef } from "react";
import { motion } from "motion/react";
import { 
  ArrowLeft, 
  Upload, 
  Sparkles, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight, 
  Zap, 
  FileText, 
  BookOpen, 
  Briefcase,
  AlertCircle,
  Trash2,
  User,
  Play
} from "lucide-react";
import { ResumeData } from "../types";
import { mockDb } from "../lib/mockDb";

interface ResumeUploadProps {
  onNavigate: (path: string) => void;
  theme?: "dark" | "light";
}

const PRESET_RESUMES = [
  {
    name: "Alex Rodriguez — Senior React Web Engineer",
    skills: ["React", "TypeScript", "Tailwind CSS", "Vite", "Node.js", "Web Audio API"],
    text: `ALEX RODRIGUEZ — SENIOR REACT ENGINEER
Contact: alex.rodriguez@example.com | Seattle, WA

EXPERIENCE
Lead Frontend Architect - ModernWeb Inc. (3 years)
* Designed scalable client architecture utilizing React 19, web audio layers, and optimized state-charts.
* Integrated audio capture hooks converting PCM arrays locally, scaling backend processing.
* Reduced visual render latency by 45% using customized memoization strategies.

Senior UI Developer - TechLabs LLC (2 years)
* Created clean reusable component design systems based on modular guidelines.
* Leveraged standard Tailwind layout practices to support desktop and mobile viewports.

SKILLS
Extensive: React, TypeScript, Tailwind CSS, Vite, Node.js, Web Audio API, Express, Client Audio, Performance Diagnostics.`
  },
  {
    name: "Sophia Chen — Technical Product Manager",
    skills: ["Agile Development", "Product Strategy", "System Architecture", "Google Analytics", "SQL"],
    text: `SOPHIA CHEN — TECHNICAL PRODUCT MANAGER
Contact: sophia.chen@example.com | San Francisco, CA

EXPERIENCE
Senior Product Manager - CloudScale Solutions (4 years)
* Directed engineering sprints for multi-modal API products, increasing volume by 120% YoY.
* Coordinated with interface design and front-end teams to support low-latency voice integrations.
* Spearheaded quantitative feature audits using Google Analytics and direct behavioral tests.

Associate Product Lead - FinTech Corp (2 years)
* Developed clean roadmap diagrams and functional product briefs for cross-functional developers.

SKILLS
Core: Agile Development, Product Strategy, System Architecture, Google Analytics, SQL, Metrics Analytics, Cross-team alignment.`
  }
];

export default function ResumeUpload({ onNavigate, theme = "dark" }: ResumeUploadProps) {
  const isLight = theme === "light";
  const [dragActive, setDragActive] = useState(false);
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<ResumeData | null>(null);
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [confirmToDeleteId, setConfirmToDeleteId] = useState<string | null>(null);
  const [isOfflineSimulation, setIsOfflineSimulation] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setResumes(mockDb.getResumes());
  }, []);

  const handleDeleteResume = (id: string) => {
    mockDb.deleteResume(id);
    setResumes(mockDb.getResumes());
    if (analysis && analysis.id === id) {
      setAnalysis(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

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

  const processText = async (content: string, isBase64: boolean, titleName: string) => {
    setIsLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const bodyPayload = isBase64 
        ? { fileBase64: content, filename: titleName }
        : { resumeText: content };

      const response = await fetch("/api/analyze-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned error ${response.status}`);
      }

      const parsedResult = await response.json();
      if (parsedResult.isSimulated) {
        setIsOfflineSimulation(true);
      } else {
        setIsOfflineSimulation(false);
      }

      // Store in DB
      const newResume: ResumeData = {
        id: "res_" + Math.random().toString(36).substring(2, 11),
        user_id: "client_user",
        filename: titleName,
        raw_text: parsedResult.extractedText || (isBase64 ? "" : content),
        ats_score: parsedResult.ats_score || 70,
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

      mockDb.addResume(newResume);
      setAnalysis(newResume);
      setResumes(mockDb.getResumes());
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to parse resume via server. Please double-check credentials and retry.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setFileName(file.name);
      setSelectedFile(file);
      if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        const text = await file.text();
        setResumeText(text);
      } else {
        setResumeText(`[File Selected: ${file.name}] Ready for diagnostics. Click below to begin.`);
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      setSelectedFile(file);
      if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        const text = await file.text();
        setResumeText(text);
      } else {
        setResumeText(`[File Selected: ${file.name}] Ready for diagnostics. Click below to begin.`);
      }
    }
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleSubmitAnalysis = async () => {
    if (selectedFile) {
      try {
        setIsLoading(true);
        setError("");
        const base64 = await fileToBase64(selectedFile);
        await processText(base64, true, selectedFile.name);
      } catch (err: any) {
        console.error(err);
        setError("Failed to read file contents.");
        setIsLoading(false);
      }
    } else {
      if (!resumeText.trim()) {
        setError("Please paste custom resume details, drop a file, or select a template preset above.");
        return;
      }
      const title = fileName || "Custom_Pasted_Portfolio_Resume.txt";
      await processText(resumeText, false, title);
    }
  };

  const handleSelectPreset = (preset: typeof PRESET_RESUMES[0]) => {
    setFileName(`${preset.name.replace(/\s+/g, "_")}.txt`);
    setResumeText(preset.text);
    setSelectedFile(null);
    setError("");
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 ${isLight ? "bg-transparent text-[#131518]" : "bg-slate-950 text-slate-100"}`}>

      {/* Header */}
      <header className={`relative max-w-7xl mx-auto px-6 h-16 flex items-center justify-between border-b z-10 backdrop-blur-md transition-colors duration-500 ${
        isLight ? "border-slate-200 bg-[#f8f8f6]/30" : "border-slate-900 bg-slate-950/30"
      }`}>
        <button
          id="btn_resume_back"
          onClick={() => onNavigate("/app")}
          className={`flex items-center gap-2 text-xs font-mono uppercase tracking-wider transition-colors ${
            isLight ? "text-black" : "text-slate-400"
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <span className={`font-display font-medium text-xs ${isLight ? "text-black font-semibold" : "text-slate-400"}`}>HIRE IQ ATS Engine</span>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-10 z-10 relative">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="space-y-2">
            <h1 className={`text-2xl font-black font-display tracking-tight ${isLight ? "text-[#131518]" : "text-white"}`}>
              Resume Diagnostic Console
            </h1>
            <p className={`text-xs leading-relaxed max-w-2xl font-light ${isLight ? "text-black font-normal" : "text-slate-400"}`}>
              Upload custom text (.txt, .pdf, or .docx) or paste resume lines to run deep neural indexings. We evaluate layout readiness, core strengths, weaknesses, and ATS metrics.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex gap-3 items-start">
              <AlertCircle className="w-4.5 h-4.5 shrink-0" />
              <div>
                <span className="font-mono font-bold block mb-0.5 uppercase tracking-wide">Analysis Blocked</span>
                <p className="font-sans font-light leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {isOfflineSimulation && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-xs flex gap-3 items-start animate-pulse">
              <AlertCircle className="w-4.5 h-4.5 shrink-0" />
              <div>
                <span className="font-mono font-bold block mb-0.5 uppercase tracking-wide animate-pulse">Sandbox Simulation Active ({new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} offline bypass)</span>
                <p className="font-sans font-light leading-relaxed">
                  The Gemini API is currently offline or rate-limited. Our high-fidelity local ATS parser simulation has processed your resume safely so you can proceed to the sandbox room unhindered!
                </p>
              </div>
            </div>
          )}

          {!analysis ? (
            <>
              <div className="max-w-xl mx-auto space-y-6">
              
                {/* Visual Drag and Drop Dropzone */}
                <div
                  id="drop_zone"
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={handleTriggerUpload}
                  className={`border border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
                    dragActive 
                      ? "border-emerald-400 bg-emerald-500/5 shadow-md shadow-emerald-500/5" 
                      : "border-slate-800 hover:border-slate-700 bg-slate-900/10 hover:bg-slate-900/30"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    id="file_input"
                    type="file"
                    accept=".txt,.pdf,.docx"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div className="space-y-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400 group-hover:text-emerald-400 transition-colors">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {fileName ? `File Selected: ${fileName}` : "Drop your resume file or click to select"}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-1">Supports PDF, DOCX, or TXT lines</span>
                    </div>
                  </div>
                </div>

                {/* Paste Area */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">Resume Body Text</span>
                  <textarea
                    id="resume_text_area"
                    value={resumeText}
                    onChange={(e) => {
                      setResumeText(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Paste full text details of your resume here to run advanced diagnostic analytics..."
                    className="w-full h-64 bg-slate-900/30 border border-slate-800 rounded-xl p-4 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-sans tracking-wide leading-relaxed resize-y"
                  />
                </div>

                <button
                  id="btn_submit_resume_analysis"
                  onClick={handleSubmitAnalysis}
                  disabled={isLoading}
                  className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-800 disabled:text-slate-500"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      Scanning Profile & Reviewing Keywords...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Start Neural ATS Diagnostics
                    </>
                  )}
                </button>
              </div>

            {/* INTEGRATED INDEXED PORTFOLIO RESUMES LIST (DELETE SUPPORT IN CONSOLE) */}
            <div className="space-y-4 pt-8 border-t border-slate-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Your Indexed Portfolios</h2>
                </div>
                <span className="text-[10px] text-slate-500 font-mono font-medium">Total resumes: {resumes.length}</span>
              </div>

              {resumes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center bg-slate-900/10">
                  <p className="text-xs text-slate-500 font-light">No resumes currently uploaded or indexed. Create one above to begin simulated diagnostics.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {resumes.map((resume) => {
                    let candidateName = resume.parsed?.name;
                    if (!candidateName || candidateName.toLowerCase() === "candidate" || candidateName.toLowerCase() === "invited candidate" || candidateName.trim() === "") {
                      let fallbackName = null;
                      if (resume.raw_text) {
                        const lines = resume.raw_text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
                        for (let i = 0; i < Math.min(lines.length, 5); i++) {
                          const line = lines[i];
                          if (line.includes("@") || line.match(/\+?\d[\d-\s()]{7,}/)) continue;
                          if (line.toLowerCase().includes("resume") || line.toLowerCase().includes("curriculum") || line.toLowerCase().includes("cv")) continue;
                          if (line.match(/^(education|experience|skills|summary|objective|contact|professional|about)/i)) continue;
                          
                          const words = line.split(/\s+/);
                          if (words.length >= 2 && words.length <= 4) {
                            const isValidName = words.every(word => /^[A-Z][a-zA-Z.-]*$/.test(word));
                            if (isValidName) {
                              fallbackName = line;
                              break;
                            }
                          }
                        }
                      }

                      if (fallbackName) {
                        candidateName = fallbackName;
                      } else {
                        let cleanName = resume.filename
                          .replace(/\.[^/.]+$/, "")
                          .replace(/[_\-]/g, " ")
                          .replace(/\b(2[\s-]*pages|pages?|resume|cv|v\d+|version\d+)\b/gi, "")
                          .replace(/\s+/g, " ")
                          .trim();
                        
                        candidateName = cleanName
                          .split(" ")
                          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                          .join(" ");
                      }
                    }

                    const initials = candidateName
                      .split(/\s+/)
                      .map((n) => n[0])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    return (
                      <div
                        key={resume.id}
                        onClick={() => {
                          localStorage.setItem("preselected_resume_id", resume.id);
                          onNavigate("/app/interview/new");
                        }}
                        className="p-4 bg-slate-900/40 hover:bg-slate-900/80 rounded-xl border border-slate-900/80 hover:border-emerald-500/50 flex justify-between items-center gap-4 hover:shadow-[0_0_20px_rgba(16,185,129,0.06)] scale-100 hover:scale-[1.01] transition-all cursor-pointer group"
                      >
                        {/* Profile/Person Avatar and Metadata */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 font-extrabold flex items-center justify-center text-xs shrink-0 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30 transition-colors">
                            {initials || <User className="w-4.5 h-4.5" />}
                          </div>

                          <div className="space-y-0.5 min-w-0">
                            <h4 className="text-xs font-semibold text-slate-200 group-hover:text-white truncate" title={candidateName}>
                              {candidateName}
                            </h4>
                            <p className="text-[10px] text-slate-400 truncate" title={resume.filename}>
                              {resume.filename}
                            </p>
                            <span className="text-[8.5px] text-slate-500 font-mono uppercase block">
                              INDEXED &bull; {new Date(resume.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {/* Interactive trigger and actions */}
                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              localStorage.setItem("preselected_resume_id", resume.id);
                              onNavigate("/app/interview/new");
                            }}
                            className="h-8 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] tracking-wider uppercase px-3.5 flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Start interview with this profile"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            Start
                          </button>

                          <div className="h-4 w-px bg-slate-800" />

                          <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 font-mono text-[9px] font-bold rounded border border-emerald-500/15" title="ATS Score">
                            {resume.ats_score}%
                          </span>

                          <button
                            id={`btn_delete_resume_upload_view_${resume.id}`}
                            onClick={() => {
                              if (confirmToDeleteId === resume.id) {
                                handleDeleteResume(resume.id);
                                setConfirmToDeleteId(null);
                              } else {
                                setConfirmToDeleteId(resume.id);
                              }
                            }}
                            className={`h-8 rounded-lg flex items-center justify-center transition-all ${
                              confirmToDeleteId === resume.id
                                ? "bg-rose-500 text-slate-950 font-bold text-[9px] tracking-wider uppercase px-2.5 hover:bg-rose-400 cursor-pointer"
                                : "w-8 border border-slate-850 hover:border-rose-500 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 cursor-pointer"
                            }`}
                            title="Delete Resume"
                          >
                            {confirmToDeleteId === resume.id ? "Delete" : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
          ) : (
            
            /* DIAGNOSTICS RESULTS OUTCOME */
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              
              {/* Score card banner */}
              <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-900/30 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono">
                    <CheckCircle className="w-4 h-4 fill-emerald-500/10" />
                    Diagnostics Successful
                  </div>
                  <h2 className="text-xl font-bold text-white font-display">
                    {analysis.parsed?.name || "Candidate"} &mdash; Core Audit
                  </h2>
                  <p className="text-xs text-slate-400 font-light max-w-md">
                    Our model scanned your profile details. The evaluated scoring represents target market readiness index.
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0 bg-slate-950 p-4 border border-slate-850 rounded-xl">
                  <div className="text-center">
                    <span className="text-[28px] font-black font-mono text-emerald-400 leading-none block">
                      {analysis.ats_score}
                    </span>
                    <span className="text-[9px] font-mono text-emerald-500 uppercase block tracking-wider mt-0.5">ATS Readiness</span>
                  </div>
                </div>
              </div>

              {/* Parsed Talent core tags */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="md:col-span-2 bg-slate-900/30 border border-slate-900 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold font-mono uppercase text-slate-400 tracking-wider">CORE ASSETS</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-light">
                    <div className="space-y-1 bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">Talent Skills Extracted</span>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {analysis.parsed?.skills?.map((s, idx) => (
                          <span key={idx} className="bg-slate-900 px-2 py-0.5 rounded text-[10px] text-slate-300 border border-slate-800">
                            {s}
                          </span>
                        )) || <span className="text-slate-600 font-mono text-[10px]">No skills found</span>}
                      </div>
                    </div>

                    <div className="space-y-3.5">
                      <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850 flex items-center gap-3">
                        <Briefcase className="w-5 h-5 text-emerald-400" />
                        <div>
                          <span className="text-[9px] font-mono text-slate-500 uppercase block leading-none">Experience Index</span>
                          <span className="text-xs font-bold text-white mt-1 block">{analysis.parsed?.experienceCount || 1} Years / Job Entries</span>
                        </div>
                      </div>

                      <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850 flex items-center gap-3">
                        <BookOpen className="w-5 h-5 text-teal-400" />
                        <div>
                          <span className="text-[9px] font-mono text-slate-500 uppercase block leading-none">Education Reference Extracted</span>
                          <span className="text-xs font-bold text-slate-200 mt-1 block line-clamp-1">{analysis.parsed?.education?.[0] || "Foundational Reference"}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Suggestions block */}
                <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-1.5 text-teal-400">
                    <Zap className="w-4 h-4" />
                    <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">Actionable Suggestions</h3>
                  </div>

                  <ul className="space-y-2 text-[10.5px] text-slate-400 leading-normal font-light">
                    {analysis.suggestions?.map((su, idx) => (
                      <li key={idx} className="flex gap-2 items-start">
                        <ArrowRight className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                        <span>{su}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* Strengths and Weaknesses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Strengths */}
                <div className="bg-slate-900/10 border border-slate-900 rounded-xl p-5 space-y-3">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-400">Key strengths parsed</h3>
                  <ul className="space-y-2.5 text-xs text-slate-300 font-light">
                    {analysis.strengths?.map((st, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start">
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{st}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="bg-slate-900/10 border border-slate-900 rounded-xl p-5 space-y-3">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-amber-500">Growth Opportunities</h3>
                  <ul className="space-y-2.5 text-xs text-slate-300 font-light">
                    {analysis.weaknesses?.map((we, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span>{we}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-900">
                <button
                  id="btn_analysis_reupload"
                  onClick={() => setAnalysis(null)}
                  className="h-10 px-5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 transition-colors text-xs font-mono uppercase tracking-wider"
                >
                  Analyze New Resume
                </button>

                <button
                  id="btn_analysis_start_interview"
                  onClick={() => {
                    if (analysis) {
                      localStorage.setItem("preselected_resume_id", analysis.id);
                    }
                    onNavigate("/app/interview/new");
                  }}
                  className="h-10 px-6 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer"
                >
                  Practice Interview Now
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </motion.div>
          )}

        </div>
      </main>
    </div>
  );
}
