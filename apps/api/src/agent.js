import {metrics,runScenario,VIAS,DEFAULT_PLAN} from '@transita/simulation'
const SYSTEM=`És o agente de trânsito Transita, em Luanda. Há um incidente num cruzamento e o estado actual já te é dado. Nunca inventes números: usa as ferramentas.
Regras: 1) chama simular_cenario com 4 planos diferentes, TODOS NO MESMO PASSO (em paralelo), incluindo um que altere só uma coisa; 2) compara a espera total e a fila; 3) chama escolher_plano com uma justificação em português de Angola, no máximo duas frases curtas e sem símbolos, porque será lida em voz alta, citando pelo menos dois números das simulações. Os parâmetros verdeEW e verdeNS só valem no modo fixo.`
const planProps={modo:{type:'string',enum:['fixo','adaptativo']},verdeEW:{type:'number'},verdeNS:{type:'number'},desvio:{type:'number',description:'fracção de condutores desviados da via bloqueada, 0 a 0.9'},enviarAgente:{type:'boolean'}}
const fn=(name,description,properties={},required=[])=>({type:'function',function:{name,description,parameters:{type:'object',properties,required}}})
const TOOLS=[fn('ler_estado','Estado actual do cruzamento e do incidente.'),
 fn('simular_cenario','Simula 240 s com o plano e devolve métricas calculadas pelo motor.',planProps,['modo']),
 fn('escolher_plano','Regista o plano final a propor ao operador.',{...planProps,justificacao:{type:'string'}},['modo','justificacao'])]
const num=(v,a,b,d)=>Number.isFinite(+v)?Math.min(b,Math.max(a,+v)):d
const clampPlan=(a={})=>({modo:a.modo==='adaptativo'?'adaptativo':'fixo',verdeEW:num(a.verdeEW,5,40,12),verdeNS:num(a.verdeNS,5,40,12),desvio:num(a.desvio,0,.9,0),enviarAgente:!!a.enviarAgente})
export async function runAgent(estado){
 const passos=[],push=p=>passos.push(p)
 const tools={
  ler_estado:()=>({...metrics(estado),planoAtual:estado.plan,incidente:estado.inc?{via:VIAS[estado.inc.a],terminaEmSegundos:Math.round(estado.inc.clearAt-estado.t)}:null}),
  simular_cenario:a=>{const plano=clampPlan(a);return{plano,...runScenario(estado,plano)}},
  escolher_plano:()=>({ok:true})}
 const call=(nome,args={})=>{const resultado=tools[nome](args);push({tipo:'ferramenta',nome,args,resultado});return resultado}
 let aviso
 if(process.env.MODEL_API_KEY){
  try{const r=await viaLLM(tools,push);if(r)return{modo:'llm',passos,...r}}catch(e){aviso='LLM indisponível ('+e.message+'). A usar o modo de reserva.';passos.length=0}}
 push({tipo:'pensamento',texto:'Modo de reserva: sem LLM. O agente avalia planos com o mesmo motor de simulação.'})
 call('ler_estado')
 const cand=[{modo:'fixo'},{modo:'adaptativo'},{modo:'fixo',enviarAgente:true},{modo:'adaptativo',desvio:.7,enviarAgente:true}]
 const res=cand.map(c=>call('simular_cenario',c))
 const i=res.reduce((b,r,k)=>r.esperaTotalS<res[b].esperaTotalS?k:b,0),base=res[0].esperaTotalS
 const plano=res[i].plano,ganho=base?Math.round((1-res[i].esperaTotalS/base)*100):0
 call('escolher_plano',plano)
 return{modo:'reserva',aviso,passos,plano,justificacao:`Menor espera total simulada, ${ganho}% abaixo de manter o plano fixo.`}}
let semEsforco=false
async function viaLLM(tools,push){
 const B=(process.env.META_API_BASE||'https://api.meta.ai/v1').replace(/\/$/,''),K=process.env.MODEL_API_KEY,M=process.env.META_MODEL||'muse-spark-1.3',ef=process.env.META_REASONING||'low',t0=Date.now(),uso={chamadas:0,tokens:0,ms:0}
 const est=tools.ler_estado();push({tipo:'ferramenta',nome:'ler_estado',args:{},resultado:est})
 const msgs=[{role:'system',content:SYSTEM},{role:'user',content:'Estado actual do cruzamento: '+JSON.stringify(est)+'. Analisa e propõe o melhor plano.'}]
 const go=extra=>fetch(`${B}/chat/completions`,{method:'POST',signal:AbortSignal.timeout(25000),headers:{'Content-Type':'application/json',Authorization:`Bearer ${K}`},body:JSON.stringify({model:M,messages:msgs,tools:TOOLS,tool_choice:'auto',...extra})})
 for(let i=0;i<6;i++){
  if(Date.now()-t0>40000)throw new Error('o modelo demorou demasiado')
  let res=await go(semEsforco||ef==='off'?{}:{reasoning_effort:ef})
  if(res.status===400&&!semEsforco&&ef!=='off'){semEsforco=true;res=await go({})}
  if(!res.ok)throw new Error('HTTP '+res.status)
  const j=await res.json();uso.chamadas++;uso.tokens+=j.usage?.total_tokens||0;uso.ms=Date.now()-t0;console.log(`[Muse Spark] chamada ${uso.chamadas}, ${j.usage?.total_tokens||'?'} tokens, ${uso.ms} ms`)
  const m=j.choices[0].message;msgs.push(m)
  if(m.content)push({tipo:'pensamento',texto:m.content})
  if(!m.tool_calls?.length)break
  for(const tc of m.tool_calls){let args={};try{args=JSON.parse(tc.function.arguments||'{}')}catch{}
   const f=tools[tc.function.name],out=f?f(args):{erro:'ferramenta desconhecida'}
   push({tipo:'ferramenta',nome:tc.function.name,args,resultado:out})
   msgs.push({role:'tool',tool_call_id:tc.id,content:JSON.stringify(out)})
   if(tc.function.name==='escolher_plano')return{plano:clampPlan(args),justificacao:args.justificacao||'',uso}}}
 return null}
