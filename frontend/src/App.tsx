import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { PublicShell } from "./components/layout/PublicShell";
import { routeDefinitions } from "./routes/routeDefinitions";
import { HomePage } from "./pages/public/HomePage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ConstitutionPage } from "./pages/public/ConstitutionPage";
import { NoticesPage } from "./pages/public/NoticesPage";
import { AboutPage } from "./pages/public/AboutPage";
import { ContactPage } from "./pages/public/ContactPage";
import { EventDetailsPage } from "./pages/public/EventDetailsPage";
import { NotFoundPage } from "./pages/common/NotFoundPage";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { EventsPage } from "./pages/events/EventsPage";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicShell />}>
        <Route index element={<HomePage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailsPage />} />
        <Route path="/notices" element={<NoticesPage />} />
        <Route path="/constitution" element={<ConstitutionPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
      </Route>
      <Route element={<AppShell />}>
        {routeDefinitions.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={<ProtectedRoute requiredRoles={route.requiredRoles}>{route.element}</ProtectedRoute>}
          />
        ))}
      </Route>
      <Route path="/dashboard" element={<Navigate to="/dashboard/home" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}