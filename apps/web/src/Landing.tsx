import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Play,
  Pause,
  Plus,
  Minus,
} from "lucide-react";
import "./landing.css";

function QuantumGlobe({playing, excited}:{playing:boolean;excited:boolean}) {
 const [expanded,setExpanded]=useState(false);
 return <div className={`landchip-scene ${playing ? "" : "landchip-paused"} ${excited ? "landchip-active" : ""} ${expanded ? "processor-expanded" : ""}`} onPointerMove={e=>{const r=e.currentTarget.getBoundingClientRect();e.currentTarget.style.setProperty('--tilt',`${(e.clientX-r.left)/r.width*22-11}deg`);}} onPointerLeave={e=>e.currentTarget.style.setProperty('--tilt','0deg')}>
 <div className="core-environment" aria-hidden="true"><div className="core-halo halo-outer"/><div className="core-halo halo-inner"/><div className="core-halo halo-ticks"/><div className="core-nebula"/><div className="core-rays"/><svg className="core-signals" viewBox="0 0 600 520">{Array.from({length:12},(_,i)=>{const y=50+i*36;return <g key={i} style={{animationDelay:`${i*.25}s`}}><path className="signal-track" d={`M 0 ${y} H ${65+i%3*20} L 170 260 H 430 L ${515-i%3*20} ${y} H 600`}/><path className="signal-packet" style={{animationDelay:`${i*.23}s`}} d={`M 0 ${y} H ${65+i%3*20} L 170 260 H 430 L ${515-i%3*20} ${y} H 600`}/></g>;})}</svg><div className="core-readout readout-left">Q / 08<br/><span>COUPLED ARRAY</span><i/><i/><i/><i/><i/></div><div className="core-readout readout-right">MAH / CORE<br/><span>ARCHITECTURE VIEW</span><b>⌁ ⌁ ⌁</b></div></div><div className="processor-reticle" aria-hidden="true"/><div className="landchip-orbit orbit-a"/><div className="landchip-orbit orbit-b"/>
 <span className="processor-callout callout-one">01 / CONTROL INTERFACE<i/></span><span className="processor-callout callout-two">02 / QUBIT LATTICE<i/></span>
 <div className="landchip-assembly" role="img" aria-label="Layered quantum processor with gold bond wires, circuit traces and eight illuminated qubits">
 <div className="core-underlight"/><div className="core-platform"><i/><i/><i/></div><div className="processor-base"/><div className="processor-interposer"/>
 <div className="landchip-board"><div className="landchip-traces"/>
 {Array.from({length:64},(_,i)=>{const side=Math.floor(i/16),pos=7+(i%16)*5.7;return <i className={`processor-contact contact-${side}`} key={i} style={side<2?{left:`${pos}%`}:{top:`${pos}%`}}/>;})}
 <svg className="processor-routing" viewBox="0 0 400 400" aria-hidden="true">{Array.from({length:12},(_,i)=>{const x=26+i*31;return <g key={i}><path d={`M ${x} 10 V 45 L ${100+i*17} 85 V 125 M ${x} 390 V 355 L ${100+i*17} 315 V 275 M 10 ${x} H 45 L 85 ${100+i*17} H 125 M 390 ${x} H 355 L 315 ${100+i*17} H 275`}/><circle cx={x} cy="28" r="2"/><circle cx={x} cy="372" r="2"/></g>;})}</svg>
 {Array.from({length:4},(_,i)=><i key={i} className={`processor-screw screw-${i}`}/>)}
 <div className="processor-bonds">{Array.from({length:32},(_,i)=><i key={i} style={{transform:`rotate(${i*11.25}deg) translateY(-104px)`}}/>)}</div>
 <div className="landchip-package"><div className="processor-die"><div className="processor-mesh"/><div className="die-dataflow"/>
{Array.from({length:8},(_,i)=><div className="processor-qubit" key={i} style={{animationDelay:`${i*.22}s`}}><i/><span>Q{i}</span></div>)}<div className="processor-scan"/><strong>MAH <small>QUANTUM</small></strong></div></div>
 <div className="core-capacitors">{Array.from({length:16},(_,i)=><i key={i} style={{left:`${12+(i%8)*10}%`,top:i<8?'13%':'83%'}}/>)}</div><span className="processor-serial">MAH / Q-08 · QUANTUM CORE</span></div></div>
 <button className="processor-expand" onClick={()=>setExpanded(!expanded)} aria-pressed={expanded}>{expanded?'− Assemble processor':'+ Explore layers'}</button>
 </div>;
}
function ParticleField(){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{const c=ref.current!,ctx=c.getContext('2d')!;let f=0,w=0,h=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const points=Array.from({length:65},()=>({x:Math.random(),y:Math.random(),vx:(Math.random()-.5)*.00013,vy:(Math.random()-.5)*.00013}));
 const resize=()=>{w=innerWidth;h=innerHeight;c.width=w;c.height=h;};resize();addEventListener('resize',resize);
 const draw=()=>{ctx.clearRect(0,0,w,h);points.forEach((p,i)=>{if(!reduced){p.x=(p.x+p.vx+1)%1;p.y=(p.y+p.vy+1)%1;}ctx.fillStyle='#7fc9ff';ctx.beginPath();ctx.arc(p.x*w,p.y*h,1.2,0,7);ctx.fill();for(let j=i+1;j<points.length;j++){const q=points[j],d=Math.hypot((p.x-q.x)*w,(p.y-q.y)*h);if(d<150){ctx.strokeStyle=`rgba(77,156,232,${(1-d/150)*.2})`;ctx.beginPath();ctx.moveTo(p.x*w,p.y*h);ctx.lineTo(q.x*w,q.y*h);ctx.stroke();}}});if(!reduced)f=requestAnimationFrame(draw);};draw();return()=>{cancelAnimationFrame(f);removeEventListener('resize',resize);};},[]);return <canvas className="particle-field" ref={ref} aria-hidden="true"/>;
}
const faqs = [
  [
    "Is it really free?",
    "Yes. Your calculations run on your device, in your browser. There are no API keys, subscriptions, or paid compute services required.",
  ],
  [
    "Do I need to know quantum computing?",
    "Start with a Bell or GHZ example, run it, and inspect the results. The visual composer lets you build a circuit before writing any code.",
  ],
  [
    "Can I run code here?",
    "Yes. Studio compiles and runs a supported static subset of OpenQASM 2 and 3. You can also export Qiskit Python scripts for use in your own Python environment.",
  ],
  [
    "What can I build?",
    "Explore up to 8 qubits, build circuits with 256 operations, compile OpenQASM, inspect quantum states, and export your work.",
  ],
];
export default function Landing() {
  const [playing, setPlaying] = useState(true),
    [excited, setExcited] = useState(true),
    [open, setOpen] = useState<number | null>(0);
  return (
    <div className="landing" id="top"><ParticleField/>
      <a className="landing-skip" href="#explore">
        Skip to content
      </a>
      <header className="land-nav">
        <a href="/" className="land-brand">
          <img src="/mah-quantum-logo.jpg" alt="" />
          <span>
            MAH Quantum - Devashri S Quantum
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#explore">Discover</a>
          <a href="#workflow">The workspace</a>
          <a href="#questions">Questions</a>
        </nav>
        <a className="land-button small" href="/studio">
          Launch Studio <ArrowUpRight size={17} />
        </a>
      </header>
      <main>
        <section className="land-hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="land-eyebrow">
              <span className="live-dot" /> A QUANTUM LAB. OPEN TO YOU.
            </p>
            <h1 id="hero-title" className="brand-hero-title">MAH Quantum <span className="hero-divider">-</span><br/><span>Devashri S Quantum</span></h1>
            <p className="land-intro">
              Meet the world beyond 0 and 1.
              <br />
              Build quantum circuits, write code, and see the mathematics come
              alive. All in your browser.
            </p>
            <div className="hero-actions">
              <a className="land-button" href="/studio">
                Enter the Studio <ArrowUpRight size={20} />
              </a>
              <a className="text-link" href="#explore">
                Take a closer look <span>↓</span>
              </a>
            </div>
            <p className="hero-note">
              FREE TO EXPLORE <span> / </span> NO SIGN-UP REQUIRED
            </p>
          </div>
          <div className="hero-object">
            <div className="object-heading">
              <span>01 / QUANTUM PROCESSOR</span>
              <span>
                INTERACTIVE VIEW <span className="blue-dot" />
              </span>
            </div>
            <QuantumGlobe playing={playing} excited={excited} />
            <div className="state-tag">
              {excited ? "|ψ⟩ = (|0⟩ + |1⟩) / √2" : "|ψ⟩ = |0⟩"}
              <small>QUANTUM PROCESSOR VISUALIZATION</small>
            </div>
            <div className="object-controls">
              <div>
                <button
                  className={!excited ? "active" : ""}
                  onClick={() => setExcited(false)}
                  aria-pressed={!excited}
                >
                  Idle core
                </button>
                <button
                  className={excited ? "active" : ""}
                  onClick={() => setExcited(true)}
                  aria-pressed={excited}
                >
                  Active core
                </button>
              </div>
              <button
                className="motion-button"
                onClick={() => setPlaying(!playing)}
                aria-label={
                  playing ? "Pause chip animation" : "Play chip animation"
                }
              >
                {playing ? <Pause size={16} /> : <Play size={16} />}
              </button>
            </div>
            <p className="object-hint">
              MOVE YOUR POINTER. CHANGE YOUR PERSPECTIVE.
            </p>
          </div>
        </section>
        <div className="land-facts">
          <span>YOUR IDEAS. YOUR DEVICE.</span>
          <p>
            <b>08</b> qubits to explore
          </p>
          <p>
            <b>256</b> operations per circuit
          </p>
          <p>
            <b>0</b> cloud compute fees
          </p>
          <a href="/studio">
            Start experimenting <ArrowUpRight size={18} />
          </a>
        </div>
        <section className="land-discover" id="explore">
          <div className="section-heading">
            <p className="land-eyebrow">01 — A DIFFERENT WAY TO THINK</p>
            <h2>
              Make the abstract
              <br />
              <em>something you can see.</em>
            </h2>
            <p>
              Quantum computing makes more sense when you can experiment. Start
              with a single gate. Follow its effect. Build from there.
            </p>
          </div>
          <div className="discovery-grid">
            <article className="discovery-main">
              <div
                className="mini-circuit"
                aria-label="Bell circuit illustration: Hadamard on qubit zero, then controlled X on qubit one"
              >
                <div>
                  <span>q₀</span>
                  <i>H</i>
                  <b>●</b>
                  <span>→</span>
                </div>
                <div>
                  <span>q₁</span>
                  <i className="empty" />
                  <b>⊕</b>
                  <span>→</span>
                </div>
              </div>
              <span className="card-index">01 / BUILD</span>
              <h3>
                A thought. A gate.
                <br />A new possibility.
              </h3>
              <p>
                Place gates on the canvas and connect qubits. Create your first
                entangled state in just two operations.
              </p>
              <a href="/studio">
                Open the circuit composer <ArrowUpRight size={18} />
              </a>
            </article>
            <article className="discovery-code">
              <div className="code-top">
                <span>hello_quantum.qasm</span>
                <span>OPENQASM 3</span>
              </div>
              <pre>
                <span>OPENQASM</span> 3.0;{"\n"}include "stdgates.inc";{"\n\n"}
                qubit[2] q;{"\n"}bit[2] c;{"\n\n"}
                <strong>h</strong> q[0];{"\n"}
                <strong>cx</strong> q[0], q[1];{"\n"}c = measure q;
              </pre>
              <span className="card-index">02 / CODE</span>
              <h3>
                Go from curiosity
                <br />
                to your first program.
              </h3>
              <p>
                Write OpenQASM, compile it into a circuit, and run it locally.
                Your code and canvas speak the same language.
              </p>
              <a href="/studio">
                Explore the code workspace <ArrowUpRight size={18} />
              </a>
            </article>
          </div>
        </section>
        <section className="land-workflow" id="workflow">
          <div>
            <p className="land-eyebrow">02 — LOOK UNDER THE SURFACE</p>
            <h2>
              Every operation.
              <br />A little more
              <br />
              <span>understanding.</span>
            </h2>
            <p>
              A workspace designed to follow your thinking—from the first
              experiment to the result worth keeping.
            </p>
            <a className="land-button" href="/studio">
              Find your next discovery <ArrowUpRight size={18} />
            </a>
          </div>
          <div className="workflow-list">
            {[
              [
                "01",
                "Inspect the invisible",
                "Step through your circuit. Explore amplitudes, phases, Bloch vectors, and quantum observables.",
              ],
              [
                "02",
                "Transform your circuit",
                "Optimize operations, decompose to U + CX, and explore linear connectivity with the built-in transpiler.",
              ],
              [
                "03",
                "Put theory to the test",
                "Compare ideal probabilities with sampled results. Introduce noise and observe what changes.",
              ],
              [
                "04",
                "Keep the work that matters",
                "Save projects on your device, revisit job history, and export circuits and results.",
              ],
            ].map(([n, title, body]) => (
              <article key={n}>
                <span>{n}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
                <ArrowUpRight size={22} />
              </article>
            ))}
          </div>
        </section>
        <section className="land-faq" id="questions">
          <div>
            <p className="land-eyebrow">03 — BEFORE YOU BEGIN</p>
            <h2>
              A few good
              <br />
              questions.
            </h2>
            <p>No mystery around how this works.</p>
          </div>
          <div>
            {faqs.map(([q, a], i) => (
              <article key={q}>
                <h3>
                  <button
                    aria-expanded={open === i}
                    aria-controls={"answer-" + i}
                    onClick={() => setOpen(open === i ? null : i)}
                  >
                    {q}
                    {open === i ? <Minus size={19} /> : <Plus size={19} />}
                  </button>
                </h3>
                <div id={"answer-" + i} hidden={open !== i}>
                  <p>{a}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="land-cta">
          <p className="land-eyebrow">THE NEXT STEP IS YOURS.</p>
          <h2>
            Curiosity looks
            <br />
            good on you.
          </h2>
          <a href="/studio" className="land-button">
            Let’s make something quantum <ArrowUpRight size={22} />
          </a>
          <span className="cta-symbol" aria-hidden="true">
            ψ
          </span>
        </section>
      </main>
      <footer className="land-footer">
        <a href="/" className="land-brand">
          <img src="/mah-quantum-logo.jpg" alt="" />
          <span>
            MAH Quantum - Devashri S Quantum
          </span>
        </a>
        <p>
          Developed by Devashri S Quantum.
          <br />
          Quantum circuits. Code. Discovery.
        </p>
        <a href="https://github.com/Niroop-H/Devashri_S_Quantum">
          GitHub <ArrowUpRight size={16} />
        </a>
        <a href="#top">Back to top ↑</a>
      </footer>
    </div>
  );
}
