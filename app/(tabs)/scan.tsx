import { CameraView, CameraType, useCameraPermissions, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Camera, Image as ImageIcon, Zap, ZapOff, RefreshCw } from 'lucide-react-native';
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';
import { copyImageToPermanentStorage } from '@/utils/plantIdApi';
import InterstitialAd from '@/components/InterstitialAd';

export default function ScanScreen() {
  const insets = useSafeAreaInsets();
  const { canScan, dailyScansRemaining, hasActiveSubscription } = useAuth();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { paddingTop: insets.top }]}>
        <View style={styles.permissionContent}>
          <Camera size={64} color={Colors.primary} strokeWidth={1.5} />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            PlantGenius needs camera access to identify plants
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleCapture = async () => {
    if (isCapturing || !cameraRef.current) return;

    if (!canScan()) {
      if (hasActiveSubscription()) {
        Toast.show({
          type: 'info',
          text1: 'Daily Scan Limit Reached',
          text2: 'You have used all scans for today. Limit will reset at midnight.',
          position: 'top',
          visibilityTime: 4000,
        });
        return;
      }

      Toast.show({
        type: 'info',
        text1: 'Free Scans Exhausted',
        text2: 'Tap "Earn a Free Scan" in your Profile to watch an ad and continue',
        position: 'top',
        visibilityTime: 5000,
      });
      
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      setTimeout(() => {
        router.push('/profile' as any);
      }, 1500);
      return;
    }

    try {
      setIsCapturing(true);
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      console.log('Taking picture...');
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo && photo.uri) {
        console.log('Photo captured:', photo.uri);
        
        const permanentUri = await copyImageToPermanentStorage(photo.uri);
        console.log('Image saved to permanent storage:', permanentUri);
        
        if (Platform.OS === 'ios') {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        router.push({
          pathname: '/analyzing' as any,
          params: { imageUri: permanentUri },
        });
      }
    } catch (error: any) {
      console.error('Error taking picture:', error);
      Toast.show({
        type: 'error',
        text1: 'Camera Error',
        text2: error.message || 'Failed to capture photo. Please try again.',
        position: 'top',
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleAdClose = () => {
    setShowAd(false);
    if (pendingImageUri) {
      if (Platform.OS === 'ios') {
        setTimeout(() => {
          router.push({
            pathname: '/analyzing' as any,
            params: { imageUri: pendingImageUri },
          });
          setPendingImageUri(null);
        }, 100);
      } else {
        router.push({
          pathname: '/analyzing' as any,
          params: { imageUri: pendingImageUri },
        });
        setPendingImageUri(null);
      }
    }
  };

  const handleGalleryPick = async () => {
    if (!canScan()) {
      if (hasActiveSubscription()) {
        Toast.show({
          type: 'info',
          text1: 'Daily Scan Limit Reached',
          text2: 'You have used all scans for today. Limit will reset at midnight.',
          position: 'top',
          visibilityTime: 4000,
        });
        return;
      }

      Toast.show({
        type: 'info',
        text1: 'Free Scans Exhausted',
        text2: 'Tap "Earn a Free Scan" in your Profile to watch an ad and continue',
        position: 'top',
        visibilityTime: 5000,
      });
      
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      setTimeout(() => {
        router.push('/profile' as any);
      }, 1500);
      return;
    }

    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      console.log('Opening image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('Image selected:', result.assets[0].uri);
        
        const permanentUri = await copyImageToPermanentStorage(result.assets[0].uri);
        console.log('Image saved to permanent storage:', permanentUri);
        
        if (Platform.OS === 'ios') {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        router.push({
          pathname: '/analyzing' as any,
          params: { imageUri: permanentUri },
        });
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Toast.show({
        type: 'error',
        text1: 'Gallery Error',
        text2: error.message || 'Failed to select image. Please try again.',
        position: 'top',
      });
    }
  };

  const toggleFlash = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setFlash((current) => (current === 'off' ? 'on' : 'off'));
  };

  const toggleCameraFacing = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing} flash={flash}>
        <View style={[styles.overlay, { paddingTop: insets.top }]}>
          <View style={styles.topControls}>
            <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
              {flash === 'on' ? (
                <Zap size={24} color={Colors.white} fill={Colors.white} />
              ) : (
                <ZapOff size={24} color={Colors.white} />
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing}>
              <RefreshCw size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.guidanceContainer}>
            <Animated.View
              style={[
                styles.focusBox,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
            <Text style={styles.guidanceText}>Position plant within frame</Text>
            {!hasActiveSubscription() && (
              <View style={styles.scansRemainingBadge}>
                <Text style={styles.scansRemainingText}>
                  {dailyScansRemaining} free scans left today
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 40 }]}>
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={handleGalleryPick}
            disabled={isCapturing}
          >
            <ImageIcon size={28} color={Colors.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleCapture}
            disabled={isCapturing}
          >
            <View style={styles.captureButtonInner}>
              {isCapturing ? (
                <ActivityIndicator size="large" color={Colors.primary} />
              ) : (
                <Camera size={32} color={Colors.primary} />
              )}
            </View>
          </TouchableOpacity>

          <View style={styles.placeholder} />
        </View>
      </CameraView>

      <InterstitialAd 
        visible={showAd} 
        onClose={handleAdClose}
        duration={60}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  permissionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.black,
    marginTop: 24,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    color: Colors.gray.dark,
    textAlign: 'center',
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guidanceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusBox: {
    width: 280,
    height: 360,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: Colors.accent,
    opacity: 0.8,
  },
  guidanceText: {
    marginTop: 24,
    fontSize: 16,
    color: Colors.white,
    fontWeight: '600' as const,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.accent,
  },
  captureButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 56,
    height: 56,
  },
  scansRemainingBadge: {
    marginTop: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scansRemainingText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
