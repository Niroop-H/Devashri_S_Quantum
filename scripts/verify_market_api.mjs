/** Mandatory Vercel API and route/security release gate. Never prints live secrets. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const ts=require("typescript");

function loadHandler(path,dependencies={}){
 const raw=readFileSync(path,"utf8");
 const js=ts.transpileModule(raw,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
 }).outputText;
 const module={exports:{}};
 const imports=name=>{
  if(name in dependencies)return dependencies[name];
  if(name==="node:crypto")return require("node:crypto");
  throw Error("Unknown dependency in API test: "+name);
 };
 const factory=new Function("require","module","exports","process","Buffer",js);
 factory(imports,module,module.exports,process,Buffer);
 assert.equal(typeof module.exports.default,"function");
 return module.exports.default;
}
function invoke(handler,method="POST",auth="",body={qubits:2,bits:2,steps:[],shots:32,seed:1},contentType="application/json"){
 const headers={"content-type":contentType};
 if(auth)headers.authorization=auth;
 const req={method,headers,body};
 const res={
  code:200,headers:{},jsonValue:undefined,
  setHeader(key,value){this.headers[key.toLowerCase()]=value;return this;},
  status(value){this.code=value;return this;},
  json(data){this.jsonValue=data;return this;},
 };
 handler(req,res);
 return res;
}
const old=process.env.QUANTUM_SIMULATION_API_TOKEN;
const oldIndustrial=process.env.QUANTUM_INDUSTRIAL_API_TOKEN;
let calls=0;
const handler=loadHandler("api/circuit/simulate.ts",{
 "../../apps/engine/src/studio/request":{simulateRequest:()=>{calls++;return{counts:{"00":32}};}}
});
const token="sample-test-token-not-a-production-secret-abcdefghi0123456789";
try{
 delete process.env.QUANTUM_SIMULATION_API_TOKEN;
 assert.equal(invoke(handler).code,503,"Open API must fail closed when not configured");
 assert.equal(invoke(handler,"GET").code,405,"Only POST is allowed");
 process.env.QUANTUM_SIMULATION_API_TOKEN=token;
 assert.equal(invoke(handler).code,401,"Anonymous requests must be rejected");
 assert.equal(invoke(handler,"POST","Bearer invalid").code,401);
 assert.equal(calls,0);
 assert.equal(invoke(handler,"POST","Bearer "+token,{shots:8,steps:[],qubits:2,bits:2,seed:1},"text/plain").code,415);
 assert.equal(invoke(handler,"POST","Bearer "+token,{shots:2049,steps:[],qubits:2,bits:2,seed:1}).code,422);
 assert.equal(invoke(handler,"POST","Bearer "+token,{shots:32,steps:[],qubits:2,bits:2,seed:1,pad:"a".repeat(66000)}).code,413);
 const accepted=invoke(handler,"POST","Bearer "+token);
 assert.equal(accepted.code,200);assert.deepEqual(accepted.jsonValue,{counts:{"00":32}});
 assert.equal(calls,1,"Only authenticated bounded JSON may execute");
 let industrialCalls=0;
 const pilotGraph={name:"pilot",nodes:["A","B"],edges:[{source:0,target:1,weight:1}]};
 const pilot={graph:pilotGraph,shots:128,seed:17};
 const industrial=loadHandler("api/industrial/optimize.ts",{
  "../../apps/engine/src/industrial/optimization":{
   validateWeightedGraph:value=>value,
   runWeightedOptimization:graph=>{
    industrialCalls++;
    return{graph,model:{family:"QAOA"},execution:{completedShots:128}};
   }
  }
 });
 delete process.env.QUANTUM_INDUSTRIAL_API_TOKEN;
 assert.equal(invoke(industrial,"POST","",pilot).code,503,"Industrial API must be disabled by default");
 assert.equal(invoke(industrial,"GET","",pilot).code,405);
 process.env.QUANTUM_INDUSTRIAL_API_TOKEN=token;
 assert.equal(invoke(industrial,"POST","",pilot).code,401);
 assert.equal(invoke(industrial,"POST","Bearer incorrect",pilot).code,401);
 assert.equal(invoke(industrial,"POST","Bearer "+token,pilot,"text/plain").code,415);
 assert.equal(invoke(industrial,"POST","Bearer "+token,{...pilot,shots:2049}).code,422);
 assert.equal(invoke(industrial,"POST","Bearer "+token,{...pilot,pad:"a".repeat(33000)}).code,413);
 assert.equal(industrialCalls,0,"Unauthorized/oversized industrial requests may not execute");
 const acceptedIndustrial=invoke(industrial,"POST","Bearer "+token,pilot);
 assert.equal(acceptedIndustrial.code,200);
 assert.equal(acceptedIndustrial.jsonValue.schema,"MAH-Quantum-Industrial-API/v1");
 assert.equal(acceptedIndustrial.jsonValue.result.execution.completedShots,128);
 assert.equal(acceptedIndustrial.headers["x-mq-input-sha256"],
  require("node:crypto").createHash("sha256").update(JSON.stringify(pilotGraph)).digest("hex"));
 assert.equal(industrialCalls,1,"Exactly one authorized bounded industrial request should execute");
 const health=loadHandler("api/health.ts");
 const response=invoke(health,"GET");
 assert.equal(response.code,200);
 assert.equal(response.jsonValue.capabilities.denseStatevectorMaxLogicalQubits,20);
 assert.equal(response.jsonValue.capabilities.adaptiveStudioMaxLogicalQubits,100);
 assert.equal(response.jsonValue.capabilities.restrictedCircuitFamiliesMaxLogicalQubits,4096);
 assert.equal(response.jsonValue.simulationApi.authenticated,true);
 assert.equal(response.jsonValue.industrialOptimization.maxDecisionVariables,12);
 assert.equal(response.jsonValue.industrialOptimization.apiAuthenticated,true);
 assert.equal(invoke(health,"POST").code,405);
 const vercel=JSON.parse(readFileSync("vercel.json","utf8"));
 assert.ok(vercel.rewrites.some(x=>x.source.startsWith("/1000-plus")&&x.destination==="/index.html"),"1000+ deep-link rewrite missing");
 const headers=vercel.headers?.flatMap(x=>x.headers||[])||[];
 const map=new Map(headers.map(h=>[h.key.toLowerCase(),h.value]));
 for(const key of ["content-security-policy","x-content-type-options","x-frame-options","referrer-policy"])
  assert.ok(map.has(key),"Missing production header: "+key);
 assert.match(map.get("content-security-policy"),/worker-src 'self'/);
 assert.match(map.get("content-security-policy"),/frame-ancestors 'none'/);
 console.log("MARKET_API_GATE PASS — protected circuit/industrial APIs, bounded jobs, truthful health, security headers and routes");
}finally{
 if(old===undefined)delete process.env.QUANTUM_SIMULATION_API_TOKEN;
 else process.env.QUANTUM_SIMULATION_API_TOKEN=old;
 if(oldIndustrial===undefined)delete process.env.QUANTUM_INDUSTRIAL_API_TOKEN;
 else process.env.QUANTUM_INDUSTRIAL_API_TOKEN=oldIndustrial;
}
