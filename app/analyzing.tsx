import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import NeuralNetworkAnimation from '@/components/NeuralNetworkAnimation';
import Colors from '@/constants/colors';
import { identifyPlant } from '@/utils/plantIdApi';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { trpc } from '@/lib/trpc';
import * as FileSystem from 'expo-file-system';

export default function AnalyzingScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ imageUri: string }>();
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { incrementDailyScan } = useAuth();
  const { addToHistory } = useApp();
  const identifyMutation = trpc.plant.identify.useMutation();

  useEffect(() => {
    let cancelled = false;

    const analyzeImage = async () => {
      try {
        if (!params.imageUri) {
          throw new Error('No image provided');
        }

        const progressInterval = setInterval(() => {
          setProgress((prev) => Math.min(prev + 5, 90));
        }, 200);

        let plantData;
        
        try {
          console.log('[Analyzing] Attempting direct PlantNet API identification');
          plantData = await identifyPlant(params.imageUri);
          console.log('[Analyzing] ✅ Direct API identification successful');
        } catch (directApiError: any) {
          console.log('[Analyzing] ⚠️ Direct API error:', directApiError.message);
          
          if (directApiError.message?.includes('RATE_LIMIT_EXCEEDED') || directApiError.message?.includes('429')) {
            throw new Error('Daily scan limit reached. The plant identification service has reached its daily limit. Please try again tomorrow.');
          }
          
          if (directApiError.message?.includes('not available') || directApiError.message?.includes('not configured') || directApiError.message?.includes('missing or invalid')) {
            throw new Error('Plant identification service is not properly configured. Please contact support or check your API key configuration.');
          }
          
          console.log('[Analyzing] Attempting backend identification as fallback');
          
          try {
            let imageBase64: string;
            let mimeType: string;
            
            if (Platform.OS === 'web') {
              const response = await fetch(params.imageUri);
              const blob = await response.blob();
              const reader = new FileReader();
              const base64Promise = new Promise<string>((resolve) => {
                reader.onloadend = () => resolve(reader.result as string);
              });
              reader.readAsDataURL(blob);
              const dataUrl = await base64Promise;
              imageBase64 = dataUrl.split(',')[1];
              mimeType = blob.type;
            } else {
              imageBase64 = await FileSystem.readAsStringAsync(params.imageUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              mimeType = params.imageUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
            }
            
            const backendResult = await identifyMutation.mutateAsync({
              imageBase64,
              mimeType,
            });
            
            console.log('[Analyzing] ✅ Backend identification successful');
            
            const topResult = backendResult.results[0];
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

            const referenceImages = topResult.images?.slice(0, 6).map((img: any) => ({
              url: img.url.m || img.url.s,
              organ: img.organ,
              author: img.author,
              license: img.license,
            })) || [];

            plantData = {
              id: `plant_${Date.now()}`,
              timestamp: Date.now(),
              imageUri: params.imageUri,
              commonName,
              scientificName: species.scientificName,
              confidence: Math.round(topResult.score * 100),
              family: familyName,
              genus: genusName,
              species: species.scientificNameWithoutAuthor,
              description,
              author: species.scientificNameAuthorship,
              careLevel: 'Beginner' as const,
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
              similarSpecies: backendResult.results.slice(1, 4).map((result: any) => ({
                name: result.species.commonNames?.[0] || result.species.scientificNameWithoutAuthor,
                imageUrl: result.images?.[0]?.url.s || result.images?.[0]?.url.m || '',
                difference: `${Math.round(result.score * 100)}% match`,
              })),
              saved: false,
            };
          } catch (backendError: any) {
            console.error('[Analyzing] ❌ Backend fallback also failed:', backendError.message);
            console.error('[Analyzing] ❌ Direct API failed:', directApiError.message);
            
            if (backendError.message?.includes('RATE_LIMIT_EXCEEDED') || backendError.message?.includes('429')) {
              throw new Error('Daily scan limit reached. The plant identification service has reached its daily limit. Please try again tomorrow.');
            }
            
            if (backendError.message?.includes('BACKEND_NOT_AVAILABLE') || backendError.message?.includes('404')) {
              throw new Error('Plant identification service not configured. Please contact support.');
            }
            
            throw new Error('Unable to identify plant. Both direct API and backend are currently unavailable. Please check your configuration or try again later.');
          }
        }
        
        clearInterval(progressInterval);
        setProgress(100);

        if (!cancelled) {
          await addToHistory(plantData);
          await incrementDailyScan();
          
          Toast.show({
            type: 'success',
            text1: 'Plant Identified!',
            text2: plantData.commonName,
            position: 'top',
            visibilityTime: 2000,
          });
          
          setTimeout(() => {
            router.replace({
              pathname: '/results' as any,
              params: { 
                imageUri: params.imageUri,
                plantData: JSON.stringify(plantData),
              },
            });
          }, 500);
        }
      } catch (err: any) {
        console.error('Error analyzing plant:', err);
        let errorMessage = err.message || 'Failed to identify plant';
        let errorTitle = 'Identification Failed';
        let visibilityTime = 5000;
        
        if (errorMessage.includes('RATE_LIMIT_EXCEEDED') || errorMessage.includes('Daily scan limit') || errorMessage.includes('429')) {
          errorTitle = 'Daily Limit Reached';
          errorMessage = 'The plant identification service has reached its daily limit. Please try again tomorrow or upgrade to premium.';
          visibilityTime = 6000;
        }
        
        setError(errorMessage);
        
        Toast.show({
          type: 'error',
          text1: errorTitle,
          text2: errorMessage,
          position: 'top',
          visibilityTime,
        });
        
        setTimeout(() => {
          router.back();
        }, 3000);
      }
    };

    analyzeImage();

    return () => {
      cancelled = true;
    };
  }, [params.imageUri]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <NeuralNetworkAnimation />
      
      <View style={styles.content}>
        {params.imageUri && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: params.imageUri }} style={styles.image} />
          </View>
        )}
        
        <Text style={styles.title}>{error ? 'Analysis Failed' : 'Analyzing Your Plant'}</Text>
        <Text style={styles.subtitle}>
          {error || 'Using AI to identify species...'}
        </Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>

        <View style={styles.stepsContainer}>
          <StepIndicator 
            label="Analyzing image" 
            completed={progress > 30} 
            active={progress <= 30}
          />
          <StepIndicator 
            label="Matching database" 
            completed={progress > 60} 
            active={progress > 30 && progress <= 60}
          />
          <StepIndicator 
            label="Generating results" 
            completed={progress > 90} 
            active={progress > 60 && progress <= 90}
          />
        </View>
      </View>
    </View>
  );
}

function StepIndicator({ label, completed, active }: { label: string; completed: boolean; active: boolean }) {
  return (
    <View style={styles.stepItem}>
      <View style={[
        styles.stepDot,
        completed && styles.stepDotCompleted,
        active && styles.stepDotActive,
      ]}>
        {completed ? (
          <Text style={styles.checkmark}>✓</Text>
        ) : active ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : null}
      </View>
      <Text style={[
        styles.stepLabel,
        (completed || active) && styles.stepLabelActive,
      ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 1,
  },
  imageContainer: {
    width: 200,
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 32,
    borderWidth: 3,
    borderColor: Colors.accent,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.gray.dark,
    marginBottom: 32,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.gray.light,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  stepsContainer: {
    width: '100%',
    gap: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: Colors.accent,
  },
  stepDotCompleted: {
    backgroundColor: Colors.primary,
  },
  checkmark: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  stepLabel: {
    fontSize: 16,
    color: Colors.gray.medium,
  },
  stepLabelActive: {
    color: Colors.black,
    fontWeight: '600' as const,
  },
});
