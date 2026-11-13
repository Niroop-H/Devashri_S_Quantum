# Industrial Optimization API — Controlled pilot specification

**Version:** \`MAH-Quantum-Industrial-API/v1\`  
**Status:** disabled by default; a prototype integration endpoint, not a multi-tenant production service.

## Endpoint

\`POST /api/industrial/optimize\`

### Server-side configuration

Set the secret \`QUANTUM_INDUSTRIAL_API_TOKEN\` (at least 32 high-entropy characters) only in the hosting provider's **server environment**. Never check the value into Git, put it in a \`VITE_*\` setting, email it, or expose it to a browser. The service returns HTTP 503 until configured.

Every authorized call must send:

- \`Authorization: Bearer <server-issued-token>\`
- \`Content-Type: application/json\`

The endpoint disallows cross-origin wildcard CORS, does not store customer jobs, and returns \`Cache-Control: no-store\`.

### Request example

\`\`\`json
{
  "graph": {
    "name": "Internal engineering pilot",
    "nodes": ["Group A", "Group B", "Group C"],
    "edges": [
      {"source": 0, "target": 1, "weight": 3},
      {"source": 1, "target": 2, "weight": 2},
      {"source": 0, "target": 2, "weight": 1}
    ]
  },
  "shots": 128,
  "seed": 17
}
\`\`\`

The response includes \`schema\`, \`inputSha256\`, \`result\` (full weighted MaxCut analytical and sampled results), and an \`X-MQ-Input-SHA256\` response header. The digest is over the canonical, validated graph JSON, not raw request text.

### Resource contract

- 2–12 decision variables (logical qubits), 1–66 positive weighted undirected edges.
- Weights must be finite, >0 and <=1000; duplicate/self edges rejected.
- API shots: 128–2048; seed: 32-bit unsigned integer.
- Request payload: at most 32 KiB.
- Pure computation of a deterministic p=1 QAOA numerical statevector on conventional hardware, with an exact classical baseline.
- No physical quantum processor, quantum advantage, guaranteed uptime, job queue or sustained throughput SLA.

### Responses

| Status | Meaning |
|---|---|
| 200 | Successful bounded optimization with evidence |
| 400 | Invalid graph, malformed JSON or unsupported model |
| 401 | Authorization missing or invalid |
| 405 | Only POST is supported |
| 413 | Request exceeds size budget |
| 415 | Content type is not JSON |
| 422 | Invalid seed/shot workload budget |
| 503 | No server-side API credential configured |

### Sample client request

Use an HTTPS client on an authorized server, not a browser with a reusable master token:

\`\`\`bash
curl --fail-with-body -X POST "https://your-approved-domain.example/api/industrial/optimize" \
  -H "Authorization: Bearer $QUANTUM_INDUSTRIAL_TOKEN" \
  -H "Content-Type: application/json" \
  --data @graph-request.json
\`\`\`

Store and rotate the token using a secret manager. **Do not print it into CI logs, request traces or analytics.**

### Commercial prerequisites

This v1 endpoint uses a single shared environment token. It is intended for *one controlled pilot* and must **not** be sold as a secure multi-tenant API without implementing independent organization identities, per-tenant keys, revocation, request rate limits, durable quotas, billing, entitlement checks, incident response, audit retention, and contractual SLAs. Commercial hosting eligibility must also be confirmed. Its computations are not suitable as direct control signals for safety-critical equipment.
