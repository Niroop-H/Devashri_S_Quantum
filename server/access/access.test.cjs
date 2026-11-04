const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validCode,phase,ACTIVE_MS,CYCLE_MS}=require(process.env.ACCESS_TEST_BUILD+'/core.js');
const {default:handler,authorize}=require(process.env.ACCESS_TEST_BUILD+'/service.js');
test('code requires exact prefix and two lowercase ASCII letters',()=>{
 for(const x of ['25212007ab','25212007zz','25212007aa'])assert.ok(validCode(x));
 for(const x of ['25212007AB','25212007a','25212007abc','25212007a1',' 25212007ab','25212007ab\n',null,{},123])assert.equal(validCode(x),false);
});
test('24-hour access and 12-hour cooldown boundaries',()=>{const start=1700000000000;assert.equal(phase(start,start+ACTIVE_MS-1).state,'active');assert.deepEqual(phase(start,start+ACTIVE_MS),{state:'cooldown',retryAt:start+CYCLE_MS});assert.equal(phase(start,start+CYCLE_MS-1).state,'cooldown');assert.equal(phase(start,start+CYCLE_MS).state,'available');});
test('activation, re-entry, cooldown, reuse, signed cookie and unavailable storage',async()=>{
 process.env.UPSTASH_REDIS_REST_URL='https://redis.example';process.env.UPSTASH_REDIS_REST_TOKEN='test';process.env.WORKSPACE_SESSION_SECRET='test-secret-'.repeat(4);
 const originalFetch=global.fetch,originalNow=Date.now;let clock=1700000000000;Date.now=()=>clock;const db=new Map();
 global.fetch=async(url,options)=>{const cmd=JSON.parse(options.body);let result;if(cmd[0]==='GET')result=db.get(cmd[1])??null;else{const key=cmd[3];let start=db.get(key);if(start===undefined||clock>=start+CYCLE_MS){start=clock;db.set(key,start);}result=[start,clock];}return {ok:true,json:async()=>({result})};};
 const request=code=>({method:'POST',headers:{host:'example.com',origin:'https://example.com','content-type':'application/json'},body:{code}});
 const response=()=>({headers:{},status(n){this.code=n;return this;},setHeader(k,v){this.headers[k]=v;},json(data){this.body=data;return this;}});
 try{
 const first=response();await handler(request('25212007ab'),first);assert.equal(first.code,200);assert.equal(first.body.expiresAt,clock+ACTIVE_MS);const cookie=first.headers['Set-Cookie'].split(';')[0];assert.match(first.headers['Set-Cookie'],/HttpOnly; Secure; SameSite=Strict/);
 clock+=3600000;const again=response();await handler(request('25212007ab'),again);assert.equal(again.body.expiresAt,first.body.expiresAt);assert.ok(await authorize({headers:{cookie}}));
 assert.equal(await authorize({headers:{cookie:cookie+'tampered'}}),null);
 clock=first.body.expiresAt;assert.equal(await authorize({headers:{cookie}}),null);const cooling=response();await handler(request('25212007ab'),cooling);assert.equal(cooling.code,429);assert.equal(cooling.body.retryAt,clock+12*3600000);
 const different=response();await handler(request('25212007cd'),different);assert.equal(different.code,200);
 clock=cooling.body.retryAt;const reused=response();await handler(request('25212007ab'),reused);assert.equal(reused.code,200);assert.equal(await authorize({headers:{cookie}}),null);
 const invalid=response();await handler(request('wrong'),invalid);assert.equal(invalid.code,400);
 global.fetch=async()=>{throw Error('offline')};const offline=response();await handler(request('25212007ab'),offline);assert.equal(offline.code,503);
 }finally{global.fetch=originalFetch;Date.now=originalNow;}
});
