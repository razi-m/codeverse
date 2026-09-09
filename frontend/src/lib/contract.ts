/**
 * Reads the address + ABI written by contracts/scripts/deploy.js.
 * The file is generated, so it is gitignored and absent before the first deploy.
 */
import deployment from "./deployment.json";
import type { Abi } from "viem";

export type Deployment = {
  address: `0x${string}`;
  chainId: number;
  network: string;
  // wagmi's write/read hooks narrow functionName/args/value against this
  // type — readonly unknown[] defeats that narrowing entirely, so this
  // must be viem's Abi, not a loosely-typed array.
  abi: Abi;
};

const typed = deployment as unknown as Deployment;

export const contractAddress = typed.address;
export const contractAbi = typed.abi;
export const contractChainId = typed.chainId;
