// Voz do agente: síntese e reconhecimento de voz do próprio navegador (Chrome ou Edge funcionam melhor).
let ativa=true
export const voz={
  get ativa(){return ativa},
  alternar(){ativa=!ativa;if(!ativa)speechSynthesis.cancel();return ativa},
  falar(t:string):Promise<void>{
    return new Promise(res=>{
      if(!ativa||!('speechSynthesis' in window)){setTimeout(res,700);return}
      const u=new SpeechSynthesisUtterance(t),vs=speechSynthesis.getVoices()
      u.voice=vs.find(v=>v.lang==='pt-PT')||vs.find(v=>v.lang.startsWith('pt'))||null;u.lang=u.voice?.lang||'pt-PT';u.rate=1.05
      const fim=setTimeout(res,15000);u.onend=u.onerror=()=>{clearTimeout(fim);res()};speechSynthesis.speak(u)})},
  ouvir(cb:(t:string)=>void){
    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;if(!SR)return false
    const r=new SR();r.lang='pt-PT';r.onresult=(e:any)=>cb(e.results[0][0].transcript.toLowerCase());r.start();return true}
}
