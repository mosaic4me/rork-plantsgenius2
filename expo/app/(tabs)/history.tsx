import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Search, Filter, Camera, Trash2 } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';

type FilterType = 'All' | 'Saved' | 'This Week' | 'Toxic' | 'Edible';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { history, removeFromHistory } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');

  const filteredHistory = useMemo(() => {
    let filtered = [...history];

    if (searchQuery) {
      filtered = filtered.filter(
        (item) =>
          item.commonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.scientificName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    switch (activeFilter) {
      case 'Saved':
        filtered = filtered.filter((item) => item.saved);
        break;
      case 'This Week':
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        filtered = filtered.filter((item) => item.timestamp > weekAgo);
        break;
      case 'Toxic':
        filtered = filtered.filter(
          (item) => item.toxicity && (item.toxicity.dogs || item.toxicity.cats || item.toxicity.horses)
        );
        break;
      case 'Edible':
        filtered = filtered.filter((item) => item.edible);
        break;
    }

    return filtered;
  }, [history, searchQuery, activeFilter]);

  const handleDelete = (id: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    removeFromHistory(id);
  };

  const handlePlantPress = (imageUri: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: '/results' as any,
      params: { imageUri },
    });
  };

  const handleScanPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/');
  };

  const filters: FilterType[] = ['All', 'Saved', 'This Week', 'Toxic', 'Edible'];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>{filteredHistory.length} plants scanned</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.gray.medium} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search plants..."
            placeholderTextColor={Colors.gray.medium}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === item && styles.filterChipActive]}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setActiveFilter(item);
              }}
            >
              <Text style={[styles.filterChipText, activeFilter === item && styles.filterChipTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {filteredHistory.length === 0 ? (
        <View style={styles.emptyState}>
          <Camera size={64} color={Colors.gray.medium} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>No plants yet</Text>
          <Text style={styles.emptyText}>
            {searchQuery || activeFilter !== 'All'
              ? 'No plants match your search'
              : 'Start scanning plants to build your collection'}
          </Text>
          {!searchQuery && activeFilter === 'All' && (
            <TouchableOpacity style={styles.scanButton} onPress={handleScanPress}>
              <Camera size={20} color={Colors.white} />
              <Text style={styles.scanButtonText}>Scan a Plant</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 80 }]}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.plantCard}
              onPress={() => handlePlantPress(item.imageUri)}
              activeOpacity={0.7}
            >
              <Image source={{ uri: item.imageUri }} style={styles.plantImage} />
              <View style={styles.plantInfo}>
                <Text style={styles.plantName} numberOfLines={1}>
                  {item.commonName}
                </Text>
                <Text style={styles.plantDate}>
                  {new Date(item.timestamp).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item.id)}
              >
                <Trash2 size={16} color={Colors.white} />
              </TouchableOpacity>
              {item.saved && (
                <View style={styles.savedBadge}>
                  <Text style={styles.savedBadgeText}>★</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.gray.dark,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.black,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.gray.dark,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  grid: {
    paddingHorizontal: 16,
  },
  plantCard: {
    flex: 1,
    margin: 8,
    borderRadius: 16,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  plantImage: {
    width: '100%',
    height: 160,
  },
  plantInfo: {
    padding: 12,
  },
  plantName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.black,
    marginBottom: 4,
  },
  plantDate: {
    fontSize: 12,
    color: Colors.gray.medium,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedBadgeText: {
    fontSize: 16,
    color: Colors.white,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.black,
    marginTop: 24,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.gray.dark,
    textAlign: 'center',
    marginBottom: 24,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
