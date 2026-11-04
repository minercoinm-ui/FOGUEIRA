import { WorldLocation, SitSpot, CharacterPreset } from '../types/game';

export interface BoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  name: string;
}

export const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: 'tiao',
    name: 'Tião do Campo',
    gender: 'male',
    title: 'Peão Tradicional',
    description: 'Nascido na lida caipira, adora contar causos de fazenda ao redor do fogo.',
    skinTone: '#d8a679',
    hairStyle: 'short_part',
    hairColor: '#362312',
    shirtStyle: 'flannel_red',
    shirtColor: '#b83a2b',
    pantsStyle: 'jeans_classic',
    pantsColor: '#2b3f60',
    hatType: 'straw',
  },
  {
    id: 'rosinha',
    name: 'Rosinha da Serra',
    gender: 'female',
    title: 'Bordadeira & Cantora',
    description: 'Traz viola e canções antigas que aquecem as noites frias na fogueira.',
    skinTone: '#f3c7a7',
    hairStyle: 'braids',
    hairColor: '#684024',
    shirtStyle: 'floral_farm',
    shirtColor: '#d66d75',
    pantsStyle: 'jeans_classic',
    pantsColor: '#25354e',
    hatType: 'straw',
  },
  {
    id: 'mateus',
    name: 'Mateus Carreiro',
    gender: 'male',
    title: 'Condutor de Boiada',
    description: 'Conhece cada palmo de trilha e estrela no céu rural.',
    skinTone: '#784d2d',
    hairStyle: 'curly_afro',
    hairColor: '#1c1510',
    shirtStyle: 'denim_vest',
    shirtColor: '#2d4e68',
    pantsStyle: 'jeans_dark',
    pantsColor: '#1e242e',
    hatType: 'cap',
  },
  {
    id: 'clara',
    name: 'Clara Pescadora',
    gender: 'female',
    title: 'Guardiã do Lago',
    description: 'Aprecia a calmaria da água e o som dos grilos sob o luar da fazenda.',
    skinTone: '#b57d54',
    hairStyle: 'long_wavy',
    hairColor: '#291c13',
    shirtStyle: 'linen_cream',
    shirtColor: '#e8dcbe',
    pantsStyle: 'khaki_ranch',
    pantsColor: '#75583b',
    hatType: 'none',
  },
  {
    id: 'ze',
    name: 'Seu Zé da Porteira',
    gender: 'male',
    title: 'Patriarca da Fazenda',
    description: 'Guarda as histórias centenárias do casarão colonial e do celeiro antigo.',
    skinTone: '#dfb799',
    hairStyle: 'short_part',
    hairColor: '#9c9a97',
    shirtStyle: 'mustard_rural',
    shirtColor: '#c88a2a',
    pantsStyle: 'khaki_ranch',
    pantsColor: '#453324',
    hatType: 'country_fedora',
  },
  {
    id: 'dandara',
    name: 'Dandara da Terra',
    gender: 'female',
    title: 'Agricultora Agroecológica',
    description: 'Cuida da horta e dos pomares com energia contagiante e sorriso caloroso.',
    skinTone: '#54321d',
    hairStyle: 'rustic_bun',
    hairColor: '#140f0c',
    shirtStyle: 'flannel_blue',
    shirtColor: '#2f5b84',
    pantsStyle: 'overalls_dungaree',
    pantsColor: '#203248',
    hatType: 'none',
  },
];

export const WORLD_LOCATIONS: WorldLocation[] = [
  {
    name: 'Ao redor da Fogueira',
    description: 'O coração da fazenda, aquecido pelas chamas sob as estrelas.',
    center: [0, 0],
    radius: 7,
  },
  {
    name: 'Varanda da Casa Antiga',
    description: 'Casa sede colonial com paredes de adobe e telhas artesanais.',
    center: [-18, -14],
    radius: 10,
  },
  {
    name: 'Celeiro Rústico',
    description: 'Celeiro histórico com fardos de feno, barris e ferramentas.',
    center: [18, -12],
    radius: 11,
  },
  {
    name: 'Lago & Píer de Madeira',
    description: 'Águas calmas refletindo a lua cheia e as luzes da fazenda.',
    center: [15, 16],
    radius: 12,
  },
  {
    name: 'Pomar & Pasto das Cercas',
    description: 'Árvores frutíferas e trilha de terra batida sob a brisa noturna.',
    center: [-16, 15],
    radius: 14,
  },
];

export const SIT_SPOTS: SitSpot[] = [
  { id: 'log_north', position: [0, 0.45, -3.4], rotationY: 0, label: 'Banco Norte da Fogueira' },
  { id: 'log_south', position: [0, 0.45, 3.4], rotationY: Math.PI, label: 'Banco Sul da Fogueira' },
  { id: 'log_east', position: [3.4, 0.45, 0], rotationY: -Math.PI / 2, label: 'Banco Leste da Fogueira' },
  { id: 'log_west', position: [-3.4, 0.45, 0], rotationY: Math.PI / 2, label: 'Banco Oeste da Fogueira' },
  { id: 'porch_bench', position: [-15.5, 0.7, -13], rotationY: Math.PI / 2, label: 'Banco da Varanda' },
  { id: 'pier_edge', position: [14.8, 0.55, 12], rotationY: -Math.PI / 4, label: 'Beira do Píer' },
];

export const WORLD_BOUNDS = {
  minX: -42,
  maxX: 42,
  minZ: -42,
  maxZ: 42,
};
