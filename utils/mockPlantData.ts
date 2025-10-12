import type { PlantIdentification } from '@/types/plant';

export function generateMockPlantData(imageUri: string): PlantIdentification {
  const plants = [
    {
      commonName: 'Monstera Deliciosa',
      scientificName: 'Monstera deliciosa',
      family: 'Araceae',
      genus: 'Monstera',
      species: 'M. deliciosa',
      description: 'A species of flowering plant native to tropical forests of southern Mexico. Known for its large, glossy, heart-shaped leaves with natural holes.',
      careLevel: 'Beginner' as const,
      sunExposure: 'Bright indirect light',
      wateringSchedule: 'Water when top 2 inches of soil are dry (every 1-2 weeks)',
      soilType: 'Well-draining potting mix with peat moss',
      toxicity: { dogs: true, cats: true, horses: true },
      edible: false,
      medicinal: false,
      nativeHabitat: 'Tropical rainforests of Central America',
      bloomingSeason: ['Spring', 'Summer'],
      pollinators: ['Bees', 'Beetles'],
      confidence: 95,
    },
    {
      commonName: 'Snake Plant',
      scientificName: 'Dracaena trifasciata',
      family: 'Asparagaceae',
      genus: 'Dracaena',
      species: 'D. trifasciata',
      description: 'A resilient succulent that can grow anywhere between 6 inches to several feet. Known for its sword-like leaves and air-purifying qualities.',
      careLevel: 'Beginner' as const,
      sunExposure: 'Low to bright indirect light',
      wateringSchedule: 'Water every 2-6 weeks, allow soil to dry completely',
      soilType: 'Well-draining cactus or succulent mix',
      toxicity: { dogs: true, cats: true, horses: true },
      edible: false,
      medicinal: false,
      nativeHabitat: 'West Africa from Nigeria to Congo',
      bloomingSeason: ['Spring'],
      pollinators: ['Moths'],
      confidence: 92,
    },
    {
      commonName: 'Pothos',
      scientificName: 'Epipremnum aureum',
      family: 'Araceae',
      genus: 'Epipremnum',
      species: 'E. aureum',
      description: 'A popular trailing houseplant with heart-shaped leaves. Extremely easy to care for and propagate, making it perfect for beginners.',
      careLevel: 'Beginner' as const,
      sunExposure: 'Low to bright indirect light',
      wateringSchedule: 'Water when soil is dry (every 1-2 weeks)',
      soilType: 'General purpose potting soil',
      toxicity: { dogs: true, cats: true, horses: true },
      edible: false,
      medicinal: false,
      nativeHabitat: 'French Polynesia',
      bloomingSeason: ['Rarely blooms indoors'],
      pollinators: ['Bees'],
      confidence: 88,
    },
  ];

  const randomPlant = plants[Math.floor(Math.random() * plants.length)];

  return {
    id: Date.now().toString(),
    timestamp: Date.now(),
    imageUri,
    ...randomPlant,
    similarSpecies: [
      {
        name: 'Philodendron',
        imageUrl: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=400',
        difference: 'Philodendron leaves are more heart-shaped without natural holes',
      },
      {
        name: 'Split-leaf Philodendron',
        imageUrl: 'https://images.unsplash.com/photo-1614594895304-fe7116ac3b58?w=400',
        difference: 'Similar leaf splits but different growth pattern',
      },
    ],
    saved: false,
  };
}
