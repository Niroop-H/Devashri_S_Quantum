# MAH Quantum — Industrial Optimization Workbench
**Engineering qualification note / controlled external evaluation**

## 1. What is implemented

This workbench makes MAH Quantum useful for a precisely defined optimization use case rather than merely displaying a qubit count. It evaluates **weighted graph bipartitioning (MaxCut)** from a user-supplied JSON graph and performs:

1. Exact ideal **QAOA p=1** statevector evolution, with a bounded deterministic parameter search.
2. Exact **classical global optimum** computed independently by exhaustive enumeration.
3. Deterministic classical single-bit-flip heuristic and analytic random-assignment baseline.
4. Sampled candidate assignments, complete shot histogram, objective-value comparison, and statistical summary.
5. Export of complete versioned JSON evidence with SHA-256 fingerprint of canonical input, random seed, circuit method, parameter evaluations, numerical results, and limitations.
6. Cancellable local browser computation with hard execution timeout and strict graph validation.
7. Local bounded CSV edge-list import and CSV export (`source,target,weight`) for interoperability, including escaped/quoted labels and rejection of spreadsheet formula-like labels.

These results are **classical simulations of quantum algorithms**, not results from a physical quantum processor.

## 2. Mathematical contract

Given an undirected weighted graph G = (V,E) with positive weights w_uv, represent a bipartition by binary variables x_i in {0,1}:

C(x) = sum_{(u,v) in E} w_uv * (x_u XOR x_v).

The objective is **maximize C(x)**. The exact reference optimum is computed over all 2^n bitstrings with no unspecified heuristic assumptions.

For QAOA p=1:

|psi(gamma,beta)> = exp(-i beta sum_j X_j) exp(-i gamma C) |+>^n,

where gamma and beta are chosen by a **bounded finite parameter search**, not a guaranteed global variational optimum. The cost unitary is diagonal in the measurement basis; the mixing unitary uses the same independently tested RX gate routine used by the quantum simulation engine.

The application reports:
- Exact QAOA expected objective for the selected variational parameters.
- Best sampled feasible partition and its objective.
- Probability of obtaining a classically optimal partition.
- Exact classical optimum and degeneracy.
- Classical greedy benchmark and uniform random expected score.
- Approximate 95% interval of the sampled mean (not of the exact expectation).
- Complete measured counts that sum exactly to the requested number of shots.
- Required FP64 statevector memory, algorithm configuration and run timing.

**No quantum computational advantage is asserted.** At 12 variables or fewer, a classical exhaustive method is inexpensive and is the correct independent benchmark.

## 3. Input limits

| Input/feature | Supported bound |
|---|---|
| Decision variables / qubits | 2–12 |
| Weighted undirected edges | 1–66, no duplicates or self-edges |
| Positive edge weight | 0 < weight <= 1000 |
| Shots | 128–4096 |
| Deterministic seed | unsigned 32-bit integer |
| QAOA layers | 1 |
| Algorithm parameters | finite deterministic sweep and two refinements |
| Raw statevector memory | max 64 KiB at 12 qubits |
| Long-running work | 90-second client-side cancellation timeout |
| Graph input | JSON with name, labeled nodes, source/target/weight edges |

The interface includes three **synthetic examples**:
- Manufacturing interference separation.
- Energy network segmentation.
- Compute-job conflict separation.

Examples do **not** represent real factory, dispatch, grid reliability, capacity, routing, or safety constraints. Real industrial input needs correct problem formulation, all hard constraints, financial/safety definitions, and validation by the customer's domain experts.

## 4. Customer evaluation procedure

1. Select a synthetic example and run the experiment.
2. Confirm the global optimum, QAOA expected score, best sampled score, and classical greedy baseline are present.
3. Replace the example with a **customer-defined** undirected weighted conflict/interaction graph. Paste JSON or import a bounded `source,target,weight` CSV edge list. Document the weight's unit and exactly which industry objective it represents.
4. Roundtrip the imported graph to CSV and check all node labels, edge weights, and the graph objective mapping. Run the same model multiple times with the same seed; outcomes must agree. Change the seed and observe variations in samples while exact expectations remain unchanged.
5. Export the evidence JSON, recompute SHA-256 over JSON.stringify(result.graph), reconcile every outcome's shots to completedShots, and reproduce the score of each returned assignment from the graph.
6. Independently validate objective mapping and external constraints. Treat the result only as a **candidate** for any industrial decision.

## 5. Existing quantum computation workspaces

- **Quantum Computing Studio:** up to 100 logical qubits, with 20-qubit dense statevector and larger exact Clifford, separable, or bounded independent entanglement backends.
- **1000+ Qubit:** 1,000–4,096 logical qubits for *specified* mathematically tractable circuit families, not a universal high-qubit gate simulator.
- **Industrial Optimization:** genuine 2–12-qubit variational quantum algorithm evaluation, classical optimum comparison, reproducible reports.

These figures refer to **logical qubits simulated on classical hardware**, not fabricated or error-corrected physical qubits. Performance in a CI runner does not constitute an industrial workstation or browser service-level guarantee.

## 6. Information security and operating requirements

The main workbench runs in a local Web Worker; submitted graph data need not be sent to a server for these computations. Operators should still **not paste confidential enterprise data** into a general website before the employer has approved the site's privacy/security controls.

The optional server simulation API is disabled by default and requires a server-only token when explicitly enabled. Do not place credentials in browser bundles or VITE_* variables.

**Not production-qualified as a multi-tenant paid SaaS yet:**
- Existing workspace access codes are enforced using **client localStorage** and can be bypassed. They are a convenience gate, not a commercial authentication or authorization system.
- The project source was publicly visible during the pre-release audit. Browser-shipped numerical algorithms are inspectable.
- Commercial hosting requires a provider/plan that permits commercial workloads.
- Formal tenant identity, RBAC, billing, contractual SLAs, rate limits, independent penetration test, backup/incident response, data-retention controls, and regulatory certifications have **not** been demonstrated.
- Browser timeouts are per local worker only, not cloud resource quotas or service uptime guarantees.

Do not claim "industry certified", "industrial safety approved", "quantum superiority", or "1000-qubit universal computation" without the respective evidence.

## 7. Market positioning and roadmap

**Sell the evaluated capability:** reproducible quantum algorithm experimentation with exact classical references, transparent numerical limits, and inspectable engineering reports. Target research engineering teams and industrial quantum-algorithm R&D evaluations—not generic student training.

A paid offering would need the following before contract execution:
1. Authenticated, private, tenant-isolated projects and durable entitlements with server-side enforcement.
2. Legal/licensing and commercial hosting approval.
3. Validated QUBO/constraint model adapters for selected concrete industries; no unsupported "general-purpose industrial optimizer" claim.
4. Headless/batch API for customer pipelines with quotas and job status.
5. Published performance/memory benchmark comparisons against mature external reference simulators under matching conditions.
6. SOC-aligned security program, system monitoring, SLA/incident response and recovery procedures.

**Current release recommendation:** technical evaluation / controlled pilot prototype. Commercial launch remains conditional on the unresolved operating and security controls.
