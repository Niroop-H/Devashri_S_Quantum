import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import type {ChangeEvent,KeyboardEvent as ReactKeyboardEvent} from "react";
import {Page} from "./lab/Shared";
import {download} from "./services/projects";
import type {ScalableResult} from "../../engine/src/studio/scalable";
import {
 bitSamples,displayBackend,empiricalEntropy,LARGE_HISTORY_LIMIT,
 LARGE_LOCAL_SOURCE_LIMIT,LARGE_SAVED_LIMIT,LARGE_SOURCE_LIMIT,
 makeHistoryEntry,newLargeDraft,preflightLarge,presetSource,readLargeDocument,
 sizes,writeLargeDocument,type LargeDraft,type LargeHistory,type LargePreset,
 type LargePreflight,type LargeSaved
} from "./services/large-research";
import "./large-quantum.css";

type Stage="preparing"|"parsing"|"planning"|"computing"|"complete";
type EditorTab="editor"|"map"|"log";
type InspectorTab="outcomes"|"bits"|"evidence";
type LogEntry={at:string;message:string};
const MAX_JOB_DURATION_MS=120_000;
const SHOTS=[32,64,128,256,512,1024] as const;
const PRESETS:Array<{id:Exclude<LargePreset,"custom">;label:string;detail:string}>= [
 {id:"ghz",label:"GHZ correlation",detail:"Long-range entanglement · H + CX"},
 {id:"cluster",label:"Graph-state chain",detail:"Stabilizer entanglement · H + CZ"},
 {id:"plus",label:"Uniform superposition",detail:"Independent Hadamards · H"},
 {id:"rotations",label:"Rotation ensemble",detail:"Product-state RY amplitudes"}
];
const compact=(bits:string)=>bits.length<=64?bits:bits.slice(0,24)+" ··· "+bits.slice(-24);
const number=(v:number)=>v.toLocaleString("en-US");
const stamp=(value:string)=>{const d=new Date(value);return Number.isNaN(d.valueOf())?value:d.toLocaleString(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});};
const method=(value:string)=>value==="stabilizer-tableau"?"Clifford stabilizer tableau":value==="separable-state"?"Separable pure-state":"Partitioned exact statevectors";
const logClock=()=>new Date().toLocaleTimeString(undefined,{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit"});
const errorText=(e:unknown)=>e instanceof Error?e.message:String(e);
const proofInfo=(r:ScalableResult)=>{
 if(r.method==="stabilizer-tableau")return "Exact Clifford Z-basis distribution represented as an affine binary subspace.";
 if(r.method==="separable-state")return "Exact product of independent two-component complex vectors.";
 return "Independent entangled components computed with bounded exact statevectors.";
};
function outcomeStats(result:ScalableResult|null){
 if(!result)return {rows:[] as [string,number][],total:0,distinct:0,width:0};
 const rows=Object.entries(result.counts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
 return {rows,total:rows.reduce((a,[,v])=>a+v,0),distinct:rows.length,width:rows[0]?.[0].length??0};
}

export default function LargeQuantum(){
 const [initial]=useState(readLargeDocument);
 const [draft,setDraft]=useState<LargeDraft>(initial.draft);
 const [saved,setSaved]=useState<LargeSaved[]>(initial.saved);
 const [history,setHistory]=useState<LargeHistory[]>(initial.history);
 const [selectedSaved,setSelectedSaved]=useState<string|null>(null);
 const [selectedHistory,setSelectedHistory]=useState<string|null>(null);
 const [search,setSearch]=useState("");
 const [storageStatus,setStorageStatus]=useState("Local draft loaded");
 const [preflight,setPreflight]=useState<LargePreflight|null>(null);
 const [preflightError,setPreflightError]=useState("");
 const [checking,setChecking]=useState(true);
 const [editorTab,setEditorTab]=useState<EditorTab>("editor");
 const [inspectorTab,setInspectorTab]=useState<InspectorTab>("outcomes");
 const [bitOffset,setBitOffset]=useState(0);
 const [selectedBit,setSelectedBit]=useState(0);
 const [selectedOutcome,setSelectedOutcome]=useState<string|null>(null);
 const [result,setResult]=useState<ScalableResult|null>(null);
 const [runSnapshot,setRunSnapshot]=useState<LargeDraft|null>(null);
 const [error,setError]=useState("");
 const [running,setRunning]=useState(false);
 const [stage,setStage]=useState<Stage>("preparing");
 const [elapsed,setElapsed]=useState(0);
 const [startedAt,setStartedAt]=useState("");
 const [logs,setLogs]=useState<LogEntry[]>([{at:logClock(),message:"Research console initialized. No remote computation is connected."}]);
 const [lineNo,setLineNo]=useState(1),[columnNo,setColumnNo]=useState(1);
 const workerRef=useRef<Worker|null>(null);
 const deadlineRef=useRef<ReturnType<typeof setTimeout>|null>(null);
 const sourceEditor=useRef<HTMLTextAreaElement|null>(null);
 const gutterRef=useRef<HTMLPreElement|null>(null);
 const importRef=useRef<HTMLInputElement|null>(null);
 const [clock,setClock]=useState(0);
 const appendLog=useCallback((message:string)=>setLogs(prev=>[...prev,{at:logClock(),message}].slice(-60)),[]);
 const invalidate=useCallback(()=>{setResult(null);setRunSnapshot(null);setSelectedOutcome(null);setError("");},[]);
 const update=(changes:Partial<LargeDraft>)=>{setDraft(prev=>({...prev,...changes}));invalidate();};
 useEffect(()=>()=>{
  workerRef.current?.terminate();
  if(deadlineRef.current!==null)clearTimeout(deadlineRef.current);
 },[]);
 useEffect(()=>{
  if(!running)return;
  const timer=setInterval(()=>setClock(Date.now()),250);
  return()=>clearInterval(timer);
 },[running]);
 useEffect(()=>{
  setChecking(true);
  const timer=setTimeout(()=>{
   try{setPreflight(preflightLarge(draft.source));setPreflightError("");}
   catch(e){setPreflight(null);setPreflightError(errorText(e));}
   setChecking(false);
  },280);
  return()=>clearTimeout(timer);
 },[draft.source]);
 useEffect(()=>{
  setStorageStatus("Saving locally…");
  const timer=setTimeout(()=>{
   if(draft.source.length>LARGE_LOCAL_SOURCE_LIMIT){setStorageStatus("Large source: export QASM to protect your work");return;}
   const success=writeLargeDocument({version:2,draft,saved,history});
   setStorageStatus(success?"Autosaved to this browser":"Local save unavailable — export your circuit");
  },550);
  return()=>clearTimeout(timer);
 },[draft,saved,history]);
 const saveNamed=()=>{
  if(running)return;
  if(draft.source.length>LARGE_LOCAL_SOURCE_LIMIT){
   setError("This circuit exceeds the 140,000-character local snapshot limit. Export QASM to protect it.");return;
  }
  const now=new Date().toISOString(),title=draft.title.trim()||"Untitled experiment";
  const id=selectedSaved||now;
  const record:LargeSaved={id,title,updated:now,draft:{...draft,title}};
  setSaved(prev=>[record,...prev.filter(x=>x.id!==id)].slice(0,LARGE_SAVED_LIMIT));
  setSelectedSaved(id);appendLog('Saved named experiment "'+title+'" to browser storage.');
 };
 const loadSaved=(item:LargeSaved)=>{
  if(running)return;
  setDraft(item.draft);setSelectedSaved(item.id);invalidate();setEditorTab("editor");
  appendLog('Loaded saved experiment "'+item.title+'".');
 };
 const deleteSaved=(item:LargeSaved)=>{
  if(running||!confirm('Delete saved experiment "'+item.title+'"?'))return;
  setSaved(prev=>prev.filter(x=>x.id!==item.id));
  if(selectedSaved===item.id)setSelectedSaved(null);
  appendLog("Deleted local experiment snapshot.");
 };
 const setPreset=(id:Exclude<LargePreset,"custom">,width=draft.qubits)=>{
  if(running)return;
  setDraft(prev=>({...newLargeDraft(width,id),shots:prev.shots,seed:prev.seed,source:presetSource(width,id)}));
  setSelectedSaved(null);invalidate();
  appendLog("Loaded "+id+" reference experiment for "+number(width)+" logical qubits.");
 };
 const createNew=()=>{
  if(running||!confirm("Start a new experiment? The current draft will be replaced; named snapshots remain saved."))return;
  setDraft(newLargeDraft());setSelectedSaved(null);invalidate();setEditorTab("editor");
  appendLog("Started a new 1,000-qubit research experiment.");
 };
 const onImport=async(event:ChangeEvent<HTMLInputElement>)=>{
  const file=event.target.files?.[0];event.target.value="";
  if(!file||running)return;
  if(file.size>LARGE_SOURCE_LIMIT*4){setError("Import exceeds the QASM source size limit.");return;}
  try{
   const source=await file.text();
   const p=preflightLarge(source);
   const title=file.name.replace(/\.(qasm|txt)$/i,"").slice(0,90)||"Imported experiment";
   setDraft(prev=>({...prev,title,source,qubits:sizes.includes(p.program.qubits)?p.program.qubits:prev.qubits,preset:"custom"}));
   setSelectedSaved(null);invalidate();setEditorTab("editor");
   appendLog("Imported "+file.name+"; parsed "+number(p.program.steps.length)+" expanded operations.");
  }catch(e){setError("QASM import rejected: "+errorText(e));appendLog("Import failed: "+errorText(e));}
 };
 const run=useCallback(()=>{
  if(workerRef.current||running)return;
  let parsed:LargePreflight;
  try{parsed=preflightLarge(draft.source);}
  catch(e){setError(errorText(e));appendLog("Preflight rejected the circuit: "+errorText(e));return;}
  if(!Number.isInteger(draft.seed)||draft.seed<0||draft.seed>4294967295){
   setError("Seed must be a 32-bit unsigned integer.");return;
  }
  if(!SHOTS.includes(draft.shots as typeof SHOTS[number])){setError("Choose a supported shot count.");return;}
  setPreflight(parsed);setPreflightError("");setError("");setResult(null);setRunSnapshot(null);
  setElapsed(0);setClock(Date.now());setRunning(true);setStartedAt(new Date().toISOString());
  setStage("preparing");
  appendLog("Submitting "+number(parsed.program.qubits)+"-qubit, "+number(parsed.expandedGates)+"-operation circuit to a local Worker.");
  const snapshot={...draft};
  const started=performance.now();
  let worker:Worker;
  try{worker=new Worker(new URL("./services/large.worker.ts",import.meta.url),{type:"module"});}
  catch{setRunning(false);setError("Unable to start the local quantum worker.");return;}
  workerRef.current=worker;
  const finish=(message:{result?:ScalableResult;error?:string})=>{
   if(workerRef.current!==worker)return;
   workerRef.current=null;
   if(deadlineRef.current!==null)clearTimeout(deadlineRef.current);
   deadlineRef.current=null;
   worker.terminate();setRunning(false);
   const duration=performance.now()-started;
   setElapsed(duration);setStage("complete");
   if(message.result){
    setResult(message.result);setRunSnapshot(snapshot);setInspectorTab("outcomes");setBitOffset(0);
    setSelectedOutcome(null);
    setHistory(prev=>[makeHistoryEntry(snapshot.title,message.result!,"completed",new Date().toISOString()),...prev].slice(0,LARGE_HISTORY_LIMIT));
    appendLog("Completed "+number(message.result.backendInfo.shots)+" shots using "+displayBackend(message.result.method)+".");
   }else{
    const reason=message.error||"Simulation returned no result.";
    setError(reason);appendLog("Job failed: "+reason);
    setHistory(prev=>[{
     id:new Date().toISOString(),title:snapshot.title,created:new Date().toISOString(),
     qubits:parsed.program.qubits,shots:snapshot.shots,seed:snapshot.seed,
     method:parsed.method,durationMs:duration,distinctOutcomes:0,
     status:"failed" as const,error:reason
    },...prev].slice(0,LARGE_HISTORY_LIMIT));
   }
  };
  worker.onmessage=(event:MessageEvent<{stage?:Stage;result?:ScalableResult;error?:string}>)=>{
   if(workerRef.current!==worker)return;
   if(event.data?.stage){
    setStage(event.data.stage);
    appendLog("Worker: "+({parsing:"parsing QASM",planning:"validating mathematical representation",
     computing:"executing quantum circuit and sampling",preparing:"preparing",complete:"complete"} as Record<Stage,string>)[event.data.stage]);
   }else finish(event.data);
  };
  worker.onerror=()=>finish({error:"The quantum worker encountered an execution error."});
  worker.onmessageerror=()=>finish({error:"The quantum worker returned an unreadable result."});
  deadlineRef.current=setTimeout(()=>finish({
   error:"The computation exceeded the 120-second execution budget. Reduce gates, shots, or connected entanglement."
  }),MAX_JOB_DURATION_MS);
  try{worker.postMessage({source:snapshot.source,shots:snapshot.shots,seed:snapshot.seed});}
  catch{finish({error:"Could not transfer this circuit to the quantum worker."});}
 },[draft,running,appendLog]);
 const cancel=()=>{
  if(!workerRef.current)return;
  workerRef.current.terminate();workerRef.current=null;
  if(deadlineRef.current!==null)clearTimeout(deadlineRef.current);deadlineRef.current=null;
  setRunning(false);setError("Execution cancelled by operator.");
  setStage("complete");
  appendLog("Operator cancelled the local worker.");
  setHistory(prev=>[{
   id:new Date().toISOString(),title:draft.title,created:new Date().toISOString(),qubits:preflight?.program.qubits||draft.qubits,
   shots:draft.shots,seed:draft.seed,method:preflight?.method||"unresolved",
   durationMs:0,distinctOutcomes:0,status:"cancelled" as const
  },...prev].slice(0,LARGE_HISTORY_LIMIT));
 };
 const exportExperiment=async()=>{
  if(!result||running||!runSnapshot)return;
  const source=runSnapshot.source;
  const bytes=new TextEncoder().encode(source);
  const digest=globalThis.crypto?.subtle
   ?await globalThis.crypto.subtle.digest("SHA-256",bytes).then(buffer=>
     Array.from(new Uint8Array(buffer),x=>x.toString(16).padStart(2,"0")).join("")
    ).catch(()=>null)
   :null;
  const evidence={
   schema:"MAH-Quantum-Experiment/v1",
   recordedAtUtc:new Date().toISOString(),
   software:"MAH Quantum logical-qubit classical simulation",
   circuit:{openQasm:source,sha256:digest,logicalQubits:result.backendInfo.qubitCount},
   execution:{seed:result.seed,requestedShots:result.backendInfo.shots,
    completedShots:Object.values(result.counts).reduce((sum,value)=>sum+value,0),
    method:result.method,exactForSupportedCircuit:result.exact,simulationTimeMs:result.executionTimeMs,
    finiteSupportRank:result.supportRank??null,idealProbabilityLog2:result.idealProbabilityLog2??null},
   measurement:{counts:result.counts,shotFrequencies:result.probabilities,
    idealProbabilitiesShown:result.idealProbabilities,
    omittedIdealProbabilityMass:result.distributionInfo.omittedIdealProbabilityMass},
   limitations:result.detail,
   notice:"A reproducible classical quantum circuit simulation, not a result measured on physical quantum hardware."
  };
  download("MAH-Quantum-"+result.backendInfo.qubitCount+"Q-experiment.json",JSON.stringify(evidence,null,2),"application/json");
  appendLog("Exported evidence package with SHA-256 source fingerprint.");
 };
 const editorKeys=(e:ReactKeyboardEvent<HTMLTextAreaElement>)=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="enter"){e.preventDefault();run();return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();saveNamed();return;}
  if(e.key!=="Tab"||e.ctrlKey||e.altKey)return;
  e.preventDefault();
  const el=e.currentTarget,begin=el.selectionStart,end=el.selectionEnd;
  const newSource=draft.source.slice(0,begin)+"  "+draft.source.slice(end);
  update({source:newSource,preset:"custom"});
  requestAnimationFrame(()=>{el.focus();el.setSelectionRange(begin+2,begin+2);});
 };
 const selectionLine=(el:HTMLTextAreaElement)=>{
  const before=el.value.slice(0,el.selectionStart);
  const lines=before.split("\n");setLineNo(lines.length);setColumnNo((lines[lines.length-1]?.length||0)+1);
 };
 const locate=(line:number)=>{
  const textarea=sourceEditor.current;
  if(!textarea)return;
  const segments=draft.source.split("\n");const bounded=Math.max(1,Math.min(line,segments.length));
  let index=0;for(let i=0;i<bounded-1;i++)index+=segments[i].length+1;
  textarea.focus();textarea.setSelectionRange(index,index);
  textarea.scrollTop=Math.max(0,(bounded-3)*21.6);setLineNo(bounded);setColumnNo(1);
 };
 const outcome=useMemo(()=>outcomeStats(result),[result]);
 const measured=useMemo(()=>result?bitSamples(result.counts,bitOffset,48):[],[result,bitOffset]);
 const ent=useMemo(()=>result?empiricalEntropy(result.counts):0,[result]);
 const selectedProb=measured.find(x=>x.bit===selectedBit);
 const diagnostics=preflight;
 const gateTotal=diagnostics?.topOperations.reduce((a,x)=>a+x.count,0)||0;
 const visibleSaved=saved.filter(x=>x.title.toLowerCase().includes(search.toLowerCase()));
 const isRunningTime=running&&clock&&startedAt?
  Math.max(0,(clock-Date.parse(startedAt))/1000):elapsed/1000;
 const logRows=logs.slice(-30);
 const lineCount=Math.min(10000,Math.max(1,draft.source.split("\n").length));
 const selectedHistoryRecord=history.find(h=>h.id===selectedHistory);
 return <Page eyebrow="MAH QUANTUM / RESEARCH COMPUTING" title="1000+ Qubit"
  description="An instrumented scientific workspace for exact, mathematically restricted large-scale quantum-circuit simulation. Classical computation only; no physical quantum processor.">
  <div className="hq-shell">
   <header className="hq-commandbar">
    <div className="hq-document">
     <span className="hq-eyebrow"><span className="hq-signal"/> QUANTUM RESEARCH CONSOLE <span className="hq-version">v2.0 · LOCAL</span></span>
     <label className="hq-name-label" htmlFor="hq-document-name">Experiment name</label>
     <input id="hq-document-name" className="hq-document-name" aria-label="Experiment name" maxLength={90}
      disabled={running} value={draft.title} onChange={e=>update({title:e.target.value})}/>
     <span className="hq-save-state" aria-live="polite">{storageStatus}. Drafts are not cloud-synced.</span>
    </div>
    <div className="hq-header-tools">
     <button type="button" onClick={createNew} disabled={running}>New experiment</button>
     <button type="button" onClick={saveNamed} disabled={running||draft.source.length>LARGE_LOCAL_SOURCE_LIMIT}>Save experiment</button>
     <button type="button" onClick={()=>importRef.current?.click()} disabled={running}>Import QASM</button>
     <input ref={importRef} className="hq-hidden-input" type="file" aria-label="Import QASM file" accept=".qasm,.txt,text/plain" onChange={e=>{void onImport(e);}}/>
     <button type="button" onClick={()=>download("MAH-Quantum-"+(draft.title.replace(/[^a-z0-9_-]/gi,"-").slice(0,45)||"experiment")+".qasm",draft.source,"text/plain")}>Export QASM</button>
    </div>
   </header>
   <section className="hq-spec-strip" aria-label="Large quantum computing specifications">
    <div><span>PLATFORM RANGE</span><strong>1,000–4,096</strong><small>logical qubits · supported families</small></div>
    <div><span>EXPANDED CIRCUIT LIMIT</span><strong>8,192</strong><small>operations per experiment</small></div>
    <div><span>MAXIMUM SHOTS</span><strong>1,024</strong><small>measurement samples per run</small></div>
    <div><span>SOLVER TYPE</span><strong>EXACT</strong><small>within validated mathematical families</small></div>
   </section>
   <div className="hq-workspace">
    <aside className="hq-sidebar" aria-label="Research experiment library">
     <div className="hq-sidebar-head"><span>WORKSPACE LIBRARY</span><b>{saved.length}/{LARGE_SAVED_LIMIT}</b></div>
     <div className="hq-sidebar-section">
      <label className="hq-small-label" htmlFor="hq-preset">REFERENCE EXPERIMENT</label>
      <select id="hq-preset" className="hq-select" aria-label="Large circuit preset" value={draft.preset} disabled={running}
       onChange={e=>setPreset(e.target.value as Exclude<LargePreset,"custom">)}>
       {PRESETS.map(p=><option value={p.id} key={p.id}>{p.label}</option>)}
       <option disabled value="custom">Custom source</option>
      </select>
      <div className="hq-preset-cards">
       {PRESETS.map(p=><button type="button" key={p.id} disabled={running}
        className={draft.preset===p.id?"hq-preset active":"hq-preset"} onClick={()=>setPreset(p.id)}
        aria-pressed={draft.preset===p.id}>
        <span>{p.label}</span><small>{p.detail}</small>
       </button>)}
      </div>
     </div>
     <div className="hq-sidebar-section hq-library">
      <div className="hq-mini-heading"><span>SAVED EXPERIMENTS</span><small>local browser</small></div>
      <input type="search" aria-label="Search experiments" placeholder="Search experiments" value={search}
       onChange={e=>setSearch(e.target.value)}/>
      {!visibleSaved.length?<p className="hq-muted">No named experiments found. Save the current circuit to build your library.</p>:
       <div className="hq-saved-list">{visibleSaved.map(item=><div key={item.id} className={selectedSaved===item.id?"hq-saved-item selected":"hq-saved-item"}>
        <button disabled={running} onClick={()=>loadSaved(item)} title={"Open "+item.title}><strong>{item.title}</strong><small>{stamp(item.updated)} · {number(item.draft.qubits)} Q</small></button>
        <button className="hq-delete" disabled={running} aria-label={"Delete "+item.title} title="Delete named snapshot" onClick={()=>deleteSaved(item)}>×</button>
       </div>)}</div>}
     </div>
     <div className="hq-sidebar-section">
      <div className="hq-mini-heading"><span>JOB HISTORY</span>
       <button type="button" className="hq-text-button" onClick={()=>{
        if(confirm("Clear local run history?")){setHistory([]);setSelectedHistory(null);appendLog("Cleared local history.");}
       }}>Clear</button>
      </div>
      {!history.length?<p className="hq-muted">Completed simulations appear here. Only bounded metadata is retained.</p>:
       <div className="hq-history-list">
        {history.slice(0,8).map(item=><button key={item.id} className={selectedHistory===item.id?"hq-history active":"hq-history"}
         onClick={()=>setSelectedHistory(selectedHistory===item.id?null:item.id)}>
         <span><i className={"hq-history-dot "+item.status}/>{item.qubits.toLocaleString()} Q · {item.status}</span>
         <small>{stamp(item.created)}</small>
        </button>)}
       </div>}
      {selectedHistoryRecord&&<div className="hq-history-detail">
       <b>{selectedHistoryRecord.title}</b>
       <span>Backend: {method(selectedHistoryRecord.method)}</span>
       <span>Seed {selectedHistoryRecord.seed} · {selectedHistoryRecord.shots} shots</span>
       <span>Runtime {selectedHistoryRecord.durationMs.toFixed(1)} ms</span>
       {selectedHistoryRecord.error&&<span>{selectedHistoryRecord.error}</span>}
       <small>History stores run metadata, not the full output. Export the result immediately after a run.</small>
      </div>}
     </div>
     <div className="hq-rail-footer"><span>DATA POLICY</span><p>Drafts and run metadata are stored in this browser only. Do not enter confidential customer data without approval. Local storage is not encrypted or access-controlled.</p></div>
    </aside>
    <section className="large-editor hq-circuit" aria-label="1000-plus circuit editor">
     <div className="hq-section-header">
      <div><span className="hq-index">01 / CIRCUIT DESIGN</span><h2>Quantum circuit studio</h2></div>
      <div className="hq-backend-status">{checking?"Analyzing…":preflight?"Preflight ready":"Preflight needs attention"}</div>
     </div>
     <div className="hq-controls">
      <label>Logical qubits
       <select aria-label="Large circuit qubit count" value={draft.qubits} disabled={running} onChange={e=>{
        const width=Number(e.target.value);
        setPreset(draft.preset==="custom"?"ghz":draft.preset,width);
       }}>{sizes.map(x=><option value={x} key={x}>{number(x)}</option>)}</select>
      </label>
      <label>Measurement shots
       <select aria-label="Large circuit shots" value={draft.shots} disabled={running}
        onChange={e=>update({shots:Number(e.target.value)})}>
        {SHOTS.map(x=><option key={x} value={x}>{number(x)}</option>)}
       </select>
      </label>
      <label>Random seed
       <input aria-label="Large circuit seed" type="number" min={0} max={4294967295} step={1}
        disabled={running} value={draft.seed} onChange={e=>update({seed:Number(e.target.value)})}/>
      </label>
     </div>
     <p className="hq-controls-note">QASM register declarations determine execution width. Changing the width selector reloads a reference template.</p>
     <div className="hq-tablist" role="tablist" aria-label="Circuit workspace views">
      {([["editor","QASM editor"],["map","Circuit map"],["log","Execution log"]] as [EditorTab,string][]).map(([key,label])=>
       <button type="button" role="tab" aria-selected={editorTab===key} key={key} onClick={()=>setEditorTab(key)}>{label}</button>)}
     </div>
     <div className="hq-editor-body" hidden={editorTab!=="editor"}>
      <div className="hq-editor-toolbar">
       <div><span className="hq-file-dot"/><strong>experiment.qasm</strong><small>OpenQASM 2/3 subset</small></div>
       <div><span>{number(draft.source.length)} chars</span><span>{number(lineCount)} lines</span></div>
      </div>
      <div className="hq-code-surface">
       <pre aria-hidden="true" className="hq-gutter" ref={gutterRef}>{Array.from({length:lineCount},(_,i)=>i+1).join("\n")}</pre>
       <textarea className="large-code" ref={sourceEditor} aria-label="Large quantum QASM code" spellCheck={false} wrap="off"
        value={draft.source} disabled={running} onScroll={e=>{if(gutterRef.current)gutterRef.current.scrollTop=e.currentTarget.scrollTop;}}
        onChange={e=>{update({source:e.target.value,preset:"custom"});selectionLine(e.target);}}
        onKeyDown={editorKeys} onClick={e=>selectionLine(e.currentTarget)} onKeyUp={e=>selectionLine(e.currentTarget)}/>
      </div>
      <div className="hq-editor-footer">
       <span>Ln {lineNo}, Col {columnNo} · UTF-8 · 2-space indent</span>
       <span><kbd>Ctrl</kbd> + <kbd>Enter</kbd> Run <span aria-hidden="true">·</span> <kbd>Ctrl</kbd> + <kbd>S</kbd> Save</span>
      </div>
     </div>
     <div className="hq-map-panel" hidden={editorTab!=="map"}>
      <div className="hq-mini-heading"><span>COMPUTATIONAL TOPOLOGY</span><small>Actual parsed gate data</small></div>
      {!diagnostics?<p className="hq-muted">{preflightError||"Analyzing circuit…"}</p>:<>
       <div className="hq-map-facts">
        <div><b>{number(diagnostics.activeQubits)}</b><span>active logical qubits</span></div>
        <div><b>{number(diagnostics.entanglingGates)}</b><span>multi-qubit operations</span></div>
        <div><b>{number(diagnostics.gateDepthEstimate)}</b><span>greedy logical depth estimate</span></div>
       </div>
       <p className="hq-muted">Activity heatmap of consecutive logical qubit groups. Brighter segments represent more gate references, not physical pulse intensity.</p>
       <div className="hq-touchmap" role="img" aria-label={"Gate activity across "+diagnostics.program.qubits+" logical qubits"}>
        {Array.from({length:64},(_,i)=>{
         const start=Math.floor(i*diagnostics.program.qubits/64);
         const end=Math.min(diagnostics.program.qubits,Math.floor((i+1)*diagnostics.program.qubits/64));
         let active=0;
         for(let q=start;q<end;q++)active+=diagnostics.qubitTouches[q];
         const peak=Math.min(1,Math.log2(active+1)/8);
         return <div key={i} style={{opacity:.2+.8*peak}} title={"q"+start+"–q"+(end-1)+": "+active+" gate references"}/>;
        })}
       </div>
       <div className="hq-gate-list"><div className="hq-mini-heading"><span>OPERATION COMPOSITION</span><small>{number(gateTotal)} expanded steps</small></div>
        {diagnostics.topOperations.map(op=><div className="hq-gate-row" key={op.name}>
         <span>{op.name}</span><div><i style={{width:(gateTotal?100*op.count/gateTotal:0)+"%"}}/></div><b>{number(op.count)}</b>
        </div>)}
       </div>
      </>}
     </div>
     <div className="hq-log-panel" hidden={editorTab!=="log"}>
      <div className="hq-mini-heading"><span>LOCAL WORKER EVENTS</span><button className="hq-text-button" onClick={()=>setLogs([])}>Clear log</button></div>
      <div role="log" aria-label="Quantum worker execution log" className="hq-log-lines">
       {logRows.map((entry,i)=><div key={i}><time>{entry.at}</time><span>{entry.message}</span></div>)}
      </div>
      <p className="hq-muted">Job stages are worker messages, not a fabricated numerical progress percentage.</p>
     </div>
     <div className="hq-preflight">
      <div className="hq-mini-heading"><span>SCIENTIFIC PREFLIGHT</span><small>{checking?"Analyzing QASM…":preflight?"VALIDATED INPUT":"ACTION REQUIRED"}</small></div>
      {preflight?<div className="hq-preflight-grid">
       <div><span>Execution backend</span><b>{displayBackend(preflight.method)}</b></div>
       <div><span>Expanded gates</span><b>{number(preflight.expandedGates)} / 8,192</b></div>
       <div><span>Estimated logical depth</span><b>{number(preflight.gateDepthEstimate)}</b></div>
       <div><span>Quantum register</span><b>{number(preflight.program.qubits)} logical Q</b></div>
      </div>:<p className="hq-preflight-error" role="status">{checking?"Checking the circuit input…":preflightError}</p>}
      {preflight&&preflight.method==="partitioned-statevector"&&<p className="hq-preflight-caution">Partitioned exact simulation is admitted only when each connected entangled group has ≤18 qubits and the total amplitude budget fits. Final resource checks occur during execution.</p>}
     </div>
     <div className="large-actions hq-execution-controls">
      <button type="button" className="large-primary" onClick={run} disabled={running||checking||!preflight}>
       {running?"Computing…":"Run quantum circuit"}</button>
      {running&&<button type="button" onClick={cancel}>Cancel computation</button>}
      <button type="button" disabled={running} onClick={()=>setPreset(draft.preset==="custom"?"ghz":draft.preset)}>Restore preset</button>
      <button type="button" disabled={!result||running} onClick={()=>{void exportExperiment();}}>Download reproducible JSON</button>
     </div>
     <div className="hq-job-status" aria-live="polite">
      <span className={running?"hq-pulse":"hq-dot"}/>
      <span>{running?"Worker: "+stage+" · "+isRunningTime.toFixed(1)+" seconds elapsed":
       result?"Run completed · "+number(result.backendInfo.shots)+" shots · "+elapsed.toFixed(1)+" ms browser duration":
       "Idle · ready for local execution"}</span>
     </div>
     {error&&<p role="alert" className="large-error">{error}</p>}
     {running&&<p role="status" className="large-status">Computing locally in an isolated browser worker. Completion time depends on circuit topology and device resources.</p>}
    </section>
    <section className="large-results hq-inspector" aria-label="Quantum computation results">
     <div className="hq-section-header">
      <div><span className="hq-index">02 / SCIENTIFIC ANALYSIS</span><h2>Measurement inspector</h2></div>
      <span className="hq-tag">{result?"DATA AVAILABLE":"NO DATA"}</span>
     </div>
     {!result?<div className="large-empty">
      <div className="hq-empty-symbol">|ψ⟩</div>
      <h3>Awaiting simulation output</h3>
      <p>Run a validated circuit to inspect sampled distributions, individual classical output-bit frequencies, and experimental provenance.</p>
      <span className="hq-empty-meta">No physical qubit state or hardware telemetry is represented.</span>
     </div>:<>
      <div className="large-telemetry">
       <div><span>Method</span><b>{method(result.method)}</b></div>
       <div><span>Logical qubits</span><b>{number(result.backendInfo.qubitCount)}</b></div>
       <div><span>Completed shots</span><b>{number(outcome.total)} / {number(result.backendInfo.shots)}</b></div>
       <div><span>Computation time</span><b>{result.executionTimeMs.toFixed(1)} ms</b></div>
      </div>
      <div className="hq-insights">
       <div><span>Distinct measured outcomes</span><b>{number(outcome.distinct)}</b></div>
       <div><span>Sample Shannon entropy</span><b>{ent.toFixed(3)} bits</b></div>
      </div>
      <p className="large-scope">Mathematically exact for the selected supported circuit family. Sample frequencies are stochastic; no physical-device fidelity is estimated.</p>
      {result.method==="stabilizer-tableau"&&<div className="large-metric">
       <span>Exact Z-basis support dimension</span><b>2<sup>{result.supportRank}</sup> bitstrings</b>
       <small>Each supported full classical bitstring has theoretical probability 2<sup>−{result.supportRank}</sup>. Extremely small values are reported symbolically.</small>
      </div>}
      <div className="hq-tablist hq-inspector-tabs" role="tablist" aria-label="Quantum result analysis views">
       {([["outcomes","Distribution"],["bits","Bit analyzer"],["evidence","Method & evidence"]] as [InspectorTab,string][]).map(([key,label])=>
        <button type="button" role="tab" key={key} aria-selected={inspectorTab===key} onClick={()=>setInspectorTab(key)}>{label}</button>)}
      </div>
      {inspectorTab==="outcomes"&&<div className="hq-outcome-tab">
       <div className="large-outcome-header"><b>Most frequent measured outcomes</b><span>{number(outcome.distinct)} distinct · showing {Math.min(24,outcome.distinct)}</span></div>
       <div className="large-outcomes">
        {outcome.rows.slice(0,24).map(([bits,count])=><button type="button" className={selectedOutcome===bits?"large-outcome selected":"large-outcome"} key={bits}
         onClick={()=>setSelectedOutcome(selectedOutcome===bits?null:bits)} title="Inspect full measured outcome">
         <code>{compact(bits)}</code><span>{number(count)} / {number(result.backendInfo.shots)}</span>
         <div className="large-meter"><i style={{width:100*count/result.backendInfo.shots+"%"}}/></div>
        </button>)}
       </div>
       {selectedOutcome&&<div className="hq-selected-outcome"><div className="hq-mini-heading"><span>SELECTED FULL BITSTRING</span>
        <button type="button" onClick={()=>{
         void navigator.clipboard?.writeText(selectedOutcome).then(()=>appendLog("Copied measured bitstring to clipboard."),()=>appendLog("Clipboard permission declined."));
        }}>Copy</button></div>
        <code>{selectedOutcome}</code>
        <span>{number(selectedOutcome.length)} bits · classical output register, highest index on the left</span>
       </div>}
       <p className="large-footnote">This chart shows sampled outcomes only, not a full enumeration of 2<sup>{result.backendInfo.qubitCount}</sup> basis states. Outcome frequencies vary with seed and shot count.</p>
      </div>}
      {inspectorTab==="bits"&&<div className="hq-bit-panel">
       <div className="hq-mini-heading"><span>MEASURED CLASSICAL BITS</span><small>{number(outcome.width)} output bits</small></div>
       <p className="hq-muted">Sampled probability of output bit = 1. These are classical measurement marginals, not Bloch vectors or entanglement entropy.</p>
       <div className="hq-bit-pagination">
        <button onClick={()=>setBitOffset(v=>Math.max(0,v-48))} disabled={bitOffset===0}>Previous 48</button>
        <span>c{bitOffset}–c{Math.min(outcome.width-1,bitOffset+47)}</span>
        <button onClick={()=>setBitOffset(v=>Math.min(Math.max(0,outcome.width-48),v+48))} disabled={bitOffset+48>=outcome.width}>Next 48</button>
       </div>
       <div className="hq-bit-bars">
        {measured.map(x=><button type="button" key={x.bit} className={selectedBit===x.bit?"hq-bit selected":"hq-bit"}
         onClick={()=>setSelectedBit(x.bit)} title={"Classical c"+x.bit+" · observed P(1) "+(100*x.probability).toFixed(2)+"%"}>
         <i style={{height:Math.max(2,x.probability*100)+"%"}}/><span>{x.bit}</span>
        </button>)}
       </div>
       {selectedProb&&<div className="hq-focus"><span>c{selectedProb.bit} sampled P(1)</span><b>{(100*selectedProb.probability).toFixed(2)}%</b><small>{selectedProb.ones} / {outcome.total} measurements recorded as 1</small></div>}
      </div>}
      {inspectorTab==="evidence"&&<div className="hq-evidence">
       <div><span>Mathematical representation</span><b>{method(result.method)}</b></div>
       <div><span>Exactness scope</span><b>{result.exact?"Exact for supported ideal circuit family":"Approximate"}</b></div>
       <div><span>Reproducibility seed</span><b>{result.seed}</b></div>
       <div><span>Classical output width</span><b>{number(outcome.width)} bits</b></div>
       <div><span>Ideal distribution mass omitted from summary</span><b>{Math.max(0,result.distributionInfo.omittedIdealProbabilityMass).toPrecision(3)}</b></div>
       <p>{proofInfo(result)}</p><p>{result.detail}</p>
       <p>No physical hardware noise, error correction or calibrated gate fidelity is simulated by this workspace.</p>
       <button type="button" onClick={()=>{void exportExperiment();}}>Download reproducible JSON</button>
      </div>}
     </>}
    </section>
   </div>
   <section className="hq-science-foot">
    <div><span>SIMULATION BACKENDS</span><h2>Scientific capability, with explicit boundaries</h2>
     <p>Clifford circuits use signed stabilizer tableaux; separable one-qubit circuits use complex product states; bounded independent entangled non-Clifford components use small exact statevectors. This does not simulate arbitrary universal 4,096-qubit circuits.</p>
    </div>
    <div><span>RESEARCH OPERATING NOTES</span><h2>Designed for traceable experiments</h2>
     <p>Sessions are autosaved only on this device. Keep source files and exported JSON in your approved research data system. Industrial teams should independently validate their circuits, hardware assumptions, access controls and results before operational decisions.</p>
    </div>
   </section>
  </div>
 </Page>;
}
