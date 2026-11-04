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
export type StatusChangeCallback = (status: ConnectionStatus, errorMsg?: string) => void;

export class SocketManager {
  private client: Client | null = null;
  private room: Room | null = null;
  private serverUrl: string;
  private roomName: string = 'fogueira_room';
  public status: ConnectionStatus = 'disconnected';
  public sessionId: string | null = null;
  public errorMessage: string | null = null;

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

  constructor(serverUrl?: string) {
    // Determine Colyseus server endpoint:
    // 1. Explicit argument
    // 2. Environment variable VITE_COLYSEUS_URL
    // 3. Fallback to default Colyseus port or current host with ws/wss protocol
    const envUrl = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_COLYSEUS_URL;

    if (serverUrl) {
      this.serverUrl = serverUrl;
    } else if (envUrl) {
      this.serverUrl = envUrl;
    } else if (typeof window !== 'undefined') {
      const isHttps = window.location.protocol === 'https:';
      const wsProtocol = isHttps ? 'wss://' : 'ws://';
      // In development, default to standard Colyseus dev port 2567 or the current host
      const host = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';
      this.serverUrl = `${wsProtocol}${host}${port}`;
    } else {
      this.serverUrl = 'ws://localhost:2567';
    }
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

      // Connect and joinOrCreate room
      this.room = await this.client.joinOrCreate(this.roomName, joinOptions);
      this.sessionId = this.room.sessionId;
      this.setStatus('connected');

      this.setupRoomListeners();
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.errorMessage = message;
      this.setStatus('error', message);
      console.warn(`[SocketManager] Colyseus connection failed to ${this.serverUrl}: ${message}`);
      return false;
    }
  }

  /**
   * Configures listeners on the joined Colyseus Room.
   */
  private setupRoomListeners(): void {
    if (!this.room) return;

    // Room connection state
    this.room.onLeave((code) => {
      this.setStatus('disconnected', `Desconectado da sala (código ${code})`);
      this.clearRemotePlayers();
    });

    this.room.onError((code, message) => {
      this.setStatus('error', `Erro na sala Colyseus: ${message} (${code})`);
    });

    // 1. Schema or state change: listen for player add/remove/change
    this.room.onStateChange((state: unknown) => {
      const typedState = state as { players?: Record<string, unknown> };
      if (!typedState?.players) return;

      const currentIds = new Set<string>();

      // Iterate players in room state
      Object.entries(typedState.players).forEach(([sessionId, pData]) => {
        if (sessionId === this.sessionId) return; // Skip local player
        currentIds.add(sessionId);

        const data = pData as Partial<PlayerNetworkState>;
        if (!this.remotePlayers.has(sessionId)) {
          // New remote player joined
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
            z: data.z ?? 0,
            rotationY: data.rotationY ?? 0,
            action: (data.action as AvatarAction) ?? 'idle',
            isSitting: Boolean(data.isSitting),
            sitSpotId: data.sitSpotId,
            lastUpdated: Date.now(),
          };

          this.remotePlayers.set(sessionId, newPlayer);
          this.notifyPlayerJoin(newPlayer);
        } else {
          // Existing remote player updated
          const existing = this.remotePlayers.get(sessionId)!;
          if (data.x !== undefined) existing.x = data.x;
          if (data.y !== undefined) existing.y = data.y;
          if (data.z !== undefined) existing.z = data.z;
          if (data.rotationY !== undefined) existing.rotationY = data.rotationY;
          if (data.action !== undefined) existing.action = data.action as AvatarAction;
          if (data.isSitting !== undefined) existing.isSitting = data.isSitting;
          if (data.sitSpotId !== undefined) existing.sitSpotId = data.sitSpotId;
          existing.lastUpdated = Date.now();

          this.notifyPlayerUpdate(sessionId, existing);
        }
      });

      // Remove players who left
      for (const id of Array.from(this.remotePlayers.keys())) {
        if (!currentIds.has(id)) {
          this.remotePlayers.delete(id);
          this.notifyPlayerLeave(id);
        }
      }
    });

    // 2. Direct message handlers for discrete events
    // Chat message broadcast
    this.room.onMessage('chat', (message: ChatMessage) => {
      this.notifyChatMessage(message);
    });

    // Direct player movement packet (for high frequency interpolation)
    this.room.onMessage('player_move', (data: { sessionId: string } & Partial<PlayerNetworkState>) => {
      if (data.sessionId && data.sessionId !== this.sessionId) {
        const p = this.remotePlayers.get(data.sessionId);
        if (p) {
          if (data.x !== undefined) p.x = data.x;
          if (data.y !== undefined) p.y = data.y;
          if (data.z !== undefined) p.z = data.z;
          if (data.rotationY !== undefined) p.rotationY = data.rotationY;
          if (data.action !== undefined) p.action = data.action;
          if (data.isSitting !== undefined) p.isSitting = data.isSitting;
          p.lastUpdated = Date.now();
          this.notifyPlayerUpdate(data.sessionId, p);
        }
      }
    });

    // Emote broadcast
    this.room.onMessage('player_emote', (data: { sessionId: string; action: AvatarAction }) => {
      if (data.sessionId && data.sessionId !== this.sessionId) {
        const p = this.remotePlayers.get(data.sessionId);
        if (p) {
          p.action = data.action;
          this.notifyPlayerUpdate(data.sessionId, { action: data.action });
        }
      }
    });
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
      console.warn('[SocketManager] Failed to send player transform:', e);
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
      console.warn('[SocketManager] Failed to send chat message:', e);
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
      console.warn('[SocketManager] Failed to send emote:', e);
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
      console.warn('[SocketManager] Failed to send sit interact:', e);
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
      console.warn('[SocketManager] Failed to send profile update:', e);
    }
  }

  /**
   * Disconnects gracefully from the Colyseus server.
   */
  public disconnect(): void {
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
    cb(this.status, this.errorMessage ?? undefined);
    return () => this.onStatusChangeCallbacks.delete(cb);
  }

  private setStatus(status: ConnectionStatus, errorMsg?: string): void {
    this.status = status;
    if (errorMsg) this.errorMessage = errorMsg;
    this.onStatusChangeCallbacks.forEach((cb) => cb(status, errorMsg));
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
