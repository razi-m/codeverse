import { useState } from "react";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { contractAbi, contractAddress } from "../lib/contract.js";

const MAX_LENGTH = 280;

export function PostComposer({ onPosted }: { onPosted: () => void }) {
  const { isConnected } = useAccount();
  const [content, setContent] = useState("");
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
    // Refresh the feed only once the tx is actually mined.
    query: { enabled: Boolean(hash) },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) return;

    writeContract(
      {
        address: contractAddress,
        abi: contractAbi as never,
        functionName: "createPost",
        args: [trimmed],
      },
      {
        onSuccess: () => {
          setContent("");
          // Give the node a beat to mine, then reload.
          setTimeout(onPosted, 1500);
        },
      }
    );
  }

  const busy = isPending || isConfirming;

  return (
    <form className="card composer" onSubmit={submit}>
      <textarea
        value={content}
        maxLength={MAX_LENGTH}
        placeholder={isConnected ? "Say something on-chain…" : "Connect a wallet to post"}
        disabled={!isConnected || busy}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="composer-footer">
        <span className="muted">
          {content.length}/{MAX_LENGTH}
        </span>
        <button type="submit" disabled={!isConnected || busy || !content.trim()}>
          {isPending ? "Confirm in wallet…" : isConfirming ? "Mining…" : "Post"}
        </button>
      </div>
      {error && <p className="error">{error.message.split("\n")[0]}</p>}
    </form>
  );
}
