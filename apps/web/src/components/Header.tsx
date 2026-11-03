import React from "react";
import {
  Play,
  Settings2,
  RotateCcw,
  Loader2,
  ArrowUpRight,
} from "lucide-react";
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
  noiseEnabled,
}) => (
  <header className="studio-header">
    <div className="brand-row">
      <a className="brand" href="#top" aria-label="MAH Quantum home">
        <img
          src="/mah-quantum-logo.jpg"
          alt="MAH Quantum logo"
          width="52"
          height="52"
        />
        <div>
          <span className="brand-name">
            MAH QUANTUM<sup>™</sup>
          </span>
          <span className="brand-caption">
            QPU STUDIO <i /> BY DEVASHRI S QUANTUM
          </span>
        </div>
      </a>
      <nav className="header-nav" aria-label="Studio navigation">
        <a href="#workspace" className="nav-active">
          Quantum workspace
        </a>
        <a
          href="https://github.com/Niroop-H/Devashri_S_Quantum/blob/main/README.md"
          target="_blank"
          rel="noreferrer"
        >
          Documentation <ArrowUpRight size={13} />
        </a>
      </nav>
      <span className="environment-badge">
        <span /> FREE LOCAL SIMULATOR
      </span>
    </div>
    <div className="control-row">
      <div className="workspace-label">
        <span className="status-dot" /> Simulation workspace{" "}
        <span className="workspace-version">/ 01</span>
      </div>
      <div className="studio-controls">
        <label className="select-control">
          Qubits{" "}
          <select
            aria-label="Qubit count"
            value={qubits}
            onChange={(e) => setQubits(Number(e.target.value))}
            disabled={isRunning}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                {n.toString().padStart(2, "0")}
              </option>
            ))}
          </select>
        </label>
        <label className="select-control">
          Shots{" "}
          <select
            aria-label="Shot count"
            value={shots}
            onChange={(e) => setShots(Number(e.target.value))}
            disabled={isRunning}
          >
            {[128, 256, 512, 1024, 2048, 4096, 8192].map((n) => (
              <option key={n} value={n}>
                {n.toLocaleString()}
              </option>
            ))}
          </select>
        </label>
        <button
          className={`noise-button ${noiseEnabled ? "enabled" : ""}`}
          onClick={toggleNoiseModal}
          disabled={isRunning}
        >
          <Settings2 size={15} /> Noise{" "}
          <span>{noiseEnabled ? "ON" : "OFF"}</span>
        </button>
        <button
          className="reset-button"
          onClick={onReset}
          disabled={isRunning}
          title="Reset circuit"
          aria-label="Reset circuit"
        >
          <RotateCcw size={16} />
        </button>
        <button className="run-button" onClick={onRun} disabled={isRunning}>
          {isRunning ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Play size={14} fill="currentColor" />
          )}
          {isRunning ? "Simulating…" : "Run simulation"}
        </button>
      </div>
    </div>
  </header>
);
