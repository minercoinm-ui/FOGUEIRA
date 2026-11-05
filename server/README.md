# FOGUEIRA — Servidor Multiplayer Colyseus na Railway

Este diretório `/server` contém o servidor multiplayer dedicado do jogo **FOGUEIRA**, construído com **Node.js**, **TypeScript**, **Colyseus** e **WebSocket**.

---

## 🔍 Entendendo a Arquitetura na Railway (Frontend vs Servidor Colyseus)

Se você viu logs do **Caddy** na Railway, isso significa que seu serviço atual está configurado para a raiz do repositório (`/`), rodando a build estática do React/Vite.

Para ter o jogo funcionando com multiplayer real, a Railway precisa de **dois serviços** no mesmo projeto:

1. **Serviço 1 — Frontend (Web App):**
   - **Root Directory:** `/`
   - Servido pelo Caddy / Nixpacks com a aplicação 3D em React.
2. **Serviço 2 — Servidor Multiplayer (Colyseus):**
   - **Root Directory:** `/server`
   - Executa `node dist/index.js` ouvindo conexões WebSocket na porta `process.env.PORT`.

---

## 🚀 Passo a Passo: Publicando o Servidor como Segundo Serviço na Railway

1. Acesse seu painel no [Railway](https://railway.app/) e abra o projeto do **FOGUEIRA**.
2. Clique no botão **`+ New`** (no canto superior direito do Canvas do projeto) e selecione **`GitHub Repo`**.
3. Selecione o **mesmo repositório** do FOGUEIRA.
4. Clique no novo card de serviço criado e acesse a aba **Settings**:
   - **Service Name:** Renomeie para `fogueira-colyseus` (para facilitar identificação).
   - **General > Root Directory:** Digite `/server` e clique no botão de salvar/check.
   - **Build > Build Command:** Deixe em branco (o `railway.json` e `nixpacks.toml` já definem `npm install && npm run build`).
   - **Deploy > Start Command:** Deixe em branco (já definido como `npm start`).
5. Acesse a aba **Networking**:
   - Em **Public Networking**, clique em **Generate Domain**.
   - Você receberá uma URL pública (ex.: `fogueira-colyseus-production.up.railway.app`).
6. Verifique se o servidor está online:
   - Abra no seu navegador: `https://seu-dominio.up.railway.app/health`
   - O retorno será:
     ```json
     {
       "status": "ok",
       "service": "FOGUEIRA Colyseus Game Server",
       "version": "1.0.0",
       "room": "fogueira_room"
     }
     ```
7. Conecte o Frontend ao Servidor:
   - No serviço do **Frontend** (o primeiro serviço), vá na aba **Variables**.
   - Adicione ou atualize a variável:
     ```env
     VITE_COLYSEUS_URL=wss://seu-dominio.up.railway.app
     ```
   - O frontend será recompilado e conectará automaticamente via WebSocket seguro.

---

## 📦 Arquivos do Servidor

| Arquivo | Função |
| :--- | :--- |
| `src/index.ts` | Servidor Express + Colyseus com CORS dinâmico, rota `/health` e rota raiz `/`. |
| `src/rooms/FogueiraRoom.ts` | Sala `fogueira_room` gerenciando entrada/saída, posições, animações, bancos e chat. |
| `src/rooms/schema/FogueiraState.ts` | Schemas binários do Colyseus (`PlayerState`, `PlayerCustomizationSchema`, `FogueiraState`). |
| `package.json` | Dependências `@colyseus/core`, `@colyseus/ws-transport`, `@colyseus/schema`, `express`, `cors`. |
| `tsconfig.json` | Compilador TypeScript configurado para emitir para `./dist`. |
| `railway.json` | Configuração nativa de deploy e healthcheck da Railway. |
| `nixpacks.toml` | Declaração do ambiente Node.js 20 e fases de build da Railway. |
| `Procfile` | Instrução de inicialização do processo Web (`web: npm start`). |

---

## 🤝 Protocolo e Mensagens Sincronizadas

| Mensagem | Direção | Descrição |
| :--- | :--- | :--- |
| `fogueira_room` | Cliente -> Servidor | Nome exato da sala que o cliente ingressa. |
| `move` | Cliente -> Servidor | Posição (`x, y, z`), rotação (`rotationY`), ação e estado de sentar. |
| `player_move` | Servidor -> Clientes | Broadcast da posição para interpolação imediata no Three.js. |
| `chat` | Bidirecional | Envio e distribuição de mensagens com balões 3D sobre os avatares. |
| `emote` | Cliente -> Servidor | Gestos e animações (`warmHands`, `wave`, `talk`, `celebrate`). |
| `player_emote` | Servidor -> Clientes | Transmissão de gestos para todos os jogadores na fazenda. |
| `sit` | Cliente -> Servidor | Sentar e levantar dos troncos ao redor da fogueira ou bancos da varanda. |
| `update_profile` | Cliente -> Servidor | Atualização em tempo real de roupa, cabelo, chapéu e apelido. |
| `ping` / `pong` | Bidirecional | Cálculo da latência (ping em ms) em tempo real no HUD. |
