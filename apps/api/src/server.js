import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import {fileURLToPath} from 'node:url'
dotenv.config({path:fileURLToPath(new URL('../../../.env',import.meta.url))})
const {runAgent}=await import('./agent.js')
const app=express();app.use(cors(),express.json({limit:'5mb'}))
app.get('/api/health',(_q,r)=>r.json({ok:true,llm:!!process.env.MODEL_API_KEY}))
app.post('/api/agent/run',async(q,r)=>{try{r.json(await runAgent(q.body.estado))}catch(e){console.error(e);r.status(500).json({erro:e.message})}})
const port=process.env.PORT||3000
app.listen(port,()=>console.log(`API em http://localhost:${port} | LLM: ${process.env.MODEL_API_KEY?'ligado':'modo de reserva'}`))
