import { createHash, timingSafeEqual } from "node:crypto";
import { simulateRequest } from "../../apps/engine/src/studio/request";

/**
 * Optional server-to-server integration endpoint.
 *
 * Enabled only when the operator configures a strong secret in the server
 * environment (never in VITE_* / public browser variables).
 * Browser Studio uses local Workers; it does NOT call this protected API.
 * For commercial multi-tenant use, add durable accounts, rate limits and
 * per-customer resource quotas before enabling external access.
 */
const MAX_BODY_BYTES = 65_536;
const MAX_API_SHOTS = 2048;
const MAX_API_STEPS = 256;

function authenticated(header: unknown, secret: string): boolean {
  if (typeof header !== "string" || !header.startsWith("Bearer ")) return false;
  const candidate = header.slice(7);
  if (!candidate || candidate.length > 512) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(candidate), digest(secret));
}

export default function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Allow", "POST");
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed." });
  }
  const secret = process.env.QUANTUM_SIMULATION_API_TOKEN;
  if (!secret || secret.length < 32) {
    return res.status(503).json({
      error: "Simulation API is disabled. Use the local quantum workspace.",
    });
  }
  if (!authenticated(req.headers?.authorization, secret)) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers?.["content-type"] || "")) {
    return res.status(415).json({ error: "Content-Type must be application/json." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ error: "Invalid JSON simulation request." });
    }
    const byteLength = Buffer.byteLength(JSON.stringify(body), "utf8");
    if (byteLength > MAX_BODY_BYTES) {
      return res.status(413).json({ error: "Circuit request exceeds 64 KiB." });
    }
    if (!Array.isArray(body.steps) || body.steps.length > MAX_API_STEPS
      || !Number.isInteger(body.shots ?? 1024) || (body.shots ?? 1024) > MAX_API_SHOTS) {
      return res.status(422).json({ error: "API workload exceeds configured step/shot budget." });
    }
    // Schema validation and scientific resource limits remain mandatory in the engine.
    const result = simulateRequest(body);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({
      error: "Invalid or unsupported quantum computation request.",
      message: error instanceof Error ? error.message : "Simulation failed.",
    });
  }
}
