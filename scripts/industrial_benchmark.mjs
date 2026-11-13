/**
 * Audited reproducible industrial numerical acceptance and resource telemetry.
 * Produces machine-readable benchmark artifacts; not a production performance SLA.
 */
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdirSync,writeFileSync} from "node:fs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {runWeightedOptimization}=require("../apps/engine/dist/industrial/optimization.js");
const inputs=[
 {name:"Two-node reference",nodes:["A","B"],edges:[{source:0,target:1,weight:1}]},
 {name:"Production conflict graph (synthetic)",nodes:["A","B","C","D","E","F","G","H"],edges:[
  {source:0,target:1,weight:7},{source:0,target:2,weight:4},{source:1,target:3,weight:5},
  {source:1,target:4,weight:8},{source:2,target:5,weight:4},{source:2,target:6,weight:6},
  {source:3,target:5,weight:5},{source:4,target:6,weight:9},{source:4,target:7,weight:4},
  {source:6,target:7,weight:7},{source:0,target:7,weight:2},{source:3,target:6,weight:3}
 ]},
 {name:"Dense 12-node graph",nodes:Array.from({length:12},(_,i)=>"Q"+i),
  edges:Array.from({length:12},(_,i)=>i).flatMap(i=>Array.from({length:12-i-1},(_,j)=>({
   source:i,target:i+j+1,weight:1
  })))}
];
const settings={shots:512,seed:2026};
const results=[];
for(const input of inputs){
 const solved=runWeightedOptimization(input,settings);
 const {quantum,classical,execution,model}=solved;
 assert.ok(quantum.exactExpectedScore<=classical.optimum+1e-8);
 assert.ok(quantum.bestSampleScore<=classical.optimum+1e-8);
 assert.ok(classical.greedyScore<=classical.optimum+1e-8);
 assert.equal(execution.completedShots,settings.shots);
 assert.equal(quantum.outcomes.reduce((s,o)=>s+o.shots,0),settings.shots);
 const twin=runWeightedOptimization(input,settings);
 assert.deepEqual(twin.quantum,quantum);
 const entry={
  input:input.name,sha256:createHash("sha256").update(JSON.stringify(solved.graph)).digest("hex"),
  nodes:solved.graph.nodes.length,edges:solved.graph.edges.length,
  exactClassicalOptimum:classical.optimum,
  greedy:classical.greedyScore,
  quantumExpectation:quantum.exactExpectedScore,
  quantumRatio:quantum.approximationRatio,
  bestSampledScore:quantum.bestSampleScore,
  parameterEvaluations:model.parameterEvaluations,
  runtimeMs:execution.elapsedMs,
  statevectorBytes:model.statevectorBytes,
  seed:settings.seed,shots:settings.shots,
  deterministic:true,method:"classical ideal QAOA p=1"
 };
 results.push(entry);
 console.log("INDUSTRIAL_BENCHMARK "+JSON.stringify(entry));
}
const artifact={
 schema:"MAH-Quantum-Industrial-Numerical-Reference/v1",
 recordedAtUtc:new Date().toISOString(),
 commit:process.env.GITHUB_SHA||"local",
 scope:"Synthetic bounded MaxCut QAOA evaluation; no physical-QPU or commercial SLA claims",
 tests:results.length,results,
};
mkdirSync("artifacts",{recursive:true});
writeFileSync("artifacts/industrial-optimization-benchmarks.json",JSON.stringify(artifact,null,2)+"\n");
console.log("INDUSTRIAL_BENCHMARK_SUMMARY "+JSON.stringify({passed:results.length,failed:0}));
