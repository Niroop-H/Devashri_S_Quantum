import {useEffect, useRef} from 'react';

const colours=['#fff0da','#c5d9ff','#f39acb','#fff3df','#e77870','#c4dfa1','#ddd8ff','#fff0da'];
const names=['Ivory Crown','Azure Whirlpool','Rose Halo','Silver Horizon','Crimson Ember','Verdant Spiral','Violet Reach','Pearl Companion'];
const count=16;
function random(seed:number){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const fields=Array.from({length:count},(_,index)=>{
 const rand=random(731+index*1907);
 return Array.from({length:2400},()=>{const r=Math.pow(rand(),1.1);return {r,a:Math.floor(rand()*3)*Math.PI*2/3+r*8+(rand()-.5)*(.3+r*.7),z:(rand()-.5)*.14,s:.4+rand()*1.1,speed:.006+rand()*.008,phase:rand()*Math.PI*2};});
});
export default function CosmicUniverse(){
 const canvas=useRef<HTMLCanvasElement>(null);
 const buttons=useRef<(HTMLButtonElement|null)[]>([]);
 const bursts=useRef<number[]>(Array(count).fill(-100));
 const clock=useRef(0);
 useEffect(()=>{
  const c=canvas.current,ctx=c?.getContext('2d');if(!c||!ctx)return;
  let w=0,h=0,height=0,frame=0,last=0,dirty=true,viewScroll=window.scrollY,quality=1;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const sprites=colours.map(colour=>{const s=document.createElement('canvas');s.width=s.height=32;const g=s.getContext('2d')!;const glow=g.createRadialGradient(16,16,0,16,16,16);glow.addColorStop(0,'#ffffff');glow.addColorStop(.12,colour);glow.addColorStop(.4,colour+'70');glow.addColorStop(1,colour+'00');g.fillStyle=glow;g.fillRect(0,0,32,32);return s;});
  const stars=Array.from({length:4200},(_,i)=>{const r=random(i*239+7);return {x:r(),y:r(),phase:r()*7,speed:.3+r(),size:.5+r()};});
  // Soft gas and absorbing dust use continuous gradients, not polygon slices.
  const dust=document.createElement('canvas');dust.width=dust.height=64;
  const dg=dust.getContext('2d')!,dgFill=dg.createRadialGradient(32,32,0,32,32,32);
  dgFill.addColorStop(0,'#020106c0');dgFill.addColorStop(.45,'#08050c70');dgFill.addColorStop(1,'#00000000');dg.fillStyle=dgFill;dg.fillRect(0,0,64,64);
  const clouds=Array.from({length:260},(_,i)=>{const r=random(1187+i*149);return {x:r(),y:r(),scale:100+r()*220,phase:r()*7,colour:i%8};});
  const resize=()=>{
   const nw=innerWidth,nh=innerHeight;
   const landing=document.querySelector('.landing');
   const nextHeight=Math.max(landing?.getBoundingClientRect().height||0,nh*3);
   const dpr=Math.min(devicePixelRatio||1,nw<640?1:1.25);
   // Never clear the drawing buffer on a document-height notification.
   if(nw!==w||nh!==h){w=nw;h=nh;c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
   height=nextHeight;dirty=true;
  };
  const observer=new ResizeObserver(resize);const landing=document.querySelector('.landing');if(landing)observer.observe(landing);resize();
  const mark=()=>{dirty=true;};
  const draw=(now:number)=>{
   const dark=document.documentElement.dataset.theme==='dark';
   const moving=dark&&!document.hidden&&!reduced.matches&&!document.querySelector('.landing-motion-paused');
   const rawDt=last?(now-last)/1000:1/60;const dt=Math.min(rawDt,.05);last=now;
   if(moving)quality=Math.max(.4,Math.min(1,quality+(rawDt>.027?-.012:.002)));
   const target=window.scrollY;viewScroll=reduced.matches?target:viewScroll+(target-viewScroll)*(1-Math.exp(-dt*24));
   if(Math.abs(target-viewScroll)<.2)viewScroll=target;else dirty=true;
   if(moving)clock.current+=dt;
   if(dark&&(moving||dirty)){
    dirty=false;const t=clock.current,scroll=viewScroll;ctx.clearRect(0,0,w,h);ctx.globalCompositeOperation='lighter';
    // A page-length interstellar medium fills the gaps between named galaxies.
    for(const cloud of clouds){const y=cloud.y*height-scroll+Math.sin(t*.04+cloud.phase)*22;if(y< -cloud.scale||y>h+cloud.scale)continue;const x=cloud.x*w+Math.sin(t*.025+cloud.phase)*30;ctx.globalAlpha=.018+.008*Math.sin(t*.08+cloud.phase);ctx.drawImage(sprites[cloud.colour],x-cloud.scale,y-cloud.scale*.45,cloud.scale*2,cloud.scale*.9);}
    for(const star of stars){const x=star.x*w+Math.sin(t*.05+star.phase)*12,y=star.y*height-scroll+Math.sin(t*star.speed*.06+star.phase)*18;if(y< -20||y>h+20)continue;ctx.globalAlpha=.18+.12*(1+Math.sin(t*star.speed+star.phase));ctx.drawImage(sprites[0],x,y,star.size*3,star.size*3);}
    fields.forEach((particles,i)=>{
     const x=w*(i%2?.86:.12)+Math.sin(i*2.3)*w*.025;
     const worldY=160+i*(height-280)/(count-1),y=worldY-scroll;
     const radius=Math.min(w*.3,340)*(i%3===0?1:.78);
     const button=buttons.current[i];if(button){button.style.left="0";button.style.top="0";button.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%)`;button.style.width=`${Math.max(48,radius*1.7)}px`;button.style.height=`${Math.max(44,radius)}px`;button.style.visibility=y< -radius||y>h+radius?'hidden':'visible';}
     if(y< -radius*2||y>h+radius*2)return;
     const age=t-bursts.current[i],burst=age>=0&&age<3?Math.sin(age/3*Math.PI)**2:0;
     const tilt=i*.8,cs=Math.cos(tilt),sn=Math.sin(tilt);
     // Broad luminous bulge and overlapping gas knots create a continuous stellar disk.
     ctx.save();ctx.translate(x,y);ctx.rotate(tilt);ctx.scale(1,i%5===0?.24:.55);
     ctx.globalAlpha=.22*(1-burst);ctx.drawImage(sprites[i%8],-radius,-radius,radius*2,radius*2);
     for(let j=0;j<260;j++){
      const r=(j+.5)/260,arm=j%3*Math.PI*2/3;
      const a=arm+r*8+t*.008/(.4+r),rr=r*radius;
      const spread=radius*(.055+.09*r)*(1+.2*Math.sin(j*2.17)),d=burst*radius*r;
      ctx.globalAlpha=(.032+.018*Math.sin(j*2.3+t*.1))*(1-burst*.8);
      ctx.drawImage(sprites[i%8],Math.cos(a)*(rr+d)-spread,Math.sin(a)*(rr+d)-spread,spread*2,spread*2);
     }
     // Offset dusty filaments divide the luminous arms without hard edges or grid lines.
     ctx.globalCompositeOperation='source-over';
     for(let j=0;j<180;j++){
      const r=(j+.5)/180,a=j%3*Math.PI*2/3+r*8+.19+t*.008/(.4+r),rr=r*radius;
      const size=radius*(.025+.035*r);ctx.globalAlpha=.22*(1-burst);
      ctx.drawImage(dust,Math.cos(a)*rr-size,Math.sin(a)*rr-size,size*2,size*2);
     }
     ctx.restore();ctx.globalCompositeOperation='lighter';
     for(let pi=0;pi<particles.length;pi+=quality<.65?2:1){
      const p=particles[pi];
      const angle=p.a+t*p.speed/(.35+p.r);const r=p.r*radius;
      const scatter=burst*radius*(.35+p.r)*.9;
      const px=Math.cos(angle)*r+Math.cos(p.phase)*scatter;
      const py=Math.sin(angle)*r*.48+p.z*radius+Math.sin(p.phase)*scatter;
      const sx=x+px*cs-py*sn,sy=y+px*sn+py*cs;
      const size=p.s*(w<640?1.1:1.65)*(1+.12*Math.sin(t+p.phase));
      ctx.globalAlpha=(.28+.42*(1-p.r))*(quality<.65?1.35:1)*(.8+.2*Math.sin(t*p.speed*8+p.phase));
      ctx.drawImage(sprites[p.r<.22?0:(pi%5===0?1:i%colours.length)],sx-size/2,sy-size/2,size,size);
     }
     ctx.globalAlpha=.7*(1-burst);const core=radius*.23;ctx.drawImage(sprites[i%colours.length],x-core/2,y-core/2,core,core);
    });ctx.globalAlpha=1;
   }
   frame=requestAnimationFrame(draw);
  };
  frame=requestAnimationFrame(draw);addEventListener('resize',resize);addEventListener('scroll',mark,{passive:true});document.addEventListener('visibilitychange',mark);reduced.addEventListener('change',mark);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();removeEventListener('resize',resize);removeEventListener('scroll',mark);document.removeEventListener('visibilitychange',mark);reduced.removeEventListener('change',mark);};
 },[]);
 return <div className="cosmic-universe"><canvas ref={canvas} className="cosmic-canvas" aria-hidden="true"/>{Array.from({length:count},(_,i)=><button ref={el=>{buttons.current[i]=el;}} key={i} className="cosmic-galaxy" aria-label={`Scatter and reunite ${names[i%names.length]} ${Math.floor(i/8)+1}`} onClick={()=>{bursts.current[i]=clock.current;}}><span className="cosmic-name">{names[i%names.length]} · Touch to scatter</span></button>)}</div>;
}
