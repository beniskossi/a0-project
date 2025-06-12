// Types générés automatiquement pour Supabase
// Version: 1.0.0

export interface Database {
  public: {
    Tables: {
      draw_categories: {
        Row: {
          id: string;
          day_index: number;
          day_name: string;
          time_slot: string;
          label: string;
          full_name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          day_index: number;
          day_name: string;
          time_slot: string;
          label: string;
          full_name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          day_index?: number;
          day_name?: string;
          time_slot?: string;
          label?: string;
          full_name?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      draw_results: {
        Row: {
          id: string;
          category_id: string;
          draw_name: string;
          date: string;
          gagnants: number[];
          machine: number[] | null;
          scraped_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          draw_name: string;
          date: string;
          gagnants: number[];
          machine?: number[] | null;
          scraped_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          draw_name?: string;
          date?: string;
          gagnants?: number[];
          machine?: number[] | null;
          scraped_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      predictions: {
        Row: {
          id: string;
          category_id: string;
          predicted_numbers: number[];
          actual_numbers: number[] | null;
          confidence: number;
          model_type: 'xgboost' | 'random_forest' | 'lstm' | 'hybrid';
          model_version: string | null;
          accuracy: number | null;
          parameters: Record<string, any> | null;
          training_data_count: number | null;
          draw_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          predicted_numbers: number[];
          actual_numbers?: number[] | null;
          confidence: number;
          model_type: 'xgboost' | 'random_forest' | 'lstm' | 'hybrid';
          model_version?: string | null;
          accuracy?: number | null;
          parameters?: Record<string, any> | null;
          training_data_count?: number | null;
          draw_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          predicted_numbers?: number[];
          actual_numbers?: number[] | null;
          confidence?: number;
          model_type?: 'xgboost' | 'random_forest' | 'lstm' | 'hybrid';
          model_version?: string | null;
          accuracy?: number | null;
          parameters?: Record<string, any> | null;
          training_data_count?: number | null;
          draw_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      model_performances: {
        Row: {
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
          last_training: string | null;
          training_data_size: number | null;
          model_weights: Record<string, any> | null;
          hyperparameters: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          model_type: 'xgboost' | 'random_forest' | 'lstm' | 'hybrid';
          total_predictions?: number;
          correct_predictions?: number;
          accuracy?: number;
          precision_score?: number;
          recall_score?: number;
          f1_score?: number;
          confidence_avg?: number;
          last_training?: string | null;
          training_data_size?: number | null;
          model_weights?: Record<string, any> | null;
          hyperparameters?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          model_type?: 'xgboost' | 'random_forest' | 'lstm' | 'hybrid';
          total_predictions?: number;
          correct_predictions?: number;
          accuracy?: number;
          precision_score?: number;
          recall_score?: number;
          f1_score?: number;
          confidence_avg?: number;
          last_training?: string | null;
          training_data_size?: number | null;
          model_weights?: Record<string, any> | null;
          hyperparameters?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      number_statistics: {
        Row: {
          id: string;
          category_id: string;
          number_value: number;
          frequency: number;
          percentage: number;
          last_appearance: string | null;
          gap_days: number;
          avg_gap: number;
          max_gap: number;
          min_gap: number;
          trend_score: number;
          co_occurrences: Record<string, number> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          category_id: string;
          number_value: number;
          frequency?: number;
          percentage?: number;
          last_appearance?: string | null;
          gap_days?: number;
          avg_gap?: number;
          max_gap?: number;
          min_gap?: number;
          trend_score?: number;
          co_occurrences?: Record<string, number> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          category_id?: string;
          number_value?: number;
          frequency?: number;
          percentage?: number;
          last_appearance?: string | null;
          gap_days?: number;
          avg_gap?: number;
          max_gap?: number;
          min_gap?: number;
          trend_score?: number;
          co_occurrences?: Record<string, number> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_sessions: {
        Row: {
          id: string;
          session_id: string;
          ip_address: string | null;
          user_agent: string | null;
          country: string | null;
          city: string | null;
          predictions_count: number;
          last_activity: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          ip_address?: string | null;
          user_agent?: string | null;
          country?: string | null;
          city?: string | null;
          predictions_count?: number;
          last_activity?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          country?: string | null;
          city?: string | null;
          predictions_count?: number;
          last_activity?: string;
          created_at?: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          session_id: string | null;
          action_type: 'prediction' | 'training' | 'view' | 'export';
          category_id: string | null;
          model_type: string | null;
          metadata: Record<string, any> | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id?: string | null;
          action_type: 'prediction' | 'training' | 'view' | 'export';
          category_id?: string | null;
          model_type?: string | null;
          metadata?: Record<string, any> | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string | null;
          action_type?: 'prediction' | 'training' | 'view' | 'export';
          category_id?: string | null;
          model_type?: string | null;
          metadata?: Record<string, any> | null;
          ip_address?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      v_global_stats: {
        Row: {
          category_id: string;
          total_draws: number;
          first_draw: string;
          last_draw: string;
          avg_numbers_per_draw: number;
        };
      };
      v_model_rankings: {
        Row: {
          category_id: string;
          model_type: string;
          accuracy: number;
          total_predictions: number;
          confidence_avg: number;
          rank: number;
        };
      };
      v_trending_numbers: {
        Row: {
          category_id: string;
          number_value: number;
          frequency: number;
          percentage: number;
          gap_days: number;
          trend_score: number;
          temperature: 'recent' | 'normal' | 'cold';
        };
      };
    };
    Functions: {
      calculate_prediction_accuracy: {
        Args: {
          predicted: number[];
          actual: number[];
        };
        Returns: number;
      };
      update_number_statistics: {
        Args: {
          category_id_param: string;
        };
        Returns: void;
      };
      get_recent_predictions: {
        Args: {
          category_id_param?: string;
          limit_param?: number;
        };
        Returns: {
          id: string;
          category_id: string;
          predicted_numbers: number[];
          actual_numbers: number[] | null;
          confidence: number;
          model_type: string;
          accuracy: number | null;
          draw_date: string;
          created_at: string;
        }[];
      };
      get_frequency_stats: {
        Args: {
          category_id_param: string;
        };
        Returns: {
          number_value: number;
          frequency: number;
          percentage: number;
          gap_days: number;
          rank: number;
        }[];
      };
      set_config: {
        Args: {
          parameter: string;
          value: string;
        };
        Returns: void;
      };
    };
    Enums: {
      model_type: 'xgboost' | 'random_forest' | 'lstm' | 'hybrid';
      action_type: 'prediction' | 'training' | 'view' | 'export';
      temperature: 'recent' | 'normal' | 'cold';
    };
  };
}

// Types utilitaires pour l'application
export type DrawCategoryRow = Database['public']['Tables']['draw_categories']['Row'];
export type DrawResultRow = Database['public']['Tables']['draw_results']['Row'];
export type PredictionRow = Database['public']['Tables']['predictions']['Row'];
export type ModelPerformanceRow = Database['public']['Tables']['model_performances']['Row'];
export type NumberStatisticRow = Database['public']['Tables']['number_statistics']['Row'];
export type UserSessionRow = Database['public']['Tables']['user_sessions']['Row'];
export type ActivityLogRow = Database['public']['Tables']['activity_logs']['Row'];

export type DrawCategoryInsert = Database['public']['Tables']['draw_categories']['Insert'];
export type DrawResultInsert = Database['public']['Tables']['draw_results']['Insert'];
export type PredictionInsert = Database['public']['Tables']['predictions']['Insert'];
export type ModelPerformanceInsert = Database['public']['Tables']['model_performances']['Insert'];
export type NumberStatisticInsert = Database['public']['Tables']['number_statistics']['Insert'];
export type UserSessionInsert = Database['public']['Tables']['user_sessions']['Insert'];
export type ActivityLogInsert = Database['public']['Tables']['activity_logs']['Insert'];

export type DrawCategoryUpdate = Database['public']['Tables']['draw_categories']['Update'];
export type DrawResultUpdate = Database['public']['Tables']['draw_results']['Update'];
export type PredictionUpdate = Database['public']['Tables']['predictions']['Update'];
export type ModelPerformanceUpdate = Database['public']['Tables']['model_performances']['Update'];
export type NumberStatisticUpdate = Database['public']['Tables']['number_statistics']['Update'];
export type UserSessionUpdate = Database['public']['Tables']['user_sessions']['Update'];
export type ActivityLogUpdate = Database['public']['Tables']['activity_logs']['Update'];

// Types pour les vues
export type GlobalStatsView = Database['public']['Views']['v_global_stats']['Row'];
export type ModelRankingsView = Database['public']['Views']['v_model_rankings']['Row'];
export type TrendingNumbersView = Database['public']['Views']['v_trending_numbers']['Row'];

// Types pour les fonctions
export type RecentPredictionFunction = Database['public']['Functions']['get_recent_predictions']['Returns'][0];
export type FrequencyStatsFunction = Database['public']['Functions']['get_frequency_stats']['Returns'][0];

// Enums
export type ModelType = Database['public']['Enums']['model_type'];
export type ActionType = Database['public']['Enums']['action_type'];
export type TemperatureType = Database['public']['Enums']['temperature'];