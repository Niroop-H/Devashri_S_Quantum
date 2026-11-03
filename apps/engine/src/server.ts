import express, { Request, Response } from "express";
import cors from "cors";
import { ExecutionRequestSchema, ExecutionResponse } from "./types/circuit";
import { QuantumCircuit } from "./simulator/QuantumCircuit";
import { NoiseEngine } from "./simulator/NoiseEngine";
import { Sampler } from "./simulator/Sampler";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    engine: "Q-Sim Classical Statevector Engine v1.0",
    maxQubits: 16,
    timestamp: new Date().toISOString()
  });
});

// Circuit simulation endpoint
app.post("/api/circuit/simulate", (req: Request, res: Response) => {
  const startTime = performance.now();

  // Validate request payload with Zod schema
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
    // Initialize quantum state |00...0⟩
    const circuit = new QuantumCircuit(qubits);

    // Execute circuit steps sequentially
    for (const step of steps) {
      circuit.applyStep(step);

      // Apply per-gate noise if hardware noise model is enabled
      if (noiseModel?.enabled) {
        const activeQubits = [
          ...step.targets,
          ...(step.controls ?? [])
        ];
        NoiseEngine.applyStepNoise(circuit, activeQubits, noiseModel);
      }
    }

    // Compute exact probabilities from final state vector
    const probs = circuit.getProbabilities();

    // Sample measurement outcomes
    const { counts, measuredProbs } = Sampler.sample(
      probs,
      qubits,
      shots,
      noiseModel
    );

    // Extract significant state-vector components for telemetry
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
          ? "IBM_Eagle_r3_Noisy_Emulator"
          : "Ideal_Statevector_Engine",
        qubitCount: qubits,
        shots,
        fidelityEstimated: noiseModel?.enabled
          ? parseFloat(Math.max(0.75, 1.0 - steps.length * 0.005).toFixed(4))
          : 1.0
      }
    };

    res.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown simulation error";
    res.status(500).json({
      error: "Quantum simulation error",
      message
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n  ⚛️  Q-Sim Classical QPU Engine`);
  console.log(`  ─────────────────────────────`);
  console.log(`  Status  : Online`);
  console.log(`  Port    : ${PORT}`);
  console.log(`  Qubits  : 1–16 (statevector formalism)`);
  console.log(`  Noise   : T1/T2 relaxation, depolarizing, SPAM\n`);
});
