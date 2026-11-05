import React, { useState } from 'react';
import { PlayerCustomization, CharacterPreset, Gender, HairStyle, ShirtStyle, PantsStyle, HatType } from '../types/game';
import { CHARACTER_PRESETS } from '../game/constants';
import { Flame, Compass, User, Sparkles, Check, ChevronRight, ShieldAlert } from 'lucide-react';

import { ConnectionStatus } from '../server/SocketManager';

interface TitleScreenProps {
  onEnter: (customization: PlayerCustomization) => void;
  initialCustomization: PlayerCustomization;
  onCustomizationPreview: (customization: PlayerCustomization) => void;
  onOpenAuditModal?: () => void;
  connectionStatus?: ConnectionStatus;
  serverUrl?: string;
}

const SKIN_TONES = [
  { name: 'Clara Rosada', hex: '#f3c7a7' },
  { name: 'Morena Clara', hex: '#d8a679' },
  { name: 'Morena Dourada', hex: '#b57d54' },
  { name: 'Bronzeada', hex: '#945d37' },
  { name: 'Negra Acolhedora', hex: '#784d2d' },
  { name: 'Negra Retinta', hex: '#54321d' },
];

const HAIR_COLORS = [
  { name: 'Castanho Escuro', hex: '#362312' },
  { name: 'Preto', hex: '#1c1510' },
  { name: 'Castanho Claro', hex: '#684024' },
  { name: 'Loiro Dourado', hex: '#b58c4c' },
  { name: 'Ruivo Campestre', hex: '#8a3c1e' },
  { name: 'Grisalho', hex: '#9c9a97' },
];

const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: 'short_part', label: 'Curto Penteado' },
  { id: 'long_wavy', label: 'Ondulado Longo' },
  { id: 'braids', label: 'Tranças Caipiras' },
  { id: 'rustic_bun', label: 'Coque Rústico' },
  { id: 'curly_afro', label: 'Crespo / Afro' },
];

const SHIRT_STYLES: { id: ShirtStyle; label: string; defaultColor: string }[] = [
  { id: 'flannel_red', label: 'Xadrez Vermelho', defaultColor: '#b83a2b' },
  { id: 'flannel_blue', label: 'Xadrez Azul', defaultColor: '#2f5b84' },
  { id: 'floral_farm', label: 'Floral de Campo', defaultColor: '#d66d75' },
  { id: 'denim_vest', label: 'Colete Jeans', defaultColor: '#2d4e68' },
  { id: 'linen_cream', label: 'Linho Rústico', defaultColor: '#e8dcbe' },
  { id: 'mustard_rural', label: 'Mostarda Rural', defaultColor: '#c88a2a' },
];

const PANTS_STYLES: { id: PantsStyle; label: string; defaultColor: string }[] = [
  { id: 'jeans_classic', label: 'Jeans Clássico', defaultColor: '#2b3f60' },
  { id: 'jeans_dark', label: 'Jeans Escuro', defaultColor: '#1e242e' },
  { id: 'overalls_dungaree', label: 'Jardineira Jeans', defaultColor: '#203248' },
  { id: 'khaki_ranch', label: 'Caqui Rancho', defaultColor: '#5c4532' },
];

const HAT_OPTIONS: { id: HatType; label: string }[] = [
  { id: 'straw', label: 'Chapéu de Palha' },
  { id: 'cap', label: 'Boné Rural' },
  { id: 'country_fedora', label: 'Chapéu Campeiro' },
  { id: 'none', label: 'Sem Chapéu' },
];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onEnter,
  initialCustomization,
  onCustomizationPreview,
  onOpenAuditModal,
  connectionStatus = 'disconnected',
  serverUrl = '',
}) => {
  const [customization, setCustomization] = useState<PlayerCustomization>(initialCustomization);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    initialCustomization.presetId || 'tiao'
  );
  const [tab, setTab] = useState<'presets' | 'custom'>('presets');
  const [showDrawer, setShowDrawer] = useState(false);

  const handleApplyPreset = (preset: CharacterPreset) => {
    setSelectedPresetId(preset.id);
    const updated: PlayerCustomization = {
      name: preset.name,
      gender: preset.gender,
      skinTone: preset.skinTone,
      hairStyle: preset.hairStyle,
      hairColor: preset.hairColor,
      shirtStyle: preset.shirtStyle,
      shirtColor: preset.shirtColor,
      pantsStyle: preset.pantsStyle,
      pantsColor: preset.pantsColor,
      hatType: preset.hatType,
      presetId: preset.id,
    };
    setCustomization(updated);
    onCustomizationPreview(updated);
  };

  const handleUpdate = (partial: Partial<PlayerCustomization>) => {
    const next = { ...customization, ...partial, presetId: undefined };
    setCustomization(next);
    onCustomizationPreview(next);
  };

  const handleStart = () => {
    onEnter(customization);
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between p-4 sm:p-8 md:p-12 pointer-events-none select-none overflow-y-auto">
      {/* Top Bar lockup */}
      <div className="flex items-center justify-between w-full max-w-6xl mx-auto">
        <div className="flex items-center space-x-3 pointer-events-auto">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] text-amber-300/80 font-medium font-sans">
              Mundo Virtual 3D
            </span>
            <div className="text-xl font-bold tracking-wider text-amber-100 font-cinzel">
              FOGUEIRA
            </div>
          </div>
        </div>

        {/* Server & Network Status Badge */}
        <div className="pointer-events-auto flex items-center space-x-2">
          <button
            onClick={onOpenAuditModal}
            title={`Clique para ver detalhes do servidor multiplayer (${serverUrl || 'Railway'})`}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center space-x-2 shadow-md cursor-pointer transition-colors border ${
              connectionStatus === 'connected'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200 hover:bg-emerald-900/80'
                : connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
                ? 'bg-stone-900/90 border-amber-500/40 text-amber-300 hover:bg-stone-800'
                : connectionStatus === 'error'
                ? 'bg-red-950/80 border-red-500/50 text-red-200 hover:bg-red-900/80'
                : 'bg-stone-900/90 hover:bg-stone-800/90 border-amber-500/30 text-amber-200/90'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
                  ? 'bg-amber-400 animate-ping'
                  : connectionStatus === 'error'
                  ? 'bg-red-500'
                  : 'bg-amber-400'
              }`}
            ></span>
            <span>
              {connectionStatus === 'connected' && 'Servidor Railway (Online)'}
              {(connectionStatus === 'connecting' || connectionStatus === 'reconnecting') && 'Conectando ao Servidor...'}
              {connectionStatus === 'error' && 'Servidor Offline (Clique p/ detalhes)'}
              {connectionStatus === 'disconnected' && 'Servidor: Railway Produção'}
            </span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Main Center Title Showcase */}
      <div className="flex flex-col items-center text-center my-auto max-w-3xl mx-auto pointer-events-auto py-6">
        {/* Title Lockup */}
        <div className="relative mb-3">
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black font-cinzel tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-amber-100 via-amber-300 to-amber-600 drop-shadow-[0_4px_30px_rgba(217,119,6,0.45)]">
            FOGUEIRA
          </h1>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-56 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>
        </div>

        <p className="text-stone-300 font-sans text-sm sm:text-base md:text-lg max-w-xl mb-6 leading-relaxed drop-shadow">
          Um refúgio nostálgico em uma fazenda antiga. Aproxime-se do calor do fogo sob as estrelas, compartilhe conversas e faça amizades.
        </p>

        {/* Current Avatar Quick Badge */}
        <div className="mb-6 flex items-center space-x-3 bg-stone-950/80 border border-amber-500/30 px-4 py-2 rounded-2xl">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: customization.shirtColor }} />
          <div className="text-xs text-left">
            <span className="text-stone-400">Personagem Selecionado:</span>{' '}
            <strong className="text-amber-200 font-medium">{customization.name}</strong>
            <span className="text-stone-500 ml-1.5">
              ({customization.gender === 'female' ? 'Feminino' : 'Masculino'})
            </span>
          </div>
        </div>

        {/* Start CTA and Character Drawer Toggle */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full max-w-md">
          <button
            onClick={handleStart}
            className="w-full sm:flex-1 py-4 px-8 rounded-xl font-cinzel font-bold text-base tracking-widest text-stone-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 shadow-[0_0_35px_rgba(245,158,11,0.5)] hover:shadow-[0_0_45px_rgba(245,158,11,0.7)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center space-x-3"
          >
            <Flame className="w-5 h-5 text-amber-900" />
            <span>ENTRAR NA FAZENDA</span>
          </button>

          <button
            onClick={() => setShowDrawer(!showDrawer)}
            className="w-full sm:w-auto py-4 px-5 rounded-xl font-sans font-semibold text-sm tracking-wide text-amber-200 bg-stone-900/90 border border-amber-500/30 hover:border-amber-400/60 hover:bg-stone-800/90 transition-all cursor-pointer flex items-center justify-center space-x-2"
          >
            <User className="w-4 h-4 text-amber-400" />
            <span>{showDrawer ? 'Ocultar Opções' : 'Escolher Personagem'}</span>
          </button>
        </div>

        {/* Character Selection Panel */}
        {showDrawer && (
          <div className="mt-5 w-full max-w-xl bg-stone-950/95 border border-amber-500/30 rounded-2xl p-5 text-left text-stone-200 shadow-2xl backdrop-blur-none max-h-[60vh] overflow-y-auto">
            {/* Tabs */}
            <div className="flex border-b border-stone-800 mb-4">
              <button
                onClick={() => setTab('presets')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider text-center transition-colors cursor-pointer ${
                  tab === 'presets'
                    ? 'text-amber-400 border-b-2 border-amber-400'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Personagens Prontos ({CHARACTER_PRESETS.length})
              </button>
              <button
                onClick={() => setTab('custom')}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider text-center transition-colors cursor-pointer ${
                  tab === 'custom'
                    ? 'text-amber-400 border-b-2 border-amber-400'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Personalização Livre
              </button>
            </div>

            {/* Tab 1: Presets */}
            {tab === 'presets' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CHARACTER_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => handleApplyPreset(preset)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      selectedPresetId === preset.id
                        ? 'bg-amber-500/20 border-amber-400 shadow-md ring-1 ring-amber-400'
                        : 'bg-stone-900/70 border-stone-800 hover:border-amber-500/40 hover:bg-stone-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/40"
                          style={{ backgroundColor: preset.shirtColor }}
                        />
                        <strong className="text-sm font-semibold text-amber-100">
                          {preset.name}
                        </strong>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-300">
                        {preset.gender === 'female' ? 'Feminino' : 'Masculino'}
                      </span>
                    </div>

                    <div className="text-xs text-amber-300/90 font-medium mb-1">
                      {preset.title}
                    </div>
                    <p className="text-[11px] text-stone-400 leading-snug line-clamp-2">
                      {preset.description}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-stone-800/60 flex items-center justify-between text-[10px] text-stone-400">
                      <span>{preset.hatType !== 'none' ? 'Com chapéu' : 'Sem chapéu'}</span>
                      {selectedPresetId === preset.id && (
                        <span className="text-amber-400 flex items-center space-x-1 font-semibold">
                          <Check className="w-3 h-3" />
                          <span>Selecionado</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: Free Customization */}
            {tab === 'custom' && (
              <div className="space-y-4 text-xs">
                {/* Name */}
                <div>
                  <label className="block text-stone-400 mb-1 font-medium">Nome do Personagem</label>
                  <input
                    type="text"
                    value={customization.name}
                    maxLength={20}
                    onChange={(e) => handleUpdate({ name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 text-sm focus:outline-none focus:border-amber-400"
                    placeholder="Seu nome ou apelido"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-stone-400 mb-1 font-medium">Corpo & Gênero</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['male', 'female'] as Gender[]).map((g) => (
                      <button
                        key={g}
                        onClick={() => handleUpdate({ gender: g })}
                        className={`py-2 px-3 rounded-lg border text-center transition-all cursor-pointer ${
                          customization.gender === g
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                            : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {g === 'female' ? 'Feminino' : 'Masculino'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Skin Tone */}
                <div>
                  <label className="block text-stone-400 mb-1.5 font-medium">Tom de Pele</label>
                  <div className="flex items-center space-x-2.5">
                    {SKIN_TONES.map((st) => (
                      <button
                        key={st.hex}
                        title={st.name}
                        onClick={() => handleUpdate({ skinTone: st.hex })}
                        className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                          customization.skinTone === st.hex
                            ? 'border-amber-400 scale-110 shadow-lg'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: st.hex }}
                      />
                    ))}
                  </div>
                </div>

                {/* Hairstyle & Color */}
                <div>
                  <label className="block text-stone-400 mb-1.5 font-medium">Estilo & Cor do Cabelo</label>
                  <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                    {HAIR_STYLES.map((hs) => (
                      <button
                        key={hs.id}
                        onClick={() => handleUpdate({ hairStyle: hs.id })}
                        className={`py-1.5 px-2 rounded-lg text-[11px] border text-center transition-all cursor-pointer ${
                          customization.hairStyle === hs.id
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-semibold'
                            : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {hs.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center space-x-2">
                    {HAIR_COLORS.map((hc) => (
                      <button
                        key={hc.hex}
                        title={hc.name}
                        onClick={() => handleUpdate({ hairColor: hc.hex })}
                        className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                          customization.hairColor === hc.hex
                            ? 'border-amber-400 scale-110'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: hc.hex }}
                      />
                    ))}
                  </div>
                </div>

                {/* Shirt / Top Outfit */}
                <div>
                  <label className="block text-stone-400 mb-1.5 font-medium">Camisa / Casaco Caipira</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {SHIRT_STYLES.map((ss) => (
                      <button
                        key={ss.id}
                        onClick={() => handleUpdate({ shirtStyle: ss.id, shirtColor: ss.defaultColor })}
                        className={`py-1.5 px-2 rounded-lg text-[11px] border text-left transition-all cursor-pointer flex items-center space-x-1.5 ${
                          customization.shirtStyle === ss.id
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-semibold'
                            : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ss.defaultColor }} />
                        <span className="truncate">{ss.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pants Style */}
                <div>
                  <label className="block text-stone-400 mb-1.5 font-medium">Calça / Jardineira</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PANTS_STYLES.map((ps) => (
                      <button
                        key={ps.id}
                        onClick={() => handleUpdate({ pantsStyle: ps.id, pantsColor: ps.defaultColor })}
                        className={`py-1.5 px-2 rounded-lg text-[11px] border text-left transition-all cursor-pointer flex items-center space-x-1.5 ${
                          customization.pantsStyle === ps.id
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-semibold'
                            : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ps.defaultColor }} />
                        <span className="truncate">{ps.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hat */}
                <div>
                  <label className="block text-stone-400 mb-1.5 font-medium">Chapéu</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {HAT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleUpdate({ hatType: opt.id })}
                        className={`py-1.5 px-2 rounded-lg text-[11px] border text-center transition-all cursor-pointer ${
                          customization.hatType === opt.id
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-semibold'
                            : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Flat Control Hints Bar */}
      <div className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-stone-400 font-sans border-t border-stone-800/80 pt-4 pointer-events-auto">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2 sm:mb-0">
          <span className="text-amber-300 font-medium">Controles:</span>
          <span><strong className="text-amber-200">📱 Touch:</strong> Joystick virtual + Botões de Ação</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline"><strong className="text-stone-200">💻 Teclado:</strong> WASD / Shift / E / 1..4</span>
          <span className="hidden sm:inline">·</span>
          <span><strong className="text-stone-200">Arrastar Tela:</strong> Girar Câmera</span>
        </div>

        <div className="flex items-center space-x-2 text-stone-500 text-[11px]">
          <Compass className="w-3.5 h-3.5" />
          <span>Fogueira v1.2 · Multiplayer 3D Mobile & Desktop</span>
        </div>
      </div>
    </div>
  );
};
