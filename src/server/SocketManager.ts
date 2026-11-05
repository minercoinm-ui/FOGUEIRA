import { Client, Room } from 'colyseus.js';
import { PlayerCustomization, AvatarAction, ChatMessage } from '../types/game';

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface PlayerNetworkState {
  sessionId: string;
  name: string;
  customization: PlayerCustomization;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  action: AvatarAction;
  isSitting: boolean;
  sitSpotId?: string;
  lastUpdated: number;
}

export type PlayerJoinCallback = (player: PlayerNetworkState) => void;
export type PlayerLeaveCallback = (sessionId: string) => void;
export type PlayerUpdateCallback = (sessionId: string, state: Partial<PlayerNetworkState>) => void;
export type ChatMessageCallback = (msg: ChatMessage) => void;
export type StatusChangeCallback = (status: ConnectionStatus, errorMsg?: string, latency?: number) => void;

/**
 * Normalizes any server address (with or without protocol, HTTP/HTTPS or WS/WSS)
 * into a valid Colyseus WebSocket URI.
 */
export function normalizeColyseusUrl(rawUrl?: string): string {
  const DEFAULT_PROD_URL = 'wss://charismatic-dedication-production-80f4.up.railway.app';

  if (!rawUrl || typeof rawUrl !== 'string') {
    return DEFAULT_PROD_URL;
  }

  let clean = rawUrl.trim();
  // Strip trailing slashes
  clean = clean.replace(/\/+$/, '');

  // Strip protocol-relative "//" prefix (e.g. "//charismatic-dedication-production-80f4.up.railway.app")
  if (clean.startsWith('//')) {
    clean = clean.replace(/^\/\//, '');
  }

  if (!clean) {
    return DEFAULT_PROD_URL;
  }

  // Convert http(s) to ws(s)
  if (clean.startsWith('https://')) {
    clean = clean.replace(/^https:\/\//, 'wss://');
  } else if (clean.startsWith('http://')) {
    clean = clean.replace(/^http:\/\//, 'ws://');
  } else if (!clean.startsWith('ws://') && !clean.startsWith('wss://')) {
    // Bare hostname provided (e.g. "charismatic-dedication-production-80f4.up.railway.app")
    if (clean.includes('localhost') || clean.includes('127.0.0.1')) {
      clean = `ws://${clean}`;
    } else {
      clean = `wss://${clean}`;
    }
  }

  return clean;
}

export class SocketManager {
  private client: Client | null = null;
  private room: Room | null = null;
  private serverUrl: string;
  private roomName: string = 'fogueira_room';

  public status: ConnectionStatus = 'disconnected';
  public sessionId: string | null = null;
  public errorMessage: string | null = null;
  public latencyMs: number = 0;

  // Remote players registry: sessionId -> PlayerNetworkState
  public remotePlayers: Map<string, PlayerNetworkState> = new Map();

  // Event listeners
  private onPlayerJoinCallbacks: Set<PlayerJoinCallback> = new Set();
  private onPlayerLeaveCallbacks: Set<PlayerLeaveCallback> = new Set();
  private onPlayerUpdateCallbacks: Set<PlayerUpdateCallback> = new Set();
  private onChatMessageCallbacks: Set<ChatMessageCallback> = new Set();
  private onStatusChangeCallbacks: Set<StatusChangeCallback> = new Set();

  // Throttled position sender (target ~20 updates/sec)
  private lastSentTime = 0;
  private sendIntervalMs = 50; // 20 Hz

  // Ping interval
  private pingIntervalId: number | null = null;

  // Last connection parameters for reconnect
  private lastCustomization: PlayerCustomization | null = null;
  private lastInitialPos: { x: number; y: number; z: number; rotationY: number } | null = null;

  constructor(serverUrl?: string) {
    const envUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_COLYSEUS_URL;

    if (serverUrl) {
      this.serverUrl = normalizeColyseusUrl(serverUrl);
    } else if (envUrl) {
      this.serverUrl = normalizeColyseusUrl(envUrl);
    } else {
      this.serverUrl = normalizeColyseusUrl();
    }

    console.log(`[SocketManager] Configurado para conectar em: ${this.serverUrl}`);
  }

  public getServerUrl(): string {
    return this.serverUrl;
  }

  public setServerUrl(newUrl: string): void {
    this.serverUrl = normalizeColyseusUrl(newUrl);
    console.log(`[SocketManager] Servidor alterado para: ${this.serverUrl}`);
  }

  public getRoomName(): string {
    return this.roomName;
  }

  /**
   * Initializes WebSocket connection to Colyseus server and joins the room.
   */
  public async connect(
    customization: PlayerCustomization,
    initialPos: { x: number; y: number; z: number; rotationY: number }
  ): Promise<boolean> {
    if (this.status === 'connecting' || this.status === 'connected') {
      return true;
    }

    this.lastCustomization = customization;
    this.lastInitialPos = initialPos;

    this.setStatus('connecting');
    this.errorMessage = null;

    try {
      this.client = new Client(this.serverUrl);

      const joinOptions = {
        name: customization.name,
        customization,
        x: initialPos.x,
        y: initialPos.y,
        z: initialPos.z,
        rotationY: initialPos.rotationY,
      };

      console.log(`[SocketManager] Conectando à sala "${this.roomName}" em ${this.serverUrl}...`);

      // Connect and joinOrCreate room
      this.room = await this.client.joinOrCreate(this.roomName, joinOptions);
      this.sessionId = this.room.sessionId;
      this.setStatus('connected');
      console.log(`[SocketManager] Conexão estabelecida com sucesso! SessionID: ${this.sessionId}`);

      this.setupRoomListeners();
      this.startPingLoop();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.errorMessage = message;
      this.setStatus('error', message);
      console.warn(`[SocketManager] Erro ao conectar com servidor Colyseus (${this.serverUrl}): ${message}`);
      return false;
    }
  }

  /**
   * Tenta reconectar usando os últimos parâmetros salvos.
   */
  public async retryConnect(): Promise<boolean> {
    if (!this.lastCustomization || !this.lastInitialPos) {
      return false;
    }
    this.disconnect();
    this.setStatus('reconnecting');
    return this.connect(this.lastCustomization, this.lastInitialPos);
  }

  /**
   * Configures listeners on the joined Colyseus Room.
   */
  private setupRoomListeners(): void {
    if (!this.room) return;

    // Room connection state
    this.room.onLeave((code) => {
      const msg = `Desconectado da sala multiplayer (código ${code})`;
      console.warn(`[SocketManager] ${msg}`);
      this.stopPingLoop();
      this.setStatus('disconnected', msg);
      this.clearRemotePlayers();
    });

    this.room.onError((code, message) => {
      const msg = `Erro no servidor Colyseus: ${message} (código ${code})`;
      console.error(`[SocketManager] ${msg}`);
      this.setStatus('error', msg);
    });

    // 1. Process any players that already exist in initial room state
    if (this.room.state) {
      this.syncInitialPlayers(this.room.state);
      this.setupStateSchemaListeners(this.room.state);
    }

    // 2. Fallback / supplementary onStateChange listener
    this.room.onStateChange((state: unknown) => {
      const typedState = state as {
        players?: { forEach?: (cb: (player: unknown, sessionId: string) => void) => void } | Record<string, unknown>;
      };
      if (!typedState?.players) return;

      const currentIds = new Set<string>();

      const processPlayer = (sessionId: string, pData: unknown) => {
        if (sessionId === this.sessionId) return;
        currentIds.add(sessionId);
        this.handlePlayerJoinOrUpdate(sessionId, pData);
      };

      if (typeof typedState.players.forEach === 'function') {
        typedState.players.forEach((pData: unknown, sessionId: string) => {
          processPlayer(sessionId, pData);
        });
      } else {
        Object.entries(typedState.players as Record<string, unknown>).forEach(([sessionId, pData]) => {
          processPlayer(sessionId, pData);
        });
      }

      // Remove players who left
      for (const id of Array.from(this.remotePlayers.keys())) {
        if (!currentIds.has(id)) {
          this.remotePlayers.delete(id);
          this.notifyPlayerLeave(id);
        }
      }
    });

    // 3. Direct message handlers for discrete events
    // Chat message broadcast
    this.room.onMessage('chat', (message: ChatMessage) => {
      this.notifyChatMessage(message);
    });

    // Direct player movement packet (for high frequency interpolation)
    this.room.onMessage('player_move', (data: { sessionId: string } & Partial<PlayerNetworkState>) => {
      if (data.sessionId && data.sessionId !== this.sessionId) {
        let p = this.remotePlayers.get(data.sessionId);
        if (!p) {
          // If player_move arrived before state patch, register player immediately
          p = this.handlePlayerJoinOrUpdate(data.sessionId, data) ?? undefined;
          if (!p) return;
        }

        if (data.x !== undefined) p.x = data.x;
        if (data.y !== undefined) p.y = data.y;
        if (data.z !== undefined) p.z = data.z;
        if (data.rotationY !== undefined) p.rotationY = data.rotationY;
        if (data.action !== undefined) p.action = data.action;
        if (data.isSitting !== undefined) p.isSitting = data.isSitting;
        if (data.sitSpotId !== undefined) p.sitSpotId = data.sitSpotId;
        p.lastUpdated = Date.now();
        this.notifyPlayerUpdate(data.sessionId, p);
      }
    });

    // Emote broadcast
    this.room.onMessage('player_emote', (data: { sessionId: string; action: AvatarAction }) => {
      if (data.sessionId && data.sessionId !== this.sessionId) {
        let p = this.remotePlayers.get(data.sessionId);
        if (!p) {
          p = this.handlePlayerJoinOrUpdate(data.sessionId, { action: data.action }) ?? undefined;
          if (!p) return;
        }
        p.action = data.action;
        p.lastUpdated = Date.now();
        this.notifyPlayerUpdate(data.sessionId, { action: data.action });
      }
    });

    // Pong response for latency measurement
    this.room.onMessage('pong', (data: { clientTime?: number; serverTime?: number }) => {
      if (data?.clientTime) {
        this.latencyMs = Math.max(1, Math.round(performance.now() - data.clientTime));
        this.notifyStatusChange();
      }
    });
  }

  /**
   * Unifies player creation and updating to guarantee no duplicate joins or missed players.
   */
  public handlePlayerJoinOrUpdate(sessionId: string, pData: unknown): PlayerNetworkState | null {
    if (sessionId === this.sessionId) return null; // Never register local player as remote

    const data = (pData || {}) as Partial<PlayerNetworkState>;
    if (!this.remotePlayers.has(sessionId)) {
      const newPlayer: PlayerNetworkState = {
        sessionId,
        name: data.name || 'Viajante',
        customization: data.customization || {
          name: data.name || 'Viajante',
          gender: 'male',
          skinTone: '#d8a679',
          hairStyle: 'short_part',
          hairColor: '#362312',
          shirtStyle: 'flannel_red',
          shirtColor: '#b83a2b',
          pantsStyle: 'jeans_classic',
          pantsColor: '#2b3f60',
          hatType: 'straw',
        },
        x: data.x ?? 0,
        y: data.y ?? 0,
        z: data.z ?? 4.8,
        rotationY: data.rotationY ?? Math.PI,
        action: (data.action as AvatarAction) ?? 'idle',
        isSitting: Boolean(data.isSitting),
        sitSpotId: data.sitSpotId,
        lastUpdated: Date.now(),
      };

      this.remotePlayers.set(sessionId, newPlayer);
      this.notifyPlayerJoin(newPlayer);
      return newPlayer;
    } else {
      const existing = this.remotePlayers.get(sessionId)!;
      let changed = false;

      if (data.name && data.name !== existing.name) {
        existing.name = data.name;
        changed = true;
      }
      if (data.customization) {
        existing.customization = { ...existing.customization, ...data.customization };
        changed = true;
      }
      if (data.x !== undefined && data.x !== existing.x) {
        existing.x = data.x;
        changed = true;
      }
      if (data.y !== undefined && data.y !== existing.y) {
        existing.y = data.y;
        changed = true;
      }
      if (data.z !== undefined && data.z !== existing.z) {
        existing.z = data.z;
        changed = true;
      }
      if (data.rotationY !== undefined && data.rotationY !== existing.rotationY) {
        existing.rotationY = data.rotationY;
        changed = true;
      }
      if (data.action !== undefined && data.action !== existing.action) {
        existing.action = data.action as AvatarAction;
        changed = true;
      }
      if (data.isSitting !== undefined && data.isSitting !== existing.isSitting) {
        existing.isSitting = data.isSitting;
        changed = true;
      }
      if (data.sitSpotId !== undefined) {
        existing.sitSpotId = data.sitSpotId;
      }

      if (changed) {
        existing.lastUpdated = Date.now();
        this.notifyPlayerUpdate(sessionId, existing);
      }
      return existing;
    }
  }

  private syncInitialPlayers(state: unknown): void {
    const s = state as {
      players?: { forEach?: (cb: (player: unknown, sessionId: string) => void) => void } | Record<string, unknown>;
    };
    if (!s?.players) return;

    if (typeof s.players.forEach === 'function') {
      s.players.forEach((pData: unknown, sessionId: string) => {
        if (sessionId !== this.sessionId) {
          this.handlePlayerJoinOrUpdate(sessionId, pData);
        }
      });
    } else if (typeof s.players === 'object') {
      Object.entries(s.players as Record<string, unknown>).forEach(([sessionId, pData]) => {
        if (sessionId !== this.sessionId) {
          this.handlePlayerJoinOrUpdate(sessionId, pData);
        }
      });
    }
  }

  private setupStateSchemaListeners(state: unknown): void {
    const s = state as {
      players?: {
        onAdd?: (cb: (player: unknown, sessionId: string) => void) => void;
        onRemove?: (cb: (player: unknown, sessionId: string) => void) => void;
      };
    };

    if (s.players && typeof s.players.onAdd === 'function') {
      s.players.onAdd((playerData, sessionId) => {
        if (sessionId === this.sessionId) return;
        this.handlePlayerJoinOrUpdate(sessionId, playerData);
      });
    }

    if (s.players && typeof s.players.onRemove === 'function') {
      s.players.onRemove((_, sessionId) => {
        if (sessionId === this.sessionId) return;
        this.remotePlayers.delete(sessionId);
        this.notifyPlayerLeave(sessionId);
      });
    }
  }

  private startPingLoop(): void {
    this.stopPingLoop();
    this.pingIntervalId = window.setInterval(() => {
      if (this.room && this.status === 'connected') {
        try {
          this.room.send('ping', { t: performance.now() });
        } catch {
          // ignore
        }
      }
    }, 4000);
  }

  private stopPingLoop(): void {
    if (this.pingIntervalId !== null) {
      window.clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  /**
   * Broadcasts local player position and kinematic state to the room (throttled).
   */
  public sendPlayerTransform(
    x: number,
    y: number,
    z: number,
    rotationY: number,
    action: AvatarAction,
    isSitting: boolean,
    force = false
  ): void {
    if (!this.room || this.status !== 'connected') return;

    const now = performance.now();
    if (!force && now - this.lastSentTime < this.sendIntervalMs) {
      return;
    }
    this.lastSentTime = now;

    try {
      this.room.send('move', {
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        z: Math.round(z * 100) / 100,
        rotationY: Math.round(rotationY * 100) / 100,
        action,
        isSitting,
      });
    } catch (e) {
      console.warn('[SocketManager] Falha ao enviar posição do jogador:', e);
    }
  }

  /**
   * Sends a chat message to the room.
   */
  public sendChatMessage(text: string, senderName: string): void {
    if (!this.room || this.status !== 'connected') return;

    try {
      this.room.send('chat', {
        text,
        sender: senderName,
        timestamp: Date.now(),
      });
    } catch (e) {
      console.warn('[SocketManager] Falha ao enviar mensagem de chat:', e);
    }
  }

  /**
   * Broadcasts an emote action (wave, talk, celebrate, warmHands).
   */
  public sendEmote(action: AvatarAction): void {
    if (!this.room || this.status !== 'connected') return;

    try {
      this.room.send('emote', { action });
    } catch (e) {
      console.warn('[SocketManager] Falha ao enviar gesto:', e);
    }
  }

  /**
   * Notifies the server of a sit or stand interaction.
   */
  public sendSitInteract(isSitting: boolean, sitSpotId?: string): void {
    if (!this.room || this.status !== 'connected') return;

    try {
      this.room.send('sit', { isSitting, sitSpotId });
    } catch (e) {
      console.warn('[SocketManager] Falha ao enviar sentar/levantar:', e);
    }
  }

  /**
   * Updates player customization on server.
   */
  public sendCustomizationUpdate(customization: PlayerCustomization): void {
    if (!this.room || this.status !== 'connected') return;

    try {
      this.room.send('update_profile', { customization });
    } catch (e) {
      console.warn('[SocketManager] Falha ao enviar atualização de perfil:', e);
    }
  }

  /**
   * Disconnects gracefully from the Colyseus server.
   */
  public disconnect(): void {
    this.stopPingLoop();
    if (this.room) {
      try {
        this.room.leave();
      } catch {
        // Ignore during shutdown
      }
      this.room = null;
    }
    this.client = null;
    this.sessionId = null;
    this.clearRemotePlayers();
    this.setStatus('disconnected');
  }

  // Listener subscription methods
  public onPlayerJoin(cb: PlayerJoinCallback): () => void {
    this.onPlayerJoinCallbacks.add(cb);
    return () => this.onPlayerJoinCallbacks.delete(cb);
  }

  public onPlayerLeave(cb: PlayerLeaveCallback): () => void {
    this.onPlayerLeaveCallbacks.add(cb);
    return () => this.onPlayerLeaveCallbacks.delete(cb);
  }

  public onPlayerUpdate(cb: PlayerUpdateCallback): () => void {
    this.onPlayerUpdateCallbacks.add(cb);
    return () => this.onPlayerUpdateCallbacks.delete(cb);
  }

  public onChatMessage(cb: ChatMessageCallback): () => void {
    this.onChatMessageCallbacks.add(cb);
    return () => this.onChatMessageCallbacks.delete(cb);
  }

  public onStatusChange(cb: StatusChangeCallback): () => void {
    this.onStatusChangeCallbacks.add(cb);
    // Immediately trigger with current status
    cb(this.status, this.errorMessage ?? undefined, this.latencyMs);
    return () => this.onStatusChangeCallbacks.delete(cb);
  }

  private setStatus(status: ConnectionStatus, errorMsg?: string): void {
    this.status = status;
    if (errorMsg) this.errorMessage = errorMsg;
    this.notifyStatusChange();
  }

  private notifyStatusChange(): void {
    this.onStatusChangeCallbacks.forEach((cb) => cb(this.status, this.errorMessage ?? undefined, this.latencyMs));
  }

  private clearRemotePlayers(): void {
    const ids = Array.from(this.remotePlayers.keys());
    this.remotePlayers.clear();
    ids.forEach((id) => this.notifyPlayerLeave(id));
  }

  private notifyPlayerJoin(p: PlayerNetworkState): void {
    this.onPlayerJoinCallbacks.forEach((cb) => cb(p));
  }

  private notifyPlayerLeave(id: string): void {
    this.onPlayerLeaveCallbacks.forEach((cb) => cb(id));
  }

  private notifyPlayerUpdate(id: string, s: Partial<PlayerNetworkState>): void {
    this.onPlayerUpdateCallbacks.forEach((cb) => cb(id, s));
  }

  private notifyChatMessage(msg: ChatMessage): void {
    this.onChatMessageCallbacks.forEach((cb) => cb(msg));
  }
}

// Export singleton instance for game-wide usage
export const socketManager = new SocketManager();
