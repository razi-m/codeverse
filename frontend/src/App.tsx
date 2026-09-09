import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing.js";
import PolicyView from "./pages/PolicyView.js";

// Lazy: this is the module boundary that keeps wagmi/RainbowKit out of the
// farmer bundle (T3.16, D3, TRD PERF5). Landing and PolicyView never import
// Admin.tsx directly, so their JS chunk never pulls in a wallet library.
const Admin = lazy(() => import("./pages/Admin.js"));

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/policy/:id" element={<PolicyView />} />
      <Route
        path="/admin"
        element={
          <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
            <Admin />
          </Suspense>
        }
      />
    </Routes>
  );
}
