// Testa a ligação à API da Meta sem abrir a interface: npm run ping -w @transita/api
import dotenv from 'dotenv'
import {fileURLToPath} from 'node:url'
dotenv.config({path:fileURLToPath(new URL('../../../.env',import.meta.url))})
const B=process.env.META_API_BASE||'https://api.meta.ai/v1',M=process.env.META_MODEL||'muse-spark-1.3'
if(!process.env.MODEL_API_KEY){console.log('Falta MODEL_API_KEY no .env');process.exit(1)}
const r=await fetch(`${B}/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.MODEL_API_KEY}`},body:JSON.stringify({model:M,messages:[{role:'user',content:'Responde só: ok'}]})})
const t=await r.text();console.log('Estado HTTP:',r.status);console.log(t.slice(0,600))
