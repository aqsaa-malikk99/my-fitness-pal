import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/AppLayout";
import SetupFirebase from "@/pages/SetupFirebase";
import Login from "@/pages/Login";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import PlanPage from "@/pages/PlanPage";
import MealsPage from "@/pages/MealsPage";
import RecipesPage from "@/pages/RecipesPage";
import CalculatorPage from "@/pages/CalculatorPage";
import ProgressPage from "@/pages/ProgressPage";
import SettingsPage from "@/pages/SettingsPage";
import AdminRecipesPage from "@/pages/AdminRecipesPage";

export default function App() {
  const { firebaseReady, loading, user, profile } = useAuth();

  if (!firebaseReady) {
    return (
      <Routes>
        <Route path="*" element={<SetupFirebase />} />
      </Routes>
    );
  }

  if (loading) {
    return (
      <div className="app-shell">
        <p className="muted">Signing you in…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const needsOnboarding = !profile || !profile.onboardingComplete;
  if (needsOnboarding) {
    return (
      <Routes>
        <Route path="*" element={<Onboarding />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="plan" element={<PlanPage />} />
        <Route path="meals" element={<MealsPage />} />
        <Route path="recipes" element={<RecipesPage />} />
        <Route path="calc" element={<CalculatorPage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="admin/recipes" element={<AdminRecipesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
