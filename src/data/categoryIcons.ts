// Category icon mapping - maps maingrp names to icon filenames in /nav_images
export const categoryIconMap: Record<string, string> = {
  'Accessories & Supplies': 'accessories-01.png',
  'Accessories: Electronic': 'accessories-02.png',
  'Accessories': 'accessories-01.png',
  'Amplification & Mics': 'amp-01.png',
  'Bags & Cases': 'case-01.png',
  'Brass Instruments': 'trumpet-01.png',
  'Cables': 'calbles-01.png', // Note: filename has typo in it
  'Drum Hardware & Accessories': 'drum-hardware.png',
  'Drums & Percussion': 'drum-01.png',
  'Folk String Instruments': 'banjo-01.png',
  'Guitar Accessories & Parts': 'pickup-01.png',
  'Guitars': 'guitar-01.png',
  'Instrument Maintenance': 'cleaner-01.png',
  'Keyboards Pianos & Accordions': 'keyboard-01.png',
  'Latin & Hand Percussion': 'maracas.png',
  'Live Sound & Lighting': 'amp-01.png',
  'Metronomes': 'metronome-01.png',
  'Microphone Accessories': 'mic-accessories.png',
  'Mouthpieces & Reeds': 'mouthpiece-01.png',
  'Multimedia Books & CDs': 'book-01.png',
  'Orchestral Strings': 'violin-01.png',
  'Percussion': 'drum-01.png',
  'Recording Equipment': 'mic-accessories.png',
  'Stands': 'stand-01.png',
  'Straps': 'strap-01.png',
  'String Instrument Parts & Supplies': 'bridge-01.png',
  'String Instruments': 'violin-01.png',
  'Strings Replacement': 'strings-01.png',
  'Tuners': 'tuner-01.png',
  'Woodwind Instruments': 'sax-01.png',
  'Woodwinds': 'sax-01.png'
};

// Helper function to get icon path for a category
export const getCategoryIcon = (categoryName: string): string | undefined => {
  const iconFilename = categoryIconMap[categoryName];
  if (!iconFilename) {
    return undefined;
  }
  return `/nav_images/${iconFilename}`;
};
