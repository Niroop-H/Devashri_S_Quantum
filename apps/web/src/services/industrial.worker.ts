import {runWeightedOptimization} from "../../../engine/src/industrial/optimization";
self.onmessage = (event:MessageEvent<{graph:unknown;shots:number;seed:number}>)=>{
 try {
  const {graph,shots,seed}=event.data;
  const result=runWeightedOptimization(graph,{shots,seed});
  self.postMessage({result});
 } catch(error) {
  self.postMessage({error:error instanceof Error?error.message:"Unable to execute the optimization experiment."});
 }
};
