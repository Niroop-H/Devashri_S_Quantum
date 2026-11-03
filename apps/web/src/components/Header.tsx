import React from "react";
import { Cpu, Play, Settings, RefreshCw, Loader2 } from "lucide-react";

interface HeaderProps {
  onRun: () => void;
  onReset: () => void;
  isRunning: boolean;
  shots: number;
  setShots: (s: number) => void;
  qubits: number;
  setQubits: (q: number) => void;
  toggleNoiseModal: () => void;
  noiseEnabled: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onRun,
  onReset,
  isRunning,
  shots,
  setShots,
  qubits,
  setQubits,
  toggleNoiseModal,
  noiseEnabled
}) => {
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-ibm-dark border-b border-ibm-gray">
      {/* Left - Logo & Status */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-ibm-blue flex items-center justify-center">
          <Cpu className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-wider text-white">
            Q-SIM CLASSICAL QPU STUDIO
          </h1>
          <p className="text-[11px] text-neutral-500">
            Statevector Simulator &bull; {qubits}-Qubit Virtual Transmon &bull; Online
          </p>
        </div>
      </div>

      {/* Right - Controls */}
      <div className="flex items-center space-x-3">
        {/* Qubit selector */}
        <div className="flex items-center space-x-2 text-sm bg-ibm-darker px-3 py-1.5 rounded border border-ibm-gray">
          <span className="text-neutral-400 text-[10px] uppercase font-semibold">Qubits:</span>
          <select
            value={qubits}
            onChange={(e) => setQubits(Number(e.target.value))}
            className="bg-transparent text-white focus:outline-none cursor-pointer text-sm"
          >
            {[2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n} className="bg-ibm-dark">
                {n}
              </option>
            ))}
          </select>
        </div>

        {/* Shots selector */}
        <div className="flex items-center space-x-2 text-sm bg-ibm-darker px-3 py-1.5 rounded border border-ibm-gray">
          <span className="text-neutral-400 text-[10px] uppercase font-semibold">Shots:</span>
          <select
            value={shots}
            onChange={(e) => setShots(Number(e.target.value))}
            className="bg-transparent text-white focus:outline-none cursor-pointer text-sm"
          >
            {[512, 1024, 2048, 4096, 8192].map((n) => (
              <option key={n} value={n} className="bg-ibm-dark">
                {n.toLocaleString()}
              </option>
            ))}
          </select>
        </div>

        {/* Noise toggle */}
        <button
          onClick={toggleNoiseModal}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded text-xs uppercase font-semibold border transition ${
            noiseEnabled
              ? "bg-amber-950/40 border-amber-600 text-amber-400"
              : "bg-ibm-darker border-ibm-gray text-neutral-400 hover:text-white hover:border-neutral-500"
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Noise {noiseEnabled ? "ON" : "OFF"}</span>
        </button>

        {/* Reset */}
        <button
          onClick={onReset}
          className="p-2 text-neutral-400 hover:text-white bg-ibm-darker rounded border border-ibm-gray transition hover:border-neutral-500"
          title="Reset Circuit"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Run */}
        <button
          onClick={onRun}
          disabled={isRunning}
          className="flex items-center space-x-2 px-5 py-2 rounded bg-ibm-blue hover:bg-ibm-blueHover text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
          <span>{isRunning ? "Simulating..." : "Run on QPU"}</span>
        </button>
      </div>
    </header>
  );
};
