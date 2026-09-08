import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useCallback, useEffect, useState } from "react";
import { PostComposer } from "./components/PostComposer.js";
import { PostList } from "./components/PostList.js";
import { fetchHealth, fetchPosts, type Post } from "./lib/api.js";

export default function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { posts } = await fetchPosts();
      // Newest first.
      setPosts([...posts].reverse());
      setStatus(null);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    fetchHealth()
      .then((h) => {
        if (!h.contract) setStatus("Contract not deployed yet — run npm run deploy:local");
      })
      .catch(() => setStatus("Backend unreachable — is it running on :4000?"));
  }, [load]);

  return (
    <div className="app">
      <header>
        <h1>Global</h1>
        <ConnectButton />
      </header>

      <main>
        {status && <p className="banner">{status}</p>}
        <PostComposer onPosted={load} />
        <PostList posts={posts} loading={loading} />
      </main>
    </div>
  );
}
