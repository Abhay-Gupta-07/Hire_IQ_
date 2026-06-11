import React from "react";

interface HireIqLogoProps {
  className?: string;
  theme?: "light" | "dark";
}

export default function HireIqLogo({ className = "w-8 h-8", theme }: HireIqLogoProps) {
  const isLight = theme === "light";
  return (
    <svg 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={`${className} select-none transition-colors duration-500 ${isLight ? "text-[#131518]" : "text-white"}`}
    >
      <defs>
        {/* Dynamic mask to cut out a gap in the right bracket for the Q's tail */}
        <mask id="logo-mask">
          <rect x="0" y="0" width="200" height="200" fill="white" />
          <path d="M 115,124 L 145,154 L 165,144 L 135,114 Z" fill="black" />
        </mask>
      </defs>

      {/* 1. LEFT MAIN "H" AND CONTINUATION BLOCK */}
      <path 
        d="M 28,30 H 76 V 93 H 92 V 107 H 76 V 170 H 28 Z M 42,44 H 62 V 93 H 42 Z M 42,107 H 62 V 156 H 42 Z" 
        fill="currentColor"
        fillRule="evenodd"
      />

      {/* 2. RIGHT "]" BRACKET BLOCK WITH GAP MASK */}
      <path 
        d="M 124,30 H 172 V 170 H 124 V 126 H 138 V 156 H 158 V 44 H 138 V 74 H 124 Z" 
        fill="currentColor"
        mask="url(#logo-mask)"
      />

      {/* 3. CONSTELLATION NETWORK INNER TRUSS LINES */}
      <g stroke="currentColor" strokeWidth="2" opacity="0.4">
        {/* Boundary & inner crossing truss lines */}
        <line x1="100" y1="48" x2="122" y2="80" />
        <line x1="68" y1="62" x2="122" y2="80" />
        <line x1="54" y1="100" x2="78" y2="118" />
        <line x1="68" y1="138" x2="78" y2="118" />
        <line x1="100" y1="150" x2="78" y2="118" />
        <line x1="100" y1="150" x2="122" y2="118" />
        <line x1="132" y1="140" x2="122" y2="118" />
        <line x1="158" y1="110" x2="122" y2="118" />
        <line x1="146" y1="82" x2="122" y2="80" />
        <line x1="132" y1="60" x2="122" y2="80" />
        <line x1="78" y1="118" x2="122" y2="118" />
        <line x1="122" y1="118" x2="122" y2="80" />
        <line x1="78" y1="118" x2="122" y2="80" />

        {/* Anchor lines to center */}
        <line x1="100" y1="48" x2="100" y2="100" />
        <line x1="54" y1="100" x2="100" y2="100" />
        <line x1="146" y1="82" x2="100" y2="100" />
        <line x1="100" y1="150" x2="100" y2="100" />
        <line x1="78" y1="118" x2="100" y2="100" />
        <line x1="122" y1="118" x2="100" y2="100" />
        <line x1="122" y1="80" x2="100" y2="100" />
      </g>

      {/* 4. OUTER Q POLYGON NETWORK BOUNDARY */}
      <path 
        d="M 100,48 L 132,60 L 146,82 L 158,110 L 132,140 L 100,150 L 68,138 L 54,100 L 68,62 Z"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />

      {/* 5. INDIVIDUAL JUNCTION NODES */}
      <g fill={isLight ? "#ffffff" : "#0c0c0c"} stroke="currentColor" strokeWidth="2.5">
        <circle cx="100" cy="48" r="4" />
        <circle cx="132" cy="60" r="4" />
        <circle cx="146" cy="82" r="4" fill="currentColor" /> {/* Solid Node */}
        <circle cx="158" cy="110" r="4" />
        <circle cx="132" cy="140" r="4" />
        <circle cx="100" cy="150" r="4" />
        <circle cx="68" cy="138" r="4" />
        <circle cx="54" cy="100" r="4" />
        <circle cx="68" cy="62" r="4" />
        
        {/* Interior Nodes */}
        <circle cx="78" cy="118" r="4" />
        <circle cx="122" cy="118" r="4" />
        <circle cx="122" cy="80" r="4" />
      </g>

      {/* 6. CENTRAL EYE WITH SOLID BACKGROUND MASK */}
      <circle 
        cx="100" 
        cy="100" 
        r="24" 
        stroke="currentColor" 
        strokeWidth="3.5" 
        fill={isLight ? "#ffffff" : "#0c0c0c"} 
      />

      {/* 7. DETAILED CRESCENT EYE PUPIL */}
      <path 
        d="M 93.6,93.6 a 9.6 9.6 0 1 0 0,12.8 a 7.2 7.2 0 1 1 0,-12.8" 
        fill="currentColor" 
      />
      <circle cx="106" cy="95" r="2.4" fill={isLight ? "#ffffff" : "#0c0c0c"} />

      {/* 8. Q SYMBOL DIAGONAL TAIL */}
      <line 
        x1="116" 
        y1="120" 
        x2="148" 
        y2="152" 
        stroke="currentColor" 
        strokeWidth="6.5" 
        strokeLinecap="butt" 
      />
      <line 
        x1="126" 
        y1="110" 
        x2="158" 
        y2="142" 
        stroke="currentColor" 
        strokeWidth="4.5" 
        strokeLinecap="butt" 
      />
    </svg>
  );
}
