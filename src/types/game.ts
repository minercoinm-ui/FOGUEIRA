export type GameState = 'TITLE' | 'PLAYING' | 'PAUSED';

export type Gender = 'male' | 'female';

export type HairStyle =
  | 'short_part'
  | 'long_wavy'
  | 'braids'
  | 'rustic_bun'
  | 'curly_afro';

export type ShirtStyle =
  | 'flannel_red'
  | 'flannel_blue'
  | 'floral_farm'
  | 'denim_vest'
  | 'linen_cream'
  | 'mustard_rural';

export type PantsStyle =
  | 'jeans_classic'
  | 'jeans_dark'
  | 'overalls_dungaree'
  | 'khaki_ranch';

export type HatType = 'straw' | 'cap' | 'country_fedora' | 'none';

export interface CharacterPreset {
  id: string;
  name: string;
  gender: Gender;
  title: string;
  description: string;
  skinTone: string;
  hairStyle: HairStyle;
  hairColor: string;
  shirtStyle: ShirtStyle;
  shirtColor: string;
  pantsStyle: PantsStyle;
  pantsColor: string;
  hatType: HatType;
}

export interface PlayerCustomization {
  name: string;
  gender: Gender;
  skinTone: string;
  hairStyle: HairStyle;
  hairColor: string;
  shirtStyle: ShirtStyle;
  shirtColor: string;
  pantsStyle: PantsStyle;
  pantsColor: string;
  hatType: HatType;
  presetId?: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  color?: string;
  isSystem?: boolean;
}

export interface WorldLocation {
  name: string;
  description: string;
  center: [number, number]; // x, z
  radius: number;
}

export interface SitSpot {
  id: string;
  position: [number, number, number];
  rotationY: number;
  label: string;
}

export type AvatarAction =
  | 'idle'
  | 'walk'
  | 'run'
  | 'sit'
  | 'wave'
  | 'warmHands'
  | 'talk'
  | 'celebrate';

export interface GameSettings {
  masterVolume: number;
  fireVolume: number;
  ambientVolume: number;
  sfxVolume: number;
  mouseSensitivity: number;
  timeOfDay: 'night' | 'twilight' | 'dawn';
  shadows: boolean;
  bloom: boolean;
}
