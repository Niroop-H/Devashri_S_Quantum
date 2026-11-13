/** Public non-sensitive software availability and capability declaration. */
export default function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }
  return res.status(200).json({
    status: "ok",
    product: "MAH Quantum classical quantum-circuit simulator",
    capabilities: {
      denseStatevectorMaxLogicalQubits: 20,
      adaptiveStudioMaxLogicalQubits: 100,
      restrictedCircuitFamiliesMaxLogicalQubits: 4096,
      families: ["clifford-stabilizer", "separable-state", "bounded-partitioned-statevector"],
    },
    simulationApi: {
      enabled: Boolean(process.env.QUANTUM_SIMULATION_API_TOKEN?.length &&
        process.env.QUANTUM_SIMULATION_API_TOKEN.length >= 32),
      authenticated: true,
    },
    timestamp: new Date().toISOString(),
  });
}
