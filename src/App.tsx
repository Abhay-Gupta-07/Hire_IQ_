import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import LandingPage from "./components/LandingPage";
import AuthPage from "./components/AuthPage";
import Dashboard from "./components/Dashboard";
import ResumeUpload from "./components/ResumeUpload";
import NewInterview from "./components/NewInterview";
import InterviewRoom from "./components/InterviewRoom";
import ReportPage from "./components/ReportPage";
import MinimalistVideoBackground from "./components/MinimalistVideoBackground";
import CandidateInviteGate from "./components/CandidateInviteGate";
import SubscriptionPage from "./components/SubscriptionPage";
import AdminLiveStreamMonitor from "./components/AdminLiveStreamMonitor";
import ThankYouPage from "./components/ThankYouPage";
import { mockDb } from "./lib/mockDb";
import { supabase } from "./lib/supabaseClient";

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => {
    if (window.location.hash && window.location.hash.startsWith("#/")) {
      return window.location.hash.substring(1);
    }
    return window.location.pathname || "/";
  });
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("ai_mock_interview_theme") as "dark" | "light") || "dark";
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("ai_mock_interview_theme", next);
      return next;
    });
  };

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("ai_mock_interview_auth") === "true";
  });

  // Fetch real public host URL from server on startup so other devices bypass google.com login walls
  useEffect(() => {
    fetch("/api/public-url")
      .then(res => res.json())
      .then(data => {
        if (data && data.publicUrl) {
          localStorage.setItem("server_detected_public_origin", data.publicUrl);
          console.log("🔗 Device-accessible public URL auto-configured:", data.publicUrl);
        }
      })
      .catch(err => {
        console.warn("Could not retrieve server-detected public origin on startup:", err);
      });
  }, []);

  // Periodically synchronize localized data records from and to the central Express server-side database
  useEffect(() => {
    mockDb.syncWithServer().catch(() => {});

    const interval = setInterval(() => {
      mockDb.syncWithServer().catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Listen for Supabase Sign-In with Google Auth Changes / redirect logins
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("Supabase getSession error:", sessionError);
          return;
        }
        if (session && session.user) {
          console.log("Supabase OAuth success on App mount! Integrating Google profile:", session.user);
          
          const profile = mockDb.getProfile();
          profile.full_name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || "Google User";
          profile.email = session.user.email || "";
          
          const avatar = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture;
          if (avatar) {
            profile.avatar_url = avatar;
          }
          mockDb.updateProfile(profile);

          localStorage.setItem("ai_mock_interview_auth", "true");
          setIsAuthenticated(true);
          
          if (window.location.hash && window.location.hash.includes("access_token")) {
            try {
              window.history.replaceState(null, "", window.location.pathname);
            } catch (err) {
              console.warn("Could not sweep access token hash:", err);
            }
          }

          const getRouteWithHash = () => {
            if (window.location.hash && window.location.hash.startsWith("#/")) {
              return window.location.hash.substring(1).split(/[?#]/)[0];
            }
            return window.location.pathname.split(/[?#]/)[0];
          };
          const currentRoute = getRouteWithHash();
          if (currentRoute === "/" || currentRoute === "/auth") {
            navigate("/app");
          }
        }
      } catch (e) {
        console.error("Error checking Supabase session:", e);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && session.user) {
        console.log("Supabase Auth State trigger in App:", event, session.user);
        
        const profile = mockDb.getProfile();
        profile.full_name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || "Google User";
        profile.email = session.user.email || "";
        
        const avatar = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture;
        if (avatar) {
          profile.avatar_url = avatar;
        }
        mockDb.updateProfile(profile);

        localStorage.setItem("ai_mock_interview_auth", "true");
        setIsAuthenticated(true);
        
        if (window.location.hash && window.location.hash.includes("access_token")) {
          try {
            window.history.replaceState(null, "", window.location.pathname);
          } catch (err) {
            console.warn("Could not sweep access token hash:", err);
          }
        }

        const getRouteWithHash = () => {
          if (window.location.hash && window.location.hash.startsWith("#/")) {
            return window.location.hash.substring(1).split(/[?#]/)[0];
          }
          return window.location.pathname.split(/[?#]/)[0];
        };
        const currentRoute = getRouteWithHash();
        if (currentRoute === "/" || currentRoute === "/auth") {
          navigate("/app");
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Track popstate changes (browser back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.hash && window.location.hash.startsWith("#/")) {
        setCurrentPath(window.location.hash.substring(1));
      } else {
        setCurrentPath(window.location.pathname);
      }
    };
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handlePopState);
    };
  }, []);

  // Secure path redirects
  useEffect(() => {
    const isAppPath = currentPath.startsWith("/app");
    if (isAppPath && !isAuthenticated) {
      // Allow bypass if an active invite bypass key exists in localStorage for this interview ID
      const interviewMatch = currentPath.match(/^\/app\/interview\/([^\/]+)$/);
      const isBypassed = interviewMatch && localStorage.getItem("invite_bypass_" + interviewMatch[1]) === "true";
      if (!isBypassed) {
        navigate("/auth");
      }
    } else if (currentPath === "/auth" && isAuthenticated) {
      navigate("/app");
    }
  }, [currentPath, isAuthenticated]);

  const navigate = (path: string) => {
    if (path.startsWith("/invite") || path.startsWith("/interview")) {
      window.location.hash = path;
    } else {
      window.history.pushState(null, "", path);
    }
    const basePath = path.split(/[?#]/)[0];
    setCurrentPath(basePath);
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    navigate("/app");
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Supabase forced signout warning:", err);
    }
    localStorage.removeItem("ai_mock_interview_auth");
    setIsAuthenticated(false);
    navigate("/");
  };

  // Path Routing parsing
  const getRenderedPage = () => {
    if (currentPath === "/") {
      return (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <LandingPage onNavigate={navigate} isAuthenticated={isAuthenticated} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
        </motion.div>
      );
    }

    if (currentPath === "/auth") {
      return (
        <motion.div
          key="auth"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <AuthPage onNavigate={navigate} onLoginSuccess={handleLoginSuccess} theme={theme} toggleTheme={toggleTheme} />
        </motion.div>
      );
    }

    if (currentPath === "/subscription") {
      return (
        <motion.div
          key="subscription"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <SubscriptionPage onNavigate={navigate} theme={theme} toggleTheme={toggleTheme} />
        </motion.div>
      );
    }

    // Secure Dashboard path route
    if (currentPath === "/app") {
      return (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Dashboard onNavigate={navigate} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
        </motion.div>
      );
    }

    // Secure Resume Parsing paths
    if (currentPath === "/app/resume") {
      return (
        <motion.div
          key="resume"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ResumeUpload onNavigate={navigate} theme={theme} />
        </motion.div>
      );
    }

    // Secure New interview configuration paths
    if (currentPath === "/app/interview/new") {
      return (
        <motion.div
          key="new_interview"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <NewInterview onNavigate={navigate} theme={theme} />
        </motion.div>
      );
    }

    // Admin live monitoring page
    if (currentPath === "/admin/live-monitoring") {
      return (
        <motion.div
          key="live_monitoring"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full min-h-screen relative z-50 bg-slate-950 text-white"
        >
          <AdminLiveStreamMonitor
            liveSession={null}
            liveCameraFrame={null}
            onClose={() => navigate("/app")}
            isBulkMode={true}
            bulkCount={120}
          />
        </motion.div>
      );
    }

    // Admin live streams preview page
    if (currentPath === "/admin/live-preview") {
      return (
        <motion.div
          key="live_preview"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full min-h-screen relative z-50 bg-slate-950 text-white"
        >
          <AdminLiveStreamMonitor
            liveSession={null}
            liveCameraFrame={null}
            onClose={() => navigate("/app")}
            isBulkMode={true}
            bulkCount={120}
          />
        </motion.div>
      );
    }

    // Match subpath structures using regular expressions
    // Match Report Page first: /app/interview/:id/report
    const reportMatch = currentPath.match(/^\/app\/interview\/([^\/]+)\/report$/);
    if (reportMatch) {
      const interviewId = reportMatch[1];
      return (
        <motion.div
          key="report_page"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ReportPage interviewId={interviewId} onNavigate={navigate} theme={theme} />
        </motion.div>
      );
    }

    // Match Live Room: /app/interview/:id
    const liveMatch = currentPath.match(/^\/app\/interview\/([^\/]+)$/);
    if (liveMatch) {
      const interviewId = liveMatch[1];
      return (
        <motion.div
          key="interview_room"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <InterviewRoom interviewId={interviewId} onNavigate={navigate} theme={theme} />
        </motion.div>
      );
    }

    // Match Invite Link: /invite/:id
    const inviteMatch = currentPath.match(/^\/invite\/([^\/]+)$/);
    if (inviteMatch) {
      const interviewId = inviteMatch[1];
      return (
        <motion.div
          key="invite_gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <CandidateInviteGate interviewId={interviewId} onNavigate={navigate} theme={theme} />
        </motion.div>
      );
    }

    // Match Unique Candidate Token Link: /interview/:id
    const interviewTokenMatch = currentPath.match(/^\/interview\/([^\/]+)$/);
    if (interviewTokenMatch) {
      const token = interviewTokenMatch[1];
      return (
        <motion.div
          key="interview_token_gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <CandidateInviteGate interviewId={token} onNavigate={navigate} theme={theme} />
        </motion.div>
      );
    }

    if (currentPath === "/thank-you") {
      return (
        <motion.div
          key="thank_you"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ThankYouPage onNavigate={navigate} theme={theme} />
        </motion.div>
      );
    }

    // Default Fallback path router
    return (
      <div className="bg-slate-950 text-slate-100 min-h-screen font-sans flex flex-col items-center justify-center p-6 space-y-4">
        <h2 className="text-xl font-bold font-display text-white">404: Path Not Found</h2>
        <p className="text-xs text-slate-400">The referenced visual route sandbox has been relocated.</p>
        <button
          onClick={() => navigate("/")}
          className="h-10 px-5 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 font-mono text-xs uppercase transition-colors"
        >
          Back to Overview
        </button>
      </div>
    );
  };

  return (
    <div className={`min-h-screen overflow-x-hidden relative transition-colors duration-500 bg-transparent ${theme === "light" ? "text-[#1a1a18]" : "text-slate-100"}`}>
      <MinimalistVideoBackground theme={theme} toggleTheme={toggleTheme} />
      <AnimatePresence mode="wait">
        {getRenderedPage()}
      </AnimatePresence>
    </div>
  );
}
