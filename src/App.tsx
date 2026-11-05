import React, { useEffect, useRef, useState } from 'react';
import { FarmWorld } from './game/FarmWorld';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { SettingsModal } from './components/SettingsModal';
import { MultiplayerAuditModal } from './components/MultiplayerAuditModal';
import {
  GameState,
  PlayerCustomization,
  WorldLocation,
  GameSettings,
  ChatMessage,
  SitSpot,
} from './types/game';
import { WORLD_LOCATIONS, CHARACTER_PRESETS } from './game/constants';
import { soundEngine } from './audio/SoundEngine';
import { socketManager, ConnectionStatus } from './server/SocketManager';

const DEFAULT_CUSTOMIZATION: PlayerCustomization = {
  name: CHARACTER_PRESETS[0].name,
  gender: CHARACTER_PRESETS[0].gender,
  skinTone: CHARACTER_PRESETS[0].skinTone,
  hairStyle: CHARACTER_PRESETS[0].hairStyle,
  hairColor: CHARACTER_PRESETS[0].hairColor,
  shirtStyle: CHARACTER_PRESETS[0].shirtStyle,
  shirtColor: CHARACTER_PRESETS[0].shirtColor,
  pantsStyle: CHARACTER_PRESETS[0].pantsStyle,
  pantsColor: CHARACTER_PRESETS[0].pantsColor,
  hatType: CHARACTER_PRESETS[0].hatType,
  presetId: CHARACTER_PRESETS[0].id,
};

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  fireVolume: 0.7,
  ambientVolume: 0.45,
  sfxVolume: 0.6,
  mouseSensitivity: 1.0,
  timeOfDay: 'night',
  shadows: true,
  bloom: true,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<FarmWorld | null>(null);

  // React State for HUD & UI
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [customization, setCustomization] = useState<PlayerCustomization>(DEFAULT_CUSTOMIZATION);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [currentLocation, setCurrentLocation] = useState<WorldLocation>(WORLD_LOCATIONS[0]);
  const [nearbySitSpot, setNearbySitSpot] = useState<SitSpot | null>(null);
  const [isSitting, setIsSitting] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAuditOpen, setIsAuditOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Multiplayer connection state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(socketManager.status);
  const [connectionError, setConnectionError] = useState<string | null>(socketManager.errorMessage);
  const [latencyMs, setLatencyMs] = useState<number>(socketManager.latencyMs);
  const [remotePlayersCount, setRemotePlayersCount] = useState<number>(socketManager.remotePlayers.size);

  // Chat message history
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'Fazenda FOGUEIRA',
      text: 'Bem-vindo à Fazenda Antiga! Aproxime-se da fogueira para se aquecer.',
      timestamp: Date.now(),
      isSystem: true,
    },
  ]);

  // Mount Three.js FarmWorld ONCE
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const world = new FarmWorld(
      canvasMountRef.current,
      customization,
      settings,
      {
        onLocationChange: (loc) => setCurrentLocation(loc),
        onNearSitSpotChange: (spot) => setNearbySitSpot(spot),
        onSittingStateChange: (sitting) => setIsSitting(sitting),
      }
    );

    worldRef.current = world;

    const unsubChat = socketManager.onChatMessage((msg) => {
      setChatMessages((prev) => [...prev, msg]);
      const remote = worldRef.current?.getRemoteAvatar(msg.sender);
      remote?.showMessage(msg.text);
    });

    const unsubStatus = socketManager.onStatusChange((status, errorMsg, latency) => {
      setConnectionStatus(status);
      setConnectionError(errorMsg ?? null);
      if (typeof latency === 'number') setLatencyMs(latency);
    });

    const unsubJoin = socketManager.onPlayerJoin(() => {
      setRemotePlayersCount(socketManager.remotePlayers.size);
    });

    const unsubLeave = socketManager.onPlayerLeave(() => {
      setRemotePlayersCount(socketManager.remotePlayers.size);
    });

    return () => {
      unsubChat();
      unsubStatus();
      unsubJoin();
      unsubLeave();
      socketManager.disconnect();
      world.destroy();
      worldRef.current = null;
    };
  }, []);

  // Handler: Enter Farm from Title Screen
  const handleEnterFarm = (playerCustom: PlayerCustomization) => {
    setCustomization(playerCustom);
    setGameState('PLAYING');
    if (worldRef.current) {
      worldRef.current.updateCustomization(playerCustom);
      worldRef.current.setGameState('PLAYING');
      worldRef.current.requestPointerLock();

      // Connect to Colyseus server with initial transform
      socketManager.connect(playerCustom, {
        x: worldRef.current.playerPos.x,
        y: worldRef.current.playerPos.y,
        z: worldRef.current.playerPos.z,
        rotationY: Math.PI,
      });
    }
    soundEngine.init();

    // Welcome message in chat
    setChatMessages((prev) => [
      ...prev,
      {
        id: `enter_${Date.now()}`,
        sender: 'Sistema',
        text: `${playerCustom.name} se aconchegou ao redor da fogueira.`,
        timestamp: Date.now(),
        isSystem: true,
      },
    ]);
  };

  const handleRetryConnection = async () => {
    if (worldRef.current) {
      return socketManager.connect(customization, {
        x: worldRef.current.playerPos.x,
        y: worldRef.current.playerPos.y,
        z: worldRef.current.playerPos.z,
        rotationY: Math.PI,
      });
    }
    return socketManager.retryConnect();
  };

  // Preview character customization changes in Title mode
  const handleCustomizationPreview = (newCustom: PlayerCustomization) => {
    setCustomization(newCustom);
    if (worldRef.current) {
      worldRef.current.updateCustomization(newCustom);
    }
  };

  // Send a chat message
  const handleSendMessage = (text: string) => {
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: customization.name,
      text,
      timestamp: Date.now(),
    };

    setChatMessages((prev) => [...prev, newMsg]);

    // Show 3D speech bubble above player avatar
    if (worldRef.current) {
      worldRef.current.sendChatMessage(text);
    }
  };

  // Toggle Sit / Stand
  const handleToggleSit = () => {
    if (worldRef.current) {
      worldRef.current.toggleSitInteract();
    }
  };

  // Trigger character Emote
  const handleTriggerEmote = (emote: 'warmHands' | 'wave' | 'talk' | 'celebrate') => {
    if (worldRef.current) {
      worldRef.current.setEmote(emote);
    }
  };

  // Toggle Camera View Zoom
  const handleToggleCamera = () => {
    if (worldRef.current) {
      const evt = new KeyboardEvent('keydown', { key: 'c' });
      window.dispatchEvent(evt);
    }
  };

  // Update Settings
  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    if (worldRef.current) {
      worldRef.current.settings = updated;
      if (newSettings.timeOfDay) {
        worldRef.current.setTimeOfDay(newSettings.timeOfDay);
      }
    }
  };

  // Cycle time of day quickly
  const handleCycleTimeOfDay = () => {
    const order: GameSettings['timeOfDay'][] = ['night', 'twilight', 'dawn'];
    const nextIdx = (order.indexOf(settings.timeOfDay) + 1) % order.length;
    const nextTime = order[nextIdx];
    handleUpdateSettings({ timeOfDay: nextTime });
  };

  // Toggle Sound Mute
  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* 3D WebGL Canvas Viewport (Isolated container - never re-rendered by React) */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full z-0 cursor-grab active:cursor-grabbing"
      />

      {/* Title Screen Overlay */}
      {gameState === 'TITLE' && (
        <TitleScreen
          onEnter={handleEnterFarm}
          initialCustomization={customization}
          onCustomizationPreview={handleCustomizationPreview}
          onOpenAuditModal={() => setIsAuditOpen(true)}
          connectionStatus={connectionStatus}
          serverUrl={socketManager.getServerUrl()}
        />
      )}

      {/* In-Game HUD Overlay */}
      {gameState === 'PLAYING' && (
        <GameHUD
          currentLocation={currentLocation}
          nearbySitSpot={nearbySitSpot}
          isSitting={isSitting}
          onToggleSit={handleToggleSit}
          onTriggerEmote={handleTriggerEmote}
          onToggleCamera={handleToggleCamera}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenAuditModal={() => setIsAuditOpen(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          chatMessages={chatMessages}
          onSendMessage={handleSendMessage}
          settings={settings}
          onCycleTimeOfDay={handleCycleTimeOfDay}
          connectionStatus={connectionStatus}
          connectionError={connectionError}
          latencyMs={latencyMs}
          onlinePlayersCount={1 + remotePlayersCount}
          onRetryConnection={handleRetryConnection}
          serverUrl={socketManager.getServerUrl()}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Multiplayer Technical Audit Modal */}
      <MultiplayerAuditModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        connectionStatus={connectionStatus}
        connectionError={connectionError}
        latencyMs={latencyMs}
        onRetryConnection={handleRetryConnection}
      />
    </div>
  );
}
