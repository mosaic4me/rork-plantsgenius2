import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

const ADS_ENABLED = process.env.EXPO_PUBLIC_ADMOB_ENABLED === 'true' || process.env.EXPO_PUBLIC_ENABLE_ADS === 'true';

const ADS = [
  {
    id: '1',
    title: 'Upgrade to Premium',
    description: 'Unlimited scans & ad-free experience',
    url: 'plantgenius://profile',
  },
  {
    id: '2',
    title: 'Discover More Plants',
    description: 'Explore our plant database',
    url: 'plantgenius://garden',
  },
  {
    id: '3',
    title: 'Plant Care Tips',
    description: 'Learn how to keep your plants healthy',
    url: 'plantgenius://history',
  },
];

export default function AdBanner() {
  const { hasActiveSubscription } = useAuth();
  const [currentAd, setCurrentAd] = useState(ADS[0]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAd((prev) => {
        const currentIndex = ADS.findIndex((ad) => ad.id === prev.id);
        const nextIndex = (currentIndex + 1) % ADS.length;
        return ADS[nextIndex];
      });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  if (!ADS_ENABLED || hasActiveSubscription() || !visible) {
    return null;
  }

  const handleAdClick = () => {
    if (currentAd.url.startsWith('plantgenius://')) {
      console.log('Internal navigation:', currentAd.url);
    } else {
      Linking.openURL(currentAd.url);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.adContent} onPress={handleAdClick} activeOpacity={0.8}>
        <View style={styles.adBadge}>
          <Text style={styles.adBadgeText}>Ad</Text>
        </View>
        <View style={styles.adText}>
          <Text style={styles.adTitle}>{currentAd.title}</Text>
          <Text style={styles.adDescription}>{currentAd.description}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.closeButton} onPress={() => setVisible(false)}>
        <X size={16} color={Colors.gray.dark} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.gray.light,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray.medium,
  },
  adContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adBadge: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  adBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  adText: {
    flex: 1,
  },
  adTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.black,
    marginBottom: 2,
  },
  adDescription: {
    fontSize: 12,
    color: Colors.gray.dark,
  },
  closeButton: {
    padding: 4,
  },
});
