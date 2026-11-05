import { Room, Client } from 'colyseus';
import {
  FogueiraState,
  PlayerState,
  PlayerCustomizationSchema,
} from './schema/FogueiraState';

interface MoveMessage {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  action?: string;
  isSitting?: boolean;
}

interface ChatMessagePayload {
  text: string;
  sender?: string;
  timestamp?: number;
}

interface EmoteMessage {
  action: string;
}

interface SitMessage {
  isSitting: boolean;
  sitSpotId?: string;
}

interface CustomizationMessage {
  customization: Partial<{
    name: string;
    gender: string;
    skinTone: string;
    hairStyle: string;
    hairColor: string;
    shirtStyle: string;
    shirtColor: string;
    pantsStyle: string;
    pantsColor: string;
    hatType: string;
    presetId: string;
  }>;
}

export class FogueiraRoom extends Room<FogueiraState> {
  onCreate(options: Record<string, unknown>): void {
    this.maxClients = 50;
    this.autoDispose = false;
    console.log('[FogueiraRoom] Sala criada com opções:', options);
    this.setState(new FogueiraState());

    // 1. Mensagem de Movimento
    this.onMessage('move', (client, message: MoveMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      if (typeof message.x === 'number') player.x = message.x;
      if (typeof message.y === 'number') player.y = message.y;
      if (typeof message.z === 'number') player.z = message.z;
      if (typeof message.rotationY === 'number') player.rotationY = message.rotationY;
      if (message.action) player.action = message.action;
      if (typeof message.isSitting === 'boolean') player.isSitting = message.isSitting;
      player.lastUpdated = Date.now();

      // Transmite pacote leve de movimento para interpolação imediata nos outros clientes
      this.broadcast(
        'player_move',
        {
          sessionId: client.sessionId,
          x: player.x,
          y: player.y,
          z: player.z,
          rotationY: player.rotationY,
          action: player.action,
          isSitting: player.isSitting,
        },
        { except: client }
      );
    });

    // 2. Mensagem de Chat
    this.onMessage('chat', (client, message: ChatMessagePayload) => {
      const player = this.state.players.get(client.sessionId);
      const text = String(message.text || '').trim();
      if (!text) return;

      // Limita tamanho da mensagem
      const cleanText = text.substring(0, 160);
      const sender = player?.name || message.sender || 'Viajante';

      const chatPacket = {
        id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sender,
        text: cleanText,
        timestamp: Date.now(),
        isSystem: false,
      };

      console.log(`[FogueiraRoom Chat] ${sender}: ${cleanText}`);
      this.broadcast('chat', chatPacket);
    });

    // 3. Mensagem de Gestos / Emotes (wave, warmHands, talk, celebrate)
    this.onMessage('emote', (client, message: EmoteMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const validActions = [
        'idle',
        'walk',
        'run',
        'sit',
        'wave',
        'warmHands',
        'talk',
        'celebrate',
      ];

      const action = validActions.includes(message.action) ? message.action : 'idle';
      player.action = action;
      player.lastUpdated = Date.now();

      this.broadcast(
        'player_emote',
        {
          sessionId: client.sessionId,
          action,
        },
        { except: client }
      );
    });

    // 4. Mensagem de Sentar / Levantar
    this.onMessage('sit', (client, message: SitMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      player.isSitting = Boolean(message.isSitting);
      player.sitSpotId = message.sitSpotId || '';
      player.action = player.isSitting ? 'sit' : 'idle';
      player.lastUpdated = Date.now();

      this.broadcast(
        'player_move',
        {
          sessionId: client.sessionId,
          x: player.x,
          y: player.y,
          z: player.z,
          rotationY: player.rotationY,
          action: player.action,
          isSitting: player.isSitting,
          sitSpotId: player.sitSpotId,
        },
        { except: client }
      );
    });

    // 5. Atualização de Perfil / Customização
    this.onMessage('update_profile', (client, message: CustomizationMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !message.customization) return;

      const c = message.customization;
      if (c.name) {
        player.name = c.name.substring(0, 24);
        player.customization.name = player.name;
      }
      if (c.gender) player.customization.gender = c.gender;
      if (c.skinTone) player.customization.skinTone = c.skinTone;
      if (c.hairStyle) player.customization.hairStyle = c.hairStyle;
      if (c.hairColor) player.customization.hairColor = c.hairColor;
      if (c.shirtStyle) player.customization.shirtStyle = c.shirtStyle;
      if (c.shirtColor) player.customization.shirtColor = c.shirtColor;
      if (c.pantsStyle) player.customization.pantsStyle = c.pantsStyle;
      if (c.pantsColor) player.customization.pantsColor = c.pantsColor;
      if (c.hatType) player.customization.hatType = c.hatType;
      if (c.presetId) player.customization.presetId = c.presetId;
    });

    // Ping para cálculo de latência do cliente
    this.onMessage('ping', (client, message: { t?: number }) => {
      client.send('pong', { clientTime: message?.t, serverTime: Date.now() });
    });

    // Atualização de tempo do servidor a cada 1 segundo
    this.setSimulationInterval(() => {
      this.state.serverTime = Date.now();
      this.state.totalPlayers = this.state.players.size;
    }, 1000);
  }

  onJoin(client: Client, options: Record<string, unknown>): void {
    console.log(`[FogueiraRoom] Jogador conectado: ${client.sessionId}`);

    const player = new PlayerState();
    player.sessionId = client.sessionId;
    player.name = String(options.name || 'Viajante').substring(0, 24);
    player.x = typeof options.x === 'number' ? options.x : 0;
    player.y = typeof options.y === 'number' ? options.y : 0;
    player.z = typeof options.z === 'number' ? options.z : 4.8;
    player.rotationY = typeof options.rotationY === 'number' ? options.rotationY : Math.PI;
    player.action = 'idle';
    player.isSitting = false;
    player.lastUpdated = Date.now();

    // Aplica customização recebida do cliente
    const custom = (options.customization as Record<string, string>) || {};
    player.customization = new PlayerCustomizationSchema();
    player.customization.name = player.name;
    if (custom.gender) player.customization.gender = custom.gender;
    if (custom.skinTone) player.customization.skinTone = custom.skinTone;
    if (custom.hairStyle) player.customization.hairStyle = custom.hairStyle;
    if (custom.hairColor) player.customization.hairColor = custom.hairColor;
    if (custom.shirtStyle) player.customization.shirtStyle = custom.shirtStyle;
    if (custom.shirtColor) player.customization.shirtColor = custom.shirtColor;
    if (custom.pantsStyle) player.customization.pantsStyle = custom.pantsStyle;
    if (custom.pantsColor) player.customization.pantsColor = custom.pantsColor;
    if (custom.hatType) player.customization.hatType = custom.hatType;
    if (custom.presetId) player.customization.presetId = custom.presetId;

    this.state.players.set(client.sessionId, player);
    this.state.totalPlayers = this.state.players.size;

    // Notifica todos na fazenda
    this.broadcast('chat', {
      id: `sys_join_${Date.now()}_${client.sessionId.substring(0, 4)}`,
      sender: 'Fazenda Fogueira',
      text: `${player.name} aproximou-se da fogueira.`,
      timestamp: Date.now(),
      isSystem: true,
    });
  }

  onLeave(client: Client, consented?: boolean): void {
    const player = this.state.players.get(client.sessionId);
    const playerName = player ? player.name : 'Um viajante';

    console.log(
      `[FogueiraRoom] Jogador desconectado: ${client.sessionId} (${playerName}, consentido: ${consented})`
    );

    this.state.players.delete(client.sessionId);
    this.state.totalPlayers = this.state.players.size;

    this.broadcast('chat', {
      id: `sys_leave_${Date.now()}_${client.sessionId.substring(0, 4)}`,
      sender: 'Fazenda Fogueira',
      text: `${playerName} despediu-se da fazenda e partiu.`,
      timestamp: Date.now(),
      isSystem: true,
    });
  }

  onDispose(): void {
    console.log('[FogueiraRoom] Sala descartada / encerrada.');
  }
}
