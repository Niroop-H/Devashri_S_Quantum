import React, { useState, useCallback, useEffect, useRef } from "react";
import { QuantumScene } from "./components/QuantumScene";
import { ArrowUpRight, Layers3 } from "lucide-react";
import { Header } from "./components/Header";
import { Palette } from "./components/Palette";
import { CircuitGrid } from "./components/CircuitGrid";
import { ExecutionPanel } from "./components/ExecutionPanel";
import {
  GateType,
  CircuitStep,
  NoiseSettings,
  SimulationResult,
} from "./types";
import { runSimulation } from "./services/api";

export const App: React.FC = () => {
  const [motion, setMotion] = useState(true);
  const noiseDialog = useRef<HTMLDialogElement>(null);
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
    depolarizingRate: 0.001,
  });
  const [showNoiseModal, setShowNoiseModal] = useState<boolean>(false);

  useEffect(() => {
    if (showNoiseModal) noiseDialog.current?.showModal();
    else noiseDialog.current?.close();
  }, [showNoiseModal]);

  const loadPreset = (preset: "bell" | "ghz") => {
    if (isRunning) return;
    setQubits(preset === "bell" ? 2 : 3);
    setSteps([
      { id: "preset-h", gate: "H", targets: [0] },
      { id: "preset-cx-1", gate: "CX", targets: [1], controls: [0] },
      ...(preset === "ghz"
        ? [
            {
              id: "preset-cx-2",
              gate: "CX" as GateType,
              targets: [2],
              controls: [1],
            },
          ]
        : []),
    ]);
    setResult(null);
    setError(null);
  };

  const handleAddStep = useCallback((step: CircuitStep) => {
    setSteps((prev) => (prev.length < 16 ? [...prev, step] : prev));
    setResult(null);
  }, []);

  const handleRemoveStep = useCallback((id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
    setResult(null);
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
      }),
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
    <div id="top" className={`studio-app ${motion ? "" : "motion-paused"}`}>
      <a href="#workspace" className="skip-link">
        Skip to circuit composer
      </a>
      <Header
        onRun={handleRun}
        onReset={handleReset}
        isRunning={isRunning}
        shots={shots}
        setShots={(s) => {
          setShots(s);
          setResult(null);
        }}
        qubits={qubits}
        setQubits={handleQubitChange}
        toggleNoiseModal={() => setShowNoiseModal(!showNoiseModal)}
        noiseEnabled={noiseSettings.enabled}
      />

      <main className="studio-main">
        <QuantumScene
          qubits={qubits}
          gateCount={steps.length}
          isRunning={isRunning}
          motion={motion}
          onToggleMotion={() => setMotion(!motion)}
        />
        <section
          id="workspace"
          className="workspace-section"
          aria-labelledby="workspace-title"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">01 / BUILD & EXPERIMENT</p>
              <h2 id="workspace-title">
                Quantum composer<span className="section-dot">.</span>
              </h2>
            </div>
            <div className="preset-actions">
              <span>Start with a circuit</span>
              <button disabled={isRunning} onClick={() => loadPreset("bell")}>
                Bell state <ArrowUpRight size={13} />
              </button>
              <button disabled={isRunning} onClick={() => loadPreset("ghz")}>
                GHZ state <ArrowUpRight size={13} />
              </button>
            </div>
          </div>
          {/* Error banner */}
          {error && (
            <div
              role="alert"
              className="px-6 py-2 bg-red-950/40 border-b border-red-800 text-red-400 text-xs flex items-center justify-between"
            >
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
          <div className="composer-shell" aria-busy={isRunning}>
            <fieldset className="composer-layout" disabled={isRunning}>
              <Palette
                selectedGate={selectedGate}
                onSelectGate={setSelectedGate}
                paramAngle={paramAngle}
                onParamAngleChange={setParamAngle}
              />
              <div className="circuit-area">
                <div className="circuit-toolbar">
                  <span>
                    <Layers3 size={14} /> Circuit canvas
                  </span>
                  <span>
                    {steps.length} / 16 gates <i /> {qubits} qubits
                  </span>
                </div>
                <CircuitGrid
                  qubits={qubits}
                  steps={steps}
                  selectedGate={selectedGate}
                  paramAngle={paramAngle}
                  onAddStep={handleAddStep}
                  onRemoveStep={handleRemoveStep}
                />
                <div className="circuit-hint">
                  <span>
                    <span className="status-dot" />{" "}
                    {selectedGate
                      ? `${selectedGate} selected`
                      : "Select a gate"}
                  </span>
                  <span>
                    {steps.length >= 16
                      ? "Circuit full · remove a gate to continue"
                      : "Choose a gate, then click a wire to append it"}
                  </span>
                </div>
              </div>
            </fieldset>
          </div>
        </section>

        <section className="results-section" aria-labelledby="results-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">02 / OBSERVE & UNDERSTAND</p>
              <h2 id="results-title">
                Measurement results<span className="section-dot">.</span>
              </h2>
            </div>
            <span className="results-label">
              {isRunning
                ? "COMPUTING"
                : result
                  ? "EXECUTION COMPLETE"
                  : "AWAITING EXECUTION"}
            </span>
          </div>
          {/* Results panel */}
          <ExecutionPanel result={result} shots={shots} isRunning={isRunning} />
        </section>
        <footer className="studio-footer">
          <span>
            MAH QUANTUM™ <span className="footer-divider">/</span> Developed by
            Devashri S Quantum
          </span>
          <span>Classical simulation. Quantum possibilities.</span>
        </footer>
      </main>

      {/* Noise Configuration Modal */}
      <dialog
        ref={noiseDialog}
        className="noise-dialog"
        aria-labelledby="noise-title"
        onCancel={() => setShowNoiseModal(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setShowNoiseModal(false);
        }}
      >
        <div
          className="noise-dialog-content p-6 space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h3
            id="noise-title"
            className="text-sm font-bold uppercase tracking-wider text-white"
          >
            ⚙ Hardware Noise Configuration
          </h3>
          <p className="text-[10px] text-neutral-500">
            Simulate real quantum hardware decoherence, gate errors, and readout
            noise.
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
                  setNoiseSettings({
                    ...noiseSettings,
                    enabled: e.target.checked,
                  })
                }
                aria-label="Enable QPU noise simulation"
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-ibm-blue" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="noise-t1"
                className="text-[10px] text-neutral-400 uppercase tracking-wider"
              >
                T1 Relaxation (μs)
              </label>
              <input
                id="noise-t1"
                type="number"
                value={noiseSettings.t1}
                onChange={(e) =>
                  setNoiseSettings({
                    ...noiseSettings,
                    t1: parseFloat(e.target.value) || 1,
                  })
                }
                className="w-full bg-ibm-darker border border-ibm-gray p-2 rounded text-xs text-white focus:border-ibm-blue focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="noise-t2"
                className="text-[10px] text-neutral-400 uppercase tracking-wider"
              >
                T2 Dephasing (μs)
              </label>
              <input
                id="noise-t2"
                type="number"
                value={noiseSettings.t2}
                onChange={(e) =>
                  setNoiseSettings({
                    ...noiseSettings,
                    t2: parseFloat(e.target.value) || 1,
                  })
                }
                className="w-full bg-ibm-darker border border-ibm-gray p-2 rounded text-xs text-white focus:border-ibm-blue focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="noise-gate-time"
                className="text-[10px] text-neutral-400 uppercase tracking-wider"
              >
                Gate Time (μs)
              </label>
              <input
                id="noise-gate-time"
                type="number"
                step="0.001"
                value={noiseSettings.gateTime}
                onChange={(e) =>
                  setNoiseSettings({
                    ...noiseSettings,
                    gateTime: parseFloat(e.target.value) || 0.001,
                  })
                }
                className="w-full bg-ibm-darker border border-ibm-gray p-2 rounded text-xs text-white focus:border-ibm-blue focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="noise-depolarizing"
                className="text-[10px] text-neutral-400 uppercase tracking-wider"
              >
                Depolarizing Rate
              </label>
              <input
                id="noise-depolarizing"
                type="number"
                step="0.0001"
                value={noiseSettings.depolarizingRate}
                onChange={(e) =>
                  setNoiseSettings({
                    ...noiseSettings,
                    depolarizingRate: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full bg-ibm-darker border border-ibm-gray p-2 rounded text-xs text-white focus:border-ibm-blue focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="noise-readout-zero"
                className="text-[10px] text-neutral-400 uppercase tracking-wider"
              >
                Readout P(1|0)
              </label>
              <input
                id="noise-readout-zero"
                type="number"
                step="0.001"
                value={noiseSettings.readoutError[0]}
                onChange={(e) =>
                  setNoiseSettings({
                    ...noiseSettings,
                    readoutError: [
                      parseFloat(e.target.value) || 0,
                      noiseSettings.readoutError[1],
                    ],
                  })
                }
                className="w-full bg-ibm-darker border border-ibm-gray p-2 rounded text-xs text-white focus:border-ibm-blue focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="noise-readout-one"
                className="text-[10px] text-neutral-400 uppercase tracking-wider"
              >
                Readout P(0|1)
              </label>
              <input
                id="noise-readout-one"
                type="number"
                step="0.001"
                value={noiseSettings.readoutError[1]}
                onChange={(e) =>
                  setNoiseSettings({
                    ...noiseSettings,
                    readoutError: [
                      noiseSettings.readoutError[0],
                      parseFloat(e.target.value) || 0,
                    ],
                  })
                }
                className="w-full bg-ibm-darker border border-ibm-gray p-2 rounded text-xs text-white focus:border-ibm-blue focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={() => {
              setShowNoiseModal(false);
              setResult(null);
            }}
            className="w-full bg-ibm-blue hover:bg-ibm-blueHover py-2.5 rounded text-xs font-semibold text-white transition mt-2"
          >
            Apply & Close
          </button>
        </div>
      </dialog>
    </div>
  );
};
