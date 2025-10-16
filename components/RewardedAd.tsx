import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Gift, X } from 'lucide-react-native';
import Colors from '@/constants/colors';

const ADS_ENABLED = process.env.EXPO_PUBLIC_ADMOB_ENABLED === 'true' || process.env.EXPO_PUBLIC_ENABLE_ADS === 'true';

interface RewardedAdProps {
  visible: boolean;
  onClose: () => void;
  onReward: () => void;
  duration?: number;
}

export default function RewardedAd({ visible, onClose, onReward, duration = 60 }: RewardedAdProps) {
  const [countdown, setCountdown] = useState(duration);
  const [isWatching, setIsWatching] = useState(false);

  useEffect(() => {
    if (visible && isWatching && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && isWatching) {
      onReward();
      onClose();
    }
  }, [visible, countdown, isWatching, onReward, onClose]);

  useEffect(() => {
    if (visible) {
      setCountdown(duration);
      setIsWatching(false);
    }
  }, [visible, duration]);

  const handleStartWatching = () => {
    setIsWatching(true);
  };

  const handleEarlyExit = () => {
    setIsWatching(false);
    setCountdown(duration);
    onClose();
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.adBadge}>
              <Gift size={14} color={Colors.white} />
              <Text style={styles.adBadgeText}>Rewarded Ad</Text>
            </View>
            {!isWatching && (
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={24} color={Colors.white} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.content}>
            {!isWatching ? (
              <>
                <View style={styles.rewardInfoContainer}>
                  <View style={styles.rewardIcon}>
                    <Gift size={48} color={Colors.primary} />
                  </View>
                  <Text style={styles.rewardTitle}>Earn a Free Scan!</Text>
                  <Text style={styles.rewardDescription}>
                    Watch a {duration}-second ad to earn 1 additional free scan today.
                  </Text>
                  <Text style={styles.rewardNote}>
                    Note: You must watch the entire ad to receive your reward.
                  </Text>
                </View>

                <TouchableOpacity style={styles.watchButton} onPress={handleStartWatching}>
                  <Text style={styles.watchButtonText}>Watch Ad</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.adPlaceholder}>
                  <ActivityIndicator size="large" color={Colors.white} />
                  <Text style={styles.adTitle}>Premium Plants App</Text>
                  <Text style={styles.adDescription}>
                    Discover the world of plants with our AI-powered identification technology.
                    Get instant care guides, expert tips, and connect with plant lovers worldwide!
                  </Text>
                </View>

                <View style={styles.countdownContainer}>
                  <Text style={styles.countdownText}>
                    {countdown > 0 
                      ? `Watch for ${countdown} more ${countdown === 1 ? 'second' : 'seconds'} to earn your reward`
                      : 'Processing reward...'
                    }
                  </Text>
                  {countdown > 0 && (
                    <TouchableOpacity style={styles.exitButton} onPress={handleEarlyExit}>
                      <Text style={styles.exitButtonText}>Exit (No Reward)</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
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
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accent,
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
  rewardInfoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  rewardIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(124, 179, 66, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  rewardTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  rewardDescription: {
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
    opacity: 0.9,
    marginBottom: 16,
    lineHeight: 24,
  },
  rewardNote: {
    fontSize: 13,
    color: Colors.white,
    textAlign: 'center',
    opacity: 0.6,
    fontStyle: 'italic',
  },
  watchButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  watchButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  adPlaceholder: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    minHeight: 250,
    justifyContent: 'center',
    gap: 16,
  },
  adTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.white,
    textAlign: 'center',
  },
  adDescription: {
    fontSize: 15,
    color: Colors.white,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 22,
  },
  countdownContainer: {
    alignItems: 'center',
    gap: 16,
  },
  countdownText: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.8,
    textAlign: 'center',
  },
  exitButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  exitButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.white,
    opacity: 0.7,
  },
});
