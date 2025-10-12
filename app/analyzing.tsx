import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import NeuralNetworkAnimation from '@/components/NeuralNetworkAnimation';
import Colors from '@/constants/colors';
import { identifyPlant } from '@/utils/plantIdApi';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';

export default function AnalyzingScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ imageUri: string }>();
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { incrementDailyScan } = useAuth();
  const { addToHistory } = useApp();

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

        const plantData = await identifyPlant(params.imageUri);
        
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
        const errorMessage = err.message || 'Failed to identify plant';
        setError(errorMessage);
        
        Toast.show({
          type: 'error',
          text1: 'Identification Failed',
          text2: errorMessage,
          position: 'top',
          visibilityTime: 4000,
        });
        
        setTimeout(() => {
          router.back();
        }, 2000);
      }
    };

    analyzeImage();

    return () => {
      cancelled = true;
    };
  }, [params.imageUri, incrementDailyScan, addToHistory]);

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
