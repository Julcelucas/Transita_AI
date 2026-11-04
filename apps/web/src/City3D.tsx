import {useEffect,useRef} from 'react'
import * as THREE from 'three'
import {AP,pos,lightState,VIAS} from '@transita/simulation'
const PAL=[0xe9eff6,0x5fe0b8,0xe0bd6a,0x9aa7b6,0xff9d6c,0xc9d4e0]
const COL:any={verde:0x34d399,amarelo:0xfbbf24,vermelho:0xef4444}
const T:any={aerea:{R:74,ph:.62,tg:[0,0,0]},rua:{R:24,ph:.14,tg:[0,2,0]},incidente:{R:32,ph:.4,tg:[-18,1,2.25]}}
export default function City3D({simRef,cam:cm}:{simRef:{current:any},cam:string}){
  const host=useRef<HTMLDivElement>(null),cmRef=useRef(cm);cmRef.current=cm
  useEffect(()=>{
    const el=host.current!,r=new THREE.WebGLRenderer({antialias:true});r.setPixelRatio(Math.min(devicePixelRatio,2));el.appendChild(r.domElement)
    const sc=new THREE.Scene();sc.background=new THREE.Color(0x070d14);sc.fog=new THREE.Fog(0x070d14,100,250)
    sc.add(new THREE.AmbientLight(0x8aa4c0,1.1));const sun=new THREE.DirectionalLight(0xbfd4ff,2);sun.position.set(-40,80,30);sc.add(sun)
    const cam=new THREE.PerspectiveCamera(48,1,.5,400)
    const M=(c:number)=>new THREE.MeshStandardMaterial({color:c,roughness:.9}),B=(c:number)=>new THREE.MeshBasicMaterial({color:c})
    const add=(g:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);sc.add(o);return o}
    add(new THREE.PlaneGeometry(320,320),M(0x0a121a)).rotation.x=-Math.PI/2
    const rm=M(0x1a242e);add(new THREE.BoxGeometry(150,.1,9.6),rm,0,.05);add(new THREE.BoxGeometry(9.6,.1,150),rm,0,.05)
    const yl=B(0xb8962e),wh=B(0xcfd8e2)
    for(const s of[-1,1]){add(new THREE.BoxGeometry(64,.02,.14),yl,s*38,.11,0);add(new THREE.BoxGeometry(.14,.02,64),yl,0,.11,s*38)}
    AP.forEach((p:any)=>{const b=[p.d[0]*-3+p.o[0],p.d[1]*-3+p.o[1]],u=[Math.abs(p.d[1]),Math.abs(p.d[0])]
      for(let k=0;k<5;k++)add(new THREE.BoxGeometry(p.d[0]?2:.45,.03,p.d[1]?2:.45),wh,b[0]+u[0]*(k-2)*.9,.12,b[1]+u[1]*(k-2)*.9)
      const sl=pos(AP.indexOf(p),-5.5);add(new THREE.BoxGeometry(p.d[0]?.5:4.5,.03,p.d[1]?.5:4.5),wh,sl[0],.12,sl[1])})
    let sd=99;const br=()=>(sd=(sd*16807)%2147483647)/2147483647
    const bm=M(0x121d28),lm=new THREE.LineBasicMaterial({color:0x5fe0b8,transparent:true,opacity:.3})
    for(let i=0;i<46;i++){const sx=br()<.5?-1:1,sz=br()<.5?-1:1,w=5+br()*9,d=5+br()*9,h=4+br()*br()*34,x=sx*(8+w/2+br()*55),z=sz*(8+d/2+br()*55),g=new THREE.BoxGeometry(w,h,d)
      add(g,bm,x,h/2,z);const e=new THREE.LineSegments(new THREE.EdgesGeometry(g),lm);e.position.set(x,h/2,z);sc.add(e)}
    const gl=B(0xffe9b0),pm=M(0x2a3846)
    for(const t of[-45,-28,28,45])for(const [x,z] of [[t,6.4],[t,-6.4],[6.4,t],[-6.4,t]]){add(new THREE.CylinderGeometry(.08,.08,4.5),pm,x,2.25,z);add(new THREE.SphereGeometry(.32,8,6),gl,x,4.6,z)}
    const lamps=AP.map((p:any)=>{const px=p.d[0]*-6+p.o[0]/2.25*5,pz=p.d[1]*-6+p.o[1]/2.25*5
      add(new THREE.CylinderGeometry(.12,.12,5),pm,px,2.5,pz);const m=B(0xef4444);add(new THREE.SphereGeometry(.7,16,12),m,px,5.3,pz);return m})
    const gB=new THREE.BoxGeometry(1.8,.9,3.6),gT=new THREE.BoxGeometry(1.9,1.4,3.6),gC=new THREE.BoxGeometry(1.6,.7,1.8),gL=new THREE.BoxGeometry(.38,.2,.1)
    const cab=M(0x0c141c),red=M(0xe5484d),blue=new THREE.MeshStandardMaterial({color:0x1d5bd6,roughness:.5}),white=M(0xf2f6fa)
    const mats=PAL.map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.5,metalness:.2})),head=B(0xfff2c0),bOn=B(0xff3b3b),bOff=B(0x6b1a1a)
    const bc=new THREE.Mesh(new THREE.SphereGeometry(.4,12,10),B(0xffa94d));sc.add(bc)
    const ring=new THREE.Mesh(new THREE.RingGeometry(3.4,4,40),new THREE.MeshBasicMaterial({color:0xef4444,transparent:true,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;sc.add(ring)
    const meshes=new Map<number,THREE.Group>()
    const mk=(c:any)=>{const g=new THREE.Group(),taxi=!c.crash&&c.id%5===0   // candongueiro de Luanda: azul e branco
      const b=new THREE.Mesh(taxi?gT:gB,c.crash?red:taxi?blue:mats[c.id%mats.length]);b.position.y=taxi?.95:.65
      const t=new THREE.Mesh(taxi?gT:gC,taxi?white:cab);if(taxi){t.scale.set(1.01,.25,1.01);t.position.set(0,1.75,0)}else t.position.set(0,1.35,-.2)
      g.add(b,t);const rear:any[]=[]
      for(const x of[-.6,.6]){const h=new THREE.Mesh(gL,head);h.position.set(x,.7,1.8);const rr=new THREE.Mesh(gL,bOff);rr.position.set(x,.7,-1.8);g.add(h,rr);rear.push(rr)}
      g.userData.rear=rear;g.userData.on=false;sc.add(g);return g}
    const lab=document.createElement('div');lab.className='labels';el.appendChild(lab)
    const labs=[0,1,2,3,4].map(()=>{const d=document.createElement('div');d.className='lab';lab.appendChild(d);return d})
    const cur={R:74,ph:.62,tg:[0,0,0]};let th=.7,pho=0,zs=1,drag=false,lx=0,ly=0,raf=0
    const down=(e:PointerEvent)=>{drag=true;lx=e.clientX;ly=e.clientY},up=()=>{drag=false}
    const move=(e:PointerEvent)=>{if(!drag)return;th-=(e.clientX-lx)*.006;pho+=(e.clientY-ly)*.004;lx=e.clientX;ly=e.clientY}
    const wheel=(e:WheelEvent)=>{e.preventDefault();zs=Math.max(.5,Math.min(1.5,zs+e.deltaY*.0007))}
    el.addEventListener('pointerdown',down);addEventListener('pointerup',up);addEventListener('pointermove',move);el.addEventListener('wheel',wheel,{passive:false})
    const ro=new ResizeObserver(()=>{const w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;r.setSize(w,h);cam.aspect=w/h;cam.updateProjectionMatrix()});ro.observe(el)
    const v3=new THREE.Vector3(),proj=(i:number,x:number,y:number,z:number,txt:string,cls:string)=>{const d=labs[i],w=el.clientWidth,h=el.clientHeight;v3.set(x,y,z).project(cam)
      if(!txt||v3.z>1){d.style.display='none';return}d.style.display='block';d.textContent=txt;d.className='lab '+cls;d.style.left=(v3.x*.5+.5)*w+'px';d.style.top=(-v3.y*.5+.5)*h+'px'}
    const loop=()=>{raf=requestAnimationFrame(loop);if(!el.clientWidth)return
      const s=simRef.current,seen=new Set<number>(),q=[0,0,0,0]
      for(let a=0;a<4;a++)for(const c of s.cars[a]){seen.add(c.id);let g=meshes.get(c.id);if(!g){g=mk(c);meshes.set(c.id,g)}
        const p=pos(a,c.s);g.position.set(p[0],0,p[1]);g.rotation.y=c.crash?.5:Math.atan2(AP[a].d[0],AP[a].d[1])
        if(!c.crash){const on=c.v<.8;if(on!==g.userData.on){g.userData.on=on;g.userData.rear.forEach((m:any)=>m.material=on?bOn:bOff)}if(on&&c.s<-7)q[a]++}}
      meshes.forEach((g,id)=>{if(!seen.has(id)){sc.remove(g);meshes.delete(id)}})
      lamps.forEach((m,a)=>m.color.set(COL[lightState(s,a)]))
      bc.visible=ring.visible=!!s.inc
      if(s.inc){const p=pos(s.inc.a,s.inc.s);bc.position.set(p[0],2.6,p[1]);ring.position.set(p[0],.16,p[1]);bc.visible=Math.sin(s.t*9)>0;(ring.material as any).opacity=.35+.35*Math.sin(s.t*4)}
      const t0=T[cmRef.current]||T.aerea,k=.06;cur.R+=(t0.R*zs-cur.R)*k;cur.ph+=(Math.max(.1,Math.min(1.3,t0.ph+pho))-cur.ph)*k;for(let i=0;i<3;i++)cur.tg[i]+=(t0.tg[i]-cur.tg[i])*k
      if(!drag&&cmRef.current==='aerea')th+=.001
      cam.position.set(cur.tg[0]+cur.R*Math.cos(cur.ph)*Math.cos(th),cur.tg[1]+cur.R*Math.sin(cur.ph),cur.tg[2]+cur.R*Math.cos(cur.ph)*Math.sin(th));cam.lookAt(cur.tg[0],cur.tg[1],cur.tg[2])
      r.render(sc,cam)
      for(let a=0;a<4;a++){const p=pos(a,-30);proj(a,p[0],4,p[1],`${VIAS[a]}: ${q[a]} em fila`,q[a]>=8?'hot':q[a]>=4?'mid':'')}
      if(s.inc){const p=pos(s.inc.a,s.inc.s);proj(4,p[0],5,p[1],'Acidente: via '+VIAS[s.inc.a]+' bloqueada','bad')}else proj(4,0,0,0,'','')}
    loop()
    return()=>{cancelAnimationFrame(raf);ro.disconnect();el.removeEventListener('pointerdown',down);el.removeEventListener('wheel',wheel);removeEventListener('pointerup',up);removeEventListener('pointermove',move);r.dispose();el.innerHTML=''}
  },[])
  return <div ref={host} className="canvas"/>
}
