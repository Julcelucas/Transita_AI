// Motor de simulação de um cruzamento. Estado em dados simples: clonável e determinístico.
export const DT=0.05,L=55,STOP=-7.3,VMAX=9,GAP=4.8
export const RATE=[.22,.22,.25,.25],AX=[0,0,1,1]
export const AP=[{d:[1,0],o:[0,2.25]},{d:[-1,0],o:[0,-2.25]},{d:[0,1],o:[-2.25,0]},{d:[0,-1],o:[2.25,0]}]
export const VIAS=['Oeste','Este','Norte','Sul']
export const DEFAULT_PLAN={modo:'fixo',verdeEW:12,verdeNS:12,desvio:0,enviarAgente:false}
export const pos=(a,s)=>[AP[a].d[0]*s+AP[a].o[0],AP[a].d[1]*s+AP[a].o[1]]
function rnd(s){s.rs=(s.rs+0x6D2B79F5)|0;let t=Math.imul(s.rs^(s.rs>>>15),1|s.rs);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}
export const createSim=(seed=7)=>({t:0,rs:seed,phase:0,gt:0,clear:false,cars:[[],[],[],[]],id:1,wait:0,seen:0,out:0,inc:null,plan:{...DEFAULT_PLAN}})
export const clone=s=>structuredClone(s)
export function addIncident(s,a=0,p=-18,secs=600){const c={id:s.id++,a,s:p,v:0,crash:true};s.cars[a].push(c);s.cars[a].sort((x,y)=>y.s-x.s);s.inc={a,s:p,clearAt:s.t+secs}}
export function applyPlan(s,p){s.plan={...s.plan,...p};if(s.inc&&s.plan.enviarAgente)s.inc.clearAt=Math.min(s.inc.clearAt,s.t+60)}
export function lightState(s,a){const m=AX[a]===s.phase;return s.clear?(m?'amarelo':'vermelho'):(m?'verde':'vermelho')}
function press(s,ax){let n=0;for(let a=0;a<4;a++){if(AX[a]!==ax||(s.inc&&s.plan.modo==='adaptativo'&&s.inc.a===a))continue;for(const c of s.cars[a])if(!c.crash&&c.s>-48&&c.s<STOP+1&&c.v<2.5)n++}return n}
export function step(s,dt=DT){
 s.t+=dt;s.gt+=dt;const p=s.plan
 if(s.clear){if(s.gt>=1.5){s.phase^=1;s.gt=0;s.clear=false}}
 else{let sw=false
  if(p.modo==='adaptativo'){const cu=press(s,s.phase),ot=press(s,1-s.phase);sw=(s.gt>=20&&ot>0)||(s.gt>=6&&ot>cu+1)||(s.gt>=4&&cu===0&&ot>0)}
  else sw=s.gt>=(s.phase?p.verdeNS:p.verdeEW)
  if(sw){s.clear=true;s.gt=0}}
 if(s.inc&&s.t>=s.inc.clearAt){s.cars[s.inc.a]=s.cars[s.inc.a].filter(c=>!c.crash);s.inc=null}
 for(let a=0;a<4;a++){const arr=s.cars[a],r=rnd(s),last=arr[arr.length-1],m=s.inc&&s.inc.a===a?1-p.desvio:1
  if(r<RATE[a]*m*dt&&(!last||last.s>-L+7)){arr.push({id:s.id++,a,s:-L,v:VMAX*.8,w:0});s.seen++}
  const green=!s.clear&&AX[a]===s.phase
  for(let i=0;i<arr.length;i++){const c=arr[i];if(c.crash)continue
   let lim=i?arr[i-1].s-GAP:Infinity;if(!green&&c.s<STOP)lim=Math.min(lim,STOP)
   const gap=lim-c.s,tg=gap>14?VMAX:Math.max(0,Math.min(VMAX,(gap-.3)*1.6)),pv=c.s
   c.v+=Math.max(-16*dt,Math.min(5*dt,tg-c.v));c.s+=c.v*dt
   if(c.s>lim&&pv<=lim+.01){c.s=lim;c.v=0}
   if(c.v<.5&&c.s<STOP+2){c.w+=dt;s.wait+=dt}}
  while(arr.length&&arr[0].s>L){arr.shift();s.out++}}}
export const warmup=(s,secs)=>{for(let i=0;i<secs/DT;i++)step(s)}
export function metrics(s){let q=0;s.cars.forEach(a=>a.forEach(c=>{if(!c.crash&&c.v<.5&&c.s<STOP+2)q++}))
 return{t:s.t,esperaMedia:s.seen?s.wait/s.seen:0,esperaTotal:s.wait,fila:q,passaram:s.out}}
// Simula `secs` segundos numa cópia do estado com o plano dado. Usado pelas ferramentas do agente.
export function runScenario(base,plan,secs=240){const c=clone(base);applyPlan(c,plan);const w0=c.wait,o0=c.out;let pk=0
 for(let i=0;i<secs/DT;i++){step(c);if(i%20===0)pk=Math.max(pk,metrics(c).fila)}
 return{esperaTotalS:+(c.wait-w0).toFixed(1),filaMaxima:pk,passaram:c.out-o0,incidenteAtivoNoFim:!!c.inc}}
