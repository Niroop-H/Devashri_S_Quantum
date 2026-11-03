import React from "react";
import { SimulationResult } from "../types";
import { HistogramView } from "./HistogramView";
import { StateVectorView } from "./StateVectorView";
import { Activity, Zap, CheckCircle2, BarChart3, Braces } from "lucide-react";

interface ExecutionPanelProps {
  result: SimulationResult | null;
  shots: number;
  isRunning: boolean;
}

export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({
  result,
  shots,
  isRunning
}) => {
  const [activeTab, setActiveTab] = React.useState<"histogram" | "statevector">(
    "histogram"
  );

  if (isRunning) {
    return (
      <div className="h-72 bg-ibm-dark border-t border-ibm-gray flex flex-col items-center justify-center text-ibm-blue space-y-3">
        <div className="w-8 h-8 border-2 border-ibm-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
          Executing on Classical QPU...
        </p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-64 bg-ibm-dark border-t border-ibm-gray p-6 flex flex-col items-center justify-center text-neutral-600">
        <Activity className="w-7 h-7 mb-2 opacity-40" />
        <p className="text-xs">
          Compose your circuit above and click <span className="text-ibm-blue font-semibold">Run on QPU</span> to execute.
        </p>
      </div>
    );
  }

  return (
    <div className="h-80 bg-ibm-dark border-t border-ibm-gray flex flex-col">
      {/* Telemetry status bar */}
      <div className="flex items-center justify-between px-5 py-1.5 bg-ibm-darker border-b border-ibm-gray text-[10px]">
        <div className="flex items-center space-x-4">
          <span className="flex items-center text-emerald-400 space-x-1 font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            <span>Execution Complete</span>
          </span>
          <span className="text-neutral-500">
            Backend: <span className="text-neutral-300">{result.backendInfo.qpuSimulated}</span>
          </span>
          <span className="text-neutral-500">
            Shots: <span className="text-neutral-300">{result.backendInfo.shots.toLocaleString()}</span>
          </span>
        </div>
        <div className="flex items-center space-x-4 text-neutral-500">
          <span className="flex items-center space-x-1">
            <Zap className="w-3 h-3 text-yellow-500" />
            <span>{result.executionTimeMs} ms</span>
          </span>
          <span>
            Fidelity:{" "}
            <span className="text-neutral-300">
              {(result.backendInfo.fidelityEstimated * 100).toFixed(1)}%
            </span>
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-ibm-gray px-4">
        <button
          onClick={() => setActiveTab("histogram")}
          className={`flex items-center space-x-1.5 px-4 py-2 text-[10px] uppercase tracking-wider font-semibold border-b-2 transition ${
            activeTab === "histogram"
              ? "border-ibm-blue text-white"
              : "border-transparent text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <BarChart3 className="w-3 h-3" />
          <span>Histogram</span>
        </button>
        <button
          onClick={() => setActiveTab("statevector")}
          className={`flex items-center space-x-1.5 px-4 py-2 text-[10px] uppercase tracking-wider font-semibold border-b-2 transition ${
            activeTab === "statevector"
              ? "border-ibm-blue text-white"
              : "border-transparent text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <Braces className="w-3 h-3" />
          <span>State Vector</span>
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 p-4 overflow-hidden">
        {activeTab === "histogram" ? (
          <HistogramView
            probabilities={result.probabilities}
            counts={result.counts}
            shots={shots}
          />
        ) : (
          <StateVectorView stateVector={result.stateVector} />
        )}
      </div>
    </div>
  );
};
