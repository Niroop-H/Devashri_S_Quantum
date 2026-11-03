import React from "react";
import { CircuitStep, GateType, GATE_CATALOG } from "../types";
import { Trash2 } from "lucide-react";

interface CircuitGridProps {
  qubits: number;
  steps: CircuitStep[];
  selectedGate: GateType | null;
  paramAngle: number;
  onAddStep: (step: CircuitStep) => void;
  onRemoveStep: (id: string) => void;
}

const COLUMNS = 16;

/**
 * Maps circuit steps into a 2D grid: stepGridMap[col] = CircuitStep.
 * Each step occupies the next available column.
 */
function buildStepColumns(steps: CircuitStep[]): (CircuitStep | null)[] {
  const columns: (CircuitStep | null)[] = new Array(COLUMNS).fill(null);
  steps.forEach((step, idx) => {
    if (idx < COLUMNS) {
      columns[idx] = step;
    }
  });
  return columns;
}

/** Returns gate display label color based on type */
function gateColor(gate: GateType): string {
  const info = GATE_CATALOG.find((g) => g.type === gate);
  switch (info?.category) {
    case "Superposition":
      return "border-sky-500 bg-sky-950/60 text-sky-300";
    case "Clifford":
      return "border-violet-500 bg-violet-950/60 text-violet-300";
    case "Phase":
      return "border-emerald-500 bg-emerald-950/60 text-emerald-300";
    case "Parametric":
      return "border-orange-500 bg-orange-950/60 text-orange-300";
    case "Entanglement":
      return "border-rose-500 bg-rose-950/60 text-rose-300";
    case "Multi-Qubit":
      return "border-pink-500 bg-pink-950/60 text-pink-300";
    case "Operations":
      return "border-neutral-500 bg-neutral-800 text-neutral-300";
    default:
      return "border-ibm-blue bg-ibm-gray text-white";
  }
}

export const CircuitGrid: React.FC<CircuitGridProps> = ({
  qubits,
  steps,
  selectedGate,
  paramAngle,
  onAddStep,
  onRemoveStep,
}) => {
  const columns = buildStepColumns(steps);

  const handleCellClick = (qubit: number, col: number) => {
    if (!selectedGate || steps.length >= COLUMNS) return;
    if (selectedGate === "CCX" && qubits < 3) return;
    if (columns[col] !== null) return; // already occupied

    const id = `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const info = GATE_CATALOG.find((g) => g.type === selectedGate);

    if (info?.isMultiQubit) {
      // Multi-qubit gates: auto-assign controls/targets
      if (selectedGate === "CX") {
        const control = qubit === 0 ? 1 : qubit - 1;
        onAddStep({ id, gate: "CX", targets: [qubit], controls: [control] });
      } else if (selectedGate === "CZ") {
        const control = qubit === 0 ? 1 : qubit - 1;
        onAddStep({ id, gate: "CZ", targets: [qubit], controls: [control] });
      } else if (selectedGate === "SWAP") {
        const other = qubit === 0 ? 1 : qubit - 1;
        onAddStep({ id, gate: "SWAP", targets: [qubit, other] });
      } else if (selectedGate === "CCX") {
        const [c1, c2] = Array.from({ length: qubits }, (_, i) => i).filter(
          (i) => i !== qubit,
        );
        onAddStep({ id, gate: "CCX", targets: [qubit], controls: [c1, c2] });
      }
    } else if (info?.isParametric) {
      onAddStep({
        id,
        gate: selectedGate,
        targets: [qubit],
        params: { theta: paramAngle, lambda: paramAngle },
      });
    } else {
      onAddStep({ id, gate: selectedGate, targets: [qubit] });
    }
  };

  return (
    <div className="circuit-grid flex-1 p-4 overflow-auto">
      <div className="min-w-[900px]">
        {Array.from({ length: qubits }).map((_, qIndex) => (
          <div key={qIndex} className="relative flex items-center h-12 mb-1">
            {/* Qubit label */}
            <div className="w-20 shrink-0 flex items-center space-x-1 font-mono text-xs pr-2">
              <span className="font-bold text-white">q[{qIndex}]</span>
              <span className="text-neutral-500">|0⟩</span>
            </div>

            {/* Wire */}
            <div className="absolute left-20 right-2 top-1/2 h-[1px] bg-neutral-700/60 pointer-events-none" />

            {/* Gate slots */}
            <div className="flex-1 flex gap-1">
              {columns.map((step, col) => {
                const isThisQubitTarget = step?.targets.includes(qIndex);
                const isThisQubitControl = step?.controls?.includes(qIndex);
                const involvedInStep = isThisQubitTarget || isThisQubitControl;

                // Check if a multi-qubit gate spans through this qubit
                const showConnector =
                  step &&
                  step.targets &&
                  step.controls &&
                  step.controls.length > 0 &&
                  !involvedInStep &&
                  (() => {
                    const allQubits = [
                      ...step.targets,
                      ...(step.controls ?? []),
                    ];
                    const minQ = Math.min(...allQubits);
                    const maxQ = Math.max(...allQubits);
                    return qIndex > minQ && qIndex < maxQ;
                  })();

                return (
                  <div
                    key={col}
                    role={step ? "group" : "button"}
                    tabIndex={
                      step || (selectedGate === "CCX" && qubits < 3) ? -1 : 0
                    }
                    aria-label={`Append ${selectedGate ?? "gate"} to qubit ${qIndex}, slot ${col + 1}`}
                    aria-disabled={
                      !step && selectedGate === "CCX" && qubits < 3
                        ? true
                        : undefined
                    }
                    onKeyDown={(e) => {
                      if (
                        e.target === e.currentTarget &&
                        (e.key === "Enter" || e.key === " ")
                      ) {
                        e.preventDefault();
                        handleCellClick(qIndex, col);
                      }
                    }}
                    onClick={() => handleCellClick(qIndex, col)}
                    className={`relative z-10 w-10 h-10 rounded flex items-center justify-center transition-all cursor-pointer ${
                      step
                        ? involvedInStep || showConnector
                          ? ""
                          : "border border-transparent"
                        : "border border-neutral-800/50 hover:border-ibm-blue/40 hover:bg-ibm-blue/5"
                    }`}
                  >
                    {/* Control dot */}
                    {isThisQubitControl && (
                      <div className="w-3 h-3 bg-white rounded-full shadow-md shadow-white/20" />
                    )}

                    {/* Gate box */}
                    {isThisQubitTarget && step && (
                      <div className="relative group">
                        <div
                          className={`w-9 h-9 rounded border flex items-center justify-center font-mono font-bold text-[11px] shadow-sm ${gateColor(step.gate)}`}
                        >
                          {step.gate === "CX"
                            ? "⊕"
                            : step.gate === "MEASURE"
                              ? "M"
                              : step.gate}
                        </div>
                        {/* Delete button */}
                        <button
                          aria-label={`Remove ${step.gate} gate from qubit ${qIndex}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveStep(step.id);
                          }}
                          className="absolute -top-1.5 -right-1.5 flex opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 bg-red-600 hover:bg-red-500 rounded-full p-0.5 text-white shadow-lg z-20"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}

                    {/* Vertical connector line for multi-qubit gates */}
                    {showConnector && (
                      <div className="w-[2px] h-10 bg-white/30 rounded" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
