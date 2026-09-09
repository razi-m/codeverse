import { RainbowKitProvider, darkTheme, ConnectButton } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "../lib/wagmi.js";
import "@rainbow-me/rainbowkit/styles.css";

/**
 * The insurer console. Wallet providers are scoped to THIS route only,
 * loaded via React.lazy() in App.tsx — this is what keeps wagmi and
 * RainbowKit out of the farmer bundle entirely (D3, TRD PERF5, Design.md
 * § Mobile Experience). A wallet prompt cannot appear on a farmer page
 * that never imports this module.
 *
 * Full console (PolicyTable, CreatePolicyForm, OracleRegistry, ...) is
 * P8 scope — this is the route boundary and AdminGate shell only, so
 * T3.16/T3.17 can verify the split before P8 builds on top of it.
 */
const queryClient = new QueryClient();

function AdminConsole() {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }} data-surface="insurer">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>KisanShield — Insurer Console</h1>
        <ConnectButton />
      </header>
      <p style={{ color: "var(--text-muted)" }}>
        Full console (policy portfolio, oracle registry, create/fund actions) is built in P8.
      </p>
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
