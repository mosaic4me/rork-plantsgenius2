import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { ArrowLeft, Mail, MessageSquare, Send } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';

export default function ContactScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const sendEmailMutation = trpc.contact.sendEmail.useMutation();

  const handleSend = async () => {
    if (!subject || !message) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill in all fields',
        position: 'top',
      });
      return;
    }

    try {
      await sendEmailMutation.mutateAsync({
        subject,
        message,
        senderEmail: profile?.email,
      });

      setSubject('');
      setMessage('');

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Your message has been sent successfully!',
        position: 'top',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to send message',
        position: 'top',
      });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Us</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <View style={styles.content}>
          <View style={styles.infoCard}>
            <Mail size={24} color={Colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Email Us</Text>
              <Text style={styles.infoEmail}>info@programmerscourt.com</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Send us a message</Text>

            <View style={styles.inputContainer}>
              <MessageSquare size={20} color={Colors.gray.dark} />
              <TextInput
                style={styles.input}
                placeholder="Subject"
                value={subject}
                onChangeText={setSubject}
                placeholderTextColor={Colors.gray.medium}
              />
            </View>

            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Your message..."
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                placeholderTextColor={Colors.gray.medium}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, sendEmailMutation.isPending && styles.buttonDisabled]}
              onPress={handleSend}
              disabled={sendEmailMutation.isPending}
            >
              <Send size={20} color={Colors.white} />
              <Text style={styles.buttonText}>
                {sendEmailMutation.isPending ? 'Sending...' : 'Send Message'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>Need Help?</Text>
            <Text style={styles.helpText}>
              We typically respond within 24 hours. For urgent matters, please email us directly at programmerscourt@gmail.com
            </Text>
          </View>

          <View style={styles.copyrightSection}>
            <Text style={styles.copyrightText}>© 2025 Programmers&apos; Court LTD</Text>
            <Text style={styles.copyrightSubtext}>All rights reserved</Text>
          </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray.light,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.black,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    padding: 20,
    borderRadius: 16,
    marginBottom: 32,
    gap: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
    marginBottom: 4,
  },
  infoEmail: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.black,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.gray.light,
    gap: 12,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.black,
  },
  textArea: {
    minHeight: 120,
    paddingVertical: 0,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  helpSection: {
    backgroundColor: Colors.gray.light,
    padding: 20,
    borderRadius: 12,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.black,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: Colors.gray.dark,
    lineHeight: 20,
  },
  copyrightSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.gray.light,
    marginTop: 24,
  },
  copyrightText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.black,
    marginBottom: 4,
  },
  copyrightSubtext: {
    fontSize: 12,
    color: Colors.gray.dark,
  },
});
