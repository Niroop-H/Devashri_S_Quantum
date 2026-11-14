# MAH Quantum — 1000+ Qubit Research Console

**Scientific operator guide · Research-console UI v2 · Controlled evaluation**

The 1000+ Qubit workspace is a classical simulator for mathematically tractable quantum circuits, not a physical quantum computer or a universal unrestricted 4,096-qubit statevector engine.

## Workspace regions

1. Research library: reference experiments, named snapshots, recent job metadata, local-data disclosures.
2. Circuit studio: QASM source editor, line numbers and direct line navigation, backend preflight, gate/active-qubit/depth diagnostics, activity heatmap, and execution event log.
3. Scientific inspector: sampled outcome histogram, theoretical support information for stabilizer circuits, per-classical-bit sampled frequencies, execution provenance, and downloadable machine-readable evidence.

The layout supports wide research monitors, tablet widths and 390px mobile viewports. An editor focus mode hides the library and inspector for prolonged code editing. It never changes the numerical circuit.

## Reproducible scientific workflow

1. Choose the GHZ, graph-state, Hadamard or separable-rotation reference circuit, or import a .qasm/.txt file. Input is parsed as a strict bounded OpenQASM subset; arbitrary loops/functions are unavailable.
2. Set the quantum register width in source, requested shots, and deterministic sampling seed. Changing the template-width selector rebuilds a reference circuit; for custom widths use the QASM declaration itself.
3. Observe scientific preflight, including backend selected, expanded operations, active qubits, multi-qubit gate count, and a greedy logical-depth estimate. The depth estimate is not a hardware schedule or device calibration.
4. Run in the dedicated cancellable browser worker. The status log reports actual parsing/planning/computing stages, not fabricated percentages. Hard stop: 120 seconds.
5. Inspect sampled counts and bit-marginal frequencies. The sample Shannon entropy measures sampled output diversity only, not entanglement entropy.
6. Download the full reproducible experiment JSON, which contains the QASM source, SHA-256 source fingerprint when available, exact backend type, qubits, seed, shots, ideal-probability information and measured counts.
7. Save the named experiment to this browser only. A bounded draft is also autosaved; the latest 24 job metadata entries are retained locally. Full measurement distributions are not persisted to history. Export each important result after the run.

## Keyboard and file controls

- Ctrl/Command + Enter while editing QASM: run the validated circuit.
- Ctrl/Command + S while editing QASM: save/update named browser snapshot.
- Tab while editing: insert two spaces.
- Jump to line: enter a 1-based line number and choose Go.
- Focus editor: toggle the wide code-only layout.
- Import QASM / Export QASM: local files, no cloud sync.

## Mathematical capability and limitations

| Representation | Supported family | Boundary |
|---|---|---|
| Clifford stabilizer tableau | H, S, Pauli, CX, CZ, SWAP and measurement | Joint ideal Z-basis distribution; no full 2^n statevector |
| Separable vectors | Supported one-qubit gates and SWAP | No general entangled non-Clifford state |
| Bounded independent dense components | Independent small non-Clifford entangled subcircuits | Up to 18 qubits per entangled connected component; total 2^20 component amplitudes |

The workspace accepts 1,000 through 4,096 logical qubits, at most 8,192 expanded operations and 1,024 measurement shots per run. The 100-qubit Studio hosts smaller widths. Arbitrary non-Clifford entangled large circuits, calibrated noise, mid-circuit control, error correction and physical gate fidelity are outside the current scope.

Theoretical probability annotations arise from the selected mathematical representation, while plotted count frequencies are finite-shot estimates. For Clifford states with enormous support, 2^-k is displayed symbolically to avoid floating-point underflow.

## Long-session safety and privacy

- A local browser draft is not a secure account; localStorage can be cleared by browser policy, private-browsing cleanup and device failure.
- Named snapshots are bounded to 10 entries, retained history to 24 metadata records, and locally persisted source to 140,000 characters. The parser supports up to 750,000 characters. Export QASM if the local snapshot limit is exceeded.
- Browser storage is not encrypted or tenant-isolated. Never copy confidential customer models into a shared or unapproved endpoint.
- The browser-only access-code gate is not enforceable commercial authorization. Server-verifiable accounts, tenant separation, licensing and commercial hosting approval are prerequisites for paid production.
- Generated JS bundles are inspectable by end users. Do not ship secret numerical IP to browsers.

## Verification requirements

The release gate must continue to pass existing numerical, independent-reference, security, npm audit, Linux/Windows build and Chromium tests. The browser suite additionally verifies named experiment persistence, topology computed from QASM, QASM import/export, deterministic bit-frequency analysis, run history, responsive mobile execution, and rejection of unsupported circuits.

This is a research-grade interface for controlled technical evaluation. Full industrial qualification still requires a validated customer use case, protected production operations, external interoperability/performance benchmarking, independent security assessment and service-level acceptance criteria.
