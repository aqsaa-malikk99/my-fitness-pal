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
          On iPhone or iPad: tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>, to open this like an app.
        </p>
        <button type="button" className="btn btn-ghost btn-block" onClick={dismiss}>
          Dismiss
        </button>
      </div>
    );
  }

  return null;
}
