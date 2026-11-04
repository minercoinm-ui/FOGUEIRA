import { Schema, type, MapSchema } from '@colyseus/schema';

/**
 * Schema para personalização visual do avatar do jogador
 */
export class PlayerCustomizationSchema extends Schema {
  @type('string') name: string = 'Viajante';
  @type('string') gender: string = 'male';
  @type('string') skinTone: string = '#d8a679';
  @type('string') hairStyle: string = 'short_part';
  @type('string') hairColor: string = '#362312';
  @type('string') shirtStyle: string = 'flannel_red';
  @type('string') shirtColor: string = '#b83a2b';
  @type('string') pantsStyle: string = 'jeans_classic';
  @type('string') pantsColor: string = '#2b3f60';
  @type('string') hatType: string = 'straw';
  @type('string') presetId: string = 'tiao';
}

/**
 * Schema para o estado de cada jogador conectado na sala
 */
export class PlayerState extends Schema {
  @type('string') sessionId: string = '';
  @type('string') name: string = 'Viajante';
  @type(PlayerCustomizationSchema) customization: PlayerCustomizationSchema = new PlayerCustomizationSchema();
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') z: number = 4.8;
  @type('number') rotationY: number = 3.14159;
  @type('string') action: string = 'idle';
  @type('boolean') isSitting: boolean = false;
  @type('string') sitSpotId: string = '';
  @type('number') lastUpdated: number = 0;
}

/**
 * Schema do estado global da sala FOGUEIRA
 */
export class FogueiraState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type('number') serverTime: number = 0;
  @type('number') totalPlayers: number = 0;
}
