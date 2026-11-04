# FOGUEIRA — Servidor Multiplayer Colyseus (Guia de Hospedagem na Railway)

Este diretório contém o servidor de jogo em tempo real baseado em **Colyseus** e **WebSocket** para o projeto **FOGUEIRA**, preparado para implantação com 1 clique na [Railway](https://railway.app/).

---

## 📁 Estrutura de Arquivos Criada

- `package.json`: Dependências (`colyseus`, `@colyseus/ws-transport`, `@colyseus/schema`, `express`, `cors`) e scripts de build (`npm run build`) e execução (`npm start`).
- `tsconfig.json`: Configuração TypeScript CommonJS com decoradores para schemas.
- `railway.json`: Instruções de build Nixpacks e rota de verificação de integridade (`/health`).
- `Procfile`: Comando de inicialização (`web: npm start`) para o runtime.
- `src/index.ts`: Ponto de entrada com servidor HTTP, Express, CORS, transporte WebSocket e rota `/health`.
- `src/rooms/FogueiraRoom.ts`: Gerenciamento da sala `fogueira_room`, sincronizando conexões, posições, animações, gestos, bancos e chat.
- `src/rooms/schema/FogueiraState.ts`: Schemas otimizados de estado binário dos jogadores (`PlayerState`, `PlayerCustomizationSchema`, `FogueiraState`).

---

## 🚀 Passo a Passo para Hospedar na Railway

### Método 1: A partir do Repositório GitHub (Recomendado)

1. Faça login na [Railway](https://railway.app/).
2. Clique em **New Project** > **Deploy from GitHub repo**.
3. Selecione o repositório do projeto **FOGUEIRA**.
4. Em **Settings** do serviço na Railway:
   - Defina **Root Directory** como `/server` (ou deixe o projeto raiz se usar Docker/monorepo).
   - O comando de build será automaticamente: `npm install && npm run build`
   - O comando de start será automaticamente: `npm start`
5. Em **Networking**:
   - Clique em **Generate Domain** para gerar uma URL pública segura (ex: `fogueira-server-production.up.railway.app`).
6. A rota de healthcheck configurada é `/health` e responde com HTTP 200.

---

## 🔗 Conectando o Cliente Frontend ao Servidor na Railway

Após a Railway gerar a URL pública (por exemplo, `fogueira-server-production.up.railway.app`):

1. No frontend do jogo, configure a variável de ambiente:
   ```env
   VITE_COLYSEUS_URL=wss://fogueira-server-production.up.railway.app
   ```
2. O `SocketManager.ts` do cliente se conectará automaticamente via WebSocket seguro (`wss://`) à sala `fogueira_room`.
3. Todos os jogadores que acessarem o jogo entrarão na mesma fazenda 3D, compartilhando movimentos, animações, conversas e calor ao redor da fogueira em tempo real!

---

## 🧪 Teste Local do Servidor

Para rodar localmente no seu computador antes de subir para a nuvem:

```bash
cd server
npm install
npm run dev
```

O servidor iniciará em `http://localhost:2567`.
- Verifique a saúde acessando: `http://localhost:2567/health`
