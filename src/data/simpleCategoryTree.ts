import { ProductGroup } from '../types';
import { getCategoryIcon } from './categoryIcons';

// Simple hardcoded category tree - no database, no localStorage needed!
export const staticCategoryTree: ProductGroup[] = [
  {
    id: 'guitars',
    name: 'Guitars',
    level: 1,
    parentId: null,
    icon: getCategoryIcon('Guitars'),
    children: [
      { id: 'guitars-acoustic', name: 'Acoustic Guitars', level: 2, parentId: 'guitars', children: [] },
      { id: 'guitars-electric', name: 'Electric Guitars', level: 2, parentId: 'guitars', children: [] },
      { id: 'guitars-bass', name: 'Bass Guitars', level: 2, parentId: 'guitars', children: [] },
      { id: 'guitars-classical', name: 'Classical Guitars', level: 2, parentId: 'guitars', children: [] },
    ]
  },
  {
    id: 'keyboards',
    name: 'Keyboards Pianos & Accordions',
    level: 1,
    parentId: null,
    icon: getCategoryIcon('Keyboards Pianos & Accordions'),
    children: [
      { id: 'keyboards-digital', name: 'Digital Pianos', level: 2, parentId: 'keyboards', children: [] },
      { id: 'keyboards-synth', name: 'Synthesizers', level: 2, parentId: 'keyboards', children: [] },
      { id: 'keyboards-organ', name: 'Organs', level: 2, parentId: 'keyboards', children: [] },
    ]
  },
  {
    id: 'brass',
    name: 'Brass Instruments',
    level: 1,
    parentId: null,
    icon: getCategoryIcon('Brass Instruments'),
    children: [
      { id: 'brass-trumpet', name: 'Trumpets', level: 2, parentId: 'brass', children: [] },
      { id: 'brass-trombone', name: 'Trombones', level: 2, parentId: 'brass', children: [] },
      { id: 'brass-horn', name: 'French Horns', level: 2, parentId: 'brass', children: [] },
    ]
  },
  {
    id: 'woodwind',
    name: 'Woodwind Instruments',
    level: 1,
    parentId: null,
    icon: getCategoryIcon('Woodwind Instruments'),
    children: [
      { id: 'woodwind-sax', name: 'Saxophones', level: 2, parentId: 'woodwind', children: [] },
      { id: 'woodwind-clarinet', name: 'Clarinets', level: 2, parentId: 'woodwind', children: [] },
      { id: 'woodwind-flute', name: 'Flutes', level: 2, parentId: 'woodwind', children: [] },
    ]
  },
  {
    id: 'drums',
    name: 'Drums & Percussion',
    level: 1,
    parentId: null,
    icon: getCategoryIcon('Drums & Percussion'),
    children: [
      { id: 'drums-acoustic', name: 'Acoustic Drums', level: 2, parentId: 'drums', children: [] },
      { id: 'drums-electronic', name: 'Electronic Drums', level: 2, parentId: 'drums', children: [] },
      { id: 'drums-cymbals', name: 'Cymbals', level: 2, parentId: 'drums', children: [] },
    ]
  },
  {
    id: 'strings',
    name: 'Orchestral Strings',
    level: 1,
    parentId: null,
    icon: getCategoryIcon('Orchestral Strings'),
    children: [
      { id: 'strings-violin', name: 'Violins', level: 2, parentId: 'strings', children: [] },
      { id: 'strings-viola', name: 'Violas', level: 2, parentId: 'strings', children: [] },
      { id: 'strings-cello', name: 'Cellos', level: 2, parentId: 'strings', children: [] },
    ]
  },
  {
    id: 'recording',
    name: 'Recording Equipment',
    level: 1,
    parentId: null,
    icon: getCategoryIcon('Recording Equipment'),
    children: [
      { id: 'recording-interface', name: 'Audio Interfaces', level: 2, parentId: 'recording', children: [] },
      { id: 'recording-mics', name: 'Studio Microphones', level: 2, parentId: 'recording', children: [] },
    ]
  },
  {
    id: 'sound',
    name: 'Live Sound & Lighting',
    level: 1,
    parentId: null,
    icon: getCategoryIcon('Live Sound & Lighting'),
    children: [
      { id: 'sound-speakers', name: 'Speakers & PA Systems', level: 2, parentId: 'sound', children: [] },
      { id: 'sound-mixers', name: 'Mixers', level: 2, parentId: 'sound', children: [] },
    ]
  },
  {
    id: 'accessories',
    name: 'Accessories',
    level: 1,
    parentId: null,
    icon: getCategoryIcon('Accessories'),
    children: [
      { id: 'accessories-cables', name: 'Cables', level: 2, parentId: 'accessories', children: [] },
      { id: 'accessories-stands', name: 'Stands', level: 2, parentId: 'accessories', children: [] },
      { id: 'accessories-cases', name: 'Cases & Bags', level: 2, parentId: 'accessories', children: [] },
    ]
  },
];

export const fetchCategoryData = async (): Promise<ProductGroup[]> => {
  // Return the simple static tree - no complexity!
  return Promise.resolve(staticCategoryTree);
};
