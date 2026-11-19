import {useEffect, useRef} from 'react';

const colours=['#fff0da','#c5d9ff','#f39acb','#fff3df','#e77870','#c4dfa1','#ddd8ff','#fff0da'];
const names=['Ivory Crown','Azure Whirlpool','Rose Halo','Silver Horizon','Crimson Ember','Verdant Spiral','Violet Reach','Pearl Companion'];
const count=16;
function random(seed:number){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const fields=Array.from({length:count},(_,index)=>{
 const rand=random(731+index*1907);
 return Array.from({length:1200},()=>{const r=Math.pow(rand(),.65);return {r,a:Math.floor(rand()*3)*Math.PI*2/3+r*8+(rand()-.5)*(.3+r*.7),z:(rand()-.5)*.14,s:.4+rand()*1.1,speed:.025+rand()*.045,phase:rand()*Math.PI*2};});
});
export default function CosmicUniverse(){
 const canvas=useRef<HTMLCanvasElement>(null);
 const buttons=useRef<(HTMLButtonElement|null)[]>([]);
 const bursts=useRef<number[]>(Array(count).fill(-100));
 const clock=useRef(0);
 useEffect(()=>{
  const c=canvas.current,ctx=c?.getContext('2d');if(!c||!ctx)return;
  let w=0,h=0,height=0,frame=0,last=0,dirty=true;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const sprites=colours.map(colour=>{const s=document.createElement('canvas');s.width=s.height=32;const g=s.getContext('2d')!;const glow=g.createRadialGradient(16,16,0,16,16,16);glow.addColorStop(0,'#ffffff');glow.addColorStop(.12,colour);glow.addColorStop(.4,colour+'70');glow.addColorStop(1,colour+'00');g.fillStyle=glow;g.fillRect(0,0,32,32);return s;});
  const stars=Array.from({length:420},(_,i)=>{const r=random(i*239+7);return {x:r(),y:r(),phase:r()*7,speed:.3+r(),size:.5+r()};});
  const resize=()=>{w=innerWidth;h=innerHeight;height=Math.max(document.documentElement.scrollHeight,h*3);const dpr=Math.min(devicePixelRatio||1,1.5);c.width=w*dpr;c.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);dirty=true;};
  const observer=new ResizeObserver(resize);observer.observe(document.body);resize();
  const mark=()=>{dirty=true;};
  const draw=(now:number)=>{
   const dark=document.documentElement.dataset.theme==='dark';
   const moving=dark&&!document.hidden&&!reduced.matches&&!document.querySelector('.landing-motion-paused');
   const dt=last?Math.min((now-last)/1000,.05):0;last=now;
   if(moving)clock.current+=dt;
   if(dark&&(moving||dirty)){
    dirty=false;const t=clock.current,scroll=window.scrollY;ctx.clearRect(0,0,w,h);ctx.globalCompositeOperation='lighter';
    for(const star of stars){const x=star.x*w+Math.sin(t*.05+star.phase)*12,y=star.y*height-scroll+Math.sin(t*star.speed*.06+star.phase)*18;if(y< -20||y>h+20)continue;ctx.globalAlpha=.18+.12*(1+Math.sin(t*star.speed+star.phase));ctx.drawImage(sprites[0],x,y,star.size*3,star.size*3);}
    fields.forEach((particles,i)=>{
     const x=w*(i%2?.86:.12)+Math.sin(i*2.3)*w*.025;
     const worldY=160+i*(height-280)/(count-1),y=worldY-scroll;
     const radius=Math.min(w*.2,235)*(i%3===0?1:.7);
     const button=buttons.current[i];if(button){button.style.left=`${x}px`;button.style.top=`${y}px`;button.style.width=`${Math.max(48,radius*1.7)}px`;button.style.height=`${Math.max(44,radius)}px`;button.style.visibility=y< -radius||y>h+radius?'hidden':'visible';}
     if(y< -radius*2||y>h+radius*2)return;
     const age=t-bursts.current[i],burst=age>=0&&age<3?Math.sin(age/3*Math.PI)**2:0;
     const tilt=i*.8,cs=Math.cos(tilt),sn=Math.sin(tilt);
     for(const p of particles){
      const angle=p.a+t*p.speed/(.35+p.r);const r=p.r*radius;
      const scatter=burst*radius*(.35+p.r)*.9;
      const px=Math.cos(angle)*r+Math.cos(p.phase)*scatter;
      const py=Math.sin(angle)*r*.48+p.z*radius+Math.sin(p.phase)*scatter;
      const sx=x+px*cs-py*sn,sy=y+px*sn+py*cs;
      const size=p.s*(w<640?2:2.8)*(1+.12*Math.sin(t+p.phase));
      ctx.globalAlpha=(.25+.35*(1-p.r))*(.8+.2*Math.sin(t*p.speed*8+p.phase));
      ctx.drawImage(sprites[i%colours.length],sx-size/2,sy-size/2,size,size);
     }
     ctx.globalAlpha=.28*(1-burst);const core=radius*.25;ctx.drawImage(sprites[i%colours.length],x-core/2,y-core/2,core,core);
    });ctx.globalAlpha=1;
   }
   frame=requestAnimationFrame(draw);
  };
  frame=requestAnimationFrame(draw);addEventListener('resize',resize);addEventListener('scroll',mark,{passive:true});document.addEventListener('visibilitychange',mark);reduced.addEventListener('change',mark);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();removeEventListener('resize',resize);removeEventListener('scroll',mark);document.removeEventListener('visibilitychange',mark);reduced.removeEventListener('change',mark);};
 },[]);
 return <div className="cosmic-universe"><canvas ref={canvas} className="cosmic-canvas" aria-hidden="true"/>{Array.from({length:count},(_,i)=><button ref={el=>{buttons.current[i]=el;}} key={i} className="cosmic-galaxy" aria-label={`Scatter and reunite ${names[i%names.length]} ${Math.floor(i/8)+1}`} onClick={()=>{bursts.current[i]=clock.current;}}><span className="cosmic-name">{names[i%names.length]} · Touch to scatter</span></button>)}</div>;
}
