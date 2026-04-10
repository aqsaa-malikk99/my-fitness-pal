import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const DISMISS_KEY = "fp-install-banner-dismissed";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;
}

export default function InstallAppBanner() {
  const { user, profile } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");
  const [iosEligible, setIosEligible] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  const hasBottomNav = !!(user && profile?.onboardingComplete);

  useEffect(() => {
    if (isStandalone()) return;
    if (isIos()) {
      setIosEligible(true);
      return;
    }
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  }, [deferredPrompt, dismiss]);

  const copyFullUrl = useCallback(async () => {
    const href = window.location.href.split("#")[0];
    try {
      await navigator.clipboard.writeText(href);
      setCopyDone(true);
      window.setTimeout(() => setCopyDone(false), 2500);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = href;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopyDone(true);
        window.setTimeout(() => setCopyDone(false), 2500);
      } catch {
        window.prompt("Copy this full URL:", href);
      }
    }
  }, []);

  if (dismissed || isStandalone()) return null;

  const posClass = hasBottomNav ? "install-banner--above-nav" : "install-banner--floating";

  if (deferredPrompt) {
    return (
      <div className={`install-banner ${posClass}`} role="region" aria-label="Install app">
        <p className="install-banner-text">Install Fitness Pal on your home screen for quick access.</p>
        <div className="install-banner-actions">
          <button type="button" className="btn btn-primary btn-block" onClick={() => void install()}>
            Install app
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={dismiss}>
            Not now
          </button>
        </div>
      </div>
    );
  }

  if (iosEligible) {
    return (
      <div className={`install-banner ${posClass}`} role="region" aria-label="Add to Home Screen">
        <p className="install-banner-text">
          On iPhone or iPad: open this page in <strong>Safari</strong>, tap <strong>Share</strong>, then{" "}
          <strong>Add to Home Screen</strong>. If Share shows a short or wrong link, copy the full URL below first, then
          paste it in the Safari address bar before adding.
        </p>
        <div className="install-banner-actions">
          <button type="button" className="btn btn-primary btn-block" onClick={() => void copyFullUrl()}>
            {copyDone ? "Copied!" : "Copy full URL"}
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={dismiss}>
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return null;
}
