import React, { useState, useCallback } from "react";
import { Header } from "./components/Header";
import { Palette } from "./components/Palette";
import { CircuitGrid } from "./components/CircuitGrid";
import { ExecutionPanel } from "./components/ExecutionPanel";
import { GateType, CircuitStep, NoiseSettings, SimulationResult } from "./types";
import { runSimulation } from "./services/api";

export const App: React.FC = () => {
  // Circuit state
  const [qubits, setQubits] = useState<number>(3);
  const [steps, setSteps] = useState<CircuitStep[]>([]);
  const [selectedGate, setSelectedGate] = useState<GateType | null>("H");
  const [paramAngle, setParamAngle] = useState<number>(Math.PI / 2);

  // Execution state
  const [shots, setShots] = useState<number>(1024);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Noise model
  const [noiseSettings, setNoiseSettings] = useState<NoiseSettings>({
    enabled: false,
    t1: 50.0,
    t2: 70.0,
    gateTime: 0.02,
    readoutError: [0.015, 0.025],
    depolarizingRate: 0.001
  });
  const [showNoiseModal, setShowNoiseModal] = useState<boolean>(false);

  const handleAddStep = useCallback((step: CircuitStep) => {
    setSteps((prev) => [...prev, step]);
  }, []);

  const handleRemoveStep = useCallback((id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleReset = useCallback(() => {
    setSteps([]);
    setResult(null);
    setError(null);
  }, []);

  const handleQubitChange = useCallback((q: number) => {
    setQubits(q);
    // Remove steps referencing qubits that no longer exist
    setSteps((prev) =>
      prev.filter((s) => {
        const allQubits = [...s.targets, ...(s.controls ?? [])];
        return allQubits.every((idx) => idx < q);
      })
    );
    setResult(null);
  }, []);

  const handleRun = useCallback(async () => {
    if (steps.length === 0) {
      setError("Add at least one gate to the circuit before running.");
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      const res = await runSimulation(qubits, steps, shots, noiseSettings);
      setResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Simulation failed: ${msg}`);
    } finally {
      setIsRunning(false);
    }
  }, [qubits, steps, shots, noiseSettings]);

  return (
    <div className="flex flex-col h-screen w-screen bg-ibm-darker text-white overflow-hidden">
      <Header
        onRun={handleRun}
        onReset={handleReset}
        isRunning={isRunning}
        shots={shots}
        setShots={setShots}
        qubits={qubits}
        setQubits={handleQubitChange}
        toggleNoiseModal={() => setShowNoiseModal(!showNoiseModal)}
        noiseEnabled={noiseSettings.enabled}
      />

      {/* Error banner */}
      {error && (
        <div className="px-6 py-2 bg-red-950/40 border-b border-red-800 text-red-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-300 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden">
        <Palette
          selectedGate={selectedGate}
          onSelectGate={setSelectedGate}
          paramAngle={paramAngle}
          onParamAngleChange={setParamAngle}
        />
        <CircuitGrid
          qubits={qubits}
          steps={steps}
          selectedGate={selectedGate}
          paramAngle={paramAngle}
          onAddStep={handleAddStep}
          onRemoveStep={handleRemoveStep}
        />
      </div>

      {/* Results panel */}
      <ExecutionPanel result={result} shots={shots} isRunning={isRunning} />

      {/* Noise Configuration Modal */}
      {showNoiseModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setShowNoiseModal(false)}
        >
          <div
            className="bg-ibm-dark border border-ibm-gray p-6 rounded-xl w-[420px] space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              ⚙ Hardware Noise Configuration
            </h3>
            <p className="text-[10px] text-neutral-500">
              Simulate real quantum hardware decoherence, gate errors, and readout noise.
            </p>

            {/* Enable toggle */}
            <div className="flex items-center justify-between py-2 border-b border-ibm-gray">
              <span className="text-xs text-neutral-300 font-semibold">
                Enable QPU Noise Simulation
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={noiseSettings.enabled}
                  onChange={(e) =>
                    setNoiseSettings({ ...noiseSettings, enabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-ibm-blue" />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                  T1 Relaxation (μs)
                </label>
                <input
                  type="number"
                  value={noiseSettings.t1}
                  onChange={(e) =>
                    setNoiseSettings({
                      ...noiseSettings,
                      t1: parseFloat(e.target.value) || 1
                    })
                  }
                  className="w-full bg-ibm-darker border border-ibm-gray p-2 rounded text-xs text-white focus:border-ibm-blue focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                  T2 Dephasing (μs)
                </label>
                <input
                  type="number"
                  value={noiseSettings.t2}
                  onChange={(e) =>
                    setNoiseSettings({
                      ...noiseSettings,
                      t2: parseFloat(e.target.value) || 1
                    })
                  }
                  className="w-full bg-ibm-darker border border-ibm-gray p-2 rounded text-xs text-white focus:border-ibm-blue focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                  Gate Time (μs)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={noiseSettings.gateTime}
                  onChange={(e) =>
                    setNoiseSettings({
                      ...noiseSettings,
                      gateTime: parseFloat(e.target.value) || 0.001
                    })
                  }
                  className="w-full bg-ibm-darker border border-ibm-gray p-2 rounded text-xs text-white focus:border-ibm-blue focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                  Depolarizing Rate
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={noiseSettings.depolarizingRate}
                  onChange={(e) =>
                    setNoiseSettings({
                      ...noiseSettings,
                      depolarizingRate: parseFloat(e.target.value) || 0
                    })
                  }
                  className="w-full bg-ibm-darker border border-ibm-gray p-2 rounded text-xs text-white focus:border-ibm-blue focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                  Readout P(1|0)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={noiseSettings.readoutError[0]}
                  onChange={(e) =>
                    setNoiseSettings({
                      ...noiseSettings,
                      readoutError: [
                        parseFloat(e.target.value) || 0,
                        noiseSettings.readoutError[1]
                      ]
                    })
                  }
                  className="w-full bg-ibm-darker border border-ibm-gray p-2 rounded text-xs text-white focus:border-ibm-blue focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 uppercase tracking-wider">
                  Readout P(0|1)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={noiseSettings.readoutError[1]}
                  onChange={(e) =>
                    setNoiseSettings({
                      ...noiseSettings,
                      readoutError: [
                        noiseSettings.readoutError[0],
                        parseFloat(e.target.value) || 0
                      ]
                    })
                  }
                  className="w-full bg-ibm-darker border border-ibm-gray p-2 rounded text-xs text-white focus:border-ibm-blue focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={() => setShowNoiseModal(false)}
              className="w-full bg-ibm-blue hover:bg-ibm-blueHover py-2.5 rounded text-xs font-semibold text-white transition mt-2"
            >
              Apply & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
