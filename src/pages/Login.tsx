import { useAuth } from "@/context/AuthContext";
import AppLogo from "@/components/AppLogo";

export default function Login() {
  const { loginWithGoogle, loading, authNotice, clearAuthNotice } = useAuth();

  return (
    <div className="app-shell" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div className="page-title">
        <div className="login-logo-wrap">
          <AppLogo height={120} />
        </div>
        <p className="page-lead">
          Train, eat, and track progress in one place — whether you are cutting, bulking, or maintaining. Syncs with your
          Google account.
        </p>
      </div>
      {authNotice && (
        <div className="error-banner" style={{ marginBottom: "0.75rem" }}>
          <p style={{ margin: 0 }}>{authNotice}</p>
          <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: "0.5rem" }} onClick={clearAuthNotice}>
            Dismiss
          </button>
        </div>
      )}
      <button type="button" className="btn btn-primary btn-block" disabled={loading} onClick={() => void loginWithGoogle()}>
        {loading ? "Loading…" : "Continue with Google"}
      </button>
      <p className="page-lead" style={{ marginTop: "1rem", marginBottom: 0, fontSize: "0.82rem" }}>
        If Google sign-in fails inside Instagram, Facebook, or other in-app browsers, open this site in Safari or Chrome
        instead.
      </p>
    </div>
  );
}
