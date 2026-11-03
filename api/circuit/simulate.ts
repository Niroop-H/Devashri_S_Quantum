import { ExecutionRequestSchema, ExecutionResponse } from "../../apps/engine/src/types/circuit";
import { QuantumCircuit } from "../../apps/engine/src/simulator/QuantumCircuit";
import { NoiseEngine } from "../../apps/engine/src/simulator/NoiseEngine";
import { Sampler } from "../../apps/engine/src/simulator/Sampler";

export default function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  const startTime = performance.now();
  const parseResult = ExecutionRequestSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid circuit payload",
      details: parseResult.error.format()
    });
    return;
  }

  const { qubits, steps, shots, noiseModel } = parseResult.data;

  try {
    const circuit = new QuantumCircuit(qubits);

    for (const step of steps) {
      circuit.applyStep(step);

      if (noiseModel?.enabled) {
        const activeQubits = [
          ...step.targets,
          ...(step.controls ?? [])
        ];
        NoiseEngine.applyStepNoise(circuit, activeQubits, noiseModel);
      }
    }

    const probs = circuit.getProbabilities();
    const { counts, measuredProbs } = Sampler.sample(
      probs,
      qubits,
      shots,
      noiseModel
    );

    const stateVector: ExecutionResponse["stateVector"] = [];
    for (let i = 0; i < circuit.stateSize; i++) {
      const r = circuit.real[i];
      const im = circuit.imag[i];
      const mag = Math.sqrt(r * r + im * im);
      if (mag > 0.0001) {
        stateVector.push({
          state: `|${i.toString(2).padStart(qubits, "0")}>`,
          real: parseFloat(r.toFixed(6)),
          imag: parseFloat(im.toFixed(6)),
          magnitude: parseFloat(mag.toFixed(6)),
          phase: parseFloat(Math.atan2(im, r).toFixed(6))
        });
      }
    }

    const endTime = performance.now();

    const response: ExecutionResponse = {
      counts,
      probabilities: measuredProbs,
      stateVector,
      executionTimeMs: parseFloat((endTime - startTime).toFixed(2)),
      backendInfo: {
        qpuSimulated: noiseModel?.enabled
          ? "IBM_Eagle_r3_Noisy_Emulator (Vercel)"
          : "Ideal_Statevector_Engine (Vercel)",
        qubitCount: qubits,
        shots,
        fidelityEstimated: noiseModel?.enabled
          ? parseFloat(Math.max(0.75, 1.0 - steps.length * 0.005).toFixed(4))
          : 1.0
      }
    };

    res.status(200).json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown simulation error";
    res.status(500).json({ error: "Quantum simulation error", message });
  }
}
