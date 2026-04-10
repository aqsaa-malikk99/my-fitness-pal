export default function SetupFirebase() {
  return (
    <div className="app-shell">
      <h1>Connect Firebase</h1>
      <p className="muted">
        Create a Firebase project, enable Authentication (Google) and Cloud Firestore, then add these to{" "}
        <code>.env</code> in the project root:
      </p>
      <div className="card">
        <pre style={{ margin: 0, fontSize: "0.75rem", overflow: "auto", color: "var(--muted)" }}>
          {`VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=`}
        </pre>
      </div>
      <p className="muted">
        In Firebase Console → Authentication → Sign-in method → enable Google. Firestore → create database in production
        mode, then add rules that restrict reads/writes to <code>request.auth.uid</code>.
      </p>
      <p className="muted">Restart <code>npm run dev</code> after saving <code>.env</code>.</p>
    </div>
  );
}
