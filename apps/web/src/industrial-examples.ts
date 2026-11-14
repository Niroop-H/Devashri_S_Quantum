/** Synthetic scenarios designed to demonstrate the *same* weighted MaxCut model. */
import type {WeightedGraph} from "../../engine/src/industrial/optimization";
export type IndustryScenario="manufacturing"|"energy"|"computing";
export const industrialExamples:Record<IndustryScenario,WeightedGraph>={
 manufacturing:{
  name:"Manufacturing — interference separation (synthetic)",
  context:"Separate process groups into two clusters to maximize weighted separation of conflicting activities. This illustrative graph omits shift, capacity, safety and precedence constraints.",
  nodes:["Cutting","Welding","Coating","Assembly","Inspection","Packaging","Heat","Testing"],
  edges:[
   {source:0,target:1,weight:7},{source:0,target:2,weight:4},
   {source:1,target:3,weight:5},{source:1,target:4,weight:8},
   {source:2,target:5,weight:4},{source:2,target:6,weight:6},
   {source:3,target:5,weight:5},{source:4,target:6,weight:9},
   {source:4,target:7,weight:4},{source:6,target:7,weight:7},
   {source:0,target:7,weight:2},{source:3,target:6,weight:3}
  ]
 },
 energy:{
  name:"Energy — distribution segmentation (synthetic)",
  context:"Illustrative two-region segmentation of a weighted grid-interaction network. This is not a power-flow, N-1 reliability, protection or operational dispatch model.",
  nodes:["Node A","Node B","Node C","Node D","Node E","Node F","Node G","Node H"],
  edges:[
   {source:0,target:1,weight:5},{source:0,target:2,weight:7},
   {source:1,target:3,weight:8},{source:1,target:4,weight:4},
   {source:2,target:5,weight:10},{source:2,target:6,weight:5},
   {source:3,target:4,weight:3},{source:3,target:7,weight:9},
   {source:4,target:6,weight:8},{source:5,target:7,weight:7},
   {source:6,target:7,weight:9}
  ]
 },
 computing:{
  name:"Compute — noisy-job separation (synthetic)",
  context:"Split computational jobs into two groups to maximize weighted separation of conflicting pairs. This does not model machine capacity, placement constraints, network scheduling or real cluster provisioning.",
  nodes:["Job A","Job B","Job C","Job D","Job E","Job F","Job G","Job H","Job I"],
  edges:[
   {source:0,target:1,weight:10},{source:0,target:4,weight:4},
   {source:1,target:2,weight:7},{source:1,target:6,weight:6},
   {source:2,target:3,weight:8},{source:2,target:7,weight:5},
   {source:3,target:4,weight:9},{source:3,target:8,weight:8},
   {source:4,target:5,weight:4},{source:5,target:6,weight:7},
   {source:5,target:8,weight:5},{source:6,target:7,weight:4},
   {source:7,target:8,weight:10},{source:0,target:8,weight:2}
  ]
 },
};
