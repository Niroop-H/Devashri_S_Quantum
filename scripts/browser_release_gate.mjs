/* Production-build browser smoke for the 20-logical-qubit Studio.
 * Uses a controlled local test-session fixture to bypass the UI access gate;
 * this is NOT a security/authentication test, nor a hosted deployment.
 */
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {performance} from "node:perf_hooks";
import {mkdirSync,writeFileSync,readFileSync} from "node:fs";
import {chromium} from "playwright";
import {createHash} from "node:crypto";
const base="http://127.0.0.1:4173", evidence=[],started=performance.now();
let server,browser;
const test=async(name,action)=>{
 const t=performance.now();
 try{const facts=await action();const entry={name,status:"PASS",durationMs:+(performance.now()-t).toFixed(2),...(facts||{})};evidence.push(entry);console.log("BROWSER_GATE "+JSON.stringify(entry));}
 catch(e){const entry={name,status:"FAIL",durationMs:+(performance.now()-t).toFixed(2),error:String(e.stack||e)};evidence.push(entry);console.error("BROWSER_GATE "+JSON.stringify(entry));}
};
async function ready(){
 for(let i=0;i<100;i++){
  if(server.exitCode!==null)throw new Error("Local preview exited");
  try{const r=await fetch(base+"/studio");if(r.ok)return;}catch{}
  await new Promise(r=>setTimeout(r,300));
 }
 throw new Error("Local preview server did not respond");
}
async function main(){
 server=spawn("npm",["run","preview","--workspace=apps/web","--","--host","127.0.0.1","--port","4173","--strictPort"],{stdio:"ignore"});
 await ready();
 browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const pageErrors=[];page.on("pageerror",e=>pageErrors.push(String(e)));
 // Controlled fixture: does not exercise the access-code system or prove security.
 await page.addInitScript(()=>{
  localStorage.setItem("mah-workspace-access-v1",JSON.stringify({
   version:1,active:"c0",codes:{"c0":{usedMs:0,cooldownUntil:0}},
   owner:null,heartbeat:0
  }));
 });
 await test("Market landing identifies controlled access and links directly to 1000+ computation",async()=>{
  const response=await page.goto(base+"/",{waitUntil:"domcontentloaded"});
  assert.equal(response?.status(),200);
  await page.getByRole("link",{name:/1000\+ Qubit workspace/i}).waitFor({timeout:25000});
  await page.getByRole("link",{name:/Explore the Optimization Workbench/i}).waitFor({timeout:10000});
  const copy=await page.locator(".landing").innerText();
  assert.ok(copy.includes("CONTROLLED WORKSPACE ACCESS"));
  assert.match(copy,/100\s+logical qubits/i);
  assert.ok(!copy.includes("NO SIGN-UP REQUIRED"));
  return{controlledAccessDisclosure:true,largeWorkspaceLinked:true};
 });
 await test("Studio renders 20-qubit selector in a real Chromium tab",async()=>{
  const response=await page.goto(base+"/studio",{waitUntil:"domcontentloaded"});
  assert.equal(response?.status(),200);
  await page.getByRole("combobox",{name:"Qubit count"}).waitFor({timeout:30000});
  const select=page.getByRole("combobox",{name:"Qubit count"});
  const options=await select.locator("option").allTextContents();
  assert.equal(options.length,100);
  await select.selectOption("20");
  assert.equal(await select.inputValue(),"20");
  return{qubitOptions:options.length,selected:20};
 });
 await test("20-qubit circuit runs in browser Web Worker",async()=>{
  await page.getByRole("button",{name:"Run circuit"}).click();
  await page.locator(".lab-notice").filter({hasText:"Completed locally"}).waitFor({timeout:60000});
  await page.getByText("Execution Complete").waitFor({timeout:10000});
  const text=await page.locator(".result-telemetry").innerText();
  assert.ok(text.includes("Local exact statevector simulator"));
  return{executionComplete:true,backend:"Local exact statevector simulator"};
 });
 await test("20-qubit Inspector calculates amplitudes in worker",async()=>{
  await page.getByRole("tab",{name:"Inspector"}).click();
  await page.getByText(/Displaying \d+ strongest amplitudes/).waitFor({timeout:60000});
  const data=await page.locator(".amplitude-grid").innerText();
  assert.ok(data.includes("⟩"));
  return{inspectorHasAmplitudes:true};
 });
 await test("QASM code editor declares 20-qubit capability",async()=>{
  await page.getByRole("tab",{name:"Code"}).click();
  await page.getByText(/1–100 logical qubits/).waitFor({timeout:10000});
  return{capabilityLabel:"1–100 logical qubits"};
 });
 await test("20-bit long-range Bell QASM compiles and executes in browser",async()=>{
  const source='OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[20];\ncreg c[20];\nh q[0];\ncx q[0],q[19];\n';
  await page.getByRole("textbox",{name:"Quantum code editor"}).fill(source);
  await page.getByRole("button",{name:"Compile & run"}).click();
  await page.locator(".lab-notice").filter({hasText:"Completed locally"}).waitFor({timeout:60000});
  await page.getByText("Execution Complete").waitFor({timeout:10000});
  assert.equal(await page.getByRole("combobox",{name:"Qubit count"}).inputValue(),"20");
  return{qubits:20,entanglement:"q0->q19",completed:true};
 });
 await test("8192-shot 20-bit simulation completes in browser",async()=>{
  await page.getByRole("combobox",{name:"Shot count"}).selectOption("8192");
  await page.getByRole("button",{name:"Run circuit"}).click();
  await page.locator(".lab-notice").filter({hasText:"8,192 shots"}).waitFor({timeout:60000});
  const text=await page.locator(".result-telemetry").innerText();
  assert.ok(text.includes("8,192"));
  return{shots:8192,completed:true};
 });
 await test("100-qubit Studio runs true q0–q99 Bell circuit",async()=>{
  await page.getByRole("tab",{name:"Code"}).click();
  const src='OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[100];\ncreg c[100];\nh q[0];\ncx q[0],q[99];\n';
  await page.getByRole("textbox",{name:"Quantum code editor"}).fill(src);
  await page.getByRole("button",{name:"Compile & run"}).click();
  await page.locator(".result-telemetry").filter({hasText:"Exact Clifford stabilizer tableau"}).waitFor({timeout:60000});
  assert.equal(await page.getByRole("combobox",{name:"Qubit count"}).inputValue(),"100");
  return{qubits:100,backend:"exact Clifford tableau",completed:true};
 });
 await test("100-qubit state inspector rejects full dense amplitude view honestly",async()=>{
  await page.getByRole("tab",{name:"Inspector"}).click();
  await page.getByText(/No 2\^n amplitude array is allocated/).waitFor({timeout:10000});
  return{bounded:true};
 });
 await test("100-qubit Studio executes non-Clifford entanglement in independent cluster",async()=>{
  await page.getByRole("tab",{name:"Code"}).click();
  const src='OPENQASM 2.0;\nqreg q[100];\ncreg c[100];\nh q[0];\nt q[0];\ncx q[0],q[99];\nh q[99];\n';
  await page.getByRole("textbox",{name:"Quantum code editor"}).fill(src);
  await page.getByRole("button",{name:"Compile & run"}).click();
  await page.locator(".result-telemetry").filter({hasText:"Exact partitioned statevector"}).waitFor({timeout:60000});
  return{qubits:100,method:"partitioned statevector",completed:true};
 });
 await test("1000+ dedicated page runs exact 1000-qubit GHZ in Chromium worker",async()=>{
  const response=await page.goto(base+"/1000-plus",{waitUntil:"domcontentloaded"});
  assert.equal(response?.status(),200);
  await page.getByRole("heading",{name:"1000+ Qubit"}).waitFor({timeout:20000});
  await page.getByRole("button",{name:"Run quantum circuit"}).click();
  await page.getByText("Exact Z-basis support dimension").waitFor({timeout:60000});
  const text=await page.locator(".large-results").innerText();
  assert.ok(text.includes("Clifford stabilizer tableau"));
  assert.ok(text.includes("1,000"));
  return{qubits:1000,completed:true,exactClifford:true};
 });
 await test("1000-qubit experiment exports a reproducible signed-input evidence record",async()=>{
  const downloadReady=page.waitForEvent("download",{timeout:15000});
  await page.getByRole("button",{name:"Download reproducible JSON"}).click();
  const downloaded=await downloadReady;
  assert.match(downloaded.suggestedFilename(),/1000Q-experiment\.json/);
  const path=await downloaded.path();
  assert.ok(path,"Download path unavailable");
  const evidence=JSON.parse(readFileSync(path,"utf8"));
  assert.equal(evidence.schema,"MAH-Quantum-Experiment/v1");
  assert.equal(evidence.circuit.logicalQubits,1000);
  assert.equal(evidence.execution.requestedShots,256);
  assert.equal(evidence.execution.completedShots,256);
  assert.equal(evidence.execution.method,"stabilizer-tableau");
  assert.equal(evidence.execution.exactForSupportedCircuit,true);
  assert.equal(evidence.circuit.sha256,createHash("sha256").update(evidence.circuit.openQasm).digest("hex"));
  assert.equal(Object.values(evidence.measurement.counts).reduce((a,b)=>a+b,0),256);
  return{sha256Verified:true,qubits:1000,shots:256,method:"stabilizer-tableau"};
 });
 await test("Changing seed and shots invalidates previous results and preserves exported provenance",async()=>{
  await page.getByRole("spinbutton",{name:"Large circuit seed"}).fill("123");
  await page.getByRole("combobox",{name:"Large circuit shots"}).selectOption("128");
  assert.equal(await page.getByRole("button",{name:"Download reproducible JSON"}).isDisabled(),true);
  await page.getByRole("button",{name:"Run quantum circuit"}).click();
  await page.locator(".large-telemetry").getByText("Clifford stabilizer tableau").waitFor({timeout:30000});
  const next=page.waitForEvent("download",{timeout:15000});
  await page.getByRole("button",{name:"Download reproducible JSON"}).click();
  const downloaded=await next;
  const parsed=JSON.parse(readFileSync(await downloaded.path(),"utf8"));
  assert.equal(parsed.execution.seed,123);
  assert.equal(parsed.execution.requestedShots,128);
  assert.equal(parsed.execution.completedShots,128);
  assert.equal(parsed.circuit.sha256,createHash("sha256").update(parsed.circuit.openQasm).digest("hex"));
  return{seed:123,shots:128,previousResultInvalidated:true,sha256Verified:true};
 });
 await test("2048-qubit Hadamard preset executes without statevector",async()=>{
  await page.getByRole("combobox",{name:"Large circuit qubit count"}).selectOption("2048");
  await page.getByRole("combobox",{name:"Large circuit preset"}).selectOption("plus");
  await page.getByRole("combobox",{name:"Large circuit shots"}).selectOption("32");
  await page.getByRole("button",{name:"Run quantum circuit"}).click();
  await page.getByText("Exact Z-basis support dimension").waitFor({timeout:60000});
  const text=await page.locator(".large-results").innerText();
  assert.ok(text.includes("2,048"));
  assert.ok(text.includes("32 / 32"));
  return{qubits:2048,shots:32,completed:true};
 });
 await test("1000-qubit non-Clifford entanglement runs when its cluster is bounded",async()=>{
  const src='OPENQASM 2.0;\nqreg q[1000];\ncreg c[1000];\nh q[0];\nt q[0];\ncx q[0],q[999];\nh q[999];\n';
  await page.getByRole("textbox",{name:"Large quantum QASM code"}).fill(src);
  await page.getByRole("button",{name:"Run quantum circuit"}).click();
  await page.locator(".large-telemetry").getByText("Partitioned exact statevectors").waitFor({timeout:30000});
  const text=await page.locator(".large-results").innerText();
  assert.match(text,/1[,\s.]*000/,"Expected 1,000 logical qubits in telemetry, saw: "+text.slice(0,250));
  return{qubits:1000,method:"partitioned statevector",completed:true};
 });
 await test("1000-qubit oversized non-Clifford entangled cluster rejects safely",async()=>{
  const lines=['OPENQASM 2.0;','qreg q[1000];','creg c[1000];','h q[0];','t q[0];'];
  for(let q=1;q<19;q++)lines.push('cx q['+(q-1)+'],q['+q+'];');
  await page.getByRole("textbox",{name:"Large quantum QASM code"}).fill(lines.join('\n'));
  await page.getByRole("button",{name:"Run quantum circuit"}).click();
  await page.getByRole("alert").filter({hasText:/19 qubits/i}).waitFor({timeout:30000});
  return{rejected:true,maxConnectedQubits:18,misleadingOutput:false};
 });
 await test("Mobile-width 1000+ workspace remains usable with no page-level horizontal overflow",async()=>{
  const mobileContext=await browser.newContext({viewport:{width:390,height:844}});
  await mobileContext.addInitScript(()=>{
   localStorage.setItem("mah-workspace-access-v1",JSON.stringify({
    version:1,active:"c0",codes:{"c0":{usedMs:0,cooldownUntil:0}},owner:null,heartbeat:0
   }));
  });
  const mobile=await mobileContext.newPage();
  try{
   await mobile.goto(base+"/1000-plus",{waitUntil:"domcontentloaded"});
   await mobile.getByRole("heading",{name:"1000+ Qubit"}).waitFor({timeout:25000});
   const widths=await mobile.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));
   assert.ok(widths.page<=widths.viewport+8,
    "Mobile page overflows: "+JSON.stringify(widths));
   await mobile.getByRole("button",{name:"Run quantum circuit"}).click();
   await mobile.locator(".large-telemetry").getByText("Clifford stabilizer tableau").waitFor({timeout:60000});
   return{viewportPx:widths.viewport,pagePx:widths.page,executed:true};
  }finally{await mobileContext.close();}
 });
 await test("Industrial QAOA workbench solves synthetic manufacturing partition and verifies classical optimum",async()=>{
  const response=await page.goto(base+"/industrial",{waitUntil:"domcontentloaded"});
  assert.equal(response?.status(),200);
  await page.getByRole("heading",{name:"Industrial Optimization"}).waitFor({timeout:25000});
  await page.getByRole("button",{name:"Run quantum + classical analysis"}).click();
  await page.getByText("Verified classical optimum").waitFor({timeout:90000});
  const results=await page.locator(".industrial-metrics").innerText();
  assert.ok(results.includes("QAOA expected cut value"));
  assert.ok(results.includes("Best sampled cut"));
  assert.equal(await page.getByRole("button",{name:"Export audit-ready JSON"}).isDisabled(),false);
  return{optimizationCompleted:true,engine:"QAOA p=1",classicalReference:true};
 });
 await test("Industrial optimization export contains matching canonical input digest and numerical provenance",async()=>{
  const ready=page.waitForEvent("download",{timeout:15000});
  await page.getByRole("button",{name:"Export audit-ready JSON"}).click();
  const file=await ready;
  const report=JSON.parse(readFileSync(await file.path(),"utf8"));
  assert.equal(report.schema,"MAH-Quantum-Industrial-Optimization-Evidence/v1");
  assert.equal(report.result.schema,"MAH-Quantum-Weighted-MaxCut/v1");
  assert.equal(report.inputHash.canonicalGraphJson,
   createHash("sha256").update(JSON.stringify(report.result.graph)).digest("hex"));
  assert.equal(report.result.model.layers,1);
  assert.equal(report.result.model.simulatedHardware,false);
  assert.equal(report.result.settings.seed,2026);
  assert.equal(report.result.settings.shots,1024);
  assert.equal(report.result.execution.completedShots,1024);
  assert.ok(report.result.classical.optimum>=report.result.quantum.bestSampleScore-1e-9);
  assert.ok(report.result.classical.optimum>=report.result.quantum.exactExpectedScore-1e-9);
  return{format:"verified MaxCut JSON",inputSha256:true,classicalOptimalityChecked:true};
 });
 await test("Industry application rejects malformed graph input and does not invent analysis",async()=>{
  await page.getByRole("textbox",{name:"Industrial weighted graph JSON"}).fill(
   '{"name":"Unsafe","nodes":["A","B"],"edges":[{"source":0,"target":1,"weight":-2}]}'
  );
  assert.equal(await page.getByRole("button",{name:"Export audit-ready JSON"}).isDisabled(),true);
  await page.getByRole("button",{name:"Run quantum + classical analysis"}).click();
  await page.getByRole("alert").filter({hasText:/positive/i}).waitFor({timeout:15000});
  return{invalidGraphRejected:true};
 });
 await test("Industrial CSV edge-list import roundtrips quoted labels and produces a verifiable model",async()=>{
  const text='source,target,weight\n"Line, A",Welding,3\nWelding,Testing,2\n"Line, A",Testing,1\n';
  await page.getByLabel("Import industrial CSV graph").setInputFiles({
   name:"pilot.csv",mimeType:"text/csv",buffer:Buffer.from(text,"utf8")
  });
  const editor=page.getByRole("textbox",{name:"Industrial weighted graph JSON"});
  await page.waitForFunction(()=>{
   const el=document.querySelector('textarea[aria-label="Industrial weighted graph JSON"]');
   return el&&el.value.includes("Line, A");
  });
  const graph=JSON.parse(await editor.inputValue());
  assert.deepEqual(graph.nodes,["Line, A","Welding","Testing"]);
  assert.equal(graph.edges.length,3);
  await page.getByRole("button",{name:"Run quantum + classical analysis"}).click();
  await page.getByText("Verified classical optimum").waitFor({timeout:30000});
  const fileReady=page.waitForEvent("download",{timeout:10000});
  await page.getByRole("button",{name:"Export graph CSV"}).click();
  const exported=await fileReady;
  const exportedCsv=readFileSync(await exported.path(),"utf8");
  assert.ok(exportedCsv.startsWith("source,target,weight\r\n"));
  assert.ok(exportedCsv.includes('"Line, A"'));
  return{importedNodes:3,weightedEdges:3,quotedCsvRoundtrip:true,computed:true};
 });
 await test("Industrial CSV rejects spreadsheet-formula labels before executing",async()=>{
  await page.getByLabel("Import industrial CSV graph").setInputFiles({
   name:"untrusted.csv",mimeType:"text/csv",
   buffer:Buffer.from('source,target,weight\n"=2+2",Plant,3\n',"utf8")
  });
  await page.getByRole("alert").filter({hasText:/spreadsheet formula operators/i}).waitFor({timeout:12000});
  return{formulaLabelRejected:true};
 });
 await test("Industrial optimization is usable on 390px mobile viewport",async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.addInitScript(()=>{
   localStorage.setItem("mah-workspace-access-v1",JSON.stringify({
    version:1,active:"c0",codes:{"c0":{usedMs:0,cooldownUntil:0}},owner:null,heartbeat:0
   }));
  });
  const mobile=await context.newPage();
  try{
   await mobile.goto(base+"/industrial",{waitUntil:"domcontentloaded"});
   await mobile.getByRole("heading",{name:"Industrial Optimization"}).waitFor({timeout:25000});
   const widths=await mobile.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));
   assert.ok(widths.page<=widths.viewport+8,"Industrial page overflows: "+JSON.stringify(widths));
   await mobile.getByRole("button",{name:"Run quantum + classical analysis"}).click();
   await mobile.getByText("Verified classical optimum").waitFor({timeout:90000});
   return{responsive:true,viewport:390,computed:true};
  }finally{await context.close();}
 });
 await test("1000+ research console autosaves named experiments and restores the editor after reload",async()=>{
  const response=await page.goto(base+"/1000-plus",{waitUntil:"domcontentloaded"});
  assert.equal(response?.status(),200);
  await page.getByRole("heading",{name:"1000+ Qubit"}).waitFor({timeout:20000});
  await page.getByRole("button",{name:/GHZ correlation.*Long-range entanglement/i}).click();
  await page.getByRole("textbox",{name:"Experiment name"}).fill("Scientist acceptance session");
  await page.getByRole("button",{name:"Save experiment"}).click();
  await page.getByRole("searchbox",{name:"Search experiments"}).fill("Scientist acceptance session");
  await page.getByRole("button",{name:/Scientist acceptance session/i}).waitFor({timeout:10000});
  await page.getByText("Autosaved to this browser").waitFor({timeout:10000});
  await page.reload({waitUntil:"domcontentloaded"});
  await page.getByRole("heading",{name:"1000+ Qubit"}).waitFor({timeout:15000});
  assert.equal(await page.getByRole("textbox",{name:"Experiment name"}).inputValue(),"Scientist acceptance session");
  assert.ok((await page.getByRole("textbox",{name:"Large quantum QASM code"}).inputValue()).includes("cx q[998],q[999];"));
  await page.getByRole("button",{name:/Scientist acceptance session/i}).waitFor({timeout:10000});
  return{namedExperimentsPersist:true,draftAutosaveRestored:true};
 });
 await test("Scientific circuit topology is derived from actual QASM operations",async()=>{
  await page.getByRole("tab",{name:"Circuit map"}).click();
  await page.getByText("OPERATION COMPOSITION").waitFor({timeout:12000});
  const body=await page.locator(".hq-map-panel").innerText();
  assert.match(body,/999/);
  assert.match(body,/CX/);
  assert.match(body,/logical depth estimate/);
  assert.equal(await page.locator(".hq-touchmap>div").count(),64);
  await page.getByRole("tab",{name:"Execution log"}).click();
  await page.getByRole("log",{name:"Quantum worker execution log"}).waitFor({timeout:10000});
  await page.getByRole("tab",{name:"QASM editor"}).click();
  return{activityTiles:64,trueGateCounts:true,accessibleViews:true};
 });
 await test("QASM import/export and measurement-bit explorer retain exact 1-state frequency",async()=>{
  const circuit="OPENQASM 2.0;\nqreg q[1000];\ncreg c[1000];\nx q[0];\n";
  await page.getByLabel("Import QASM file").setInputFiles({
   name:"industrial-operator-check.qasm",mimeType:"text/plain",buffer:Buffer.from(circuit)
  });
  await page.getByRole("textbox",{name:"Experiment name"}).waitFor({timeout:10000});
  await page.waitForFunction(()=>{
   const editor=document.querySelector('textarea[aria-label="Large quantum QASM code"]');
   return editor&&editor.value.includes("x q[0];")&&editor.value.length<120;
  });
  const exported=page.waitForEvent("download",{timeout:15000});
  await page.getByRole("button",{name:"Export QASM"}).click();
  const file=await exported;
  assert.equal(readFileSync(await file.path(),"utf8"),circuit);
  await page.getByRole("button",{name:"Run quantum circuit"}).click();
  await page.locator(".large-telemetry").getByText("Clifford stabilizer tableau").waitFor({timeout:40000});
  await page.getByRole("tab",{name:"Bit analyzer"}).click();
  await page.getByText("c0 sampled P(1)").waitFor({timeout:10000});
  const details=await page.locator(".hq-focus").innerText();
  assert.ok(details.includes("100.00%"),details);
  return{sourceRoundtrip:true,measurementC0Probability:1,shotsRecorded:true};
 });
 await test("Named experiment run history persists reproducible method metadata",async()=>{
  await page.reload({waitUntil:"domcontentloaded"});
  await page.getByRole("heading",{name:"1000+ Qubit"}).waitFor({timeout:15000});
  const histories=await page.locator(".hq-history-list").innerText();
  assert.ok(histories.includes("completed"),histories);
  assert.ok(histories.includes("1,000 Q"),histories);
  return{reloadedRunHistory:true,metadataPreserved:true};
 });
 await test("No uncaught browser page exceptions",async()=>{
  assert.deepEqual(pageErrors,[]);
  return{uncaughtExceptions:pageErrors.length};
 });
}
try{await main();}
catch(e){evidence.push({name:"Harness initialization",status:"FAIL",error:String(e.stack||e)});console.error("BROWSER_GATE_FATAL "+String(e.stack||e));}
finally{
 try{await browser?.close();}catch{}
 try{server?.kill("SIGTERM");}catch{}
 const fails=evidence.filter(x=>x.status==="FAIL");
 const result={schema:"MQ-DSQ-BROWSER-RELEASE/v1",dateUtc:new Date().toISOString(),
  sha:process.env.GITHUB_SHA||"local",
  environment:"GitHub Actions Chromium, locally hosted production build; no cloud deployment",
  scope:"20/100/1000+/2048 quantum, scientific research console and industrial optimization browser smoke; access control not evaluated",
  durationMs:+(performance.now()-started).toFixed(2),
  counts:{total:evidence.length,passed:evidence.length-fails.length,failed:fails.length},cases:evidence};
 mkdirSync("artifacts",{recursive:true});
 writeFileSync("artifacts/browser-release-gate.json",JSON.stringify(result,null,2)+"\n");
 console.log("BROWSER_GATE_SUMMARY "+JSON.stringify(result.counts));
 if(fails.length)process.exitCode=1;
}
