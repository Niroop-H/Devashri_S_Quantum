/**
 * Strict, browser-local import/export for industrial weighted edge lists.
 * Source and target are symbolic customer-defined vertex names, not indices.
 *
 * CSV contract:
 * source,target,weight
 * "Cutting","Welding",7
 *
 * Accepts quoted commas, escaped double quotes and CRLF; does not evaluate
 * spreadsheet formulas or connect to customer data systems.
 */
import {validateWeightedGraph,type WeightedGraph} from "../../../engine/src/industrial/optimization";
const MAX_CSV_BYTES=32*1024;
const MAX_CSV_ROWS=128;
function parseRows(csv:string):string[][] {
 const rows:string[][]=[];
 let row:string[]=[],cell="",quoted=false,closed=false;
 for(let i=0;i<csv.length;i++){
  const c=csv[i];
  if(quoted){
   if(c==='"'){
    if(csv[i+1]==='"'){cell+='"';i++;}
    else {quoted=false;closed=true;}
   }else cell+=c;
  }else if(c==='"'){
   if(cell!==""||closed)throw Error("Unexpected quote in CSV cell.");
   quoted=true;
  }else if(c===','){
   row.push(cell);cell="";closed=false;
  }else if(c==='\n'||c==='\r'){
   if(c==='\r'&&csv[i+1]==='\n')i++;
   row.push(cell);
   if(row.some(s=>s.trim()!==""))rows.push(row);
   if(rows.length>MAX_CSV_ROWS)throw Error("CSV has too many rows.");
   row=[];cell="";closed=false;
  }else{
   if(closed&&!/\s/.test(c))throw Error("Characters after a quoted CSV cell.");
   cell+=c;
  }
 }
 if(quoted)throw Error("Unclosed quoted CSV cell.");
 if(row.length||cell!==""){
  row.push(cell);if(row.some(s=>s.trim()!==""))rows.push(row);
 }
 if(rows.length>MAX_CSV_ROWS)throw Error("CSV has too many rows.");
 return rows;
}
export function importWeightedEdgeCsv(source:string,name="Imported industrial graph"):WeightedGraph{
 if(typeof source!=="string"||new TextEncoder().encode(source).length>MAX_CSV_BYTES)
  throw Error("CSV input is limited to 32 KiB.");
 const rows=parseRows(source.replace(/^\uFEFF/,""));
 if(!rows.length||rows[0].length!==3||
  rows[0].some((v,i)=>v.trim().toLowerCase()!==["source","target","weight"][i]))
  throw Error('CSV needs exactly these headers: source,target,weight.');
 const labels:string[]=[],seen=new Map<string,number>();
 const node=(value:string):number=>{
  const label=value.trim();
  if(!label||label.length>48)throw Error("CSV nodes need nonempty labels of at most 48 characters.");
  const key=label.toLocaleLowerCase("en");
  let index=seen.get(key);
  if(index===undefined){
   index=labels.length;labels.push(label);seen.set(key,index);
  }
  return index;
 };
 const edges=[];
 for(let i=1;i<rows.length;i++){
  const row=rows[i];if(row.length!==3)throw Error("CSV row "+(i+1)+" must have three columns.");
  const source=node(row[0]),target=node(row[1]);
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(row[2].trim()))
   throw Error("CSV row "+(i+1)+" has an invalid weight; use a positive decimal number.");
  const weight=Number(row[2].trim());
  edges.push({source,target,weight});
 }
 return validateWeightedGraph({name:name.trim().slice(0,90),nodes:labels,edges,
  context:"Imported weighted undirected edge list. Verify units, meaning, and external constraints before operational use."});
}
function quoteCell(value:string):string{
 // Quote every string field to preserve commas and discourage spreadsheet formula execution.
 // This export is an interoperability template, not a general-purpose spreadsheet report.
 const safe=/^[=+\-@\t\r]/.test(value)?"'"+value:value;
 return '"'+safe.replace(/"/g,'""')+'"';
}
export function exportWeightedEdgeCsv(graph:WeightedGraph):string{
 const g=validateWeightedGraph(graph);
 return ["source,target,weight",...g.edges.map(e=>
  [quoteCell(g.nodes[e.source]),quoteCell(g.nodes[e.target]),String(e.weight)].join(",")
 )].join("\r\n")+"\r\n";
}
