# Transita

1. `npm install`
2. Copie `.env.example` para `.env` e preencha MODEL_API_KEY (sem isto a demo corre em modo de reserva). Teste a ligação com `npm run ping -w @transita/api`.
3. `npm run dev` e abra http://localhost:5173

- Motor: `packages/simulation/src/index.js`
- Agente e ligação ao LLM: `apps/api/src/agent.js` (função `viaLLM`)
- Cidade 3D e interface: `apps/web/src`
