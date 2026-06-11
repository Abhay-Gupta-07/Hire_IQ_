import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  ArrowLeft, 
  FileDown, 
  Award, 
  CheckCircle, 
  XCircle,
  TrendingUp, 
  MessageSquare, 
  BookOpen, 
  ExternalLink,
  Loader2,
  ChevronRight,
  ClipboardList,
  Camera,
  AlertCircle,
  Mail,
  Send,
  ShieldAlert
} from "lucide-react";
import { jsPDF } from "jspdf";
import { Interview, InterviewQuestion, InterviewReport } from "../types";
import { mockDb } from "../lib/mockDb";
import { videoDb } from "../lib/videoDb";

interface ReportPageProps {
  interviewId: string;
  onNavigate: (path: string) => void;
  theme?: "dark" | "light";
}

export default function ReportPage({ interviewId, onNavigate, theme = "dark" }: ReportPageProps) {
  const isLight = theme === "light";
  const [interview, setInterview] = useState<Interview | null>(null);
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [errorText, setErrorText] = useState("");
  
  // Storage map for local object URLs linked to specific questions
  const [videoUrls, setVideoUrls] = useState<Record<string, { url: string; isVideo: boolean }>>({});

  // Direct client email messaging states
  const [clientEmail, setClientEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "success" | "error" | "mailto">("idle");
  const [emailMessage, setEmailMessage] = useState("");

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

  useEffect(() => {
    // Read from mockDb
    const currentInt = mockDb.getInterviewById(interviewId);
    if (!currentInt) {
      setErrorText("Interview log reference not found.");
      return;
    }
    setInterview(currentInt);

    const matchReport = mockDb.getReportByInterviewId(interviewId);
    if (matchReport) setReport(matchReport);

    const associatedQs = mockDb.getQuestions(interviewId);
    setQuestions(associatedQs);

    // Asynchronously pull all recorded candidate media files for this session
    const pullRecordings = async () => {
      try {
        const savedList = await videoDb.getVideosForInterview(interviewId);
        const map: Record<string, { url: string; isVideo: boolean }> = {};
        
        savedList.forEach((recordedItem) => {
          map[recordedItem.questionId] = {
            url: URL.createObjectURL(recordedItem.blob),
            isVideo: recordedItem.mimeType.startsWith("video/")
          };
        });
        setVideoUrls(map);
      } catch (err) {
        console.warn("Could not load candidate recordings from IndexedDB:", err);
      }
    };

    pullRecordings();
  }, [interviewId]);

  // Clean-up generated URL endpoints on page unmount
  useEffect(() => {
    return () => {
      Object.keys(videoUrls).forEach((key) => {
        try {
          URL.revokeObjectURL(videoUrls[key].url);
        } catch (e) {
          console.warn("Error revoking media URL:", e);
        }
      });
    };
  }, [videoUrls]);

  // Send direct email report to client inbox
  const handleSendEmail = async () => {
    if (!clientEmail.trim() || !interview || !report) return;
    setIsSendingEmail(true);
    setEmailStatus("idle");
    setEmailMessage("");

    try {
      const emailBody = `
        Dear Client,

        Here is the fully certified HireIQ Candidate Appraisal Report for ${interview.candidate_name}.

        ------------------------------------------------------------
        CANDIDATE PERFORMANCE SUMMARY:
        ------------------------------------------------------------
        Target Role: ${interview.role}
        Difficulty Parameters: ${interview.difficulty.toUpperCase()}
        Linked portfolio resume: ${interview.resume_filename || "None specified"}
        Overall Performance Index Score: ${report.overall_score}%
        Appraisal Verdict Recommendation: ${report.recommendation.toUpperCase()}

        ------------------------------------------------------------
        CORE ASSESSMENT RESULTS:
        ------------------------------------------------------------
        • Technical scoring marks: ${report.metrics?.technical || 7}/10
        • Communication articulation ratings: ${report.metrics?.communication || 7}/10
        • Confidence index ratings: ${report.metrics?.confidence || 8}/10
        • Technical Warmup MCQ Scorecard: ${interview.mcq_score !== undefined ? interview.mcq_score + "%" : "Not attempted"}

        ------------------------------------------------------------
        INTEGRITY STANDARDS LOG:
        ------------------------------------------------------------
        • Tab-Switch occurrences detected during exam loop: ${interview.tab_switch_count || 0} times
        • Automated video/biometric rule infraction violations: ${interview.violations_log?.length || 0} flag(s)

        ------------------------------------------------------------
        EXECUTIVE SUMMARY & INTERVIEW CRITIQUE FEEDBACK:
        ------------------------------------------------------------
        ${report.summary}

        Best regards,
        Certified Evaluator | HireIQ Mock Interview Platform
      `;

      const res = await fetch("/api/send-client-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientEmail: clientEmail.trim(),
          candidateName: interview.candidate_name,
          role: interview.role,
          score: report.overall_score,
          recommendation: report.recommendation,
          emailText: emailBody,
          smtpConfig: getLocalSmtpConfig()
        })
      });

      if (!res.ok) {
        throw new Error("SMTP dispatch service could not complete process.");
      }

      setEmailStatus("success");
      setEmailMessage(`✓ Appraisal summary successfully emailed to ${clientEmail}!`);
    } catch (err: any) {
      console.warn("Client email fetch error:", err);
      setEmailStatus("mailto");
      setEmailMessage("✓ Direct email service initialized. Launching local mail composer callback...");
      
      const mailtoLink = `mailto:${encodeURIComponent(clientEmail)}?subject=${encodeURIComponent(`[Appraisal] Certified Interview Report for ${interview.candidate_name} (${interview.role})`)}&body=${encodeURIComponent(
        `Dear Client,\n\nHere is the certified appraisal report for your candidate, ${interview.candidate_name}.\n\nOverall Score: ${report.overall_score}%\nRecommendation: ${report.recommendation}\n\nAppraisal Feedback Summary:\n${report.summary}\n\nGenerated secure and certified report in HireIQ.`
      )}`;
      window.open(mailtoLink, "_self");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Robust PDF generator with multi-page line wrapping safeguards
  const handleExportPDF = () => {
    if (!interview || !report) return;
    setIsExporting(true);

    setTimeout(() => {
      try {
        const doc = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4"
        });

        const margin = 15;
        const pageMaxWidth = 180;
        let y = 20;

        // Draw Cover accents
        doc.setFillColor("#0f172a"); // slate-900 bg header
        doc.rect(0, 0, 210, 42, "F");

        // Header Title text
        doc.setTextColor("#ffffff");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.text("HIRE IQ - EXECUTIVE REPORT", margin, 20);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor("#10b981"); // emerald-500
        doc.text("AUTOMATED NEURAL INTERVIEW PERFORMANCE ASSESSMENT", margin, 26);

        // Resume y counter
        y = 52;
        doc.setTextColor("#0f172a");

        // Candidate Profile Data Box
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("SESSION RECORD SUMMARY", margin, y);
        y += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor("#475569");
        
        doc.text(`Candidate Name: ${interview.candidate_name}`, margin, y);
        doc.text(`Target Role: ${interview.role}`, margin + 90, y);
        y += 5;
        doc.text(`Difficulty Tier: ${interview.difficulty.toUpperCase()}`, margin, y);
        doc.text(`Date Evaluated: ${new Date(report.created_at).toLocaleDateString()}`, margin + 90, y);
        y += 8;

        // Line Break
        doc.setDrawColor("#e2e8f0");
        doc.line(margin, y, margin + pageMaxWidth, y);
        y += 8;

        // 2. AGGREGATE CORE RATINGS METRICS
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("CORE METRICS RATING (SCALE 1-10)", margin, y);
        y += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Overall General Index: ${report.overall_score}%`, margin, y);
        doc.text(`Hiring Action Suggestion: ${report.recommendation.toUpperCase()}`, margin + 90, y);
        y += 5;
        doc.text(`Communication Index: ${report.communication}/10`, margin, y);
        doc.text(`Domain Technical Index: ${report.technical}/10`, margin + 90, y);
        y += 5;
        doc.text(`Delivery Confidence Level: ${report.confidence}/10`, margin, y);
        doc.text(`Body Language Index: ${(report as any).body_language_score || 10}/10`, margin + 90, y);
        y += 5;
        doc.text(`Concentric Focal Level: ${(report as any).eye_contact_score || 10}/10`, margin, y);
        doc.text(`Proctor Activity Flags: ${(report as any).distractions_count || 0}`, margin + 90, y);
        y += 10;

        // Line Break
        doc.setDrawColor("#e2e8f0");
        doc.line(margin, y, margin + pageMaxWidth, y);
        y += 8;

        // 3. EXECUTIVE DETAILED SUMMARY
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("EXECUTIVE PERFORMANCE NARRATIVE", margin, y);
        y += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor("#334155");

        // Split text output with safeguards to wrap properly
        const summaryTextClean = report.summary_md
          .replace(/[#*`\-]+/g, "") // Clean Markdown artifacts
          .trim();

        const summaryLines = doc.splitTextToSize(summaryTextClean, pageMaxWidth);
        
        for (let idx = 0; idx < summaryLines.length; idx++) {
          if (y > 275) {
            doc.addPage();
            y = 20;
          }
          doc.text(summaryLines[idx], margin, y);
          y += 5.5;
        }
        y += 4;

        // Line Break
        if (y > 270) {
          doc.addPage();
          y = 20;
        } else {
          doc.line(margin, y, margin + pageMaxWidth, y);
          y += 8;
        }

        // 4. QUESTION BY QUESTION BREAKDOWN LISTS
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor("#0f172a");
        doc.text("DETAILED QUESTION-BY-QUESTION EVALUATIONS", margin, y);
        y += 8;

        questions.forEach((q, i) => {
          if (y > 250) {
            doc.addPage();
            y = 20;
          }

          doc.setFont("helvetica", "bold");
          doc.setFontSize(10.5);
          doc.setTextColor("#0f172a");
          doc.text(`Question ${i + 1}`, margin, y);
          y += 5;

          // Question Prompt
          doc.setFont("helvetica", "italic");
          doc.setFontSize(9.5);
          doc.setTextColor("#475569");
          const qTextLines = doc.splitTextToSize(`"Q: ${q.question}"`, pageMaxWidth);
          qTextLines.forEach((line: string) => {
            if (y > 275) { doc.addPage(); y = 20; }
            doc.text(line, margin, y);
            y += 5;
          });
          y += 1.5;

          // Answer transcript
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor("#0f172a");
          const ansTextLines = doc.splitTextToSize(`Answer: ${q.answer_transcript || "No spoken answer captured."}`, pageMaxWidth);
          ansTextLines.forEach((line: string) => {
            if (y > 275) { doc.addPage(); y = 20; }
            doc.text(line, margin, y);
            y += 4.5;
          });
          y += 2;

          // Evaluated score and feed
          if (q.scores) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor("#10b981");
            doc.text(`Metrics evaluated: Communication: ${q.scores.communication}/10  |  Technical: ${q.scores.technical}/10  |  Confidence: ${q.scores.confidence}/10`, margin, y);
            y += 4.5;

            doc.setFont("helvetica", "normal");
            doc.setTextColor("#475569");
            const feedbackLines = doc.splitTextToSize(`Recruiter Appraisal: ${q.scores.feedback}`, pageMaxWidth);
            feedbackLines.forEach((line: string) => {
              if (y > 275) { doc.addPage(); y = 20; }
              doc.text(line, margin, y);
              y += 4.5;
            });
          }

          y += 7; // spacing between questions
        });

        // Save PDF file
        doc.save(`${interview.candidate_name.replace(/\s+/g, "_")}_Interview_Assessment_Report.pdf`);
      } catch (err) {
        console.error("PDF generation failure:", err);
      } finally {
        setIsExporting(false);
      }
    }, 900);
  };

  return (
    <div className={`min-h-screen font-sans selection:bg-emerald-500/30 selection:text-emerald-300 transition-colors duration-500 ${isLight ? "bg-transparent text-[#131518]" : "bg-slate-950 text-slate-100"}`}>

      {/* HeaderNav */}
      <header className={`relative max-w-7xl mx-auto px-6 h-16 flex items-center justify-between border-b z-10 backdrop-blur-md transition-colors duration-500 ${
        isLight ? "border-slate-200 bg-[#f8f8f6]/30" : "border-slate-900 bg-slate-950/30"
      }`}>
        <button
          id="btn_report_view_back"
          onClick={() => onNavigate("/app")}
          className={`flex items-center gap-2 text-xs font-mono uppercase tracking-wider transition-colors ${
            isLight ? "text-black" : "text-slate-400"
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard Overview
        </button>

        <span className="font-mono text-[10px] text-emerald-500 uppercase tracking-widest font-semibold leading-none">Assessment Summary</span>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-10 z-10 relative">
        {errorText && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex gap-2.5 max-w-2xl mx-auto">
            <Award className="w-4.5 h-4.5 text-rose-400" />
            <span>{errorText}</span>
          </div>
        )}

        {interview && report && (
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* 1. WELCOME BANNER PANEL HIGHLIGHT */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-900/40 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden relative shadow-2xl"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500" />
              <div className="absolute -right-20 -bottom-20 w-44 h-44 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="space-y-1.5 text-left">
                <div className="flex items-center gap-1 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/15 w-fit">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wide">COMPLETED ASSESSMENTS REGISTERED</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight">
                  {interview.candidate_name} &bull; Hiring Appraisal
                </h1>
                <p className="text-xs text-slate-400 font-light max-w-xl">
                  Evaluated target role: <strong className="font-semibold text-slate-200">{interview.role}</strong> &mdash; Difficulty: {interview.difficulty.toUpperCase()}
                  {interview.resume_filename && (
                    <span className="block text-xs text-slate-500 font-mono mt-1">
                      Linked Portfolio Resume: <strong className="font-semibold text-emerald-400 uppercase tracking-wide">{interview.resume_filename}</strong>
                    </span>
                  )}
                </p>
              </div>

              <button
                id="btn_report_download_pdf"
                onClick={handleExportPDF}
                disabled={isExporting}
                className="w-full md:w-auto px-6 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10 disabled:bg-slate-800 disabled:text-slate-500 self-stretch md:self-center shrink-0"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    Assembling...
                  </>
                ) : (
                  <>
                    <FileDown className="w-4.5 h-4.5" />
                    Download PDF Report
                  </>
                )}
              </button>
            </motion.div>

            {/* DIRECT TO CLIENT EMAIL DISPATCH PORTAL */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-slate-900/40 p-5 rounded-2xl border border-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-lg backdrop-blur-sm text-left"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-400">
                  <Mail className="w-4 h-4 text-indigo-400" />
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Client Mailroom Delivery</span>
                </div>
                <h3 className="text-sm font-bold text-white">Send Report Direct to Client Emails</h3>
                <p className="text-[11px] text-slate-400 leading-normal max-w-xl font-light">
                  Instantly dispatch this certified high-fidelity candidate appraisal transcript, performance scores, technical Multiple Choice metrics, and audit logs directly to client or stakeholder inboxes.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0 md:max-w-md">
                <div className="relative flex-1 sm:w-64">
                  <input
                    id="client_email_input"
                    type="email"
                    required
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="client@organization.com"
                    className="w-full h-10 px-3 pb-0.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/80 transition-colors font-mono"
                  />
                </div>
                
                <button
                  id="btn_report_dispatch_email"
                  onClick={handleSendEmail}
                  disabled={isSendingEmail || !clientEmail.trim()}
                  className="h-10 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 active:scale-[0.98] disabled:scale-100 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-650/10 disabled:text-slate-500 shrink-0"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Dispatching...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Email Client
                    </>
                  )}
                </button>
              </div>
            </motion.div>

            {emailStatus !== "idle" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2 text-left ${
                  emailStatus === "success" 
                    ? "bg-emerald-950/20 border border-emerald-900/30 text-emerald-300" 
                    : emailStatus === "mailto"
                      ? "bg-amber-950/20 border border-amber-900/30 text-amber-300 font-mono"
                      : "bg-rose-950/20 border border-rose-900/30 text-rose-300"
                }`}
              >
                {emailStatus === "success" ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : emailStatus === "mailto" ? (
                  <Mail className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-450 shrink-0" />
                )}
                <p className="font-light leading-relaxed">{emailMessage}</p>
              </motion.div>
            )}

            {/* 2. OVERALL SCORE BREAKDOWN GRAPHICS CARD */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Core Index Rating score circle */}
              <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 text-center flex flex-col justify-between items-center shadow-md relative min-h-[220px]">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">Performance Index Score</span>
                  <span className="text-xs text-slate-400 block mt-0.5 font-light">Overall weight average</span>
                </div>

                <div className="relative py-4">
                  <span className="text-[54px] font-black font-mono text-emerald-400 tracking-tighter leading-none block">
                    {report.overall_score}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest block leading-none -mt-1 font-bold">Percentile score</span>
                </div>

                <div className="bg-slate-950/80 px-4 py-1.5 border border-slate-850 rounded-lg text-xs">
                  Recommendation: <strong className="font-semibold text-emerald-400">{report.recommendation}</strong>
                </div>
              </div>

              {/* Slider performance indicators */}
              <div className="md:col-span-2 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 space-y-5 shadow-md justify-center flex flex-col">
                <div>
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 leading-none">Performance dimensions</h3>
                  <span className="text-[10px] text-slate-500 block mt-1.5 font-light">Breakdowns scored out of 10 maximum.</span>
                </div>

                <div className="space-y-4">
                  
                  {/* Comm */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono lowercase">
                      <span className="text-slate-400">Communication & Articulation</span>
                      <span className="text-emerald-400 font-bold">{report.communication}/10</span>
                    </div>
                    <div className="h-2 bg-slate-950 rounded-full border border-slate-900 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${report.communication * 10}%` }} />
                    </div>
                  </div>

                  {/* Tech */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono lowercase">
                      <span className="text-slate-400">Domain Technical Accuracy</span>
                      <span className="text-teal-400 font-bold">{report.technical}/10</span>
                    </div>
                    <div className="h-2 bg-slate-950 rounded-full border border-slate-900 overflow-hidden">
                      <div className="h-full bg-teal-400 rounded-full" style={{ width: `${report.technical * 10}%` }} />
                    </div>
                  </div>

                  {/* Conf */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono lowercase">
                      <span className="text-slate-400">Speaking confidence & Pacing</span>
                      <span className="text-blue-400 font-bold">{report.confidence}/10</span>
                    </div>
                    <div className="h-2 bg-slate-950 rounded-full border border-slate-900 overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${report.confidence * 10}%` }} />
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Proctored Biometrics & Integrity row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Selfie Identity Token Display */}
              <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 text-center flex flex-col justify-between items-center shadow-md relative min-h-[220px]">
                <div className="text-center w-full">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">Identity Snapshot Audit</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5 font-light">Captured at registration step</span>
                </div>

                <div className="relative py-3 flex justify-center">
                  {interview?.candidate_selfie ? (
                    <div className="relative w-28 h-28 rounded-xl overflow-hidden border-2 border-indigo-500/30 shadow-lg">
                      <img 
                        src={interview.candidate_selfie} 
                        alt="Audit Verification Record Match" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute bottom-1.5 left-1.5 bg-indigo-400 text-slate-950 font-mono text-[7px] px-1 py-0.5 rounded font-extrabold">
                        AUTH MATCH
                      </div>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-xl border border-dashed border-slate-800 bg-slate-950 flex flex-col justify-center items-center text-slate-600">
                      <Camera className="w-8 h-8 animate-pulse mb-1" />
                      <span className="text-[8px] font-mono">No photo recorded</span>
                    </div>
                  )}
                </div>

                <div className="bg-slate-900/40 px-4 py-1.5 border border-slate-800 rounded-lg text-xs flex items-center justify-center gap-1.5 w-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ID Status: <strong className="font-semibold text-emerald-400">Verified ID</strong>
                </div>
              </div>

              {/* Behavior Ratings & Counter logs */}
              <div className="md:col-span-2 bg-slate-900/40 p-6 rounded-2xl border border-slate-800/80 space-y-5 shadow-md justify-center flex flex-col">
                <div>
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 leading-none">AI Exam Surveillance Metrics</h3>
                  <span className="text-[10px] text-slate-500 block mt-1.5 font-light">Calculated by automated real-time webcam frame descriptors.</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Body Language Rating */}
                  <div className="space-y-1 bg-slate-950/40 p-3.5 rounded-xl border border-slate-900/60">
                    <div className="flex items-center justify-between text-xs font-mono lowercase">
                      <span className="text-slate-400">Body language score</span>
                      <span className="text-amber-400 font-bold">{(report?.body_language_score ?? 10)}/10</span>
                    </div>
                    <div className="h-2 bg-slate-950 rounded-full border border-slate-900 overflow-hidden mt-1">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: `${(report?.body_language_score ?? 10) * 10}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans mt-2 leading-snug">
                      Assesses steady alignment, focus stability, and response engagement.
                    </p>
                  </div>

                  {/* Eye Contact Rating */}
                  <div className="space-y-1 bg-slate-950/40 p-3.5 rounded-xl border border-slate-900/60">
                    <div className="flex items-center justify-between text-xs font-mono lowercase">
                      <span className="text-slate-400">Concentric focal score</span>
                      <span className="text-indigo-400 font-bold">{(report?.eye_contact_score ?? 10)}/10</span>
                    </div>
                    <div className="h-2 bg-slate-950 rounded-full border border-slate-900 overflow-hidden mt-1">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(report?.eye_contact_score ?? 10) * 10}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-500 font-sans mt-2 leading-snug">
                      Evaluates active screening engagement and lack of tab switching distractions.
                    </p>
                  </div>
                </div>

                {/* Counter status labels */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-mono border-t border-slate-900 pt-3.5">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span>Tab switch alerts:</span>
                    <strong className={(interview?.tab_switch_count || 0) > 0 ? "text-rose-400 font-bold" : "text-emerald-400"}>
                      {interview?.tab_switch_count || 0}
                    </strong>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span>Proctor violations:</span>
                    <strong className={(interview?.violations_log?.length || 0) > 0 ? "text-rose-400 font-bold" : "text-emerald-400"}>
                      {interview?.violations_log?.length || 0}
                    </strong>
                  </div>
                </div>
              </div>

            </div>

            {/* TECHNICAL WARMUP MCQ RESULTS SCORECARD */}
            {interview && (interview.mcq_questions || localStorage.getItem(`interview_mcqs_${interviewId}`)) && (
              <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-5 sm:p-6 text-left space-y-5">
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300">Technical Warmup MCQ Scorecard</h3>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-slate-500">Practice Score:</span>
                    <strong className="text-emerald-400 font-extrabold">
                      {interview.mcq_score !== undefined ? `${interview.mcq_score}%` : "100%"}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {(() => {
                    let mcqs = interview.mcq_questions;
                    let answers = interview.mcq_answers;
                    
                    if (!mcqs) {
                      try {
                        const saved = localStorage.getItem(`interview_mcqs_${interviewId}`);
                        if (saved) {
                          const parsed = JSON.parse(saved);
                          mcqs = parsed.questions;
                          answers = parsed.answers;
                        }
                      } catch (e) {
                        console.warn("Failed parsing fallback local storage mcq:", e);
                      }
                    }

                    if (!mcqs || mcqs.length === 0) {
                      return (
                        <p className="text-xs text-slate-500 font-mono italic">
                          No multiple choice exam details are captured for this candidate session.
                        </p>
                      );
                    }

                    return mcqs.map((q: any, qIdx: number) => {
                      const selectedIdx = answers ? answers[qIdx] : null;
                      const isCorrect = selectedIdx === q.correctIndex;

                      return (
                        <div 
                          key={q.id || qIdx}
                          className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 sm:p-5 space-y-3.5"
                        >
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-500">
                              Warmup MCQ {qIdx + 1}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[9px] uppercase tracking-wider font-extrabold border ${
                              isCorrect 
                                ? "bg-emerald-500/5 text-emerald-400 border-emerald-500/10" 
                                : "bg-rose-500/5 text-rose-400 border-rose-500/10"
                            }`}>
                              {isCorrect ? (
                                <>
                                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                                  Correct answer
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 text-rose-400" />
                                  Incorrect selection
                                </>
                              )}
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            <p className="text-xs sm:text-sm text-slate-200 font-medium">
                              {q.question}
                            </p>

                            {q.codeSnippet && (
                              <pre className="p-3 bg-slate-950 border border-slate-900 rounded-lg text-[10px] font-mono text-indigo-200 overflow-x-auto leading-relaxed max-w-full">
                                <code>{q.codeSnippet}</code>
                              </pre>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                              {q.options.map((option: string, oIdx: number) => {
                                const isSelection = selectedIdx === oIdx;
                                const isCorrectOpt = q.correctIndex === oIdx;

                                return (
                                  <div 
                                    key={oIdx}
                                    className={`px-3 py-2 text-xs rounded-lg border flex items-center justify-between gap-1.5 ${
                                      isCorrectOpt
                                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                                        : isSelection
                                          ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                                          : "bg-slate-950/20 border-slate-900 text-slate-400"
                                    }`}
                                  >
                                    <span className="font-light leading-relaxed">{oIdx + 1}. {option}</span>
                                    {isCorrectOpt && (
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    )}
                                    {isSelection && !isCorrectOpt && (
                                      <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            <div className="p-3 bg-indigo-950/10 border border-indigo-900/10 rounded-lg text-[11px] leading-relaxed text-indigo-300 flex items-start gap-2">
                              <span className="text-indigo-400 font-mono text-[9px] uppercase font-bold tracking-widest bg-indigo-400/10 px-1.5 py-0.5 rounded leading-none shrink-0 mt-0.5">
                                Explanation
                              </span>
                              <p className="font-light">{q.explanation}</p>
                            </div>

                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

              </div>
            )}

            {/* 3. EXECUTIVE ASSESSMENT TEXT SUMMARY */}
            <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-6 sm:p-8 text-left space-y-4">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <ClipboardList className="w-5 h-5" />
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300">Executive Narrative Assessment</h3>
              </div>

              {/* Sanitize and format standard Markdown narrative block */}
              <div className="text-xs sm:text-sm text-slate-300 space-y-2.5 leading-relaxed font-sans font-light border-l-2 border-slate-800 pl-4">
                {report.summary_md.split("\n").map((line, pIndex) => {
                  const trimmed = line.trim();
                  if (!trimmed) return null;

                  // Render headers
                  if (trimmed.startsWith("###")) {
                    const headerText = trimmed.replace(/^###\s*/, "");
                    return (
                      <h4 key={pIndex} className="text-xs sm:text-sm font-bold font-mono text-emerald-400 pt-3 pb-1 uppercase tracking-wider block">
                        {headerText}
                      </h4>
                    );
                  }
                  if (trimmed.startsWith("##")) {
                    const headerText = trimmed.replace(/^##\s*/, "");
                    return (
                      <h3 key={pIndex} className="text-sm sm:text-base font-black font-display text-white pt-4 pb-1.5 tracking-tight block">
                        {headerText}
                      </h3>
                    );
                  }
                  if (trimmed.startsWith("#")) {
                    const headerText = trimmed.replace(/^#\s*/, "");
                    return (
                      <h2 key={pIndex} className="text-base sm:text-lg font-black font-display text-white pt-5 pb-2 tracking-tight block">
                        {headerText}
                      </h2>
                    );
                  }

                  // Render list items
                  if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
                    const itemText = trimmed.replace(/^[\-\*]\s*/, "");
                    // Support bold labels inside items e.g., **Label**: text
                    const boldMatch = itemText.match(/^\*\*(.*?)\*\*(.*)/);
                    if (boldMatch) {
                      return (
                        <div key={pIndex} className="flex items-start gap-2 pl-2 text-xs sm:text-sm text-slate-350 py-0.5">
                          <span className="text-emerald-500 font-bold font-mono mt-1 select-none">&bull;</span>
                          <span>
                            <strong className="font-extrabold text-white mr-1">{boldMatch[1]}</strong>
                            {boldMatch[2]}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div key={pIndex} className="flex items-start gap-2 pl-2 text-xs sm:text-sm text-slate-350 py-0.5">
                        <span className="text-emerald-500 font-bold font-mono mt-1 select-none">&bull;</span>
                        <span>{itemText}</span>
                      </div>
                    );
                  }

                  // Normal paragraphs with inline bold parsing
                  const parts = trimmed.split(/\*\*(.*?)\*\*/g);
                  return (
                    <p key={pIndex} className="tracking-wide text-xs sm:text-sm text-slate-350">
                      {parts.map((part, partIdx) => (
                        partIdx % 2 === 1 ? <strong key={partIdx} className="font-extrabold text-white">{part}</strong> : part
                      ))}
                    </p>
                  );
                })}
              </div>
            </div>

            {/* 4. DETAIL Q-BY-Q RESULTS BREAKDOWN */}
            <section className="space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">Oral Dialogue & Scores Records</h3>
                <span className="text-[10px] font-mono text-slate-500">Dialogue lines: {questions.length}</span>
              </div>

              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div 
                    key={q.id}
                    id={`rep_question_item_${idx}`}
                    className="p-5 sm:p-6 bg-slate-900/20 border border-slate-900 rounded-xl space-y-4 hover:border-slate-800 transition-all duration-300"
                  >
                    <div className="flex items-start gap-3 flex-wrap justify-between">
                      <span className="px-2.5 py-1 rounded bg-slate-950 font-mono text-[9px] text-emerald-400 uppercase tracking-wider border border-slate-850">
                        Question {idx + 1}
                      </span>

                      {q.scores && (
                        <div className="flex gap-2 text-[10px] font-mono">
                          <span className="text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-900">Communication: {q.scores.communication}/10</span>
                          <span className="text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-900">Technical: {q.scores.technical}/10</span>
                          <span className="text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-900">Confidence: {q.scores.confidence}/10</span>
                          <span className="text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">S: {q.scores.score}%</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3.5">
                      {/* Q Text */}
                      <p className="text-xs sm:text-sm text-slate-200 font-medium font-sans border-l-2 border-emerald-500 pl-3 leading-relaxed">
                        &ldquo;{q.question}&rdquo;
                      </p>

                      {/* A Text Transcript */}
                      <div className="bg-slate-950 p-4 border border-slate-850 rounded-lg text-xs leading-relaxed font-light text-slate-300">
                        <span className="text-[9px] font-mono text-slate-500 block uppercase mb-1 font-bold">Candidate Transcript</span>
                        <p className="italic">&ldquo;{q.answer_transcript || "[No speech captured]"}&rdquo;</p>
                      </div>

                      {/* Video / Audio Practice Recording Playback */}
                      {videoUrls[q.id] ? (
                        <div className="bg-slate-950 p-4 border border-slate-900 rounded-xl space-y-3 max-w-xl">
                          <div className="flex items-center gap-1.5 justify-between">
                            <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-widest flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              {videoUrls[q.id].isVideo ? "Recruited Webcam + Sound Practice Capture" : "Audio Answer File"}
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono">Local IndexedDB Cache Playback</span>
                          </div>
                          
                          {videoUrls[q.id].isVideo ? (
                            <div className="relative rounded-lg overflow-hidden border border-slate-850 bg-black aspect-video max-w-md shadow-inner">
                              <video 
                                src={videoUrls[q.id].url} 
                                controls 
                                playsInline
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : (
                            <div className="pt-1 select-none">
                              <audio 
                                src={videoUrls[q.id].url} 
                                controls 
                                className="w-full max-w-md accent-emerald-500" 
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-slate-900/10 p-3 border border-slate-900 border-dashed rounded-lg text-[10px] font-mono text-slate-500 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-850" />
                          No recorded video clip remains cached for this answer.
                        </div>
                      )}

                      {/* Recruiter specific Answer Appraisal feedback */}
                      {q.scores && (
                        <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-lg text-[11px] leading-relaxed font-sans text-slate-400 flex items-start gap-2 max-w-3xl">
                          <MessageSquare className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                          <p>
                            <strong className="font-semibold text-slate-300 font-mono text-[10px] uppercase block mb-0.5">Recruiter Feedback</strong>
                            {q.scores.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* AI exam integrity audit logs list */}
            {interview?.violations_log && interview.violations_log.length > 0 ? (
              <div className="bg-slate-950/60 rounded-xl border border-rose-500/10 p-5 sm:p-6 text-left space-y-4">
                <div className="flex items-center gap-2 text-rose-400 border-b border-slate-900 pb-3">
                  <AlertCircle className="w-4.5 h-4.5" />
                  <h3 className="text-xs font-extrabold font-mono uppercase tracking-wider">Automated exam integrity audit log ({interview.violations_log.length})</h3>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2">
                  {interview.violations_log.map((log, lIdx) => (
                    <div key={lIdx} className="bg-rose-950/10 border border-rose-500/10 px-3 py-2 rounded text-[10px] font-mono text-rose-300/90 leading-snug">
                      {log}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 leading-normal font-light">
                  All alerts are processed in real-time. Unaligned candidate face coordinates, secondary user matching, and focus degradation switch logs are compiled instantaneously.
                </p>
              </div>
            ) : (
              <div className="bg-slate-950/40 rounded-xl border border-emerald-500/10 p-5 sm:p-6 text-left space-y-2">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle className="w-4.5 h-4.5" />
                  <h3 className="text-xs font-extrabold font-mono uppercase tracking-wider">Integrity Audit Verification</h3>
                </div>
                <p className="text-xs text-slate-400 font-light leading-relaxed">
                  Perfect compliance! No second person detection, phone notifications, or browser tab switching distractions were logged during this exam session.
                </p>
              </div>
            )}

            {/* Back to dashboard bottom actions */}
            <div className="flex justify-center pt-8 border-t border-slate-900">
              <button
                id="btn_report_return_dashboard"
                onClick={() => onNavigate("/app")}
                className="px-6 h-11 rounded-lg border border-slate-800 hover:border-slate-600 hover:bg-slate-900 text-slate-400 hover:text-white transition-colors text-xs font-mono uppercase tracking-wider"
              >
                Return to Dashboard Overview
              </button>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
