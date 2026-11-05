import React, { useState } from 'react';
import { VirtualJoystick } from './VirtualJoystick';
import { Armchair, Zap, Sparkles, Camera, ArrowUp, Hand, Flame, Smile, Check } from 'lucide-react';
import { SitSpot } from '../types/game';

interface MobileControlsProps {
  onMove: (move: { forward: number; strafe: number; isSprinting?: boolean }) => void;
  onToggleSit: () => void;
  onTriggerEmote: (emote: 'warmHands' | 'wave' | 'talk' | 'celebrate') => void;
  onJump: () => void;
  onToggleCamera: () => void;
  isSitting: boolean;
  nearbySitSpot: SitSpot | null;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onMove,
  onToggleSit,
  onTriggerEmote,
  onJump,
  onToggleCamera,
  isSitting,
  nearbySitSpot,
}) => {
  const [isSprinting, setIsSprinting] = useState<boolean>(false);
  const [isEmoteMenuOpen, setIsEmoteMenuOpen] = useState<boolean>(false);
  const [currentMove, setCurrentMove] = useState<{ forward: number; strafe: number }>({ forward: 0, strafe: 0 });

  const handleJoystickMove = (move: { forward: number; strafe: number }) => {
    setCurrentMove(move);
    onMove({ ...move, isSprinting });
  };

  const handleToggleSprint = () => {
    const nextSprint = !isSprinting;
    setIsSprinting(nextSprint);
    onMove({ ...currentMove, isSprinting: nextSprint });
  };

  const handleSelectEmote = (emote: 'warmHands' | 'wave' | 'talk' | 'celebrate') => {
    onTriggerEmote(emote);
    setIsEmoteMenuOpen(false);
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))] z-25 select-none">
      <div className="flex items-end justify-between w-full">
        {/* BOTTOM-LEFT: Virtual Movement Joystick */}
        <div className="pointer-events-auto pl-2 pb-2">
          <VirtualJoystick onMove={handleJoystickMove} size={132} />
        </div>

        {/* BOTTOM-RIGHT: Action Buttons Cluster */}
        <div className="pointer-events-auto flex flex-col items-end space-y-2.5 pr-2 pb-2">
          {/* Quick Emote Radial / Popup Menu */}
          {isEmoteMenuOpen && (
            <div className="mb-2 p-2 rounded-2xl bg-stone-950/95 border border-amber-500/40 shadow-2xl flex flex-col space-y-1.5 animate-fade-in backdrop-blur-md">
              <div className="text-[10px] font-bold text-amber-400 font-cinzel px-2 pt-0.5 uppercase tracking-wider">
                Gestos
              </div>
              <button
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleSelectEmote('wave');
                }}
                onClick={() => handleSelectEmote('wave')}
                className="flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-900/80 hover:bg-amber-500/20 text-stone-200 border border-stone-800 hover:border-amber-500/40 transition-colors"
              >
                <Hand className="w-4 h-4 text-amber-400" />
                <span>Acenar</span>
              </button>

              <button
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleSelectEmote('warmHands');
                }}
                onClick={() => handleSelectEmote('warmHands')}
                className="flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-900/80 hover:bg-amber-500/20 text-stone-200 border border-stone-800 hover:border-amber-500/40 transition-colors"
              >
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Aquecer Mãos</span>
              </button>

              <button
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleSelectEmote('talk');
                }}
                onClick={() => handleSelectEmote('talk')}
                className="flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-900/80 hover:bg-amber-500/20 text-stone-200 border border-stone-800 hover:border-amber-500/40 transition-colors"
              >
                <span className="text-amber-400 text-sm">💬</span>
                <span>Conversar</span>
              </button>

              <button
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleSelectEmote('celebrate');
                }}
                onClick={() => handleSelectEmote('celebrate')}
                className="flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-900/80 hover:bg-amber-500/20 text-stone-200 border border-stone-800 hover:border-amber-500/40 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Comemorar</span>
              </button>
            </div>
          )}

          {/* Upper row of secondary mobile actions: Emotes & Camera */}
          <div className="flex items-center space-x-2">
            {/* Emotes Trigger */}
            <button
              onTouchEnd={(e) => {
                e.preventDefault();
                setIsEmoteMenuOpen(!isEmoteMenuOpen);
              }}
              onClick={() => setIsEmoteMenuOpen(!isEmoteMenuOpen)}
              className={`w-12 h-12 rounded-full border flex items-center justify-center shadow-lg transition-all active:scale-90 ${
                isEmoteMenuOpen
                  ? 'bg-amber-500 border-amber-300 text-stone-950 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                  : 'bg-stone-900/85 border-amber-500/30 text-amber-300 hover:border-amber-400'
              }`}
              title="Gestos do Personagem"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Camera Zoom Toggle */}
            <button
              onTouchEnd={(e) => {
                e.preventDefault();
                onToggleCamera();
              }}
              onClick={onToggleCamera}
              className="w-12 h-12 rounded-full border border-amber-500/30 bg-stone-900/85 text-amber-300 hover:border-amber-400 flex items-center justify-center shadow-lg transition-all active:scale-90"
              title="Alternar Câmera"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>

          {/* Lower cluster of primary mobile buttons: Jump, Sprint, Sit/Stand */}
          <div className="flex items-center space-x-2.5">
            {/* Sprint Toggle */}
            <button
              onTouchEnd={(e) => {
                e.preventDefault();
                handleToggleSprint();
              }}
              onClick={handleToggleSprint}
              className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center shadow-xl transition-all active:scale-90 ${
                isSprinting
                  ? 'bg-gradient-to-br from-amber-400 to-amber-600 border-amber-200 text-stone-950 font-bold shadow-[0_0_20px_rgba(245,158,11,0.6)]'
                  : 'bg-stone-950/85 border-stone-700/80 text-stone-300 hover:border-amber-500/40'
              }`}
              title={isSprinting ? 'Correr Ativado' : 'Tocar para Correr'}
            >
              <Zap className={`w-5 h-5 ${isSprinting ? 'text-stone-950' : 'text-amber-400'}`} />
              <span className="text-[10px] font-bold mt-0.5">
                {isSprinting ? 'CORRENDO' : 'CORRER'}
              </span>
            </button>

            {/* Jump / Hop Action */}
            <button
              onTouchEnd={(e) => {
                e.preventDefault();
                onJump();
              }}
              onClick={onJump}
              className="w-14 h-14 rounded-2xl border border-stone-700/80 bg-stone-950/85 text-amber-300 hover:border-amber-500/50 flex flex-col items-center justify-center shadow-xl transition-all active:scale-90"
              title="Pular"
            >
              <ArrowUp className="w-5 h-5 text-amber-400" />
              <span className="text-[10px] font-bold mt-0.5">PULAR</span>
            </button>

            {/* Sit / Stand Button (Prominent, changes dynamically) */}
            <button
              onTouchEnd={(e) => {
                e.preventDefault();
                onToggleSit();
              }}
              onClick={onToggleSit}
              className={`min-w-16 h-14 px-3.5 rounded-2xl border flex flex-col items-center justify-center shadow-2xl transition-all active:scale-90 ${
                isSitting
                  ? 'bg-amber-500 border-amber-300 text-stone-950 font-bold shadow-[0_0_25px_rgba(245,158,11,0.7)] animate-pulse'
                  : nearbySitSpot
                  ? 'bg-amber-500/90 border-amber-300 text-stone-950 font-bold shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                  : 'bg-stone-950/85 border-stone-700/80 text-stone-300 hover:border-amber-500/40'
              }`}
              title={isSitting ? 'Levantar' : nearbySitSpot ? 'Sentar' : 'Sentar no banco'}
            >
              <Armchair className={`w-5 h-5 ${isSitting || nearbySitSpot ? 'text-stone-950' : 'text-amber-400'}`} />
              <span className="text-[10px] font-bold mt-0.5 whitespace-nowrap">
                {isSitting ? 'LEVANTAR' : nearbySitSpot ? 'SENTAR' : 'SENTAR'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
