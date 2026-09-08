import { parseEther } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import type { Post } from "../lib/api.js";
import { contractAbi, contractAddress } from "../lib/contract.js";

const TIP_AMOUNT = "0.01";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function PostList({ posts, loading }: { posts: Post[]; loading: boolean }) {
  const { isConnected } = useAccount();
  const { writeContract, isPending } = useWriteContract();

  function tip(id: number) {
    writeContract({
      address: contractAddress,
      abi: contractAbi as never,
      functionName: "tipPost",
      args: [BigInt(id)],
      value: parseEther(TIP_AMOUNT),
    });
  }

  if (loading) return <p className="muted">Loading feed…</p>;
  if (posts.length === 0) return <p className="muted">No posts yet. Be the first.</p>;

  return (
    <ul className="feed">
      {posts.map((post) => (
        <li key={post.id} className="card post">
          <div className="post-meta">
            <span className="author">{shortAddress(post.author)}</span>
            <time>{new Date(post.timestamp * 1000).toLocaleString()}</time>
          </div>
          <p className="post-content">{post.content}</p>
          <div className="post-footer">
            <span className="muted">{post.tips} ETH tipped</span>
            <button disabled={!isConnected || isPending} onClick={() => tip(post.id)}>
              Tip {TIP_AMOUNT}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
