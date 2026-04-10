import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import { AuthProvider } from "@/context/AuthContext";
import InstallAppBanner from "@/components/InstallAppBanner";
import App from "./App";
import "./index.css";

registerSW({ immediate: true });

const baseUrl = import.meta.env.BASE_URL;
const basename = baseUrl === "/" ? "" : baseUrl.replace(/\/$/, "");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={basename || undefined}>
      <AuthProvider>
        <InstallAppBanner />
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
