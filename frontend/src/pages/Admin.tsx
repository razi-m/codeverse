import { useState } from "react";
import { RainbowKitProvider, darkTheme, ConnectButton } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "../lib/wagmi.js";
import { AdminGate } from "../components/insurer/AdminGate.js";
import { PolicyTable } from "../components/insurer/PolicyTable.js";
import { CreatePolicyForm } from "../components/insurer/CreatePolicyForm.js";
import { OracleRegistry } from "../components/insurer/OracleRegistry.js";
import "@rainbow-me/rainbowkit/styles.css";

/**
 * The insurer console. Wallet providers are scoped to THIS route only,
 * loaded via React.lazy() in App.tsx — this is what keeps wagmi and
 * RainbowKit out of the farmer bundle entirely (D3, D24, TRD PERF5).
 */
const queryClient = new QueryClient();

type Tab = "portfolio" | "create" | "oracles";

function AdminConsole() {
  const [tab, setTab] = useState<Tab>("portfolio");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }} data-surface="insurer">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>KisanShield — Insurer Console</h1>
        <ConnectButton />
      </header>

      <AdminGate>
        <nav style={{ display: "flex", gap: 8, margin: "16px 0" }}>
          <button onClick={() => setTab("portfolio")} aria-current={tab === "portfolio"}>
            Portfolio
          </button>
          <button onClick={() => setTab("create")} aria-current={tab === "create"}>
            Create policy
          </button>
          <button onClick={() => setTab("oracles")} aria-current={tab === "oracles"}>
            Weather feeds
          </button>
        </nav>

        {tab === "portfolio" && <PolicyTable key={refreshKey} />}
        {tab === "create" && (
          <CreatePolicyForm onCreated={() => setRefreshKey((k) => k + 1)} />
        )}
        {tab === "oracles" && <OracleRegistry />}
      </AdminGate>
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
