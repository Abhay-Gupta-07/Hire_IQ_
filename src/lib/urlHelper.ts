/**
 * URL helper for generating, customizing, and detecting device-accessible public links.
 * Works seamlessly across parent frames, iframes, and sandbox environments in AI Studio.
 */

export function getAppBaseUrl(): string {
  const normalizeUrl = (rawUrl: string): string => {
    let url = rawUrl.trim().replace(/\/$/, "");
    
    // Change http:// to https:// for all cloud-hosted endpoints to satisfy microphone/camera secure context requirements
    if (url.startsWith("http://") && (url.includes("run.app") || url.includes("asia-southeast1") || url.includes("aistudio"))) {
      url = url.replace(/^http:\/\//, "https://");
    }

    return url;
  };

  // If we are running in a browser, use the current page's origin as the primary source of truth,
  // unless we are inside the Google AI Studio parent wrapper itself.
  const origin = window.location.origin;
  if (origin && !origin.includes("aistudio.google.com")) {
    return normalizeUrl(origin);
  }

  const custom = localStorage.getItem("custom_public_origin");
  if (custom && custom.trim()) {
    return normalizeUrl(custom);
  }
  
  const serverDetected = localStorage.getItem("server_detected_public_origin");
  if (serverDetected && serverDetected.trim() && !serverDetected.includes("aistudio.google.com")) {
    return normalizeUrl(serverDetected);
  }
  
  // Default to the user's custom production Vercel domain
  return "https://hire-iq-01.vercel.app";
}

export function isAiStudioOrigin(): boolean {
  return (
    window.location.origin.includes("aistudio.google.com") ||
    document.referrer.includes("aistudio.google.com")
  );
}

export function getQrCodeUrl(url: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}`;
}
