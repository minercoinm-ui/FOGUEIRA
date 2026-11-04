import React from 'react';
import { ShieldAlert, Server, WifiOff, Users, Database, Radio, X, CheckCircle2 } from 'lucide-react';

interface MultiplayerAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MultiplayerAuditModal: React.FC<MultiplayerAuditModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 pointer-events-auto select-none">
      <div className="w-full max-w-2xl bg-stone-950 border border-amber-500/30 rounded-2xl p-6 text-stone-200 shadow-2xl overflow-y-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center space-x-3 text-amber-400">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-cinzel tracking-wider text-amber-100">
                Auditoria Técnica do Multiplayer
              </h2>
              <p className="text-xs text-stone-400 font-sans">
                Diagnóstico de rede, servidor e infraestrutura do FOGUEIRA
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
          {/* Main Diagnostic Summary Banner */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start space-x-3">
            <WifiOff className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-sm font-semibold text-amber-200 block mb-1">
                Diagnóstico: O jogo está rodando em Sessão Local (Cliente SPA Isolado)
              </strong>
              <p className="text-stone-300 leading-relaxed text-[11px]">
                A mensagem "Sessão Local" aparece porque o jogo está executando puramente no navegador como uma Single Page Application no Vite. Não há processo de servidor de jogo dedicado (Node.js/WebSocket) em execução, e nenhuma conexão de rede externa foi configurada.
              </p>
            </div>
          </div>

          {/* Verification Items Checklist */}
          <div className="space-y-3">
            <span className="font-semibold text-amber-300 uppercase tracking-wider block text-[11px]">
              Itens Verificados na Auditoria de Código
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-stone-900/70 border border-stone-800">
                <div className="flex items-center space-x-2 text-stone-200 font-semibold mb-1">
                  <Server className="w-4 h-4 text-amber-400" />
                  <span>Tecnologia Multiplayer</span>
                </div>
                <p className="text-stone-400 text-[11px] leading-relaxed">
                  Não há bibliotecas clientes instaladas (<code className="text-amber-300">colyseus.js</code> ou <code className="text-amber-300">socket.io-client</code>). A arquitetura foi deixada modular para recebê-las.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-stone-900/70 border border-stone-800">
                <div className="flex items-center space-x-2 text-stone-200 font-semibold mb-1">
                  <WifiOff className="w-4 h-4 text-amber-400" />
                  <span>Conexão WebSocket</span>
                </div>
                <p className="text-stone-400 text-[11px] leading-relaxed">
                  Não existe instância de <code className="text-amber-300">new WebSocket()</code> ativa. Portanto, não há tráfego de rede ou sockets abertos.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-stone-900/70 border border-stone-800">
                <div className="flex items-center space-x-2 text-stone-200 font-semibold mb-1">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Entrada na Mesma Sala</span>
                </div>
                <p className="text-stone-400 text-[11px] leading-relaxed">
                  Cada navegador que acessa o link executa uma simulação local independente. Dois jogadores simultâneos não se enxergam na fazenda.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-stone-900/70 border border-stone-800">
                <div className="flex items-center space-x-2 text-stone-200 font-semibold mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Erros de CORS / Auth</span>
                </div>
                <p className="text-stone-400 text-[11px] leading-relaxed">
                  Não ocorrem erros de CORS ou autenticação porque nenhuma requisição HTTP/WS de sincronização está sendo disparada.
                </p>
              </div>
            </div>
          </div>

          {/* What needs to be built for real multiplayer */}
          <div className="p-4 rounded-xl bg-stone-900/90 border border-stone-800 space-y-3">
            <span className="font-semibold text-amber-300 uppercase tracking-wider block text-[11px]">
              O que é Necessário para o Multiplayer Real (Sem Simulações)
            </span>

            <div className="space-y-2 text-stone-300 text-[11px]">
              <div className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                <div>
                  <strong className="text-emerald-300">1. Servidor de Jogo Colyseus (Estrutura Criada na pasta /server):</strong>
                  <p className="text-stone-300 mt-0.5">
                    O servidor Node.js/TypeScript com a sala <code className="text-amber-300">FogueiraRoom</code>, schemas de estado, WebSocket e rota <code className="text-amber-300">/health</code> está 100% pronto na pasta <code className="text-amber-300">server/</code> com configurações para a Railway (<code className="text-stone-300">railway.json</code>, <code className="text-stone-300">Procfile</code>). Basta apontar a Railway para a pasta <code className="text-stone-300">server</code> para colocá-lo no ar e conectar via <code className="text-stone-300">VITE_COLYSEUS_URL</code>.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></span>
                <div>
                  <strong className="text-stone-100">2. Servidor de Voz WebRTC (LiveKit):</strong>
                  <p className="text-stone-400 mt-0.5">
                    Para o botão de microfone transmitir áudio de verdade entre os jogadores com atenuação espacial 3D ao redor da fogueira, é necessário conectar a um servidor LiveKit (LiveKit Cloud ou self-hosted).
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></span>
                <div>
                  <strong className="text-stone-100">3. Persistência & Contas (Supabase):</strong>
                  <p className="text-stone-400 mt-0.5">
                    Utilizar a tabela de perfis do Supabase caso queira salvar o personagem escolhido, apelido e conquistas de forma permanente.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-stone-500 italic">
            * Garantia de transparência: Conforme solicitado nas regras, não simulamos jogadores fictícios ou bots mascarados como multiplayer.
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs tracking-wider cursor-pointer transition-colors"
          >
            ENTENDI
          </button>
        </div>
      </div>
    </div>
  );
};
