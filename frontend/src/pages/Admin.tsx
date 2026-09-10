import { useState } from "react";
import { RainbowKitProvider, darkTheme, ConnectButton } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "../lib/wagmi.js";
import { AdminGate } from "../components/insurer/AdminGate.js";
import { RequireInsurerSession } from "../components/insurer/RequireInsurerSession.js";
import { PolicyTable } from "../components/insurer/PolicyTable.js";
import { CreatePolicyForm } from "../components/insurer/CreatePolicyForm.js";
import { OracleRegistry } from "../components/insurer/OracleRegistry.js";
import { NotificationPanel } from "../components/insurer/NotificationPanel.js";
import "@rainbow-me/rainbowkit/styles.css";

/**
 * The insurer console. Wallet providers are scoped to THIS route only,
 * loaded via React.lazy() in App.tsx — this is what keeps wagmi and
 * RainbowKit out of the farmer bundle entirely (D3, D24, TRD PERF5).
 */
const queryClient = new QueryClient();

type Tab = "portfolio" | "create" | "oracles" | "notifications";

function AdminConsole() {
  const [tab, setTab] = useState<Tab>("portfolio");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="insurer-shell" data-surface="insurer">
      <header className="insurer-head">
        <div>
          <h1>Insurer Console</h1>
          <span className="mono-label">KisanShield · Underwriting Desk</span>
        </div>
        <ConnectButton />
      </header>

      <RequireInsurerSession>
        <nav className="tabs">
          <button onClick={() => setTab("portfolio")} aria-current={tab === "portfolio"}>
            Portfolio
          </button>
          <button onClick={() => setTab("create")} aria-current={tab === "create"}>
            Create policy
          </button>
          <button onClick={() => setTab("oracles")} aria-current={tab === "oracles"}>
            Weather feeds
          </button>
          <button onClick={() => setTab("notifications")} aria-current={tab === "notifications"}>
            Notifications
          </button>
        </nav>

        {/* Notifications is Supabase-RBAC-gated only — it never touches the
            contract, so it doesn't need the wallet-owner check AdminGate
            enforces for on-chain write actions. */}
        {tab === "notifications" ? (
          <NotificationPanel />
        ) : (
          <AdminGate>
            {tab === "portfolio" && <PolicyTable key={refreshKey} />}
            {tab === "create" && (
              <CreatePolicyForm onCreated={() => setRefreshKey((k) => k + 1)} />
            )}
            {tab === "oracles" && <OracleRegistry />}
          </AdminGate>
        )}
      </RequireInsurerSession>
    </div>
  );
}

export default function Admin() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          <AdminConsole />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
