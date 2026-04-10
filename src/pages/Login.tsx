import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const { loginWithGoogle, loading } = useAuth();

  return (
    <div className="app-shell" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div className="page-title">
        <h1>Fitness Pal</h1>
        <p className="muted">Goals, meals, gym plan, and progress—synced with your Google account.</p>
      </div>
      <button type="button" className="btn btn-primary btn-block" disabled={loading} onClick={() => loginWithGoogle()}>
        {loading ? "Loading…" : "Continue with Google"}
      </button>
    </div>
  );
}
