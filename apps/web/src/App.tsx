import {useEffect,useRef,useState} from 'react'
import {createSim,addIncident,applyPlan,step,metrics,warmup,clone,DT} from '@transita/simulation'
import City3D from './City3D'
import {runAgent} from './api'
import {voz} from './voz'
import './App.css'
const f=(n:number)=>n.toFixed(1).replace('.',',')
const plan=(a:any)=>`${a.modo==='adaptativo'?'semáforo adaptativo (verde de 4 a 20 s conforme a fila)':`semáforo fixo (verde de ${a.verdeEW??12} s e ${a.verdeNS??12} s)`}${a.desvio?`, desvio de ${Math.round(a.desvio*100)}% dos condutores`:''}${a.enviarAgente?', agente de trânsito no local':''}`
const resumo=(p:any)=>{const r=p.resultado||{};if(p.nome==='simular_cenario')return `${plan(r.plano||{})}: espera total ${String(r.esperaTotalS).replace('.',',')} s, fila máxima ${r.filaMaxima}, passaram ${r.passaram}`
  if(p.nome==='ler_estado')return `espera média ${f(r.esperaMedia||0)} s, ${r.fila} veículos parados`;return 'plano registado'}
const narra=(p:any)=>{const r=p.resultado||{};if(p.tipo==='pensamento')return p.texto
  if(p.nome==='ler_estado')return `Estado lido. Há ${r.fila} veículos parados.`
  if(p.nome==='simular_cenario')return `Simulei ${plan(r.plano||{})}. Espera total de ${Math.round(r.esperaTotalS)} segundos.`;return ''}
const sinal=(x:any)=>{const e=x.phase?'Norte-Sul':'Este-Oeste',p=x.plan;if(x.clear)return `Amarelo para ${e}, a limpar o cruzamento`
  return `Verde ${e}, ${p.modo==='adaptativo'?`há ${Math.round(x.gt)} s (adaptativo)`:`faltam ${Math.max(0,Math.round((x.phase?p.verdeNS:p.verdeEW)-x.gt))} s (fixo)`}`}
const Seg=({v,set,o}:any)=><div className="seg">{o.map(([k,l]:any)=><button key={k} className={v===k?'on':''} onClick={()=>set(k)}>{l}</button>)}</div>
function Spark({h}:{h:any[][]}){const all=h.flat().map(p=>p.esp),mx=Math.max(1,...all)
  const pts=(a:any[])=>a.map((p,i)=>`${(i/Math.max(1,159))*300},${70-(p.esp/mx)*64}`).join(' ')
  return <svg viewBox="0 0 300 74" className="spark"><polyline points={pts(h[0])} fill="none" stroke="#ef7a85" strokeWidth="2"/><polyline points={pts(h[1])} fill="none" stroke="#5fe0b8" strokeWidth="2"/></svg>}
export default function App(){
  const s0=useRef<any>(null),s1=useRef<any>(null),hist=useRef<any[][]>([[],[]]),base=useRef<any>(null)
  if(!s0.current){s0.current=createSim(7);s1.current=createSim(7);warmup(s0.current,40);warmup(s1.current,40)}
  const [m,setM]=useState<any[]>([metrics(s0.current),metrics(s1.current)])
  const [speed,setSpeed]=useState(4),sp=useRef(4);sp.current=speed
  const [modo,setModo]=useState('lado'),[cam,setCam]=useState('aerea'),[aberto,setAberto]=useState(true),[vozOn,setVozOn]=useState(true)
  const [fase,setFase]=useState<'idle'|'analisa'|'proposto'|'aplicado'>('idle')
  const [passos,setPassos]=useState<any[]>([]),[res,setRes]=useState<any>(null),[erro,setErro]=useState('')
  useEffect(()=>{let last=performance.now(),acc=0,tm=0,raf=0
    const loop=(now:number)=>{const fd=Math.min(.05,(now-last)/1000);last=now;acc+=fd*sp.current
      while(acc>=DT){step(s0.current);step(s1.current);acc-=DT}
      tm+=fd;if(tm>.25){tm=0;const mm=[s0.current,s1.current].map((s,i)=>{const x=metrics(s);hist.current[i].push({t:x.t,esp:x.esperaMedia,out:x.passaram,dens:Math.min(100,Math.round(s.cars.flat().filter((c:any)=>!c.crash).length/36*100))});if(hist.current[i].length>160)hist.current[i].shift();return x});setM(mm)}
      raf=requestAnimationFrame(loop)}
    raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf)},[])
  useEffect(()=>{if(fase==='aplicado'&&!s0.current.inc&&!s1.current.inc)setFase('idle')},[m])
  const reportar=async()=>{if(fase!=='idle')return;setErro('');setPassos([]);setRes(null);setCam('incidente')
    addIncident(s0.current);addIncident(s1.current);base.current=[s0.current,s1.current].map((x:any)=>({w:x.wait,n:x.seen}));setFase('analisa');voz.falar('Incidente detectado na via Oeste. A analisar o cruzamento.')
    try{const r=await runAgent(clone(s1.current));setRes(r)
      for(const p of r.passos){await new Promise(z=>setTimeout(z,220));setPassos(x=>[...x,p])}
      const w=r.passos.filter((p:any)=>p.nome==='simular_cenario').map((p:any)=>p.resultado.esperaTotalS)
      setFase('proposto');voz.falar(`${w.length?`Simulei ${w.length} planos. A espera total vai de ${Math.round(Math.max(...w))} a ${Math.round(Math.min(...w))} segundos. `:''}Proponho ${plan(r.plano)}. ${r.justificacao} Diga aprovar para aplicar.`)}
    catch(e:any){setErro(e.message);setFase('idle');setCam('aerea')}}
  const aprovar=()=>{if(!res)return;applyPlan(s1.current,res.plano);setFase('aplicado');setCam('aerea');voz.falar('Plano aplicado. A medir o impacto.')}
  const ac=useRef<any>({});ac.current={reportar,aprovar,fase}
  const ouvir=()=>{if(!voz.ouvir(t=>{if(/aprov|aplic|sim/.test(t)&&ac.current.fase==='proposto')ac.current.aprovar();else if(/acident|incident|report/.test(t))ac.current.reportar()}))setErro('O reconhecimento de voz não é suportado neste navegador. Use Chrome ou Edge.')}
  const kpi=(i:number)=>{const h=hist.current[i],l=h[h.length-1]||{t:0,out:0,dens:0},o=[...h].reverse().find(p=>p.t<=l.t-60)||h[0]||l
    return{fluxo:l.t>o.t?Math.round((l.out-o.out)/((l.t-o.t)/60)):0,dens:l.dens}}
  const b=base.current,d=(i:number,x:any)=>b?{w:x.wait-b[i].w,n:Math.max(1,x.seen-b[i].n)}:{w:0,n:1},a0=d(0,s0.current),a1=d(1,s1.current)
  const pct=a0.w>0?Math.max(0,Math.round((1-(a1.w/a1.n)/(a0.w/a0.n))*100)):0
  const saved=Math.max(0,a0.w-a1.w)
  const vistas=[0,1].filter(i=>modo==='lado'||(modo==='ai'&&i===1)||(modo==='sem'&&i===0))
  return <div className="app">
    <header className="hud"><div className="brand"><h1>Transita</h1><span>Agente de trânsito com IA. Luanda, dados sintéticos.</span></div>
      <div className="ctl"><Seg v={modo} set={setModo} o={[['lado','Lado a lado'],['sem','Sem IA'],['ai','Com IA']]}/><Seg v={cam} set={setCam} o={[['aerea','Aérea'],['rua','Rua'],['incidente','Incidente']]}/>
        <Seg v={speed} set={setSpeed} o={[[1,'1x'],[2,'2x'],[4,'4x'],[8,'8x']]}/>
        <button className={vozOn?'tg on':'tg'} onClick={()=>setVozOn(voz.alternar())}>Voz {vozOn?'ligada':'desligada'}</button><button className="tg" onClick={ouvir}>Falar</button>
        <button className="btn" onClick={reportar} disabled={fase!=='idle'}>Reportar incidente</button><button className="tg" onClick={()=>setAberto(!aberto)}>{aberto?'Fechar painel':'Abrir painel'}</button></div></header>
    <main className={'stage'+(aberto?' com-painel':'')}>{vistas.map(i=>{const k=kpi(i);return <section key={i} className={'view'+(i?' ai':'')}><City3D simRef={i?s1:s0} cam={cam}/>
      <div className={'chip '+(i?'ok':'bad')}>{i?'Com IA: agente Transita':'Sem IA: semáforo fixo'}</div><div className="sig">{sinal(i?s1.current:s0.current)}</div>
      <div className="stats"><div className="st"><span>Espera média</span><b>{f(m[i].esperaMedia)} s</b></div><div className="st"><span>Veículos parados</span><b>{m[i].fila}</b></div>
        <div className="st"><span>Fluxo</span><b>{k.fluxo}<small> veíc/min</small></b></div><div className="st"><span>Densidade</span><b>{k.dens}<small>%</small></b></div></div></section>})}</main>
    <aside className={'panel'+(aberto?'':' fechado')}>
      <div className="k">Impacto da IA neste incidente</div><div className="big">-{pct}%</div>
      <p className="mut">{f(saved/60)} min de espera evitados, cerca de {Math.round(saved*.5)} g de CO₂ a menos (estimativa). Valores calculados pelo motor.</p>
      <Spark h={hist.current}/><div className="leg"><span className="r">Sem IA</span><span className="g">Com IA</span><span className="mut">espera média ao longo do tempo</span></div>
      <div className="k">Raciocínio do agente{res&&<span className={'tag '+res.modo}>{res.modo==='llm'?'Muse Spark':'modo de reserva'}</span>}</div>
      {fase==='idle'&&!passos.length&&<p className="mut">Carregue em «Reportar incidente» ou diga «reportar acidente».</p>}
      {fase==='analisa'&&!passos.length&&<p className="mut">O agente está a analisar o incidente...</p>}
      {erro&&<p className="err">{erro}</p>}{res?.aviso&&<p className="mut">{res.aviso}</p>}{res?.uso&&<p className="mut">{res.uso.chamadas} chamadas à API da Meta, {res.uso.tokens} tokens, {f(res.uso.ms/1000)} s</p>}
      <ol className="tl">{passos.map((p,i)=><li key={i}>{p.tipo==='pensamento'?<p>{p.texto}</p>:<><b>{p.nome}</b><p>{resumo(p)}</p></>}</li>)}</ol>
      {(fase==='proposto'||fase==='aplicado')&&res&&<div className="prop"><b>Plano proposto</b><p>{plan(res.plano)}</p><p className="mut">{res.justificacao}</p>
        {fase==='proposto'?<button className="btn" onClick={aprovar}>Aprovar e aplicar</button>:<span className="ok-t">Plano aplicado pelo operador.</span>}</div>}
    </aside></div>}
