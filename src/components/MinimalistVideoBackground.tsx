import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Palette, Play, Pause, Sliders, Check, Eye, EyeOff, Sparkles, Sun, Moon, 
  RefreshCw, Layers, Minimize2, Video, Maximize2 
} from "lucide-react";
import ThreeParticleBackground from "./ThreeParticleBackground";

export type BackgroundPresetId = "silk" | "glimmer" | "space" | "cosmic" | "threejs" | "mesh";

interface BackgroundPreset {
  id: BackgroundPresetId;
  name: string;
  url?: string;
  fallbackGradient: string;
  description: string;
}

const PRESETS: BackgroundPreset[] = [
  {
    id: "silk",
    name: "Sleek Silk Flow",
    url: "https://assets.mixkit.co/videos/preview/mixkit-slow-motion-flowing-abstract-colors-41235-large.mp4",
    fallbackGradient: "linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #030712 100%)",
    description: "Ultra-smooth motion resembling premium slow silk ribbon gradients."
  },
  {
    id: "cosmic",
    name: "Cosmic Purple Waves",
    url: "https://assets.mixkit.co/videos/preview/mixkit-waves-of-blue-and-purple-ink-in-water-41239-large.mp4",
    fallbackGradient: "linear-gradient(135deg, #0f172a 0%, #3b0764 50%, #0c0a09 100%)",
    description: "Elegant dark violet ink clouds diluting softly in high fidelity."
  },
  {
    id: "glimmer",
    name: "Light Glimmer Leak",
    url: "https://assets.mixkit.co/videos/preview/mixkit-ambient-light-leak-background-with-slow-glimmering-32541-large.mp4",
    fallbackGradient: "linear-gradient(135deg, #090d16 0%, #1e1b4b 40%, #020617 100%)",
    description: "Cinematic, slow light leaks and faint glittering lens flares."
  },
  {
    id: "space",
    name: "Stellar Galaxy",
    url: "https://assets.mixkit.co/videos/preview/mixkit-nebula-with-stars-and-galaxy-11604-large.mp4",
    fallbackGradient: "linear-gradient(135deg, #030712 0%, #022c22 60%, #090514 100%)",
    description: "Hypnotic outer space nebula combined with deep cosmos star dust."
  },
  {
    id: "mesh",
    name: "Aura Mesh (CPU)",
    fallbackGradient: "linear-gradient(135deg, #0c1824 0%, #201a30 50%, #0b0714 100%)",
    description: "Lightweight running mesh gradient optimized for static low-resource setups."
  },
  {
    id: "threejs",
    name: "3D Kinetic Particles",
    fallbackGradient: "linear-gradient(135deg, #080c10 0%, #0d121c 100%)",
    description: "Premium dynamic 3D WebGL starry point simulation."
  }
];

interface MinimalistVideoBackgroundProps {
  theme: "dark" | "light";
  toggleTheme: () => void;
}

export default function MinimalistVideoBackground({ theme, toggleTheme }: MinimalistVideoBackgroundProps) {
  const isLight = theme === "light";

  // Persistent user preferences
  const [activePreset, setActivePreset] = useState<BackgroundPresetId>(() => {
    return (localStorage.getItem("ai_bg_preset") as BackgroundPresetId) || "silk";
  });
  
  const [blurAmount, setBlurAmount] = useState<string>(() => {
    return localStorage.getItem("ai_bg_blur") || "none"; // 'none' | 'sm' | 'md' | 'lg'
  });

  const [opacityPercent, setOpacityPercent] = useState<number>(() => {
    const saved = localStorage.getItem("ai_bg_opacity");
    return saved ? parseInt(saved, 10) : 45; // default 45% transparency for premium feel
  });

  const [playbackSpeed, setPlaybackSpeed] = useState<number>(() => {
    const saved = localStorage.getItem("ai_bg_speed");
    return saved ? parseFloat(saved) : 0.65; // default 0.65x for slow relaxing pace
  });

  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync state properties with LocalStorage representation
  useEffect(() => {
    localStorage.setItem("ai_bg_preset", activePreset);
  }, [activePreset]);

  useEffect(() => {
    localStorage.setItem("ai_bg_blur", blurAmount);
  }, [blurAmount]);

  useEffect(() => {
    localStorage.setItem("ai_bg_opacity", opacityPercent.toString());
  }, [opacityPercent]);

  useEffect(() => {
    localStorage.setItem("ai_bg_speed", playbackSpeed.toString());
  }, [playbackSpeed]);

  // Handle speed and play state updates
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [playbackSpeed, isPlaying, activePreset]);

  const handleVideoLoadError = () => {
    console.warn("Selected ambient video failed to request or load from CDN. Reverting to elegant mesh style.");
    setVideoError(true);
  };

  const getBlurClass = () => {
    switch (blurAmount) {
      case "sm": return "backdrop-blur-sm";
      case "md": return "backdrop-blur-md";
      case "lg": return "backdrop-blur-xl";
      default: return "backdrop-blur-none";
    }
  };

  const currentPreset = PRESETS.find(p => p.id === activePreset) || PRESETS[0];
  const usesVideo = currentPreset.url && !videoError && activePreset !== "threejs" && activePreset !== "mesh";

  return (
    <>
      {/* 1. LAYER 1: ACTUAL VISUAL BACKGROUNDS */}
      <div 
        id="app_cinematic_bg_layer"
        className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden transition-all duration-700"
        style={{
          background: isLight 
            ? "#f8f8f6" 
            : currentPreset.fallbackGradient
        }}
      >
        {/* Animated Mesh Noise Overlay when in mesh mode or when video failed to query */}
        {(!usesVideo || activePreset === "mesh") && activePreset !== "threejs" && (
          <div 
            className={`absolute inset-0 w-full h-full opacity-60 transition-opacity duration-1000 ${
              isLight ? "bg-slate-50/50" : "bg-transparent"
            }`}
            style={isLight ? {} : {
              background: currentPreset.fallbackGradient,
              mixBlendMode: "screen"
            }}
          />
        )}

        {/* 3D Kinetic ThreeJS Field (Conditional) */}
        {activePreset === "threejs" && (
          <div className="absolute inset-0 w-full h-full opacity-70">
            <ThreeParticleBackground theme={theme} />
          </div>
        )}

        {/* Liquid HTML5 Video Canvas Element */}
        {usesVideo && (
          <video
            ref={videoRef}
            src={currentPreset.url}
            autoPlay
            loop
            muted
            playsInline
            onError={handleVideoLoadError}
            onLoadedData={() => setVideoError(false)}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
            style={{
              opacity: isLight ? (opacityPercent / 120).toFixed(2) : (opacityPercent / 100).toFixed(2),
              filter: isLight 
                ? "contrast(95%) brightness(105%) saturate(85%)" 
                : "contrast(110%) brightness(85%) saturate(100%)"
            }}
          />
        )}

        {/* 2. LAYER 2: CINEMATIC MASK & BLUR VIGNETTE FOR EXTREME MINIMALISM */}
        <div 
          className={`absolute inset-0 w-full h-full transition-all duration-500 ${getBlurClass()}`}
          style={{
            background: isLight
              ? "radial-gradient(circle at 50% 50%, rgba(248, 248, 246, 0.4) 30%, rgba(248, 248, 246, 0.95) 100%)"
              : "radial-gradient(circle at 50% 50%, rgba(12, 12, 12, 0.15) 20%, rgba(12, 12, 12, 0.85) 100%)",
            backdropFilter: blurAmount === "none" ? "none" : undefined
          }}
        />

        {/* Tiny top glow gradient */}
        {!isLight && (
          <div className="absolute top-0 left-0 right-0 h-[25vh] bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
        )}
      </div>

      {/* 3. FLOATING AMBIENT CONTROLLER WIDGET */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="relative flex items-center justify-end">
          
          {/* Expanded Menu Panel */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 15 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className={`mr-2 w-80 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all ${
                  isLight 
                    ? "bg-white/95 border-slate-200 text-slate-800" 
                    : "bg-slate-950/95 border-slate-800/80 text-slate-100"
                }`}
              >
                {/* Header title */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5 border-slate-200/20">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-indigo-500 animate-spin" style={{ animationDuration: "8s" }} />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider">Cinematic Oasis</span>
                  </div>
                  <button 
                    onClick={() => setShowControls(false)}
                    className="p-1 rounded-md hover:bg-white/10 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Preset selectors list */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-mono uppercase tracking-widest text-slate-400 block mb-1.5 flex items-center justify-between">
                      <span>Ambient Flow Presets</span>
                      <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PRESETS.map((preset) => {
                        const isSelected = activePreset === preset.id;
                        return (
                          <button
                            key={preset.id}
                            onClick={() => {
                              setActivePreset(preset.id);
                              setVideoError(false);
                            }}
                            className={`p-1.5 rounded-lg text-left transition-all text-xs flex flex-col justify-between h-[52px] border cursor-pointer ${
                              isSelected
                                ? isLight
                                  ? "bg-slate-900 text-white border-slate-900"
                                  : "bg-indigo-600/20 border-indigo-500/80 text-white shadow-sm"
                                : isLight
                                  ? "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                                  : "bg-slate-900/50 hover:bg-slate-900 border-white/5 text-slate-400 hover:text-white"
                            }`}
                          >
                            <span className="font-medium truncate block w-full">{preset.name}</span>
                            <div className="flex items-center justify-between w-full mt-1">
                              <span className="text-[8px] opacity-75 font-mono">
                                {preset.id === "threejs" ? "3D WEBGL" : preset.id === "mesh" ? "CPU" : "LOOP"}
                              </span>
                              {isSelected && <Check className="w-3 h-3 text-indigo-400 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Contrast Opacity level */}
                  {activePreset !== "threejs" && activePreset !== "mesh" && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 uppercase">
                        <span>Background Opacity</span>
                        <span>{opacityPercent}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="90"
                        step="5"
                        value={opacityPercent}
                        onChange={(e) => setOpacityPercent(parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                  )}

                  {/* Playback speed config for high performance */}
                  {usesVideo && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 uppercase">
                        <span>Pace Speed multiplier</span>
                        <span>{playbackSpeed}x</span>
                      </div>
                      <div className="flex gap-2">
                        {[0.4, 0.65, 0.9, 1.2].map((s) => (
                          <button
                            key={s}
                            onClick={() => setPlaybackSpeed(s)}
                            className={`flex-1 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                              playbackSpeed === s
                                ? "bg-indigo-600 border-indigo-500 text-white"
                                : isLight
                                  ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                                  : "bg-slate-900 hover:bg-slate-850 text-slate-400 border-white/5"
                            }`}
                          >
                            {s}x
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Backdrop blur options to increase text clarity */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase tracking-widest text-slate-400 block">
                      Text Backdrop Blur Mask
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { val: "none", lbl: "Off" },
                        { val: "sm", lbl: "Light" },
                        { val: "md", lbl: "Medium" },
                        { val: "lg", lbl: "Deep" }
                      ].map((item) => (
                        <button
                          key={item.val}
                          onClick={() => setBlurAmount(item.val)}
                          className={`py-1 rounded text-[10px] font-mono border text-center cursor-pointer ${
                            blurAmount === item.val
                              ? "bg-indigo-600 border-indigo-500 text-white"
                              : isLight
                                ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                                : "bg-slate-800/40 hover:bg-slate-800 text-slate-400 border-white/5"
                          }`}
                        >
                          {item.lbl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Primary controls & theme helper */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 border-slate-200/20">
                    <div className="flex gap-1">
                      {usesVideo && (
                        <button
                          onClick={() => setIsPlaying(!isPlaying)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            isPlaying 
                              ? "bg-emerald-600/10 border-emerald-500/30 text-emerald-400" 
                              : "bg-amber-600/10 border-amber-500/30 text-amber-400"
                          }`}
                          title={isPlaying ? "Pause Ambient Background Loop" : "Resume Ambient Background Loop"}
                        >
                          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                      )}

                      <button
                        onClick={toggleTheme}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          isLight 
                            ? "bg-violet-50 hover:bg-violet-100 text-violet-700 border-slate-200" 
                            : "bg-slate-900 hover:bg-slate-850 text-amber-400 border-white/5"
                        }`}
                        title={isLight ? "Activate Cosmic Twilight Mode" : "Activate Sunlight Oasis Mode"}
                      >
                        {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <p className="text-[8px] font-mono text-slate-500 text-right">
                      {usesVideo ? "Fluid HTML5 Loop Active" : activePreset === "threejs" ? "WebGL Render Core" : "Light Aura Shader"}
                    </p>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Core toggle button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowControls(!showControls)}
            className={`w-10 h-10 rounded-full flex items-center justify-center border shadow-xl backdrop-blur-lg transition-all cursor-pointer ${
              showControls
                ? "bg-indigo-600 border-indigo-500 text-white rotate-90"
                : isLight
                  ? "bg-white/80 hover:bg-white text-slate-800 border-slate-200"
                  : "bg-slate-950/80 hover:bg-slate-900 text-indigo-400 border-slate-800/80 shadow-[0_4px_20px_rgba(99,102,241,0.15)]"
            }`}
            style={{ transitionProperty: "background-color,border-color,color,transform" }}
          >
            {showControls ? (
              <Minimize2 className="w-4.5 h-4.5" />
            ) : (
              <Palette className="w-4.5 h-4.5 animate-pulse" />
            )}
          </motion.button>
        </div>
      </div>
    </>
  );
}
