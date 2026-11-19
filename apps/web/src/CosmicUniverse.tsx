import {useState, type CSSProperties} from 'react';

// Positions follow the galaxies in the panorama; all share one responsive coordinate space.
const galaxies = [
  {name:'Ivory Crown',x:85,y:15,w:29,h:32,tone:'white',type:'Spiral galaxy',text:'Spiral arms trace concentrations of stars, gas and dust around a luminous central bulge.'},
  {name:'Rose Halo',x:14,y:14,w:14,h:19,tone:'pink',type:'Elliptical galaxy',text:'Elliptical galaxies have smooth stellar distributions rather than prominent spiral arms.'},
  {name:'Azure Whirlpool',x:6,y:19,w:6,h:7,tone:'blue',type:'Face-on spiral',text:'A face-on view reveals the winding arms and the contrast between bright stars and dark dust lanes.'},
  {name:'Silver Horizon',x:15,y:80,w:28,h:17,tone:'white',type:'Edge-on galaxy',text:'Viewed from the side, a galactic disk becomes a thin band, often divided by a dark dust lane.'},
  {name:'Crimson Ember',x:94,y:53,w:12,h:13,tone:'red',type:'Galactic core',text:'A galaxy’s central region can contain a dense population of stars and a supermassive black hole.'},
  {name:'Verdant Spiral',x:90,y:67,w:8,h:10,tone:'lime',type:'Spiral structure',text:'Different imaging filters can reveal structures that are difficult to distinguish in visible light.'},
  {name:'Pearl Companion',x:7,y:90,w:8,h:10,tone:'white',type:'Distant galaxy',text:'The light from distant galaxies records their appearance at an earlier time in the universe.'},
  {name:'Distant Lantern',x:96,y:11,w:6,h:6,tone:'white',type:'Distant galaxy',text:'Galaxies span a vast range of sizes, shapes and stellar populations.'},
];
const shards = Array.from({length:8},(_,i)=>{
 const a=i*Math.PI/4,b=(i+1)*Math.PI/4;
 return {clip:`polygon(50% 50%, ${50+75*Math.cos(a)}% ${50+75*Math.sin(a)}%, ${50+75*Math.cos(b)}% ${50+75*Math.sin(b)}%)`,x:Math.cos(a+Math.PI/8)*65,y:Math.sin(a+Math.PI/8)*65};
});
export default function CosmicUniverse(){
 const [burst,setBurst]=useState<Record<number,number>>({});
 return <div className="cosmic-universe"><div className="cosmic-panorama">
 {galaxies.map((g,i)=><button key={g.name} className={`cosmic-galaxy tone-${g.tone}`} style={{left:`${g.x}%`,top:`${g.y}%`,width:`${g.w}%`,height:`${g.h}%`,'--duration':`${22+i*3}s`,'--delay':`${-i*4}s`} as CSSProperties} aria-label={`Separate and reunite ${g.name}`} onClick={()=>setBurst(v=>({...v,[i]:(v[i]||0)+1}))}>
 <span className="galaxy-drift"><span key={burst[i]||0} className={`galaxy-fragments ${burst[i]?'is-burst':''}`}>
 {shards.map((shard,j)=><span key={j} className="galaxy-shard" style={{clipPath:shard.clip,backgroundSize:`${10000/g.w}% ${10000/g.h}%`,backgroundPosition:`${(g.x-g.w/2)/(100-g.w)*100}% ${(g.y-g.h/2)/(100-g.h)*100}%`,'--dx':`${shard.x}px`,'--dy':`${shard.y}px`,'--spin':`${j%2?12:-12}deg`} as CSSProperties}/>)}
 </span></span><span className="cosmic-name">{g.name} · Touch to scatter</span>
 </button>)}
 </div></div>;
}
