export async function runAgent(estado:any){
  const r=await fetch('/api/agent/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({estado})})
  if(!r.ok)throw new Error('A API respondeu '+r.status+'. O servidor está a correr (npm run dev)?')
  return r.json()
}
