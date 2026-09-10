import { Suspense, lazy } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Landing from "./pages/Landing.js";
import Login from "./pages/Login.js";
import PolicyView from "./pages/PolicyView.js";
import WeatherView from "./pages/WeatherView.js";
import AuditView from "./pages/AuditView.js";
import { TabBar } from "./components/shared/TabBar.js";
import { AuthProvider } from "./lib/AuthContext.js";
import { RequireFarmerSession } from "./components/shared/RequireFarmerSession.js";

// Lazy: this is the module boundary that keeps wagmi/RainbowKit out of the
// farmer bundle (T3.16, D3, TRD PERF5). No farmer route imports Admin.tsx
// directly, so their JS chunk never pulls in a wallet library.
const Admin = lazy(() => import("./pages/Admin.js"));

export default function App() {
  const { pathname } = useLocation();
  // The tab bar belongs to the farmer surface only — the insurer console
  // has its own navigation and a different information density.
  const showTabs = !pathname.startsWith("/admin");

  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/policy/:id"
          element={
            <RequireFarmerSession>
              <PolicyView />
            </RequireFarmerSession>
          }
        />
        <Route
          path="/policy/:id/weather"
          element={
            <RequireFarmerSession>
              <WeatherView />
            </RequireFarmerSession>
          }
        />
        <Route
          path="/policy/:id/audit"
          element={
            <RequireFarmerSession>
              <AuditView />
            </RequireFarmerSession>
          }
        />
        <Route
          path="/admin"
          element={
            <Suspense
              fallback={
                <div className="farmer-page" style={{ paddingTop: "var(--sp-16)" }}>
                  <p className="mono-label">Loading console…</p>
                </div>
              }
            >
              <Admin />
            </Suspense>
          }
        />
      </Routes>
      {showTabs && <TabBar />}
    </AuthProvider>
  );
}
