import {createHash,timingSafeEqual} from "node:crypto";
import {runWeightedOptimization,validateWeightedGraph} from "../../apps/engine/src/industrial/optimization";

/**
 * Controlled industrial R&D machine-to-machine interface.
 * Disabled by default. A single server-only token authorizes the tenant pilot.
 * This is not a multi-tenant commercial entitlement or rate-limit system.
 */
const MAX_REQUEST_BYTES=32*1024;
const MAX_SHOTS=2048;
const bearer=(value:unknown,secret:string):boolean=>{
 if(typeof value!=="string"||!value.startsWith("Bearer "))return false;
 const token=value.slice(7);
 if(!token||token.length>512)return false;
 const hash=(s:string)=>createHash("sha256").update(s).digest();
 return timingSafeEqual(hash(token),hash(secret));
};
export default function handler(req:any,res:any){
 res.setHeader("Cache-Control","no-store");
 res.setHeader("X-Content-Type-Options","nosniff");
 res.setHeader("Allow","POST");
 if(req.method!=="POST")return res.status(405).json({error:"Method not allowed."});
 const secret=process.env.QUANTUM_INDUSTRIAL_API_TOKEN;
 if(!secret||secret.length<32)return res.status(503).json({
  error:"Industrial API is not enabled for this deployment."
 });
 if(!bearer(req.headers?.authorization,secret))
  return res.status(401).json({error:"Unauthorized."});
 if(!/^application\/json(?:\s*;|$)/i.test(req.headers?.["content-type"]||""))
  return res.status(415).json({error:"Send application/json."});
 if(Number(req.headers?.["content-length"])>MAX_REQUEST_BYTES)
  return res.status(413).json({error:"Request exceeds 32 KiB."});
 try{
  const body=typeof req.body==="string"?JSON.parse(req.body):req.body;
  if(!body||typeof body!=="object"||Array.isArray(body))
   return res.status(400).json({error:"A JSON request object is required."});
  if(Buffer.byteLength(JSON.stringify(body),"utf8")>MAX_REQUEST_BYTES)
   return res.status(413).json({error:"Request exceeds 32 KiB."});
  const graph=validateWeightedGraph(body.graph);
  if(!Number.isInteger(body.shots)||body.shots<128||body.shots>MAX_SHOTS
    ||!Number.isInteger(body.seed)||body.seed<0||body.seed>4294967295)
   return res.status(422).json({error:"Shots must be 128–2048, with a 32-bit unsigned seed."});
  const result=runWeightedOptimization(graph,{shots:body.shots,seed:body.seed});
  const sha256=createHash("sha256").update(JSON.stringify(result.graph)).digest("hex");
  res.setHeader("X-MQ-Input-SHA256",sha256);
  return res.status(200).json({
   schema:"MAH-Quantum-Industrial-API/v1",
   inputSha256:sha256,
   result
  });
 }catch(error){
  return res.status(400).json({
   error:"Invalid industrial optimization request.",
   message:error instanceof Error?error.message:"Invalid graph or unsupported workload."
  });
 }
}
