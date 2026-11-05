import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Server,
  Wifi,
  WifiOff,
  Users,
  Radio,
  X,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { socketManager, ConnectionStatus } from '../server/SocketManager';

interface MultiplayerAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionStatus?: ConnectionStatus;
  connectionError?: string | null;
  latencyMs?: number;
  onRetryConnection?: () => void;
}

export const MultiplayerAuditModal: React.FC<MultiplayerAuditModalProps> = ({
  isOpen,
  onClose,
  connectionStatus = socketManager.status,
  connectionError = socketManager.errorMessage,
  latencyMs = socketManager.latencyMs,
  onRetryConnection,
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const serverUrl = socketManager.getServerUrl();
  const roomName = socketManager.getRoomName();
  const sessionId = socketManager.sessionId;
  const remotePlayers = Array.from(socketManager.remotePlayers.values());

  if (!isOpen) return null;

  const handleRetry = async () => {
    setIsRetrying(true);
    if (onRetryConnection) {
      await onRetryConnection();
    } else {
      await socketManager.retryConnect();
    }
    setTimeout(() => setIsRetrying(false), 800);
  };

  const isConnected = connectionStatus === 'connected';
  const isError = connectionStatus === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 pointer-events-auto select-none">
      <div className="w-full max-w-2xl bg-stone-950 border border-amber-500/30 rounded-2xl p-6 text-stone-200 shadow-2xl overflow-y-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2.5 rounded-xl border ${
                isConnected
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : isError
                  ? 'bg-red-500/15 border-red-500/30 text-red-400'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
              }`}
            >
              {isConnected ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              ) : isError ? (
                <ShieldAlert className="w-5 h-5 text-red-400" />
              ) : (
                <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold font-cinzel tracking-wider text-amber-100">
                Auditoria de Conexão Multiplayer
              </h2>
              <p className="text-xs text-stone-400 font-sans">
                Status em tempo real com o servidor Colyseus na Railway
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audit Body */}
        <div className="py-5 space-y-5 text-xs">
          {/* Main Diagnostic Live Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start space-x-3.5 ${
              isConnected
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                : isError
                ? 'bg-red-950/40 border-red-500/40 text-red-200'
                : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
            }`}
          >
            {isConnected ? (
              <Wifi className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            ) : isError ? (
              <WifiOff className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            ) : (
              <Radio className="w-6 h-6 text-amber-400 shrink-0 mt-0.5 animate-spin" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <strong className="text-sm font-semibold block mb-1">
                  {isConnected && 'Conectado ao Servidor de Produção (Railway)'}
                  {connectionStatus === 'connecting' && 'Conectando ao Servidor Railway...'}
                  {connectionStatus === 'reconnecting' && 'Tentando Reconectar ao Servidor Railway...'}
                  {isError && 'Falha na Conexão com o Servidor Railway'}
                  {connectionStatus === 'disconnected' && 'Servidor Desconectado (Sessão Offline)'}
                </strong>

                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="px-3 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-[11px] font-semibold flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                  <span>{isRetrying ? 'Tentando...' : 'Reconectar'}</span>
                </button>
              </div>

              <p className="text-stone-300 leading-relaxed text-[11px]">
                {isConnected &&
                  `Sua sessão foi autenticada e ingressou na sala "${roomName}". Posições, rotações, sentar em troncos, emotes e mensagens de chat estão sendo sincronizados via WebSocket em tempo real.`}
                {isError &&
                  `Não foi possível estabelecer o handshake WebSocket com "${serverUrl}". Verifique se o serviço está online na Railway e se a rota /health responde.`}
                {!isConnected &&
                  !isError &&
                  `Tentando estabelecer handshake WebSocket com a URL configurada: ${serverUrl}.`}
              </p>

              {isError && connectionError && (
                <div className="mt-2.5 p-2 rounded-lg bg-black/40 border border-red-500/30 font-mono text-[10px] text-red-300 break-all">
                  Erro reportado: {connectionError}
                </div>
              )}
            </div>
          </div>

          {/* Real-time Technical Telemetry Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-stone-900/80 border border-stone-800">
              <div className="flex items-center justify-between text-stone-400 mb-1">
                <span className="flex items-center space-x-1.5 font-semibold text-stone-300">
                  <Server className="w-4 h-4 text-amber-400" />
                  <span>Servidor Colyseus</span>
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isConnected
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                      : isError
                      ? 'bg-red-950 text-red-400 border border-red-500/30'
                      : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {connectionStatus.toUpperCase()}
                </span>
              </div>
              <div className="font-mono text-[11px] text-amber-300 truncate" title={serverUrl}>
                {serverUrl}
              </div>
              <div className="text-[10px] text-stone-500 mt-1">
                Sala: <code className="text-stone-300">{roomName}</code>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-900/80 border border-stone-800">
              <div className="flex items-center justify-between text-stone-400 mb-1">
                <span className="flex items-center space-x-1.5 font-semibold text-stone-300">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Latência & Sessão</span>
                </span>
                {isConnected && latencyMs > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-mono">
                    {latencyMs}ms
                  </span>
                )}
              </div>
              <div className="font-mono text-[11px] text-stone-300 truncate">
                {sessionId ? `ID: ${sessionId}` : 'Sem sessão ativa'}
              </div>
              <div className="text-[10px] text-stone-500 mt-1">
                Transporte: <span className="text-stone-300">WebSocket Nativo</span>
              </div>
            </div>
          </div>

          {/* Active Remote Players List */}
          <div className="p-4 rounded-xl bg-stone-900/80 border border-stone-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-300 uppercase tracking-wider block text-[11px] flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  Jogadores na Fazenda ({remotePlayers.length + (isConnected ? 1 : 0)})
                </span>
              </span>
              <span className="text-[10px] text-stone-500">
                1 Local + {remotePlayers.length} Remotos
              </span>
            </div>

            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {/* Local Player */}
              <div className="p-2 rounded-lg bg-stone-950/70 border border-amber-500/20 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="font-medium text-stone-200">Você (Jogador Local)</span>
                </div>
                <span className="text-[10px] text-amber-300/80 font-mono">
                  {sessionId ? `${sessionId.substring(0, 8)}...` : 'Sessão Ativa'}
                </span>
              </div>

              {/* Remote Players */}
              {remotePlayers.length === 0 ? (
                <div className="p-3 text-center text-stone-500 text-[11px] italic bg-stone-950/40 rounded-lg">
                  Nenhum outro jogador conectado neste momento. Abra outro navegador ou compartilhe o link para jogar junto!
                </div>
              ) : (
                remotePlayers.map((player) => (
                  <div
                    key={player.sessionId}
                    className="p-2 rounded-lg bg-stone-950/70 border border-stone-800 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      <span className="font-medium text-stone-200">{player.name}</span>
                      <span className="text-[10px] text-stone-500">
                        ({player.isSitting ? 'Sentado' : player.action})
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {player.sessionId.substring(0, 8)}...
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Environment Variable Setup Instructions */}
          <div className="p-4 rounded-xl bg-stone-900/90 border border-stone-800 space-y-2">
            <span className="font-semibold text-amber-300 uppercase tracking-wider block text-[11px]">
              Como Configurar no Frontend (Railway, Vercel ou Netlify)
            </span>
            <p className="text-stone-300 leading-relaxed text-[11px]">
              Para conectar o frontend publicado ao seu servidor Colyseus na Railway, adicione a variável de ambiente no painel de publicação do frontend:
            </p>
            <div className="p-2.5 rounded-lg bg-black/60 border border-stone-800 font-mono text-[11px] text-amber-200 select-all">
              VITE_COLYSEUS_URL=wss://charismatic-dedication-production-80f4.up.railway.app
            </div>
            <p className="text-[10px] text-stone-400">
              * O cliente aceita tanto <code className="text-amber-300">wss://charismatic-dedication-production-80f4.up.railway.app</code> quanto o formato com barra dupla <code className="text-amber-300">//charismatic-dedication-production-80f4.up.railway.app</code> ou direto. O código normaliza automaticamente para WebSocket seguro (WSS).
            </p>
          </div>

          <div className="text-[11px] text-stone-500 italic">
            * Garantia de transparência: Não há jogadores simulados nem bots. Todos os jogadores exibidos são conexões reais do servidor.
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-stone-800 flex items-center justify-between">
          <a
            href={`https://${serverUrl.replace(/^wss?:\/\//, '')}/health`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:text-amber-300 text-xs flex items-center space-x-1 cursor-pointer"
          >
            <span>Verificar Rota /health do Servidor</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs tracking-wider cursor-pointer transition-colors"
          >
            FECHAR
          </button>
        </div>
      </div>
    </div>
  );
};
