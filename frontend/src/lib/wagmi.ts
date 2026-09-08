import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { hardhat, sepolia } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "Global Hackathon",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "demo",
  // hardhat = local node (chainId 31337). Add/remove chains as your demo needs.
  chains: [hardhat, sepolia],
  ssr: false,
});
