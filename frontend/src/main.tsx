import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { ThemeProvider } from "./theme/ThemeContext";
import { LanguageProvider } from "./i18n/LanguageContext";
import { useMouseGlow } from "./hooks/useMouseGlow";
import { queryClient } from "./lib/reactQueryConfig";
import "./i18n/config"; // Initialize i18n
import "./styles/tailwind.css";
import "./styles/index.css";
import "./styles/mobile-responsive.css"; // Mobile responsive styles
import "./styles/profile-mobile.css"; // Profile page mobile styles
import "./styles/mobile.css"; // CRITICAL: Mobile overrides (must be last)

function AppWithEffects() {
  useMouseGlow();
  return (
    <>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--panel-strong)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            boxShadow: 'var(--shadow)',
          },
        }}
      />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppWithEffects />
            </BrowserRouter>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);