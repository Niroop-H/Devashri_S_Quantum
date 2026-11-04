import { useEffect, useRef, useState } from 'react';
import './workspace-menu.css';

export const workspaces = [
  ['/studio', 'Quantum Computing', 'Circuits, code & quantum states'],
  ['/lab', 'Quantum Lab Twin', 'Cryogenics, calibration & environment'],
  ['/sensing', 'Sensing & Metrology', 'Magnetometry, clocks & gravimetry'],
  ['/communication', 'Communication & Cryptography', 'BB84, optical links & entanglement'],
];

export default function WorkspaceMenu() {
  const ref = useRef<HTMLDivElement>(null);
  const [open,setOpen]=useState(false);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && ref.current) {
        const inside = ref.current.contains(document.activeElement);
        setOpen(false);
        if (inside) ref.current.querySelector('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <div className="workspace-menu" ref={ref}>
    <button className="workspace-trigger" aria-expanded={open} aria-controls="workspace-destinations" onClick={()=>setOpen(v=>!v)}>Quantum Workspace <span aria-hidden="true">⌄</span></button>
    {open && <div className="workspace-options" id="workspace-destinations">
      <p>CHOOSE YOUR WORKSPACE</p>
      {workspaces.map(([href, title, description], i) => <a key={href} href={href} aria-current={location.pathname.replace(/\/$/, '') === href ? 'page' : undefined}>
        <span className="workspace-number">0{i + 1}</span><span><strong>{title}</strong><small>{description}</small></span><span aria-hidden="true">↗</span>
      </a>)}
    </div>}
  </div>;
}
