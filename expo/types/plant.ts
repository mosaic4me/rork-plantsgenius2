export interface PlantIdentification {
  id: string;
  timestamp: number;
  imageUri: string;
  commonName: string;
  scientificName: string;
  confidence: number;
  family?: string;
  genus?: string;
  species?: string;
  description?: string;
  careLevel?: 'Beginner' | 'Intermediate' | 'Expert';
  sunExposure?: string;
  wateringSchedule?: string;
  soilType?: string;
  toxicity?: {
    dogs: boolean;
    cats: boolean;
    horses: boolean;
  };
  edible?: boolean;
  medicinal?: boolean;
  nativeHabitat?: string;
  bloomingSeason?: string[];
  pollinators?: string[];
  similarSpecies?: {
    name: string;
    imageUrl: string;
    difference: string;
  }[];
  saved?: boolean;
  author?: string;
  taxonomy?: {
    kingdom?: string;
    phylum?: string;
    class?: string;
    order?: string;
    family?: string;
    genus?: string;
  };
  synonyms?: string[];
  wikiUrl?: string;
  gbifId?: string;
  referenceImages?: {
    url: string;
    organ: string;
    author: string;
    license: string;
  }[];
}

export interface WateringRecord {
  timestamp: number;
  plantId: string;
  plantName: string;
}

export interface GardenPlant extends PlantIdentification {
  addedToGarden: number;
  lastWatered?: number;
  nextWateringDue?: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
  notes?: string;
  wateringHistory?: WateringRecord[];
}

export interface PlantIdApiResponse {
  access_token: string;
  model_version: string;
  custom_id: string | null;
  input: {
    images: string[];
    datetime: string;
    latitude: number | null;
    longitude: number | null;
  };
  result: {
    is_plant: {
      probability: number;
      binary: boolean;
      threshold: number;
    };
    classification: {
      suggestions: {
        id: string;
        name: string;
        probability: number;
        similar_images: {
          id: string;
          url: string;
          similarity: number;
          url_small: string;
        }[];
        details: {
          common_names: string[];
          taxonomy: {
            class: string;
            genus: string;
            order: string;
            family: string;
            phylum: string;
            kingdom: string;
          };
          url: string;
          description: {
            value: string;
            citation: string;
            license_name: string;
            license_url: string;
          };
          synonyms: string[];
          image: {
            value: string;
            citation: string;
            license_name: string;
            license_url: string;
          };
          edible_parts: string[] | null;
          watering: {
            max: number;
            min: number;
          };
        };
      }[];
    };
  };
  status: string;
  sla_compliant_client: boolean;
  sla_compliant_system: boolean;
  created: number;
  completed: number;
}
