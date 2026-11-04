import React, { useState } from 'react';
import { WorldLocation, SitSpot, AvatarAction, GameSettings, ChatMessage } from '../types/game';
import { ChatBox } from './ChatBox';
import {
  Flame,
  Mic,
  MicOff,
  Settings,
  Volume2,
  VolumeX,
  Users,
  Compass,
  ChevronDown,
  ChevronUp,
  Hand,
  Armchair,
  Camera,
  Sun,
  Moon,
} from 'lucide-react';

interface GameHUDProps {
  currentLocation: WorldLocation;
  nearbySitSpot: SitSpot | null;
  isSitting: boolean;
  onToggleSit: () => void;
  onTriggerEmote: (emote: 'warmHands' | 'wave' | 'talk' | 'celebrate') => void;
  onToggleCamera: () => void;
  onOpenSettings: () => void;
  onOpenAuditModal: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  chatMessages: ChatMessage[];
  onSendMessage: (text: string) => void;
  settings: GameSettings;
  onCycleTimeOfDay: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  currentLocation,
  nearbySitSpot,
  isSitting,
  onToggleSit,
  onTriggerEmote,
  onToggleCamera,
  onOpenSettings,
  onOpenAuditModal,
  isMuted,
  onToggleMute,
  chatMessages,
  onSendMessage,
  settings,
  onCycleTimeOfDay,
}) => {
  const [isMicActive, setIsMicActive] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);

  const toggleMic = () => {
    setIsMicActive(!isMicActive);
  };

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 sm:p-6 select-none overflow-hidden">
      {/* TOP BAR */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Minimal Title, Location & Player Counter */}
        <div className="flex flex-col space-y-2 pointer-events-auto">
          {/* Title & Location Card */}
          <div className="flex items-center space-x-3 bg-stone-950/80 border border-amber-500/25 px-4 py-2 rounded-2xl shadow-lg">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Flame className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-amber-100 font-cinzel text-sm tracking-wide">
                  FOGUEIRA
                </span>
                <span className="text-stone-500 text-xs">·</span>
                <span className="text-amber-300 font-semibold text-xs flex items-center space-x-1">
                  <Compass className="w-3 h-3 text-amber-400" />
                  <span>{currentLocation.name}</span>
                </span>
              </div>
              <div className="text-[11px] text-stone-400 font-sans max-w-xs truncate">
                {currentLocation.description}
              </div>
            </div>
          </div>

          {/* Player Count & Session Badge (Clickable for technical audit) */}
          <button
            onClick={onOpenAuditModal}
            title="Clique para auditar a conexão com o servidor multiplayer"
            className="flex items-center space-x-2 bg-stone-900/85 hover:bg-stone-800/90 border border-stone-800 hover:border-amber-500/40 px-3 py-1 rounded-full text-[11px] text-stone-300 w-fit cursor-pointer transition-colors shadow-md"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <Users className="w-3 h-3 text-stone-400" />
            <span>1 Jogador</span>
            <span className="text-amber-300/80 text-[10px] underline underline-offset-2">
              (Sessão Local · Sem Servidor)
            </span>
          </button>
        </div>

        {/* Top-Right: Mic, Sound & Settings */}
        <div className="flex items-center space-x-2 pointer-events-auto">
          {/* Demonstrative Microphone / Voice Chat (LiveKit ready) */}
          <button
            onClick={toggleMic}
            title={isMicActive ? 'Microfone Ativo (Transmitindo)' : 'Microfone Mutado (Clique para falar)'}
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-md ${
              isMicActive
                ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'bg-stone-900/80 border-stone-700/80 text-stone-400 hover:text-stone-200'
            }`}
          >
            {isMicActive ? (
              <>
                <Mic className="w-4 h-4 text-emerald-400 animate-bounce" />
                <span className="hidden sm:inline">Voz Ativa</span>
                {/* Voice activity waves */}
                <span className="flex space-x-0.5 items-center">
                  <span className="w-1 h-3 bg-emerald-400 rounded-full animate-pulse"></span>
                  <span className="w-1 h-4 bg-emerald-400 rounded-full animate-pulse delay-75"></span>
                  <span className="w-1 h-2 bg-emerald-400 rounded-full animate-pulse delay-150"></span>
                </span>
              </>
            ) : (
              <>
                <MicOff className="w-4 h-4 text-stone-400" />
                <span className="hidden sm:inline">Voz Silenciada</span>
              </>
            )}
          </button>

          {/* Quick Audio Mute */}
          <button
            onClick={onToggleMute}
            title={isMuted ? 'Desmutar Áudio' : 'Mutar Áudio'}
            className="p-2.5 rounded-xl bg-stone-900/80 border border-stone-700 text-stone-300 hover:text-amber-200 hover:border-amber-400 transition-colors cursor-pointer shadow-md"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Settings Modal Toggle */}
          <button
            onClick={onOpenSettings}
            title="Abrir Configurações"
            className="p-2.5 rounded-xl bg-stone-900/80 border border-stone-700 text-stone-300 hover:text-amber-200 hover:border-amber-400 transition-colors cursor-pointer shadow-md"
          >
            <Settings className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* CENTER INTERACTION PROMPT */}
      <div className="flex flex-col items-center justify-center my-auto">
        {(nearbySitSpot || isSitting) && (
          <button
            onClick={onToggleSit}
            className="pointer-events-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500/90 to-amber-600/90 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-sm tracking-wider shadow-[0_0_30px_rgba(245,158,11,0.6)] flex items-center space-x-3 transform hover:scale-105 active:scale-95 transition-all cursor-pointer animate-fade-in border border-amber-300"
          >
            <Armchair className="w-5 h-5 text-stone-950" />
            <span>
              {isSitting
                ? '[E] LEVANTAR DO BANCO'
                : `[E] SENTAR EM: ${nearbySitSpot?.label.toUpperCase()}`}
            </span>
          </button>
        )}
      </div>

      {/* BOTTOM AREA: Chat (Left) + Collapsible Dock (Center) */}
      <div className="flex flex-col sm:flex-row items-end justify-between w-full gap-4">
        {/* Bottom-Left: Visual Chat */}
        <div className="order-2 sm:order-1">
          <ChatBox
            messages={chatMessages}
            onSendMessage={onSendMessage}
            isOpen={isChatOpen}
            onToggle={() => setIsChatOpen(!isChatOpen)}
          />
        </div>

        {/* Bottom-Center: Sleek Collapsible Dock (Zero Viewport Occlusion per Three.js skill) */}
        <div className="order-1 sm:order-2 flex flex-col items-center mx-auto pointer-events-auto">
          {/* Drawer Collapse / Expand Toggle Button */}
          <button
            onClick={() => setIsDockCollapsed(!isDockCollapsed)}
            className="mb-1.5 px-3 py-1 rounded-full bg-stone-900/90 border border-stone-700/80 text-[11px] font-medium text-stone-300 hover:text-amber-300 flex items-center space-x-1.5 shadow-md cursor-pointer transition-colors"
          >
            {isDockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Mostrar Ações</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                <span>Ocultar Dock</span>
              </>
            )}
          </button>

          {/* Action Dock Bar */}
          {!isDockCollapsed && (
            <div className="flex items-center space-x-2 bg-stone-950/90 border border-amber-500/25 px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-none text-stone-200">
              {/* Sit / Stand Action */}
              <button
                onClick={onToggleSit}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isSitting
                    ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                    : 'bg-stone-900/80 border-stone-700 text-amber-200 hover:bg-stone-800 hover:border-amber-400'
                }`}
              >
                <Armchair className="w-4 h-4" />
                <span>{isSitting ? 'Levantar [E]' : 'Sentar [E]'}</span>
              </button>

              {/* Emote 1: Warm Hands */}
              <button
                onClick={() => onTriggerEmote('warmHands')}
                title="Aquecer mãos na fogueira [1]"
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-900/80 border border-stone-700 text-stone-300 hover:text-amber-200 hover:border-amber-400 transition-colors cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Aquecer Mãos [1]</span>
              </button>

              {/* Emote 2: Wave */}
              <button
                onClick={() => onTriggerEmote('wave')}
                title="Acenar para amigos [2]"
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-900/80 border border-stone-700 text-stone-300 hover:text-amber-200 hover:border-amber-400 transition-colors cursor-pointer"
              >
                <Hand className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Acenar [2]</span>
              </button>

              {/* Emote 3: Talk / Conversar */}
              <button
                onClick={() => onTriggerEmote('talk')}
                title="Gesto de Conversa [3]"
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-900/80 border border-stone-700 text-stone-300 hover:text-amber-200 hover:border-amber-400 transition-colors cursor-pointer"
              >
                <span className="text-amber-400 text-sm">💬</span>
                <span className="hidden sm:inline">Conversar [3]</span>
              </button>

              {/* Emote 4: Celebrate / Comemorar */}
              <button
                onClick={() => onTriggerEmote('celebrate')}
                title="Comemorar e festejar [4]"
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-900/80 border border-stone-700 text-stone-300 hover:text-amber-200 hover:border-amber-400 transition-colors cursor-pointer"
              >
                <span className="text-amber-400 text-sm">🎉</span>
                <span className="hidden sm:inline">Comemorar [4]</span>
              </button>

              {/* Camera Zoom Toggle */}
              <button
                onClick={onToggleCamera}
                title="Alternar Distância da Câmera [C]"
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-900/80 border border-stone-700 text-stone-300 hover:text-amber-200 hover:border-amber-400 transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Câmera [C]</span>
              </button>

              {/* Quick Cycle Atmosphere / Day-Night */}
              <button
                onClick={onCycleTimeOfDay}
                title={`Iluminação Atual: ${settings.timeOfDay.toUpperCase()}`}
                className="p-2 rounded-xl bg-stone-900/80 border border-stone-700 text-amber-300 hover:border-amber-400 transition-colors cursor-pointer"
              >
                {settings.timeOfDay === 'night' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>

        {/* Empty placeholder for grid balance */}
        <div className="w-24 hidden sm:block order-3"></div>
      </div>
    </div>
  );
};
