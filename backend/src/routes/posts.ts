import { Router } from "express";
import * as chain from "../services/chain.js";

export const postsRouter = Router();

const MAX_LIMIT = 100;

/** Parses a query param as a non-negative int, falling back when absent/invalid. */
function intParam(value: unknown, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

postsRouter.get("/", async (req, res, next) => {
  try {
    const offset = intParam(req.query.offset, 0);
    const limit = intParam(req.query.limit, 20, MAX_LIMIT);

    const [posts, total] = await Promise.all([
      chain.getPosts(offset, limit),
      chain.getPostCount(),
    ]);

    res.json({ posts, total, offset, limit });
  } catch (err) {
    next(err);
  }
});

postsRouter.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 0) {
      return res.status(400).json({ error: "id must be a non-negative integer" });
    }
    res.json(await chain.getPost(id));
  } catch (err) {
    next(err);
  }
});
