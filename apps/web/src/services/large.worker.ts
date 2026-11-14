import { parseLargeQasm } from "../../../engine/src/studio/largeQasm";
import { simulateScalable, methodFor } from "../../../engine/src/studio/scalable";
/**
 * Worker stages are truthful coarse execution milestones, not made-up
 * percentages. The numerical simulation remains the same tested engine.
 */
self.onmessage = (event:MessageEvent<{source:string;shots:number;seed:number}>) => {
  try {
    const {source,shots,seed}=event.data;
    self.postMessage({stage:"parsing"});
    const program=parseLargeQasm(source);
    if(program.qubits<1000)throw new Error("Use the Quantum Computing Studio for circuits below 1,000 qubits.");
    self.postMessage({stage:"planning"});
    methodFor(program);
    self.postMessage({stage:"computing"});
    const result=simulateScalable(program,shots,seed);
    self.postMessage({result});
  }catch(error){
    self.postMessage({error:error instanceof Error?error.message:"Unable to execute large circuit."});
  }
};
