export interface PopularPlant {
  id: string;
  name: string;
  scientificName: string;
  imageUrl: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export const POPULAR_PLANTS: PopularPlant[] = [
  {
    id: '1',
    name: 'Monstera Deliciosa',
    scientificName: 'Monstera deliciosa',
    imageUrl: 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=400',
    description: 'Popular houseplant with large, split leaves',
    difficulty: 'Easy',
  },
  {
    id: '2',
    name: 'Snake Plant',
    scientificName: 'Sansevieria trifasciata',
    imageUrl: 'https://images.unsplash.com/photo-1593482892290-f54927ae1bb6?w=400',
    description: 'Hardy plant that thrives on neglect',
    difficulty: 'Easy',
  },
  {
    id: '3',
    name: 'Pothos',
    scientificName: 'Epipremnum aureum',
    imageUrl: 'https://images.unsplash.com/photo-1632207691143-643e2a9a9361?w=400',
    description: 'Trailing vine perfect for beginners',
    difficulty: 'Easy',
  },
  {
    id: '4',
    name: 'Peace Lily',
    scientificName: 'Spathiphyllum',
    imageUrl: 'https://images.unsplash.com/photo-1593691509543-c55fb32d8de5?w=400',
    description: 'Elegant white flowers and air-purifying',
    difficulty: 'Easy',
  },
  {
    id: '5',
    name: 'Fiddle Leaf Fig',
    scientificName: 'Ficus lyrata',
    imageUrl: 'https://images.unsplash.com/photo-1598880940371-c756e015faf1?w=400',
    description: 'Statement plant with large violin-shaped leaves',
    difficulty: 'Medium',
  },
  {
    id: '6',
    name: 'Spider Plant',
    scientificName: 'Chlorophytum comosum',
    imageUrl: 'https://images.unsplash.com/photo-1572688484438-313a6e50c333?w=400',
    description: 'Easy-care plant that produces baby plantlets',
    difficulty: 'Easy',
  },
  {
    id: '7',
    name: 'Rubber Plant',
    scientificName: 'Ficus elastica',
    imageUrl: 'https://images.unsplash.com/photo-1626497764746-6dc36546b388?w=400',
    description: 'Bold, glossy leaves and easy maintenance',
    difficulty: 'Easy',
  },
  {
    id: '8',
    name: 'ZZ Plant',
    scientificName: 'Zamioculcas zamiifolia',
    imageUrl: 'https://images.unsplash.com/photo-1632207691143-643e2a9a9361?w=400',
    description: 'Nearly indestructible with glossy leaves',
    difficulty: 'Easy',
  },
];
