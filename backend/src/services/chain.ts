import { ethers } from "ethers";
import { config, loadDeployment } from "../config.js";

export type Post = {
  id: number;
  author: string;
  content: string;
  timestamp: number;
  tips: string;
};

const CACHE_TTL_MS = 5_000;

let cache: { key: string; value: unknown; expires: number } | null = null;

const provider = new ethers.JsonRpcProvider(config.rpcUrl);
const deployment = loadDeployment();

export const isConfigured = () => deployment !== null;

export function contractInfo() {
  return deployment
    ? { address: deployment.address, chainId: deployment.chainId, network: deployment.network }
    : null;
}

function contract() {
  if (!deployment) {
    throw new Error(
      "No deployment found. Run `npm run deploy:local` in the contracts workspace first."
    );
  }
  return new ethers.Contract(deployment.address, deployment.abi as ethers.InterfaceAbi, provider);
}

function toPost(raw: any): Post {
  return {
    id: Number(raw.id),
    author: raw.author,
    content: raw.content,
    timestamp: Number(raw.timestamp),
    // Wei is a bigint and does not survive JSON, so send a decimal ether string.
    tips: ethers.formatEther(raw.tips),
  };
}

/** Short TTL cache: a demo refreshing on an interval shouldn't hammer the RPC. */
async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (cache && cache.key === key && cache.expires > Date.now()) return cache.value as T;
  const value = await fn();
  cache = { key, value, expires: Date.now() + CACHE_TTL_MS };
  return value;
}

export async function getPosts(offset: number, limit: number): Promise<Post[]> {
  return cached(`posts:${offset}:${limit}`, async () => {
    const raw = await contract().getPosts(offset, limit);
    return raw.map(toPost);
  });
}

export async function getPost(id: number): Promise<Post> {
  return toPost(await contract().getPost(id));
}

export async function getPostCount(): Promise<number> {
  return Number(await contract().postCount());
}

export async function getChainStatus() {
  const [blockNumber, network] = await Promise.all([
    provider.getBlockNumber(),
    provider.getNetwork(),
  ]);
  return { blockNumber, chainId: Number(network.chainId), rpcUrl: config.rpcUrl };
}
