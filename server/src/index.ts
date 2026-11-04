import http from 'http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { FogueiraRoom } from './rooms/FogueiraRoom';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 2567;
const host = '0.0.0.0';

// Configuração de CORS aberto para aceitar conexões web em produção
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  })
);

app.use(express.json());

// Rota de Healthcheck essencial para a Railway
app.get('/health', (_req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  res.status(200).json({
    status: 'ok',
    service: 'FOGUEIRA Colyseus Game Server',
    version: '1.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: Date.now(),
    room: 'fogueira_room',
    port,
    memory: {
      rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    },
  });
});

// Informações básicas na rota raiz
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    name: 'FOGUEIRA — Servidor Multiplayer Colyseus',
    status: 'online',
    websocketEndpoint: '/colyseus',
    healthCheck: '/health',
    room: 'fogueira_room',
    info: 'Servidor preparado para implantação na Railway.',
  });
});

// Criação do servidor HTTP nativo
const httpServer = http.createServer(app);

// Inicialização do servidor Colyseus com transporte WebSocket
const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
    pingInterval: 5000,
    pingMaxRetries: 3,
  }),
});

// Registro da sala principal da fazenda
gameServer.define('fogueira_room', FogueiraRoom);

// Inicialização na porta configurada (Railway injeta process.env.PORT)
gameServer.listen(port, host).then(() => {
  console.log('====================================================');
  console.log('🔥 FOGUEIRA — SERVIDOR COLYSEUS INICIADO');
  console.log(`🌐 Porta: ${port} (Host: ${host})`);
  console.log(`🏥 Healthcheck: http://${host}:${port}/health`);
  console.log(`🪵 Sala registrada: fogueira_room`);
  console.log('🚀 Pronto para produção na Railway!');
  console.log('====================================================');
}).catch((err) => {
  console.error('[FOGUEIRA Server] Falha ao iniciar servidor:', err);
  process.exit(1);
});

// Tratamento de encerramento gracioso
const shutdown = () => {
  console.log('[FOGUEIRA Server] Encerrando servidor graciosamente...');
  gameServer.gracefullyShutdown().then(() => {
    httpServer.close(() => {
      console.log('[FOGUEIRA Server] Servidor finalizado.');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
