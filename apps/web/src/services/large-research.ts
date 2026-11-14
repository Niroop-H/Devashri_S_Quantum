import type {ScalableResult,LargeProgram,ScalableMethod} from "../../../engine/src/studio/scalable";
import {methodFor} from "../../../engine/src/studio/scalable";
import {parseLargeQasm} from "../../../engine/src/studio/largeQasm";

export type LargePreset="ghz"|"cluster"|"plus"|"rotations"|"custom";
export interface LargeDraft {title:string;source:string;qubits:number;preset:LargePreset;shots:number;seed:number}
export interface LargeSaved {id:string;title:string;updated:string;draft:LargeDraft}
export interface LargeHistory {
 id:string;title:string;created:string;qubits:number;shots:number;seed:number;method:string;
 durationMs:number;distinctOutcomes:number;status:"completed"|"failed"|"cancelled";error?:string
}
export interface LargeDocument {version:2;draft:LargeDraft;saved:LargeSaved[];history:LargeHistory[]}
export type GateHistogram={name:string;count:number};
export interface LargePreflight {
 program:LargeProgram;method:ScalableMethod;expandedGates:number;entanglingGates:number;
 measuredBits:number;singleQubitGates:number;topOperations:GateHistogram[];
 activeQubits:number;gateDepthEstimate:number;sourceLines:number;qubitTouches:Uint16Array;
}
export const LARGE_DOCUMENT_KEY="mah-quantum-research-1000-v2";
export const LARGE_SOURCE_LIMIT=750000;
export const LARGE_LOCAL_SOURCE_LIMIT=140000;
export const LARGE_SAVED_LIMIT=10;
export const LARGE_HISTORY_LIMIT=24;
const presetTitles:Record<Exclude<LargePreset,"custom">,string>={
 ghz:"GHZ correlation experiment",cluster:"Linear graph-state experiment",
 plus:"Hadamard superposition study",rotations:"Separable rotation study"
};
export const sizes=[1000,1024,1536,2048,4096];
export function presetSource(n:number,preset:Exclude<LargePreset,"custom">){
 const lines=["OPENQASM 2.0;",'include "qelib1.inc";',"qreg q["+n+"];", "creg c["+n+"];"];
 if(preset==="ghz"){
  lines.push("h q[0];");
  for(let i=1;i<n;i++)lines.push("cx q["+(i-1)+"],q["+i+"];");
 }else if(preset==="cluster"){
  lines.push("h q;");
  for(let i=1;i<n;i++)lines.push("cz q["+(i-1)+"],q["+i+"];");
 }else if(preset==="plus")lines.push("h q;");
 else lines.push("ry(pi/3) q;");
 return lines.join("\n")+"\n";
}
export function newLargeDraft(n=1000,preset:Exclude<LargePreset,"custom">="ghz"):LargeDraft{
 return {title:presetTitles[preset],qubits:n,preset,shots:256,seed:42,source:presetSource(n,preset)};
}
export function isDraft(value:unknown):value is LargeDraft{
 if(!value||typeof value!=="object")return false;
 const d=value as Partial<LargeDraft>;
 return typeof d.title==="string"&&d.title.length<=100&&
  typeof d.source==="string"&&d.source.length<=LARGE_LOCAL_SOURCE_LIMIT&&
  sizes.includes(d.qubits as number)&&
  ["ghz","cluster","plus","rotations","custom"].includes(d.preset as string)&&
  Number.isInteger(d.shots)&&[32,64,128,256,512,1024].includes(d.shots as number)&&
  Number.isInteger(d.seed)&&(d.seed as number)>=0&&(d.seed as number)<=4294967295;
}
export function readLargeDocument():LargeDocument{
 const empty:LargeDocument={version:2,draft:newLargeDraft(),saved:[],history:[]};
 try{
  const raw=localStorage.getItem(LARGE_DOCUMENT_KEY);
  if(!raw||raw.length>1800000)return empty;
  const value=JSON.parse(raw) as Partial<LargeDocument>;
  if(value.version!==2)return empty;
  const saved=(Array.isArray(value.saved)?value.saved:[]).filter(
   (s):s is LargeSaved=>Boolean(s&&typeof s.id==="string"&&
    typeof s.title==="string"&&typeof s.updated==="string"&&isDraft(s.draft))
  ).slice(0,LARGE_SAVED_LIMIT);
  const history=(Array.isArray(value.history)?value.history:[]).filter(
   (h):h is LargeHistory=>Boolean(h&&typeof h.id==="string"&&typeof h.title==="string"&&
    typeof h.created==="string"&&Number.isFinite(h.durationMs)&&
    ["completed","cancelled","failed"].includes(h.status))
  ).slice(0,LARGE_HISTORY_LIMIT);
  return {version:2,draft:isDraft(value.draft)?value.draft:empty.draft,saved,history};
 }catch{return empty;}
}
export function writeLargeDocument(doc:LargeDocument):boolean{
 try{
  const serialized=JSON.stringify(doc);
  if(serialized.length>1750000)return false;
  localStorage.setItem(LARGE_DOCUMENT_KEY,serialized);return true;
 }catch{return false;}
}
export function preflightLarge(source:string):LargePreflight{
 if(source.length>LARGE_SOURCE_LIMIT)throw Error("Circuit source is larger than the 750,000-character editor limit.");
 const program=parseLargeQasm(source);
 if(program.qubits<1000)throw Error("Use the Quantum Computing Studio for circuits below 1,000 logical qubits.");
 const method=methodFor(program);
 const touches=new Uint16Array(program.qubits);
 const histogram=new Map<string,number>();
 let entanglingGates=0,singleQubitGates=0,measuredBits=0,depth=0;
 const lastLayer=new Uint16Array(program.qubits);
 for(const step of program.steps){
  histogram.set(step.gate,(histogram.get(step.gate)||0)+1);
  if(step.gate==="MEASURE"){measuredBits++;continue;}
  if(step.gate==="BARRIER")continue;
  const operands=[...step.targets,...(step.controls||[])];
  const gateDepth=operands.reduce((d,q)=>Math.max(d,lastLayer[q]),0)+1;
  depth=Math.max(depth,gateDepth);
  if(operands.length>=2)entanglingGates++;
  else singleQubitGates++;
  for(const q of operands){touches[q]=Math.min(65535,touches[q]+1);lastLayer[q]=gateDepth;}
 }
 return {program,method,expandedGates:program.steps.length,entanglingGates,measuredBits,
  singleQubitGates,topOperations:[...histogram.entries()].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count).slice(0,10),
  activeQubits:touches.reduce((a,n)=>a+(n>0?1:0),0),
  sourceLines:source.split("\n").length,gateDepthEstimate:depth,qubitTouches:touches};
}
export function displayBackend(method:ScalableMethod){
 return method==="stabilizer-tableau"?"Clifford stabilizer tableau":
  method==="separable-state"?"Separable pure-state":"Partitioned exact statevectors";
}
export function makeHistoryEntry(title:string,result:ScalableResult,status:LargeHistory["status"],date:string,error?:string):LargeHistory{
 return {id:date+"-"+Math.floor(Math.random()*1e7),title:title.slice(0,80),
  created:date,qubits:result.backendInfo.qubitCount,shots:result.backendInfo.shots,
  seed:result.seed,method:result.method,durationMs:result.executionTimeMs,
  distinctOutcomes:Object.keys(result.counts).length,status,error};
}
export function bitSamples(counts:Record<string,number>,offset:number,count:number){
 const entries=Object.entries(counts);
 const width=entries[0]?.[0].length??0;
 const total=entries.reduce((n,[,shots])=>n+shots,0);
 return Array.from({length:Math.max(0,Math.min(count,width-offset))},(_,i)=>{
  const index=offset+i;
  const ones=entries.reduce((n,[label,shots])=>n+(label[width-index-1]==="1"?shots:0),0);
  return {bit:index,ones,probability:total?ones/total:0};
 });
}
export function empiricalEntropy(counts:Record<string,number>):number{
 const total=Object.values(counts).reduce((a,b)=>a+b,0);
 if(!total)return 0;
 return -Object.values(counts).reduce((a,n)=>{
  const p=n/total;
  return a+(p>0?p*Math.log2(p):0);
 },0);
}
