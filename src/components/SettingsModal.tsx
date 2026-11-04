import React from 'react';
import { GameSettings } from '../types/game';
import {
  Settings,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Sunset,
  Eye,
  Mic,
  ShieldCheck,
  X,
} from 'lucide-react';
import { soundEngine } from '../audio/SoundEngine';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  isOpen: boolean;
  onClose: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  isOpen,
  onClose,
  isMuted,
  onToggleMute,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 pointer-events-auto select-none">
      <div className="w-full max-w-lg bg-stone-950 border border-amber-500/30 rounded-2xl p-6 text-stone-200 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div className="flex items-center space-x-2.5 text-amber-400">
            <Settings className="w-5 h-5" />
            <h2 className="text-lg font-bold font-cinzel tracking-wider text-amber-100">
              Configurações da Fazenda
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-6 text-sm">
          {/* Audio Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-amber-300 uppercase text-xs tracking-wider flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span>Áudio & Sons Ambiente</span>
              </span>
              <button
                onClick={onToggleMute}
                className="text-xs px-2.5 py-1 rounded-lg border border-stone-700 bg-stone-900 text-stone-300 hover:text-amber-200 hover:border-amber-400 flex items-center space-x-1.5 cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{isMuted ? 'Desmutar' : 'Silenciar'}</span>
              </button>
            </div>

            <div className="space-y-3 bg-stone-900/60 p-3.5 rounded-xl border border-stone-800/80">
              <div>
                <div className="flex justify-between text-xs text-stone-400 mb-1">
                  <span>Volume Geral</span>
                  <span>{Math.round(settings.masterVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.masterVolume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateSettings({ masterVolume: val });
                    soundEngine.setVolumes(val, settings.fireVolume, settings.ambientVolume, settings.sfxVolume);
                  }}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-stone-400 mb-1">
                  <span>Estalo da Fogueira</span>
                  <span>{Math.round(settings.fireVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.fireVolume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateSettings({ fireVolume: val });
                    soundEngine.setVolumes(settings.masterVolume, val, settings.ambientVolume, settings.sfxVolume);
                  }}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-stone-400 mb-1">
                  <span>Grilos & Vento Noturno</span>
                  <span>{Math.round(settings.ambientVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.ambientVolume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    onUpdateSettings({ ambientVolume: val });
                    soundEngine.setVolumes(settings.masterVolume, settings.fireVolume, val, settings.sfxVolume);
                  }}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Time of Day Atmosphere */}
          <div>
            <span className="font-semibold text-amber-300 uppercase text-xs tracking-wider block mb-2.5">
              Iluminação & Atmosfera
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'night', label: 'Noite Estrelada', icon: Moon },
                { id: 'twilight', label: 'Crepúsculo', icon: Sunset },
                { id: 'dawn', label: 'Alvorecer Rural', icon: Sun },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => onUpdateSettings({ timeOfDay: id as GameSettings['timeOfDay'] })}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer ${
                    settings.timeOfDay === id
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Icon className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-medium text-center">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Controls & Sensitivity */}
          <div>
            <span className="font-semibold text-amber-300 uppercase text-xs tracking-wider block mb-2.5">
              Sensibilidade da Câmera
            </span>
            <div className="bg-stone-900/60 p-3.5 rounded-xl border border-stone-800/80">
              <div className="flex justify-between text-xs text-stone-400 mb-1">
                <span>Sensibilidade do Mouse</span>
                <span>{settings.mouseSensitivity.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={settings.mouseSensitivity}
                onChange={(e) => onUpdateSettings({ mouseSensitivity: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Architecture Readiness info (Colyseus, LiveKit, Supabase) */}
          <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl text-xs space-y-1.5 text-stone-300">
            <div className="flex items-center space-x-2 text-amber-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Arquitetura de Conexão Pronta</span>
            </div>
            <p className="text-stone-400 leading-relaxed text-[11px]">
              Este cliente já possui interfaces de sincronização de coordenadas em tempo real preparadas para <strong>Colyseus</strong>, barramentos de áudio de voz para <strong>LiveKit</strong> e persistência de perfil em <strong>Supabase</strong>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs tracking-wider cursor-pointer transition-colors"
          >
            CONCLUÍDO
          </button>
        </div>
      </div>
    </div>
  );
};
