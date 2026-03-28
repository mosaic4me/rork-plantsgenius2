import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

const ADS_ENABLED = process.env.EXPO_PUBLIC_ADMOB_ENABLED === 'true' || process.env.EXPO_PUBLIC_ENABLE_ADS === 'true';

interface InterstitialAdProps {
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function InterstitialAd({ visible, onClose, duration = 15 }: InterstitialAdProps) {
  const { hasActiveSubscription } = useAuth();
  const [countdown, setCountdown] = useState(duration);

  useEffect(() => {
    if (visible && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [visible, countdown]);

  useEffect(() => {
    if (visible) {
      setCountdown(duration);
    }
  }, [visible, duration]);

  if (!ADS_ENABLED || hasActiveSubscription() || !visible) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.adBadge}>
              <Text style={styles.adBadgeText}>Advertisement</Text>
            </View>
            {countdown === 0 && (
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={24} color={Colors.white} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.content}>
            <View style={styles.adPlaceholder}>
              <Text style={styles.adTitle}>Unlock Premium Features</Text>
              <Text style={styles.adDescription}>
                Get unlimited plant scans, AR visualization, health diagnosis, and remove all ads. Start your 7-day free trial today!
              </Text>
            </View>

            {countdown > 0 ? (
              <View style={styles.countdownContainer}>
                <Text style={styles.countdownText}>
                  You can close this ad in {countdown} seconds
                </Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.continueButton} onPress={onClose}>
                <Text style={styles.continueButtonText}>Continue</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: Colors.black,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  adBadge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  adBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 24,
  },
  adPlaceholder: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    minHeight: 200,
    justifyContent: 'center',
  },
  adTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  adDescription: {
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
    opacity: 0.9,
  },
  countdownContainer: {
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.7,
  },
  continueButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
});
