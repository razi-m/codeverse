/**
 * Reads the address + ABI written by contracts/scripts/deploy.js.
 * The file is generated, so it is gitignored and absent before the first deploy.
 */
import deployment from "./deployment.json";

export type Deployment = {
  address: `0x${string}`;
  chainId: number;
  network: string;
  abi: readonly unknown[];
};

const typed = deployment as unknown as Deployment;

export const contractAddress = typed.address;
export const contractAbi = typed.abi;
export const contractChainId = typed.chainId;
