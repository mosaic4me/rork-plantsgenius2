import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

const supabaseUrl = 'https://jimecvkbijithiphzncv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppbWVjdmtiaWppdGhpcGh6bmN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0OTI2MzksImV4cCI6MjA3NTA2ODYzOX0._RvetTXWX1UD1pHIVbWDFGcfAHolU1GWV3xqS4u6_Iw';

const redirectUrl = Platform.select({
  web: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : 'http://localhost:8081/auth/callback',
  default: 'exp://192.168.1.100:8081/--/auth/callback',
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
});

export { redirectUrl };

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_type: 'basic' | 'premium';
          status: 'active' | 'cancelled' | 'expired';
          start_date: string;
          end_date: string;
          payment_reference: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_type: 'basic' | 'premium';
          status?: 'active' | 'cancelled' | 'expired';
          start_date: string;
          end_date: string;
          payment_reference?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_type?: 'basic' | 'premium';
          status?: 'active' | 'cancelled' | 'expired';
          start_date?: string;
          end_date?: string;
          payment_reference?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      daily_scans: {
        Row: {
          id: string;
          user_id: string;
          scan_date: string;
          scan_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          scan_date: string;
          scan_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          scan_date?: string;
          scan_count?: number;
          created_at?: string;
        };
      };
    };
  };
}
