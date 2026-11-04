import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {ACTIVATE,ACTIVE_MS,phase,validCode} from './core';
const cookieName='__Host-mah-access';
function config(){
 const url=process.env.UPSTASH_REDIS_REST_URL, token=process.env.UPSTASH_REDIS_REST_TOKEN, secret=process.env.WORKSPACE_SESSION_SECRET;
 if(!url?.startsWith('https://')||!token||!secret||secret.length<32)throw new Error('Access service is not configured');
 return {url,token,secret};
}
async function redis(command:unknown[]){
 const {url,token}=config();
 const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(command),signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw new Error('Access storage unavailable');
 const body=await response.json() as {result:any,error?:string};if(body.error)throw new Error('Access storage unavailable');return body.result;
}
const sign=(value:string)=>createHmac('sha256',config().secret).update(value).digest('base64url');
export async function authorize(req:any){
 config();
 const raw=(req.headers.cookie||'').split(';').map((x:string)=>x.trim()).find((x:string)=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 if(!raw)return null;
 try{
  const [data,mac,...rest]=raw.split('.');if(!data||!mac||rest.length)return null;
  const expected=Buffer.from(sign(data)),actual=Buffer.from(mac);if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
  const session=JSON.parse(Buffer.from(data,'base64url').toString());
  if(typeof session.key!=='string'||!/^mah:access:[a-f0-9]{64}$/.test(session.key)||!Number.isSafeInteger(session.start))return null;
  const current=await redis(['GET',session.key]);
  if(current===null||Number(current)!==session.start)return null;
  const status=phase(session.start,Date.now());return status.state==='active'?status:null;
 }catch{return null;}
}
export default async function access(req:any,res:any){
 res.setHeader('Cache-Control','no-store');res.setHeader('Vary','Cookie');
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Method not allowed.'});}
 try{
  config();
  if(req.method==='GET'){const session=await authorize(req);return res.status(200).json(session||{state:'locked'});}
  // No cross-origin activation: same-origin JSON requests only.
  const origin=req.headers.origin;const host=req.headers.host;
  if(origin&&origin!==`https://${host}`&&origin!==`http://${host}`)return res.status(403).json({error:'Request not allowed.'});
  if(!String(req.headers['content-type']||'').startsWith('application/json'))return res.status(415).json({error:'Invalid request.'});
  if(!validCode(req.body?.code))return res.status(400).json({error:'Invalid access code.'});
  const key='mah:access:'+createHash('sha256').update(req.body.code).digest('hex');
  const [start,now]=await redis(['EVAL',ACTIVATE,1,key]);
  const status=phase(Number(start),Number(now));
  if(status.state==='cooldown')return res.status(429).json({...status,error:'Please wait for the timeout to end.'});
  const data=Buffer.from(JSON.stringify({key,start:Number(start)})).toString('base64url');
  res.setHeader('Set-Cookie',`${cookieName}=${data}.${sign(data)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.max(0,Math.floor((Number(start)+ACTIVE_MS-Number(now))/1000))}`);
  return res.status(200).json(status);
 }catch{return res.status(503).json({error:'Workspace access is temporarily unavailable. Please try again later.'});}
}
