import {describe,it} from "node:test";
import assert from "node:assert/strict";
import {QuantumCircuit} from "../simulator/QuantumCircuit";
import {qaoaProbabilities,cutScore,runWeightedOptimization,validateWeightedGraph} from "../industrial/optimization";

const approx=(value:number,expected:number,tolerance=2e-10)=>{
 assert.ok(Math.abs(value-expected)<tolerance,"Expected "+expected+" but got "+value);
};
const edge={source:0,target:1,weight:1};
const pair={name:"Independent link cut",nodes:["A","B"],edges:[edge]};
describe("industrial weighted MaxCut and QAOA verification",()=>{
 it("rejects malformed, duplicate, negative-weight and oversized customer models",()=>{
  const reject=(p:unknown)=>assert.throws(()=>validateWeightedGraph(p));
  reject({...pair,nodes:["A","A"]});
  reject({...pair,nodes:["A","B"],edges:[edge,{source:1,target:0,weight:1}]});
  reject({...pair,edges:[{...edge,weight:-1}]});
  reject({...pair,edges:[{...edge,target:0}]});
  reject({...pair,edges:[{...edge,weight:Infinity}]});
  reject({...pair,nodes:Array.from({length:13},(_,i)=>"Q"+i)});
  reject({...pair,nodes:["A","B"],edges:[]});
  reject({...pair,nodes:["A","B"],edges:[{source:0,target:2,weight:1}]});
  reject({name:"x",nodes:["A","B"],edges:"untrusted"});
  reject({...pair,name:"n".repeat(100)});
 });
 it("computes independent exact graph objective and symmetry",()=>{
  const graph=validateWeightedGraph(pair);
  approx(cutScore(graph,0),0);
  approx(cutScore(graph,1),1);
  approx(cutScore(graph,2),1);
  approx(cutScore(graph,3),0);
 });
 it("matches single-edge analytic QAOA p=1 optimum at gamma pi/2 beta pi/8",()=>{
  const g=validateWeightedGraph(pair);
  const p=qaoaProbabilities(g,Math.PI/2,Math.PI/8);
  approx(p[0],0,1e-12);approx(p[3],0,1e-12);
  approx(p[1],.5,1e-12);approx(p[2],.5,1e-12);
  approx(p.reduce((s,v)=>s+v,0),1,1e-12);
 });
 it("exact QAOA cost phase matches independently expanded CX-RZ-CX gate circuit",()=>{
  const graph=validateWeightedGraph({
   name:"Three-bit weighted QAOA",nodes:["a","b","c"],edges:[
    {source:0,target:1,weight:.6},{source:1,target:2,weight:1.5}
   ]});
  const gamma=.71,beta=.24;
  const out=qaoaProbabilities(graph,gamma,beta);
  const c=new QuantumCircuit(3);
  for(let q=0;q<3;q++)c.applyStep({id:"h"+q,gate:"H",targets:[q]});
  for(const e of graph.edges){
   c.applyStep({id:"cx1",gate:"CX",targets:[e.target],controls:[e.source]});
   c.applyStep({id:"rz",gate:"RZ",targets:[e.target],params:{theta:-gamma*e.weight}});
   c.applyStep({id:"cx2",gate:"CX",targets:[e.target],controls:[e.source]});
  }
  for(let q=0;q<3;q++)c.applyStep({id:"rx"+q,gate:"RX",targets:[q],params:{theta:2*beta}});
  const oracle=c.getProbabilities();
  for(let i=0;i<oracle.length;i++)approx(out[i],oracle[i],1e-12);
 });
 it("returns exact classical optimum, quantum expectation and honest comparable metrics",()=>{
  const result=runWeightedOptimization(pair,{shots:1024,seed:19});
  assert.equal(result.classical.optimum,1);
  assert.equal(result.classical.optimumDegeneracy,2);
  assert.equal(result.classical.greedyScore,1);
  assert.equal(result.classical.randomExpectedScore,.5);
  approx(result.quantum.exactExpectedScore,1,1e-11);
  approx(result.quantum.approximationRatio,1,1e-11);
  approx(result.quantum.probabilityOfOptimalCut,1,1e-11);
  assert.equal(result.quantum.bestSampleScore,1);
  assert.equal(result.execution.completedShots,1024);
  assert.equal(result.model.logicalQubits,2);
  assert.equal(result.model.simulatedHardware,false);
  assert.equal(result.quantum.outcomes.reduce((s,o)=>s+o.shots,0),1024);
  assert.ok(result.model.parameterEvaluations>=108);
 });
 it("reproduces optimization and sampled output with a fixed seed",()=>{
  const graph={name:"Small material-separation graph",nodes:["A","B","C","D"],edges:[
   {source:0,target:1,weight:3},{source:0,target:2,weight:2},
   {source:1,target:3,weight:1},{source:2,target:3,weight:5}
  ]};
  const a=runWeightedOptimization(graph,{shots:256,seed:71});
  const b=runWeightedOptimization(graph,{shots:256,seed:71});
  assert.deepEqual(a.quantum,b.quantum);
  assert.deepEqual(a.classical,b.classical);
  assert.ok(a.quantum.exactExpectedScore<=a.classical.optimum+1e-9);
  assert.ok(a.quantum.bestSampleScore<=a.classical.optimum+1e-9);
  assert.ok(a.classical.greedyScore<=a.classical.optimum+1e-9);
 });
 it("enforces shot budgets and seed range before computation",()=>{
  for(const shots of [0,-1,127,4097,1.5,NaN])
   assert.throws(()=>runWeightedOptimization(pair,{shots,seed:42}),/Shots/);
  for(const seed of [-1,2**32,1.2,Infinity])
   assert.throws(()=>runWeightedOptimization(pair,{shots:128,seed}),/Seed/);
 });
 it("handles a full 12-node 66-edge graph in a bounded statevector",()=>{
  const edges=[];
  for(let i=0;i<12;i++)for(let j=i+1;j<12;j++)
   edges.push({source:i,target:j,weight:1});
  const graph={name:"Full 12-node complete graph",nodes:Array.from({length:12},(_,i)=>"Q"+i),edges};
  const out=runWeightedOptimization(graph,{shots:128,seed:1});
  assert.equal(out.model.statevectorBytes,65536);
  assert.equal(out.classical.optimum,36);
  assert.equal(out.classical.optimumDegeneracy,924);
  assert.ok(out.quantum.approximationRatio>=0&&out.quantum.approximationRatio<=1+1e-9);
  assert.equal(out.execution.completedShots,128);
 });
});
