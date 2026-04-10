import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Keeps canonical + og:url in sync with the real address bar (including GitHub Pages /repo/ base).
 * iOS Share and some apps use these instead of only the SPA shell URL.
 */
export default function CanonicalHead() {
  const location = useLocation();

  useEffect(() => {
    const url = window.location.href.split("#")[0];

    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = url;

    let og = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (!og) {
      og = document.createElement("meta");
      og.setAttribute("property", "og:url");
      document.head.appendChild(og);
    }
    og.content = url;
  }, [location.pathname, location.search, location.hash]);

  return null;
}
