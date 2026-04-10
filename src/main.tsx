import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import App from "./App";
import "./index.css";

const baseUrl = import.meta.env.BASE_URL;
const basename = baseUrl === "/" ? "" : baseUrl.replace(/\/$/, "");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={basename || undefined}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
