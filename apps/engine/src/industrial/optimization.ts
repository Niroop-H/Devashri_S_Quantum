/**
 * MAH Quantum — auditable weighted MaxCut QAOA workbench.
 *
 * This module models a precise graph-partitioning objective. QAOA p=1 is
 * computed using the exact FP64 2^n statevector (not physical hardware).
 * Every experiment is checked against exhaustive classical MaxCut and
 * a separately implemented deterministic single-bit-flip heuristic.
 *
 * All data sets in the UI are synthetic unless supplied by the operator.
 * No claim of quantum advantage, real-time industrial optimization, or
 * correctness of an external industrial system is implied.
 */
import { QuantumCircuit } from "../simulator/QuantumCircuit";
import { createRxGate } from "../math/gates";

export interface WeightedEdge { source:number;target:number;weight:number }
export interface WeightedGraph {
 name:string;
 nodes:string[];
 edges:WeightedEdge[];
 context?:string;
}
export interface OptimizationSettings {shots:number;seed:number}
export interface OptimizationResult {
 schema:"MAH-Quantum-Weighted-MaxCut/v1";
 graph:WeightedGraph;
 settings:OptimizationSettings;
 objective:"max-sum-weight-of-edges-crossing-the-partition";
 model:{family:"QAOA";layers:1;solver:"FP64 dense statevector";logicalQubits:number;
  gateEquivalent:number;parameterEvaluations:number;statevectorBytes:number;simulatedHardware:false};
 classical:{optimum:number;optimalAssignment:string;optimumDegeneracy:number;
  greedyScore:number;greedyAssignment:string;randomExpectedScore:number};
 quantum:{gamma:number;beta:number;exactExpectedScore:number;approximationRatio:number;
  sampledMeanScore:number;approximate95PercentInterval:[number,number];
  probabilityOfOptimalCut:number;bestSampleScore:number;bestSampleAssignment:string;
  bestSampleRatio:number;outcomes:{assignment:string;shots:number;probability:number;score:number}[]};
 execution:{elapsedMs:number;completedShots:number;status:"completed"};
 caveats:string[];
}

const MAX_NODES=12,MAX_EDGES=66,MAX_SHOTS=4096;
function finiteNumber(v:unknown):v is number{return typeof v==="number"&&Number.isFinite(v);}
export function validateWeightedGraph(raw:unknown):WeightedGraph {
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error("Graph must be a JSON object.");
 const p=raw as Record<string,unknown>;
 if(typeof p.name!=="string"||!p.name.trim()||p.name.length>90)throw Error("Graph name must be 1–90 characters.");
 if(!Array.isArray(p.nodes)||p.nodes.length<2||p.nodes.length>MAX_NODES)
  throw Error("An optimization graph must contain 2–12 labeled decision nodes.");
 const nodes=p.nodes as unknown[];
 if(nodes.some(x=>typeof x!=="string"||!x.trim()||x.length>48))
  throw Error("Every decision node needs a nonempty label of at most 48 characters.");
 const labels=nodes.map(x=>(x as string).trim());
 if(new Set(labels.map(x=>x.toLocaleLowerCase("en"))).size!==labels.length)
  throw Error("Decision-node labels must be unique.");
 if(!Array.isArray(p.edges)||p.edges.length<1||p.edges.length>MAX_EDGES)
  throw Error("A graph must contain 1–66 weighted edges.");
 const seen=new Set<string>();
 const edges:WeightedEdge[]=[];
 for(const [i,item] of (p.edges as unknown[]).entries()){
  if(!item||typeof item!=="object"||Array.isArray(item))throw Error("Edge "+(i+1)+": invalid record.");
  const e=item as Record<string,unknown>;
  if(!Number.isInteger(e.source)||!Number.isInteger(e.target)||
    (e.source as number)<0||(e.target as number)<0||
    (e.source as number)>=labels.length||(e.target as number)>=labels.length||
    e.source===e.target)
   throw Error("Edge "+(i+1)+": source and target must be distinct in-range node indices.");
  if(!finiteNumber(e.weight)||e.weight<=0||e.weight>1000)
   throw Error("Edge "+(i+1)+": weight must be positive and no greater than 1,000.");
  const a=Math.min(e.source as number,e.target as number),b=Math.max(e.source as number,e.target as number);
  const key=a+":"+b;
  if(seen.has(key))throw Error("Edge "+(i+1)+": duplicate undirected edge.");
  seen.add(key);
  edges.push({source:a,target:b,weight:e.weight});
 }
 const context=p.context===undefined?undefined:
  typeof p.context==="string"&&p.context.length<=350?p.context:
   (()=>{throw Error("Context must be up to 350 characters.");})();
 return {name:p.name.trim(),nodes:labels,edges,context};
}
const bitString=(mask:number,n:number)=>mask.toString(2).padStart(n,"0");
export function cutScore(graph:WeightedGraph,assignment:number):number{
 return graph.edges.reduce((acc,e)=>acc+(((assignment>>>e.source)^(assignment>>>e.target))&1?e.weight:0),0);
}
function seededRandom(seed:number){
 let x=seed>>>0;
 return()=>{x=(x+0x6d2b79f5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);
  t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};
}
function inverseCDF(cdf:Float64Array,value:number){
 let left=0,right=cdf.length-1;
 while(left<right){
  const mid=(left+right)>>>1;
  if(value<cdf[mid])right=mid;else left=mid+1;
 }
 return left;
}
/**
 * QAOA p=1:
 * |psi(gamma,beta)> = prod_j exp(-i beta X_j) exp(-i gamma C(z)) |+>^n.
 * The cost phase is diagonal, and RX(2beta) is applied using the independent
 * low-level quantum gate routine. This is a circuit computation, not a
 * classical probability heuristic dressed up as quantum.
 */
export function qaoaProbabilities(graph:WeightedGraph,gamma:number,beta:number):Float64Array{
 if(!finiteNumber(gamma)||!finiteNumber(beta))throw Error("QAOA angles must be finite.");
 const size=2**graph.nodes.length,c=new QuantumCircuit(graph.nodes.length);
 const amplitude=1/Math.sqrt(size);
 for(let z=0;z<size;z++){
  const phase=-gamma*cutScore(graph,z);
  c.real[z]=Math.cos(phase)*amplitude;
  c.imag[z]=Math.sin(phase)*amplitude;
 }
 const rx=createRxGate(2*beta);
 for(let q=0;q<graph.nodes.length;q++)c.applySingleQubitGate(q,rx);
 return c.getProbabilities();
}
function expectation(prob:Float64Array,scores:Float64Array){
 let result=0;for(let i=0;i<prob.length;i++)result+=prob[i]*scores[i];return result;
}
export function runWeightedOptimization(raw:unknown,settings:OptimizationSettings):OptimizationResult{
 const started=performance.now();
 const graph=validateWeightedGraph(raw);
 const {shots,seed}=settings||({} as OptimizationSettings);
 if(!Number.isInteger(shots)||shots<128||shots>MAX_SHOTS)throw Error("Shots must be an integer from 128 to 4,096.");
 if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error("Seed must be a 32-bit unsigned integer.");
 const n=graph.nodes.length,size=2**n,scores=new Float64Array(size);
 let optimum=-Infinity,optMask=0,degeneracy=0;
 for(let z=0;z<size;z++){
  const v=cutScore(graph,z);scores[z]=v;
  if(v>optimum+1e-9){optimum=v;optMask=z;degeneracy=1;}
  else if(Math.abs(v-optimum)<1e-9)degeneracy++;
 }
 // Independent classical local-improvement baseline: start with all-zeros
 // and repeatedly apply the best strictly improving single-bit flip.
 let greedyMask=0,greedyScore=scores[0];
 for(let step=0;step<n;step++){
  let candidate=greedyMask,candidateValue=greedyScore;
  for(let q=0;q<n;q++){
   const proposed=greedyMask^(1<<q),score=scores[proposed];
   if(score>candidateValue+1e-9){candidate=proposed;candidateValue=score;}
  }
  if(candidate===greedyMask)break;
  greedyMask=candidate;greedyScore=candidateValue;
 }
 const biggest=Math.max(...graph.edges.map(e=>e.weight));
 const gammaRange=(2*Math.PI)/biggest;
 let bestGamma=0,bestBeta=0,bestExpectation=-Infinity,evaluations=0;
 const evaluate=(gamma:number,beta:number)=>{
  const probs=qaoaProbabilities(graph,gamma,beta);evaluations++;
  const value=expectation(probs,scores);
  if(value>bestExpectation+1e-12){
   bestExpectation=value;bestGamma=gamma;bestBeta=beta;
  }
 };
 // Deterministic bounded grid search, then two fixed-size coordinate refinements.
 for(let i=0;i<12;i++)for(let j=0;j<=8;j++)
  evaluate(gammaRange*i/12,(Math.PI/2)*j/8);
 let dg=gammaRange/24,db=Math.PI/32;
 for(let iteration=0;iteration<2;iteration++){
  const centerGamma=bestGamma,centerBeta=bestBeta;
  for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++){
   const gamma=Math.max(0,Math.min(gammaRange,centerGamma+x*dg));
   const beta=Math.max(0,Math.min(Math.PI/2,centerBeta+y*db));
   evaluate(gamma,beta);
  }
  dg/=2;db/=2;
 }
 const probs=qaoaProbabilities(graph,bestGamma,bestBeta);
 let norm=0,optimalMass=0;
 const cdf=new Float64Array(size);
 for(let z=0;z<size;z++){
  norm+=probs[z];cdf[z]=norm;
  if(Math.abs(scores[z]-optimum)<1e-9)optimalMass+=probs[z];
 }
 if(!Number.isFinite(norm)||Math.abs(norm-1)>1e-8)
  throw Error("Quantum state failed normalization validation.");
 cdf[size-1]=norm;
 const rng=seededRandom(seed);
 const counts=new Uint32Array(size);
 let sampledSum=0,sampledSumSquares=0,bestSampleScore=-Infinity,bestSampleMask=0;
 for(let s=0;s<shots;s++){
  const mask=inverseCDF(cdf,rng()*norm);
  counts[mask]++;
  const score=scores[mask];
  sampledSum+=score;sampledSumSquares+=score*score;
  if(score>bestSampleScore+1e-9){bestSampleScore=score;bestSampleMask=mask;}
 }
 const mean=sampledSum/shots;
 const sampleVariance=shots>1?Math.max(0,(sampledSumSquares-shots*mean*mean)/(shots-1)):0;
 const margin=1.96*Math.sqrt(sampleVariance/shots);
 const outcomes:Array<{assignment:string;shots:number;probability:number;score:number}>=[];
 for(let z=0;z<size;z++)if(counts[z]){
  outcomes.push({assignment:bitString(z,n),shots:counts[z],probability:probs[z],score:scores[z]});
 }
 outcomes.sort((a,b)=>b.shots-a.shots||b.score-a.score||a.assignment.localeCompare(b.assignment));
 const total=graph.edges.reduce((s,e)=>s+e.weight,0);
 const gateEquivalent=n+graph.edges.length*3+n;
 return{
  schema:"MAH-Quantum-Weighted-MaxCut/v1",
  graph,settings:{shots,seed},
  objective:"max-sum-weight-of-edges-crossing-the-partition",
  model:{family:"QAOA",layers:1,solver:"FP64 dense statevector",logicalQubits:n,
   gateEquivalent,parameterEvaluations:evaluations,statevectorBytes:16*size,simulatedHardware:false},
  classical:{optimum,optimalAssignment:bitString(optMask,n),optimumDegeneracy:degeneracy,
   greedyScore,greedyAssignment:bitString(greedyMask,n),randomExpectedScore:total/2},
  quantum:{gamma:bestGamma,beta:bestBeta,exactExpectedScore:bestExpectation,
   approximationRatio:bestExpectation/optimum,sampledMeanScore:mean,
   approximate95PercentInterval:[Math.max(0,mean-margin),Math.min(optimum,mean+margin)],
   probabilityOfOptimalCut:Math.max(0,Math.min(1,optimalMass)),
   bestSampleScore,bestSampleAssignment:bitString(bestSampleMask,n),
   bestSampleRatio:bestSampleScore/optimum,outcomes},
  execution:{elapsedMs:performance.now()-started,completedShots:shots,status:"completed"},
  caveats:[
   "This benchmark solves bounded weighted MaxCut (2–12 decisions), not a general industrial scheduling or routing model.",
   "QAOA p=1 is an exact classical simulation of an ideal quantum circuit, not execution on quantum hardware.",
   "The classical global optimum is independently enumerated; these sizes do not demonstrate quantum advantage.",
   "Angles are selected using a finite deterministic search; no guarantee of variational optimum.",
   "The stated 95% interval is a normal-approximation interval for the sampled objective, not a hardware confidence interval.",
   "Synthetic templates are illustrations; production constraints, costs, and safety restrictions need external validation."
  ]
 };
}
