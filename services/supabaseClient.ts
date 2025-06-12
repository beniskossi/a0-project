import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// Configuration Supabase
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Client Supabase configuré pour PWA
export const supabase: SupabaseClient<Database> = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // PWA compatible
    storage: {
      getItem: (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch {
          // Ignore storage errors
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignore storage errors
        }
      },
    },
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'loto-analyzer-pro@1.0.0',
    },
  },
});

// Types pour l'interface avec Supabase
export interface DrawCategoryDB {
  id: string;
  day_index: number;
  day_name: string;
  time_slot: string;
  label: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DrawResultDB {
  id: string;
  category_id: string;
  draw_name: string;
  date: string;
  gagnants: number[];
  machine?: number[];
  scraped_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PredictionDB {
  id: string;
  category_id: string;
  predicted_numbers: number[];
  actual_numbers?: number[];
  confidence: number;
  model_type: 'xgboost' | 'random_forest' | 'lstm' | 'hybrid';
  model_version?: string;
  accuracy?: number;
  parameters?: Record<string, any>;
  training_data_count?: number;
  draw_date: string;
  created_at: string;
  updated_at: string;
}

export interface ModelPerformanceDB {
  id: string;
  category_id: string;
  model_type: 'xgboost' | 'random_forest' | 'lstm' | 'hybrid';
  total_predictions: number;
  correct_predictions: number;
  accuracy: number;
  precision_score: number;
  recall_score: number;
  f1_score: number;
  confidence_avg: number;
  last_training?: string;
  training_data_size?: number;
  model_weights?: Record<string, any>;
  hyperparameters?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface NumberStatisticDB {
  id: string;
  category_id: string;
  number_value: number;
  frequency: number;
  percentage: number;
  last_appearance?: string;
  gap_days: number;
  avg_gap: number;
  max_gap: number;
  min_gap: number;
  trend_score: number;
  co_occurrences?: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface UserSessionDB {
  id: string;
  session_id: string;
  ip_address?: string;
  user_agent?: string;
  country?: string;
  city?: string;
  predictions_count: number;
  last_activity: string;
  created_at: string;
}

export interface ActivityLogDB {
  id: string;
  session_id?: string;
  action_type: 'prediction' | 'training' | 'view' | 'export';
  category_id?: string;
  model_type?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

// Service de gestion des sessions
export class SessionService {
  private static sessionId: string | null = null;

  static async initializeSession(): Promise<string> {
    if (this.sessionId) return this.sessionId;

    // Générer un ID de session unique
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Obtenir les informations de géolocalisation et navigateur
      const userAgent = navigator.userAgent;
      const ipInfo = await this.getIPInfo();

      // Créer la session dans Supabase
      const { error } = await supabase
        .from('user_sessions')
        .insert({
          session_id: this.sessionId,
          ip_address: ipInfo.ip,
          user_agent: userAgent,
          country: ipInfo.country,
          city: ipInfo.city,
          predictions_count: 0,
          last_activity: new Date().toISOString(),
        });

      if (error) {
        console.warn('Erreur création session:', error);
      }

      // Configurer le session_id pour RLS
      await supabase.rpc('set_config', {
        parameter: 'app.session_id',
        value: this.sessionId,
      });

    } catch (error) {
      console.warn('Erreur initialisation session:', error);
    }

    return this.sessionId;
  }

  private static async getIPInfo(): Promise<{ ip?: string; country?: string; city?: string }> {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        return {
          ip: data.ip,
          country: data.country_name,
          city: data.city,
        };
      }
    } catch (error) {
      console.warn('Impossible de récupérer les infos IP:', error);
    }
    return {};
  }

  static async logActivity(
    actionType: ActivityLogDB['action_type'],
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.sessionId) {
      await this.initializeSession();
    }

    try {
      await supabase
        .from('activity_logs')
        .insert({
          session_id: this.sessionId,
          action_type: actionType,
          metadata,
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      console.warn('Erreur log activité:', error);
    }
  }

  static async updateLastActivity(): Promise<void> {
    if (!this.sessionId) return;

    try {
      await supabase
        .from('user_sessions')
        .update({
          last_activity: new Date().toISOString(),
        })
        .eq('session_id', this.sessionId);
    } catch (error) {
      console.warn('Erreur mise à jour activité:', error);
    }
  }

  static getSessionId(): string | null {
    return this.sessionId;
  }
}

// Service d'authentification et sécurité
export class AuthService {
  static async signInAnonymously(): Promise<{ success: boolean; sessionId?: string }> {
    try {
      // Pour cette app, on utilise des sessions anonymes
      const sessionId = await SessionService.initializeSession();
      
      return {
        success: true,
        sessionId,
      };
    } catch (error) {
      console.error('Erreur connexion anonyme:', error);
      return { success: false };
    }
  }

  static async checkRateLimit(action: string): Promise<boolean> {
    const sessionId = SessionService.getSessionId();
    if (!sessionId) return true;

    try {
      // Vérifier le nombre d'actions dans la dernière heure
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('session_id', sessionId)
        .eq('action_type', action)
        .gte('created_at', oneHourAgo);

      if (error) {
        console.warn('Erreur vérification rate limit:', error);
        return true; // En cas d'erreur, on autorise
      }

      // Limites par action
      const limits = {
        prediction: 50, // 50 prédictions par heure
        training: 10,   // 10 entraînements par heure
        view: 1000,     // 1000 vues par heure
        export: 20,     // 20 exports par heure
      };

      const limit = limits[action as keyof typeof limits] || 100;
      return (data?.length || 0) < limit;
    } catch (error) {
      console.warn('Erreur rate limiting:', error);
      return true;
    }
  }
}

// Utilitaires pour les requêtes
export class QueryUtils {
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = 3
  ): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === retries - 1) throw error;
        
        // Attendre avant de réessayer
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
    throw new Error('Max retries exceeded');
  }

  static buildDateFilter(startDate?: string, endDate?: string) {
    const filters: any = {};
    
    if (startDate) {
      filters.gte = startDate;
    }
    
    if (endDate) {
      filters.lte = endDate;
    }
    
    return filters;
  }

  static async batchInsert<T extends Record<string, any>>(
    table: string,
    data: T[],
    batchSize: number = 100
  ): Promise<boolean> {
    try {
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from(table)
          .insert(batch);
          
        if (error) {
          console.error(`Erreur batch insert ${table}:`, error);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Erreur batch insert ${table}:`, error);
      return false;
    }
  }
}

// Initialisation automatique de la session
SessionService.initializeSession().catch(console.warn);

// Mise à jour périodique de l'activité
setInterval(() => {
  SessionService.updateLastActivity().catch(console.warn);
}, 5 * 60 * 1000); // Toutes les 5 minutes