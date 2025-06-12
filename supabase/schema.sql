-- Schema SQL pour LotoAnalyzer Pro
-- Version 1.0 - Optimisé pour la production

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extension pour les types de données avancés
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ====================
-- TABLES PRINCIPALES
-- ====================

-- Table des catégories de tirages
CREATE TABLE draw_categories (
  id TEXT PRIMARY KEY,
  day_index INTEGER NOT NULL CHECK (day_index >= 0 AND day_index <= 6),
  day_name TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  label TEXT NOT NULL,
  full_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table des résultats de tirages
CREATE TABLE draw_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id TEXT NOT NULL REFERENCES draw_categories(id) ON DELETE CASCADE,
  draw_name TEXT NOT NULL,
  date DATE NOT NULL,
  gagnants INTEGER[] NOT NULL CHECK (array_length(gagnants, 1) = 5),
  machine INTEGER[] CHECK (machine IS NULL OR array_length(machine, 1) = 5),
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Contraintes de validation
  CONSTRAINT valid_gagnants CHECK (
    array_length(gagnants, 1) = 5 AND
    (SELECT bool_and(num >= 1 AND num <= 90) FROM unnest(gagnants) AS num)
  ),
  CONSTRAINT valid_machine CHECK (
    machine IS NULL OR (
      array_length(machine, 1) = 5 AND
      (SELECT bool_and(num >= 1 AND num <= 90) FROM unnest(machine) AS num)
    )
  )
);

-- Table des prédictions
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id TEXT NOT NULL REFERENCES draw_categories(id) ON DELETE CASCADE,
  predicted_numbers INTEGER[] NOT NULL CHECK (array_length(predicted_numbers, 1) = 5),
  actual_numbers INTEGER[] CHECK (actual_numbers IS NULL OR array_length(actual_numbers, 1) = 5),
  confidence DECIMAL(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  model_type TEXT NOT NULL CHECK (model_type IN ('xgboost', 'random_forest', 'lstm', 'hybrid')),
  model_version TEXT DEFAULT '1.0',
  accuracy DECIMAL(5,2) CHECK (accuracy IS NULL OR (accuracy >= 0 AND accuracy <= 100)),
  parameters JSONB,
  training_data_count INTEGER,
  draw_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Contraintes de validation
  CONSTRAINT valid_predicted_numbers CHECK (
    array_length(predicted_numbers, 1) = 5 AND
    (SELECT bool_and(num >= 1 AND num <= 90) FROM unnest(predicted_numbers) AS num) AND
    (SELECT count(DISTINCT num) = 5 FROM unnest(predicted_numbers) AS num)
  ),
  CONSTRAINT valid_actual_numbers CHECK (
    actual_numbers IS NULL OR (
      array_length(actual_numbers, 1) = 5 AND
      (SELECT bool_and(num >= 1 AND num <= 90) FROM unnest(actual_numbers) AS num) AND
      (SELECT count(DISTINCT num) = 5 FROM unnest(actual_numbers) AS num)
    )
  )
);

-- Table des performances des modèles
CREATE TABLE model_performances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id TEXT NOT NULL REFERENCES draw_categories(id) ON DELETE CASCADE,
  model_type TEXT NOT NULL CHECK (model_type IN ('xgboost', 'random_forest', 'lstm', 'hybrid')),
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  accuracy DECIMAL(5,2) DEFAULT 0,
  precision_score DECIMAL(5,4) DEFAULT 0,
  recall_score DECIMAL(5,4) DEFAULT 0,
  f1_score DECIMAL(5,4) DEFAULT 0,
  confidence_avg DECIMAL(5,4) DEFAULT 0,
  last_training TIMESTAMP WITH TIME ZONE,
  training_data_size INTEGER,
  model_weights JSONB,
  hyperparameters JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(category_id, model_type)
);

-- Table des analyses statistiques
CREATE TABLE number_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id TEXT NOT NULL REFERENCES draw_categories(id) ON DELETE CASCADE,
  number_value INTEGER NOT NULL CHECK (number_value >= 1 AND number_value <= 90),
  frequency INTEGER DEFAULT 0,
  percentage DECIMAL(5,2) DEFAULT 0,
  last_appearance DATE,
  gap_days INTEGER DEFAULT 0,
  avg_gap DECIMAL(8,2) DEFAULT 0,
  max_gap INTEGER DEFAULT 0,
  min_gap INTEGER DEFAULT 0,
  trend_score DECIMAL(5,4) DEFAULT 0,
  co_occurrences JSONB, -- {number: count, number: count, ...}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(category_id, number_value)
);

-- Table des sessions utilisateur (pour le tracking)
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  country TEXT,
  city TEXT,
  predictions_count INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table des logs d'activité
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT REFERENCES user_sessions(session_id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- 'prediction', 'training', 'view', 'export'
  category_id TEXT REFERENCES draw_categories(id) ON DELETE SET NULL,
  model_type TEXT,
  metadata JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================
-- INDICES POUR PERFORMANCE
-- ====================

-- Index pour les résultats de tirages
CREATE INDEX idx_draw_results_category_date ON draw_results(category_id, date DESC);
CREATE INDEX idx_draw_results_date ON draw_results(date DESC);
CREATE INDEX idx_draw_results_gagnants ON draw_results USING GIN(gagnants);
CREATE INDEX idx_draw_results_machine ON draw_results USING GIN(machine);

-- Index pour les prédictions
CREATE INDEX idx_predictions_category_date ON predictions(category_id, draw_date DESC);
CREATE INDEX idx_predictions_model_accuracy ON predictions(model_type, accuracy DESC NULLS LAST);
CREATE INDEX idx_predictions_created_at ON predictions(created_at DESC);

-- Index pour les performances
CREATE INDEX idx_model_performances_category ON model_performances(category_id);
CREATE INDEX idx_model_performances_accuracy ON model_performances(accuracy DESC);

-- Index pour les statistiques
CREATE INDEX idx_number_statistics_category ON number_statistics(category_id);
CREATE INDEX idx_number_statistics_frequency ON number_statistics(frequency DESC);
CREATE INDEX idx_number_statistics_trend ON number_statistics(trend_score DESC);

-- Index pour les logs
CREATE INDEX idx_activity_logs_session ON activity_logs(session_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Index composites pour requêtes complexes
CREATE INDEX idx_draw_results_category_date_composite ON draw_results(category_id, date, array_length(gagnants, 1));
CREATE INDEX idx_predictions_model_confidence ON predictions(model_type, confidence DESC, accuracy DESC NULLS LAST);

-- ====================
-- FONCTIONS UTILITAIRES
-- ====================

-- Fonction pour calculer la précision d'une prédiction
CREATE OR REPLACE FUNCTION calculate_prediction_accuracy(
  predicted INTEGER[],
  actual INTEGER[]
) RETURNS DECIMAL(5,2) AS $$
BEGIN
  IF actual IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN (
    SELECT COUNT(*)::DECIMAL / 5 * 100
    FROM unnest(predicted) AS pred_num
    WHERE pred_num = ANY(actual)
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour les statistiques des numéros
CREATE OR REPLACE FUNCTION update_number_statistics(category_id_param TEXT) 
RETURNS VOID AS $$
DECLARE
  num INTEGER;
BEGIN
  -- Pour chaque numéro de 1 à 90
  FOR num IN 1..90 LOOP
    INSERT INTO number_statistics (
      category_id,
      number_value,
      frequency,
      percentage,
      last_appearance,
      gap_days
    )
    SELECT 
      category_id_param,
      num,
      COUNT(*) as frequency,
      (COUNT(*)::DECIMAL / (SELECT COUNT(*) FROM draw_results WHERE category_id = category_id_param) * 100) as percentage,
      MAX(date) as last_appearance,
      CASE 
        WHEN MAX(date) IS NOT NULL THEN CURRENT_DATE - MAX(date)
        ELSE 999
      END as gap_days
    FROM draw_results 
    WHERE category_id = category_id_param 
      AND num = ANY(gagnants)
    ON CONFLICT (category_id, number_value) 
    DO UPDATE SET
      frequency = EXCLUDED.frequency,
      percentage = EXCLUDED.percentage,
      last_appearance = EXCLUDED.last_appearance,
      gap_days = EXCLUDED.gap_days,
      updated_at = timezone('utc'::text, now());
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- TRIGGERS
-- ====================

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur toutes les tables avec updated_at
CREATE TRIGGER update_draw_categories_updated_at BEFORE UPDATE ON draw_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_draw_results_updated_at BEFORE UPDATE ON draw_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_predictions_updated_at BEFORE UPDATE ON predictions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_model_performances_updated_at BEFORE UPDATE ON model_performances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_number_statistics_updated_at BEFORE UPDATE ON number_statistics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour calculer automatiquement la précision lors de l'ajout des résultats réels
CREATE OR REPLACE FUNCTION auto_calculate_accuracy()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.actual_numbers IS NOT NULL AND OLD.actual_numbers IS NULL THEN
    NEW.accuracy = calculate_prediction_accuracy(NEW.predicted_numbers, NEW.actual_numbers);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_prediction_accuracy_trigger 
  BEFORE UPDATE ON predictions 
  FOR EACH ROW 
  EXECUTE FUNCTION auto_calculate_accuracy();

-- ====================
-- DONNÉES INITIALES
-- ====================

-- Insérer les catégories de tirages
INSERT INTO draw_categories (id, day_index, day_name, time_slot, label, full_name) VALUES
-- Lundi
('lundi-10h-reveil', 0, 'Lundi', '10:00', 'Réveil', 'Lundi 10:00 - Réveil'),
('lundi-13h-etoile', 0, 'Lundi', '13:00', 'Étoile', 'Lundi 13:00 - Étoile'),
('lundi-16h-akwaba', 0, 'Lundi', '16:00', 'Akwaba', 'Lundi 16:00 - Akwaba'),
('lundi-18h15-monday-special', 0, 'Lundi', '18:15', 'Monday Special', 'Lundi 18:15 - Monday Special'),

-- Mardi
('mardi-10h-la-matinale', 1, 'Mardi', '10:00', 'La Matinale', 'Mardi 10:00 - La Matinale'),
('mardi-13h-emergence', 1, 'Mardi', '13:00', 'Émergence', 'Mardi 13:00 - Émergence'),
('mardi-16h-sika', 1, 'Mardi', '16:00', 'Sika', 'Mardi 16:00 - Sika'),
('mardi-18h15-lucky-tuesday', 1, 'Mardi', '18:15', 'Lucky Tuesday', 'Mardi 18:15 - Lucky Tuesday'),

-- Mercredi
('mercredi-10h-premiere-heure', 2, 'Mercredi', '10:00', 'Première Heure', 'Mercredi 10:00 - Première Heure'),
('mercredi-13h-fortune', 2, 'Mercredi', '13:00', 'Fortune', 'Mercredi 13:00 - Fortune'),
('mercredi-16h-baraka', 2, 'Mercredi', '16:00', 'Baraka', 'Mercredi 16:00 - Baraka'),
('mercredi-18h15-midweek', 2, 'Mercredi', '18:15', 'Midweek', 'Mercredi 18:15 - Midweek'),

-- Jeudi
('jeudi-10h-kado', 3, 'Jeudi', '10:00', 'Kado', 'Jeudi 10:00 - Kado'),
('jeudi-13h-privilege', 3, 'Jeudi', '13:00', 'Privilège', 'Jeudi 13:00 - Privilège'),
('jeudi-16h-monni', 3, 'Jeudi', '16:00', 'Monni', 'Jeudi 16:00 - Monni'),
('jeudi-18h15-fortune-thursday', 3, 'Jeudi', '18:15', 'Fortune Thursday', 'Jeudi 18:15 - Fortune Thursday'),

-- Vendredi
('vendredi-10h-cash', 4, 'Vendredi', '10:00', 'Cash', 'Vendredi 10:00 - Cash'),
('vendredi-13h-solution', 4, 'Vendredi', '13:00', 'Solution', 'Vendredi 13:00 - Solution'),
('vendredi-16h-wari', 4, 'Vendredi', '16:00', 'Wari', 'Vendredi 16:00 - Wari'),
('vendredi-18h15-friday-bonanza', 4, 'Vendredi', '18:15', 'Friday Bonanza', 'Vendredi 18:15 - Friday Bonanza'),

-- Samedi
('samedi-10h-soutra', 5, 'Samedi', '10:00', 'Soutra', 'Samedi 10:00 - Soutra'),
('samedi-13h-diamant', 5, 'Samedi', '13:00', 'Diamant', 'Samedi 13:00 - Diamant'),
('samedi-16h-moaye', 5, 'Samedi', '16:00', 'Moaye', 'Samedi 16:00 - Moaye'),
('samedi-18h15-national', 5, 'Samedi', '18:15', 'National', 'Samedi 18:15 - National'),

-- Dimanche
('dimanche-10h-benediction', 6, 'Dimanche', '10:00', 'Bénédiction', 'Dimanche 10:00 - Bénédiction'),
('dimanche-13h-prestige', 6, 'Dimanche', '13:00', 'Prestige', 'Dimanche 13:00 - Prestige'),
('dimanche-16h-awale', 6, 'Dimanche', '16:00', 'Awalé', 'Dimanche 16:00 - Awalé'),
('dimanche-18h15-espoir', 6, 'Dimanche', '18:15', 'Espoir', 'Dimanche 18:15 - Espoir');

-- ====================
-- VUES POUR REQUÊTES OPTIMISÉES
-- ====================

-- Vue pour les statistiques globales
CREATE VIEW v_global_stats AS
SELECT 
  category_id,
  COUNT(*) as total_draws,
  MIN(date) as first_draw,
  MAX(date) as last_draw,
  AVG(array_length(gagnants, 1)) as avg_numbers_per_draw
FROM draw_results
GROUP BY category_id;

-- Vue pour les performances des modèles
CREATE VIEW v_model_rankings AS
SELECT 
  category_id,
  model_type,
  accuracy,
  total_predictions,
  confidence_avg,
  RANK() OVER (PARTITION BY category_id ORDER BY accuracy DESC) as rank
FROM model_performances
WHERE total_predictions > 0;

-- Vue pour les numéros tendance
CREATE VIEW v_trending_numbers AS
SELECT 
  ns.category_id,
  ns.number_value,
  ns.frequency,
  ns.percentage,
  ns.gap_days,
  ns.trend_score,
  CASE 
    WHEN ns.gap_days <= 7 THEN 'recent'
    WHEN ns.gap_days <= 30 THEN 'normal'
    ELSE 'cold'
  END as temperature
FROM number_statistics ns
ORDER BY ns.trend_score DESC;

-- ====================
-- POLITIQUES RLS (Row Level Security)
-- ====================

-- Activer RLS sur les tables sensibles
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Politique pour les sessions utilisateur (seul propriétaire peut voir ses données)
CREATE POLICY user_sessions_policy ON user_sessions
  FOR ALL USING (session_id = current_setting('app.session_id', true));

-- Politique pour les logs d'activité  
CREATE POLICY activity_logs_policy ON activity_logs
  FOR ALL USING (session_id = current_setting('app.session_id', true));

-- ====================
-- FONCTIONS D'API
-- ====================

-- Fonction pour obtenir les prédictions récentes
CREATE OR REPLACE FUNCTION get_recent_predictions(
  category_id_param TEXT DEFAULT NULL,
  limit_param INTEGER DEFAULT 10
) RETURNS TABLE (
  id UUID,
  category_id TEXT,
  predicted_numbers INTEGER[],
  actual_numbers INTEGER[],
  confidence DECIMAL,
  model_type TEXT,
  accuracy DECIMAL,
  draw_date DATE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.category_id,
    p.predicted_numbers,
    p.actual_numbers,
    p.confidence,
    p.model_type,
    p.accuracy,
    p.draw_date,
    p.created_at
  FROM predictions p
  WHERE (category_id_param IS NULL OR p.category_id = category_id_param)
  ORDER BY p.created_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour les statistiques de fréquence
CREATE OR REPLACE FUNCTION get_frequency_stats(
  category_id_param TEXT
) RETURNS TABLE (
  number_value INTEGER,
  frequency INTEGER,
  percentage DECIMAL,
  gap_days INTEGER,
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ns.number_value,
    ns.frequency,
    ns.percentage,
    ns.gap_days,
    ROW_NUMBER() OVER (ORDER BY ns.frequency DESC)::INTEGER as rank
  FROM number_statistics ns
  WHERE ns.category_id = category_id_param
  ORDER BY ns.frequency DESC;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- COMMENTAIRES DE DOCUMENTATION
-- ====================

COMMENT ON TABLE draw_categories IS 'Catégories de tirages avec horaires spécifiques';
COMMENT ON TABLE draw_results IS 'Résultats historiques des tirages de loterie';
COMMENT ON TABLE predictions IS 'Prédictions générées par les modèles IA';
COMMENT ON TABLE model_performances IS 'Métriques de performance des modèles par catégorie';
COMMENT ON TABLE number_statistics IS 'Statistiques détaillées par numéro et catégorie';
COMMENT ON TABLE user_sessions IS 'Sessions utilisateur pour le tracking d\'usage';
COMMENT ON TABLE activity_logs IS 'Logs détaillés des actions utilisateur';

COMMENT ON FUNCTION calculate_prediction_accuracy IS 'Calcule la précision d\'une prédiction en comparant les numéros prédits vs réels';
COMMENT ON FUNCTION update_number_statistics IS 'Met à jour toutes les statistiques pour une catégorie donnée';
COMMENT ON FUNCTION get_recent_predictions IS 'Récupère les prédictions récentes avec filtrage optionnel';
COMMENT ON FUNCTION get_frequency_stats IS 'Obtient les statistiques de fréquence triées pour une catégorie';