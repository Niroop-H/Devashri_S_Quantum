import { z } from "zod";

export const GateTypeSchema = z.enum([
  "I", "H", "X", "Y", "Z", "S", "T",
  "RX", "RY", "RZ", "U",
  "CX", "CZ", "SWAP", "CCX",
  "BARRIER", "MEASURE"
]);

export type GateType = z.infer<typeof GateTypeSchema>;

export const CircuitStepSchema = z.object({
  id: z.string(),
  gate: GateTypeSchema,
  targets: z.array(z.number().int().min(0)).min(1),
  controls: z.array(z.number().int().min(0)).optional().default([]),
  params: z.record(z.string(), z.number()).optional().default({})
});

export interface CircuitStep {
  id: string;
  gate: GateType;
  targets: number[];
  controls?: number[];
  params?: Record<string, number>;
}

export const NoiseConfigSchema = z.object({
  enabled: z.boolean().default(false),
  t1: z.number().positive().default(50.0),
  t2: z.number().positive().default(70.0),
  gateTime: z.number().positive().default(0.02),
  readoutError: z.tuple([z.number(), z.number()]).default([0.015, 0.025]),
  depolarizingRate: z.number().min(0).max(1).default(0.001)
});

export type NoiseConfig = z.infer<typeof NoiseConfigSchema>;

export const ExecutionRequestSchema = z.object({
  qubits: z.number().int().min(1).max(16),
  shots: z.number().int().min(1).max(100000).default(1024),
  steps: z.array(CircuitStepSchema),
  noiseModel: NoiseConfigSchema.optional()
});

export type ExecutionRequest = z.infer<typeof ExecutionRequestSchema>;

export interface ExecutionResponse {
  counts: Record<string, number>;
  probabilities: Record<string, number>;
  stateVector: {
    real: number;
    imag: number;
    state: string;
    magnitude: number;
    phase: number;
  }[];
  executionTimeMs: number;
  backendInfo: {
    qpuSimulated: string;
    qubitCount: number;
    shots: number;
    fidelityEstimated: number;
  };
}
