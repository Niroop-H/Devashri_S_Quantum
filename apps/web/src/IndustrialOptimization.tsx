import {useEffect,useRef,useState} from "react";
import {Page} from "./lab/Shared";
import {download} from "./services/projects";
import {importWeightedEdgeCsv,exportWeightedEdgeCsv} from "./services/industrial-csv";
import {industrialExamples,type IndustryScenario} from "./industrial-examples";
import type {OptimizationResult} from "../../engine/src/industrial/optimization";
import "./industrial-optimization.css";

const TIMEOUT_MS=90000;
const initial=JSON.stringify(industrialExamples.manufacturing,null,2);
const fmt=(v:number)=>Number(v.toFixed(4)).toLocaleString(undefined,{maximumFractionDigits:4});
const percent=(v:number)=>fmt(v*100)+"%";
function columns(bits:string,nodes:string[]){
 const left:string[]=[],right:string[]=[];
 for(let i=0;i<nodes.length;i++)((bits[bits.length-1-i]==="1")?right:left).push(nodes[i]);
 return{left,right};
}
export default function IndustrialOptimization(){
 const [scenario,setScenario]=useState<IndustryScenario|"custom">("manufacturing");
 const [source,setSource]=useState(initial);
 const [shots,setShots]=useState(1024),[seed,setSeed]=useState(2026);
 const [result,setResult]=useState<OptimizationResult|null>(null);
 const [error,setError]=useState(""),[running,setRunning]=useState(false),[completedAt,setCompletedAt]=useState("");
 const worker=useRef<Worker|null>(null),deadline=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{worker.current?.terminate();if(deadline.current!==null)clearTimeout(deadline.current);},[]);
 const clear=()=>{setResult(null);setCompletedAt("");setError("");};
 const loadScenario=(name:IndustryScenario)=>{
  setScenario(name);setSource(JSON.stringify(industrialExamples[name],null,2));clear();
 };
 const importCsv=async(file:File|undefined)=>{
  if(!file||running)return;
  try{
   const source=await file.text();
   const graph=importWeightedEdgeCsv(source,file.name.replace(/\.csv$/i,"").slice(0,90));
   setSource(JSON.stringify(graph,null,2));setScenario("custom");clear();
  }catch(e){setError(e instanceof Error?e.message:"CSV import failed.");}
 };
 const downloadCsv=()=>{
  try{
   const graph=JSON.parse(source);
   download("MAH-Quantum-Weighted-Edges.csv",exportWeightedEdgeCsv(graph),"text/csv");
  }catch(e){setError(e instanceof Error?e.message:"Unable to export CSV.");}
 };
 const run=()=>{
  if(worker.current||running)return;
  let graph:unknown;
  try {graph=JSON.parse(source);}
  catch {setError("Graph JSON is invalid. Check commas, quoted names and edge objects.");return;}
  clear();setRunning(true);
  let thread:Worker;
  try {thread=new Worker(new URL("./services/industrial.worker.ts",import.meta.url),{type:"module"});}
  catch{setRunning(false);setError("Unable to start the optimization worker.");return;}
  worker.current=thread;
  const finish=(data:{result?:OptimizationResult;error?:string})=>{
   if(worker.current!==thread)return;
   worker.current=null;
   if(deadline.current!==null)clearTimeout(deadline.current);
   deadline.current=null;
   thread.terminate();setRunning(false);
   if(data.error)setError(data.error);
   else if(data.result){setResult(data.result);setCompletedAt(new Date().toISOString());}
   else setError("No optimization result was returned.");
  };
  thread.onmessage=(event:MessageEvent<{result?:OptimizationResult;error?:string}>)=>finish(event.data);
  thread.onerror=()=>finish({error:"The optimization worker encountered an execution error."});
  thread.onmessageerror=()=>finish({error:"The optimization worker returned an unreadable response."});
  deadline.current=setTimeout(()=>finish({error:"The 90-second computation budget was exceeded. Reduce graph size or complexity."}),TIMEOUT_MS);
  try{thread.postMessage({graph,shots,seed});}
  catch{finish({error:"The graph could not be transferred to the computation worker."});}
 };
 const cancel=()=>{
  if(!worker.current)return;
  worker.current.terminate();worker.current=null;
  if(deadline.current!==null)clearTimeout(deadline.current);deadline.current=null;
  setRunning(false);setError("Computation cancelled by the operator.");
 };
 const exportReport=async()=>{
  if(!result||running)return;
  const input=JSON.stringify(result.graph);
  const digest=globalThis.crypto?.subtle
   ?await globalThis.crypto.subtle.digest("SHA-256",new TextEncoder().encode(input))
     .then(buffer=>Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,"0")).join(""))
     .catch(()=>null)
   :null;
  const report={
   schema:"MAH-Quantum-Industrial-Optimization-Evidence/v1",
   recordedAtUtc:completedAt,
   inputHash:{algorithm:"SHA-256",canonicalGraphJson:digest},
   provenance:"Local FP64 classical simulation of a p=1 QAOA circuit, with independently enumerated classical optimum.",
   result
  };
  download("MAH-Quantum-Optimization-Evidence.json",JSON.stringify(report,null,2),"application/json");
 };
 const selected=result?columns(result.quantum.bestSampleAssignment,result.graph.nodes):null;
 const optimal=result?columns(result.classical.optimalAssignment,result.graph.nodes):null;
 const maximum=result?.classical.optimum||1;
 return <Page eyebrow="MAH QUANTUM / INDUSTRIAL APPLICATIONS" title="Industrial Optimization"
  description="Evaluate bounded weighted graph-partitioning problems with a genuine QAOA quantum circuit, exhaustive classical verification, and reproducible engineering evidence.">
  <section className="industrial-lead">
   <div><strong>2–12</strong><small>Decision variables</small></div>
   <div><strong>p = 1</strong><small>QAOA circuit depth</small></div>
   <div><strong>EXACT</strong><small>Classical optimum reference</small></div>
   <div><strong>FP64</strong><small>Ideal statevector computation</small></div>
  </section>
  <div className="industrial-layout">
   <section className="industrial-panel" aria-label="Industrial graph model">
    <div className="industrial-section"><span>01 / MODEL CONFIGURATION</span><h2>Define the business objective</h2></div>
    <p className="industrial-muted">Choose a synthetic scenario or replace the weighted edges with your own decision model. Each edge's weight is the value gained by separating its two nodes into different groups.</p>
    <label className="industrial-label">Example scenario
     <select aria-label="Industrial scenario" disabled={running} value={scenario} onChange={e=>loadScenario(e.target.value as IndustryScenario)}>
      <option value="manufacturing">Manufacturing — interference separation</option>
      <option value="energy">Energy — network segmentation</option>
      <option value="computing">Compute — conflicting-job separation</option>
      <option value="custom" disabled>Custom or imported graph</option>
     </select>
    </label>
    <label className="industrial-label">Weighted graph JSON
     <textarea aria-label="Industrial weighted graph JSON" className="industrial-source" spellCheck={false} disabled={running}
      value={source} onChange={e=>{setSource(e.target.value);setScenario("custom");clear();}}/>
    </label>
    <div className="industrial-actions">
     <label className="industrial-upload">Import weighted edge-list CSV
      <input aria-label="Import industrial CSV graph" accept=".csv,text/csv" type="file" disabled={running}
       onChange={e=>{const input=e.currentTarget;const file=input.files?.[0];input.value="";void importCsv(file);}}/>
     </label>
     <button disabled={running} onClick={downloadCsv}>Export graph CSV</button>
    </div>
    <p className="industrial-muted">CSV schema: source,target,weight. Symbolic labels are preserved; weights must be positive. Files are parsed locally, not uploaded to the server.</p>
    <div className="industrial-controls">
     <label className="industrial-label">Measurement shots
      <select aria-label="Industrial optimization shots" value={shots} disabled={running} onChange={e=>{setShots(Number(e.target.value));clear();}}>
       {[128,256,512,1024,2048,4096].map(n=><option key={n} value={n}>{n.toLocaleString()}</option>)}
      </select>
     </label>
     <label className="industrial-label">Random seed
      <input aria-label="Industrial optimization seed" type="number" min="0" max="4294967295" step="1"
       value={seed} disabled={running} onChange={e=>{setSeed(Number(e.target.value));clear();}}/>
     </label>
    </div>
    <div className="industrial-actions">
     <button className="industrial-run" disabled={running} onClick={run}>{running?"Optimizing…":"Run quantum + classical analysis"}</button>
     {running&&<button onClick={cancel}>Cancel</button>}
     <button disabled={!result||running} onClick={()=>{void exportReport();}}>Export audit-ready JSON</button>
    </div>
    {running&&<p className="industrial-status" role="status">Running a bounded QAOA parameter sweep and exhaustive classical reference calculation in a dedicated worker.</p>}
    {error&&<p className="industrial-error" role="alert">{error}</p>}
    <details className="industrial-details"><summary>Model contract and interpretation</summary>
     <p>Objective: maximize the total weight of edges crossing between the two groups. Nodes may have no additional constraints, and weights must be positive. This cannot by itself optimize operational scheduling, plant control, electrical dispatch, or route sequencing.</p>
     <p>The QAOA circuit is mathematically evaluated using the existing dense statevector engine on a conventional computer. A bounded deterministic parameter search produces an expectation value and independent sampled candidate solutions. The exhaustive classical solver supplies a real global optimum for the same graph.</p>
    </details>
   </section>
   <section className="industrial-panel" aria-label="Industrial optimization results">
    <div className="industrial-section"><span>02 / VERIFIED ANALYSIS</span><h2>Results and solution quality</h2></div>
    {!result?<div className="industrial-placeholder"><strong>No computation yet</strong><p>Run the sample manufacturing, energy or compute-separation scenario to see measured outcomes, the classical optimum and comparative solution quality.</p><small>Accuracy and resource boundaries are reported with each job.</small></div>:<>
     <div className="industrial-metrics">
      <div><span>Verified classical optimum</span><b>{fmt(result.classical.optimum)}</b></div>
      <div><span>QAOA expected cut value</span><b>{fmt(result.quantum.exactExpectedScore)}</b></div>
      <div><span>Best sampled cut</span><b>{fmt(result.quantum.bestSampleScore)}</b></div>
      <div><span>QAOA expectation / optimum</span><b>{percent(result.quantum.approximationRatio)}</b></div>
     </div>
     <div className="industrial-bars" role="img" aria-label={"Comparison: classical optimum "+fmt(result.classical.optimum)+", classical greedy "+fmt(result.classical.greedyScore)+", exact QAOA expectation "+fmt(result.quantum.exactExpectedScore)+", best sampled cut "+fmt(result.quantum.bestSampleScore)}>
      {[
       ["Classical global optimum",result.classical.optimum],
       ["Classical greedy heuristic",result.classical.greedyScore],
       ["QAOA exact expectation",result.quantum.exactExpectedScore],
       ["Best measured candidate",result.quantum.bestSampleScore]
      ].map(([label,value])=><div className="industrial-bar" key={label}>
       <div><span>{label}</span><b>{fmt(value as number)}</b></div>
       <div className="industrial-track"><i style={{width:((value as number)/maximum*100)+"%"}}/></div>
      </div>)}
     </div>
     <div className="industrial-evidence">
      <span>QAOA optimal-outcome probability: <strong>{percent(result.quantum.probabilityOfOptimalCut)}</strong></span>
      <span>Sample mean: <strong>{fmt(result.quantum.sampledMeanScore)}</strong></span>
      <span>Approximate 95% interval: <strong>{fmt(result.quantum.approximate95PercentInterval[0])}–{fmt(result.quantum.approximate95PercentInterval[1])}</strong></span>
      <span>Angles γ / β: <strong>{fmt(result.quantum.gamma)} / {fmt(result.quantum.beta)}</strong></span>
      <span>Parameter evaluations: <strong>{result.model.parameterEvaluations}</strong></span>
      <span>Sampled shots: <strong>{result.execution.completedShots.toLocaleString()}</strong></span>
      <span>Statevector memory: <strong>{(result.model.statevectorBytes/1024).toFixed(0)} KiB</strong></span>
      <span>Local compute: <strong>{fmt(result.execution.elapsedMs)} ms</strong></span>
     </div>
     <h3 className="industrial-subheading">Best sampled partition</h3>
     <div className="industrial-groups">
      <div><span>Group A · bit 0</span>{selected?.left.map(n=><b key={n}>{n}</b>)}</div>
      <div><span>Group B · bit 1</span>{selected?.right.map(n=><b key={n}>{n}</b>)}</div>
     </div>
     <details className="industrial-details">
      <summary>Classical optimal partition and sampled outcomes</summary>
      <p>Global optimum: {fmt(result.classical.optimum)} ({result.classical.optimumDegeneracy} equally optimal assignments).</p>
      <div className="industrial-groups">
       <div><span>Optimal A</span>{optimal?.left.map(n=><b key={n}>{n}</b>)}</div>
       <div><span>Optimal B</span>{optimal?.right.map(n=><b key={n}>{n}</b>)}</div>
      </div>
      <table className="industrial-table"><thead><tr><th>Assignment</th><th>Shots</th><th>Cut value</th><th>Ideal P</th></tr></thead>
       <tbody>{result.quantum.outcomes.slice(0,10).map(o=><tr key={o.assignment}><td><code>{o.assignment}</code></td><td>{o.shots}</td><td>{fmt(o.score)}</td><td>{percent(o.probability)}</td></tr>)}</tbody></table>
     </details>
     <p className="industrial-caveat">No quantum advantage is claimed. The classical optimum is computed exactly for this small graph. These results are not instructions for direct industrial plant control.</p>
    </>}
   </section>
  </div>
  <section className="industrial-panel industrial-bottom">
   <div className="industrial-section"><span>03 / INDUSTRIAL EVALUATION</span><h2>From research model to verifiable decisions</h2></div>
   <div className="industrial-three">
    <div><strong>Real input</strong><p>Replace synthetic examples with customer-supplied graphs and explicitly documented weight definitions.</p></div>
    <div><strong>Independent baseline</strong><p>Compare each simulated quantum result against the exact classical solution and a fast greedy heuristic using identical inputs.</p></div>
    <div><strong>Engineering evidence</strong><p>Export an immutable input fingerprint, model limits, seed, settings, assignments and quantitative result for review.</p></div>
   </div>
   <p className="industrial-caveat">Release scope: small graph-partitioning pilots, numerical verification and algorithm research. Before deployment into safety-critical, time-sensitive, or customer-owned operations, the graph mapping, constraints, security, uptime and external outcomes require separate industrial validation.</p>
  </section>
 </Page>;
}
