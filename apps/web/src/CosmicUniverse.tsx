import {useRef, useState} from 'react';

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
export default function CosmicUniverse(){
 const [active,setActive]=useState(0);
 const dialog=useRef<HTMLDialogElement>(null);
 const g=galaxies[active];
 return <div className="cosmic-universe">
  <div className="cosmic-panorama">
   <div className="cosmic-photo" aria-hidden="true"/>
   {galaxies.map((galaxy,i)=><button key={galaxy.name} className={`cosmic-galaxy tone-${galaxy.tone}`} style={{left:`${galaxy.x}%`,top:`${galaxy.y}%`,width:`${galaxy.w}%`,height:`${galaxy.h}%`}} aria-label={`Explore ${galaxy.name}`} aria-haspopup="dialog" onClick={()=>{setActive(i);dialog.current?.showModal();}}><span className="cosmic-tint" style={{backgroundSize:`${10000/galaxy.w}% ${10000/galaxy.h}%`,backgroundPosition:`${(galaxy.x-galaxy.w/2)/(100-galaxy.w)*100}% ${(galaxy.y-galaxy.h/2)/(100-galaxy.h)*100}%`}}/><span className="cosmic-name">{galaxy.name}</span></button>)}
  </div>
  <dialog aria-labelledby="cosmic-title" ref={dialog} className="cosmic-dialog" onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}}>
   <button className="cosmic-close" autoFocus onClick={()=>dialog.current?.close()} aria-label="Close galaxy view">×</button>
   <div className={`cosmic-portrait tone-${g.tone}`} style={{backgroundPosition:`${g.x}% ${g.y}%`}} aria-hidden="true"/>
   <div className="cosmic-detail"><small>CELESTIAL EXPLORER · {g.type}</small><h2 id="cosmic-title">{g.name}</h2><p>{g.text}</p><p className="cosmic-note">An artistic view of the cosmos. Names and colour treatments belong to this experience.</p><div className="cosmic-controls"><button onClick={()=>setActive((active+galaxies.length-1)%galaxies.length)}>← Previous</button><span>{active+1} / {galaxies.length}</span><button onClick={()=>setActive((active+1)%galaxies.length)}>Next →</button></div></div>
  </dialog>
 </div>;
}
