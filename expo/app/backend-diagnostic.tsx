import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { checkBackendHealth, type HealthCheckResult } from '@/utils/backendHealthCheck';
import { testBackendConnection } from '@/utils/testBackendConnection';

interface DiagnosticTest {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'warning';
  message?: string;
  details?: string;
}

export default function BackendDiagnosticScreen() {
  const insets = useSafeAreaInsets();
  const [isRunning, setIsRunning] = useState(false);
  const [tests, setTests] = useState<DiagnosticTest[]>([
    { name: 'Environment Variables', status: 'pending' },
    { name: 'Backend Health Check', status: 'pending' },
    { name: 'tRPC Endpoint', status: 'pending' },
    { name: 'Network Connectivity', status: 'pending' },
  ]);

  const updateTest = (name: string, updates: Partial<DiagnosticTest>) => {
    setTests(prev => prev.map(test => 
      test.name === name ? { ...test, ...updates } : test
    ));
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    
    console.log('\n[Diagnostic] Starting comprehensive backend test...');
    await testBackendConnection();
    console.log('[Diagnostic] Comprehensive test complete\n');

    updateTest('Environment Variables', { status: 'running' });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
    if (apiUrl && apiUrl.trim() !== '') {
      updateTest('Environment Variables', {
        status: 'success',
        message: `Configured: ${apiUrl}`,
        details: `Platform: ${Platform.OS}`,
      });
    } else {
      updateTest('Environment Variables', {
        status: 'error',
        message: 'EXPO_PUBLIC_API_BASE_URL not set',
        details: 'Check your .env file',
      });
    }

    updateTest('Backend Health Check', { status: 'running' });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const healthResult: HealthCheckResult = await checkBackendHealth();
    
    if (healthResult.isAvailable) {
      updateTest('Backend Health Check', {
        status: 'success',
        message: healthResult.message,
        details: healthResult.details 
          ? `Response time: ${healthResult.details.responseTime}ms`
          : undefined,
      });
    } else {
      updateTest('Backend Health Check', {
        status: 'error',
        message: healthResult.message,
        details: healthResult.details?.error,
      });
    }

    updateTest('tRPC Endpoint', { status: 'running' });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const trpcUrl = apiUrl ? `${apiUrl}/api/trpc` : 'Not configured';
    
    try {
      const response = await fetch(trpcUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok || response.status === 404) {
        updateTest('tRPC Endpoint', {
          status: response.ok ? 'success' : 'warning',
          message: `Status: ${response.status}`,
          details: response.ok 
            ? 'tRPC endpoint responding' 
            : 'Endpoint exists but returned 404 (expected for GET)',
        });
      } else {
        updateTest('tRPC Endpoint', {
          status: 'error',
          message: `HTTP ${response.status}`,
          details: 'Unexpected response from tRPC endpoint',
        });
      }
    } catch (error: any) {
      updateTest('tRPC Endpoint', {
        status: 'error',
        message: 'Failed to reach tRPC',
        details: error.message,
      });
    }

    updateTest('Network Connectivity', { status: 'running' });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const testResponse = await fetch('https://www.google.com', {
        method: 'HEAD',
      });
      
      if (testResponse.ok) {
        updateTest('Network Connectivity', {
          status: 'success',
          message: 'Internet connection active',
          details: 'Successfully reached external server',
        });
      } else {
        updateTest('Network Connectivity', {
          status: 'warning',
          message: 'Limited connectivity',
          details: 'External server returned unexpected response',
        });
      }
    } catch (error: any) {
      updateTest('Network Connectivity', {
        status: 'error',
        message: 'No internet connection',
        details: error.message,
      });
    }

    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: DiagnosticTest['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={24} color={Colors.success} />;
      case 'error':
        return <XCircle size={24} color={Colors.error} />;
      case 'warning':
        return <AlertCircle size={24} color="#FFA500" />;
      case 'running':
        return <ActivityIndicator size="small" color={Colors.primary} />;
      default:
        return <View style={styles.pendingDot} />;
    }
  };

  const getStatusColor = (status: DiagnosticTest['status']) => {
    switch (status) {
      case 'success':
        return Colors.success;
      case 'error':
        return Colors.error;
      case 'warning':
        return '#FFA500';
      case 'running':
        return Colors.primary;
      default:
        return Colors.gray.medium;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen 
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Backend Diagnostics</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Connection Status</Text>
          <Text style={styles.infoText}>
            This screen runs diagnostics to help identify backend connection issues.
          </Text>
        </View>

        {tests.map((test, index) => (
          <View key={index} style={styles.testCard}>
            <View style={styles.testHeader}>
              <View style={styles.testIcon}>
                {getStatusIcon(test.status)}
              </View>
              <View style={styles.testInfo}>
                <Text style={styles.testName}>{test.name}</Text>
                {test.message && (
                  <Text style={[styles.testMessage, { color: getStatusColor(test.status) }]}>
                    {test.message}
                  </Text>
                )}
              </View>
            </View>
            {test.details && (
              <View style={styles.testDetails}>
                <Text style={styles.testDetailsText}>{test.details}</Text>
              </View>
            )}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.retryButton, isRunning && styles.buttonDisabled]}
          onPress={runDiagnostics}
          disabled={isRunning}
          activeOpacity={0.8}
        >
          {isRunning ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.retryButtonText}>Run Diagnostics Again</Text>
          )}
        </TouchableOpacity>

        <View style={styles.recommendationsCard}>
          <Text style={styles.recommendationsTitle}>Common Solutions</Text>
          <Text style={styles.recommendationItem}>
            • Verify backend is deployed at the configured URL
          </Text>
          <Text style={styles.recommendationItem}>
            • Check EXPO_PUBLIC_API_BASE_URL in .env file
          </Text>
          <Text style={styles.recommendationItem}>
            • Ensure internet connection is stable
          </Text>
          <Text style={styles.recommendationItem}>
            • Verify CORS is configured on backend
          </Text>
          <Text style={styles.recommendationItem}>
            • Use Guest Mode if backend is unavailable
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray.light,
    backgroundColor: Colors.white,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.black,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.gray.light,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.gray.dark,
    lineHeight: 20,
  },
  testCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.gray.light,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  testIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  pendingDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.gray.light,
  },
  testInfo: {
    flex: 1,
  },
  testName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.black,
    marginBottom: 4,
  },
  testMessage: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  testDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.gray.light,
    marginLeft: 36,
  },
  testDetailsText: {
    fontSize: 13,
    color: Colors.gray.dark,
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  recommendationsCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE5B4',
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 12,
  },
  recommendationItem: {
    fontSize: 14,
    color: Colors.gray.dark,
    lineHeight: 22,
    marginBottom: 4,
  },
});
