/** Procedural machined carrier detail. Geometry stays crisp at every zoom level. */
export default function ChipFabrication() {
  return <svg className="precision-fabrication" viewBox="0 0 500 500" aria-hidden="true">
    <defs>
      <linearGradient id="milled-gold" x1="0" y1="0" x2="1" y2=".8"><stop stopColor="#403525"/><stop offset=".18" stopColor="#f5dc9c"/><stop offset=".34" stopColor="#a68c50"/><stop offset=".5" stopColor="#fff2ce"/><stop offset=".55" stopColor="#77603a"/><stop offset=".88" stopColor="#dec28a"/><stop offset="1" stopColor="#443722"/></linearGradient>
      <linearGradient id="coax-steel" x2="1"><stop stopColor="#0e171e"/><stop offset=".25" stopColor="#9ba9b0"/><stop offset=".44" stopColor="#f7faf3"/><stop offset=".6" stopColor="#566773"/><stop offset="1" stopColor="#0c1720"/></linearGradient>
      <radialGradient id="bolt-socket"><stop stopColor="#000"/><stop offset=".5" stopColor="#0a1015"/><stop offset=".55" stopColor="#d5d6c7"/><stop offset=".75" stopColor="#4b5050"/><stop offset="1" stopColor="#b4aa8d"/></radialGradient>
    </defs>
    {/* Milled perimeter, screw sockets, blind vias, coax launchers and strain relief. */}
    <rect x="-14" y="-14" width="528" height="528" rx="23" fill="none" stroke="#000" strokeWidth="20" opacity=".5" transform="translate(4 8)"/>
    <rect x="-15" y="-15" width="530" height="530" rx="20" fill="none" stroke="url(#milled-gold)" strokeWidth="15"/>
    <rect x="-6" y="-6" width="512" height="512" rx="13" fill="none" stroke="#e8d8ad" strokeWidth=".8"/>
    {[0,90,180,270].map(side=><g key={side} transform={`rotate(${side} 250 250)`}>
      {Array.from({length:6},(_,i)=>{const x=80+i*68;return <g key={i}>
        <rect x={x-14} y="-42" width="28" height="45" rx="5" fill="#000" opacity=".5" transform="translate(3 5)"/>
        <rect x={x-11} y="-48" width="22" height="47" rx="4" fill="url(#coax-steel)" stroke="#819091" strokeWidth=".6"/>
        <path d={`M${x-15} -34 l5 -8 h20 l5 8 l-5 8 h-20 Z`} fill="url(#milled-gold)" stroke="#f1d291" strokeWidth=".7"/>
        {Array.from({length:6},(_,j)=><path key={j} d={`M${x-10} ${-23+j*3} h20`} stroke="#252b2d" strokeWidth=".8"/>)}
        <rect x={x-7} y="4" width="14" height="16" fill="url(#milled-gold)"/>
        <path d={`M${x} 20 V46 L${x+13} 59 V83`} fill="none" stroke="#02070a" strokeWidth="7"/>
        <path d={`M${x} 20 V46 L${x+13} 59 V83`} fill="none" stroke="url(#milled-gold)" strokeWidth="3"/>
        <circle cx={x+13} cy="84" r="4" fill="#c3ac76"/><circle cx={x+13} cy="84" r="1.8" fill="#071319"/>
      </g>})}
      {Array.from({length:32},(_,i)=><g key={i}><circle cx={18+i*15} cy="11" r="2.3" fill="#b1a07c"/><circle cx={18+i*15} cy="11" r="1" fill="#071015"/></g>)}
      <text x="250" y="32" fill="#d9c898" fontSize="5" fontFamily="monospace" textAnchor="middle" letterSpacing="2">{['MICROWAVE / DRIVE','READOUT / RESONATOR','FLUX / BIAS','CLOCK / REFERENCE'][side/90]}</text>
    </g>)}
    {[[26,26],[474,26],[26,474],[474,474]].map(([x,y],i)=><g key={i}>
      <circle cx={x+2} cy={y+3} r="16" fill="#000" opacity=".6"/><circle cx={x} cy={y} r="14" fill="url(#bolt-socket)"/>
      <path d={`M${x-5} ${y-3} l5 -3 l5 3 v6 l-5 3 l-5 -3 Z`} fill="#050b10" stroke="#7f857d"/>
      <circle cx={x} cy={y} r="18" fill="none" stroke="#a38f60" strokeWidth=".5"/>
    </g>)}
    {Array.from({length:4},(_,side)=><g key={side} transform={`rotate(${side*90} 250 250)`}>
      {Array.from({length:30},(_,i)=>{const x=163+i*6;return <g key={i}><rect x={x} y="139" width="3" height="10" fill="url(#milled-gold)"/><path d={`M${x+1} 148 Q${x-5} 169 ${183+i*4.5} 181`} fill="none" stroke="#000" strokeWidth="2" transform="translate(2 3)"/><path d={`M${x+1} 148 Q${x-5} 169 ${183+i*4.5} 181`} fill="none" stroke="url(#milled-gold)" strokeWidth="1"/></g>})}
    </g>)}
    <text x="43" y="459" fill="#bac4c1" fontSize="6" fontFamily="monospace" letterSpacing="1">MAH • Q08 • REV 04</text>
    <g fill="#acb3a2">{Array.from({length:36},(_,i)=><rect key={i} x={396+i%6*3} y={445+Math.floor(i/6)*3} width={(i*7)%3+1} height="2"/>)}</g>
  </svg>;
}
