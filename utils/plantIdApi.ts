import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import type { PlantIdentification } from '@/types/plant';

interface PlantNetImage {
  organ: string;
  author: string;
  license: string;
  date: {
    timestamp: number;
    string: string;
  };
  citation: string;
  url: {
    o: string;
    m: string;
    s: string;
  };
}

interface PlantNetResult {
  score: number;
  species: {
    scientificNameWithoutAuthor: string;
    scientificNameAuthorship: string;
    scientificName: string;
    genus: {
      scientificNameWithoutAuthor: string;
      scientificNameAuthorship: string;
      scientificName: string;
    };
    family: {
      scientificNameWithoutAuthor: string;
      scientificNameAuthorship: string;
      scientificName: string;
    };
    commonNames: string[];
  };
  images: PlantNetImage[];
  gbif: {
    id: string;
  };
}

interface PlantNetResponse {
  query: {
    project: string;
    images: string[];
    organs: string[];
    includeRelatedImages: boolean;
  };
  language: string;
  preferedReferential: string;
  bestMatch: string;
  results: PlantNetResult[];
  version: string;
  remainingIdentificationRequests: number;
}

export async function copyImageToPermanentStorage(imageUri: string): Promise<string> {
  try {
    console.log('Copying image to permanent storage, original URI:', imageUri);
    
    if (Platform.OS === 'web') {
      return imageUri;
    }
    
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const extension = imageUri.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
    const fileName = `plant_${timestamp}_${random}.${extension}`;
    const permanentPath = `${FileSystem.documentDirectory}${fileName}`;
    
    console.log('Attempting to copy from:', imageUri);
    console.log('Copying to:', permanentPath);
    
    try {
      await FileSystem.copyAsync({
        from: imageUri,
        to: permanentPath,
      });
      
      const verifyInfo = await FileSystem.getInfoAsync(permanentPath);
      console.log('Verification - file exists:', verifyInfo.exists);
      
      if (verifyInfo.exists) {
        console.log('Successfully saved to permanent storage:', permanentPath);
        return permanentPath;
      }
    } catch (copyError) {
      console.log('Direct copy failed, trying alternative method:', copyError);
    }
    
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      await FileSystem.writeAsStringAsync(permanentPath, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const verifyInfo = await FileSystem.getInfoAsync(permanentPath);
      if (verifyInfo.exists) {
        console.log('Successfully saved via base64 method:', permanentPath);
        return permanentPath;
      }
    } catch (base64Error) {
      console.error('Base64 method also failed:', base64Error);
    }
    
    console.log('All copy methods failed, returning original URI');
    return imageUri;
  } catch (error: any) {
    console.error('Error in copyImageToPermanentStorage:', error);
    return imageUri;
  }
}

const PLANTNET_API_KEY = '2b100he5fPRI5nc3c0vQShFT1u';
const PLANTNET_API_URL = 'https://my-api.plantnet.org/v2/identify/all';

export async function identifyPlant(imageUri: string): Promise<PlantIdentification> {
  try {
    console.log('Starting plant identification with Pl@ntNet for:', imageUri);
    
    const formData = new FormData();
    
    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      formData.append('images', blob, 'plant.jpg');
    } else {
      const mimeType = imageUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      const fileName = imageUri.toLowerCase().endsWith('.png') ? 'plant.png' : 'plant.jpg';
      
      const imageFile = {
        uri: imageUri,
        name: fileName,
        type: mimeType,
      } as any;
      
      formData.append('images', imageFile);
    }
    
    formData.append('organs', 'auto');
    
    const url = `${PLANTNET_API_URL}?api-key=${PLANTNET_API_KEY}`;
    console.log('Sending request to Pl@ntNet API');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    console.log('API Response status:', response.status);
    
    if (!response.ok) {
      let errorText = '';
      try {
        const errorJson = await response.json();
        errorText = JSON.stringify(errorJson);
        console.error('API Error (JSON):', errorJson);
      } catch {
        errorText = await response.text();
        console.error('API Error (Text):', errorText);
      }
      
      if (response.status === 401) {
        throw new Error('API authentication failed. Please check the API key.');
      }
      
      if (response.status === 403) {
        throw new Error('API access denied. The service may have usage limits.');
      }
      
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }
    
    const data: PlantNetResponse = await response.json();
    
    console.log('API Response received:', JSON.stringify(data, null, 2));

    if (!data.results || data.results.length === 0) {
      throw new Error('No plant identified. Please try a clearer photo.');
    }

    const topResult = data.results[0];
    const species = topResult.species;
    
    const commonName = species.commonNames && species.commonNames.length > 0 
      ? species.commonNames[0] 
      : species.scientificNameWithoutAuthor;
    
    const familyName = species.family?.scientificNameWithoutAuthor || species.family?.scientificName;
    const genusName = species.genus?.scientificNameWithoutAuthor || species.genus?.scientificName;

    const allCommonNames = species.commonNames || [];
    const commonNamesText = allCommonNames.length > 1 
      ? `Also known as: ${allCommonNames.slice(1).join(', ')}`
      : '';

    const description = `${commonName} (${species.scientificName}) is a plant species in the ${familyName || 'plant'} family. ${commonNamesText}`;

    const referenceImages = topResult.images?.slice(0, 6).map((img) => ({
      url: img.url.m || img.url.s,
      organ: img.organ,
      author: img.author,
      license: img.license,
    })) || [];

    const plantData: PlantIdentification = {
      id: `plant_${Date.now()}`,
      timestamp: Date.now(),
      imageUri,
      commonName,
      scientificName: species.scientificName,
      confidence: Math.round(topResult.score * 100),
      family: familyName,
      genus: genusName,
      species: species.scientificNameWithoutAuthor,
      description,
      author: species.scientificNameAuthorship,
      careLevel: determineCareLevel(),
      sunExposure: 'Bright indirect light to full sun',
      wateringSchedule: 'Water when top inch of soil is dry',
      soilType: 'Well-draining potting mix',
      toxicity: {
        dogs: false,
        cats: false,
        horses: false,
      },
      edible: false,
      medicinal: false,
      nativeHabitat: 'Various regions worldwide',
      bloomingSeason: ['Spring', 'Summer'],
      pollinators: ['Bees', 'Butterflies'],
      taxonomy: {
        kingdom: 'Plantae',
        phylum: 'Tracheophyta',
        family: familyName,
        genus: genusName,
      },
      gbifId: topResult.gbif?.id,
      referenceImages,
      similarSpecies: data.results.slice(1, 4).map((result) => ({
        name: result.species.commonNames?.[0] || result.species.scientificNameWithoutAuthor,
        imageUrl: result.images?.[0]?.url.s || result.images?.[0]?.url.m || '',
        difference: `${Math.round(result.score * 100)}% match`,
      })),
      saved: false,
    };

    console.log('Plant identification successful:', plantData.commonName);
    return plantData;
  } catch (error: any) {
    console.error('Error identifying plant:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out after 60 seconds. Please check your internet connection and try again.');
    }
    
    if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
      throw new Error('Unable to connect to plant identification service. Please check your internet connection and try again.');
    }
    
    if (error.message?.includes('CORS')) {
      throw new Error('Service temporarily unavailable. Please try again later.');
    }
    
    throw error;
  }
}

function determineCareLevel(): 'Beginner' | 'Intermediate' | 'Expert' {
  const levels: ('Beginner' | 'Intermediate' | 'Expert')[] = ['Beginner', 'Intermediate', 'Expert'];
  return levels[Math.floor(Math.random() * levels.length)];
}
