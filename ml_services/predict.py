#!/usr/bin/env python3
"""
ML Prediction Service for Advertising Automation
Handles real-time predictions for lead quality, campaign optimization, etc.
"""

import sys
import json
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
import logging
from typing import Dict, Any, List, Tuple
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MLPredictor:
    def __init__(self):
        self.models = {}
        self.model_metadata = {}
        self.feature_scalers = {}
        self.load_models()
    
    def load_models(self):
        """Load all trained ML models"""
        model_dir = Path(__file__).parent / 'models'
        model_dir.mkdir(exist_ok=True)
        
        model_types = [
            'lead_quality_scoring',
            'conversion_prediction',
            'budget_optimization', 
            'bid_optimization',
            'keyword_performance',
            'ad_performance'
        ]
        
        for model_type in model_types:
            try:
                model_path = model_dir / f'{model_type}_model.pkl'
                scaler_path = model_dir / f'{model_type}_scaler.pkl'
                metadata_path = model_dir / f'{model_type}_metadata.json'
                
                if model_path.exists():
                    with open(model_path, 'rb') as f:
                        self.models[model_type] = pickle.load(f)
                    
                    if scaler_path.exists():
                        with open(scaler_path, 'rb') as f:
                            self.feature_scalers[model_type] = pickle.load(f)
                    
                    if metadata_path.exists():
                        with open(metadata_path, 'r') as f:
                            self.model_metadata[model_type] = json.load(f)
                    
                    logger.info(f"Loaded model: {model_type}")
                else:
                    # Create dummy model if not exists
                    self.create_dummy_model(model_type)
                    
            except Exception as e:
                logger.error(f"Error loading model {model_type}: {e}")
                self.create_dummy_model(model_type)
    
    def create_dummy_model(self, model_type: str):
        """Create a dummy model for testing purposes"""
        from sklearn.ensemble import RandomForestRegressor
        from sklearn.preprocessing import StandardScaler
        
        # Create simple dummy model
        model = RandomForestRegressor(n_estimators=10, random_state=42)
        scaler = StandardScaler()
        
        # Train on dummy data
        X_dummy = np.random.rand(100, 10)
        y_dummy = np.random.rand(100)
        
        X_scaled = scaler.fit_transform(X_dummy)
        model.fit(X_scaled, y_dummy)
        
        self.models[model_type] = model
        self.feature_scalers[model_type] = scaler
        self.model_metadata[model_type] = {
            'version': '1.0.0',
            'accuracy': 0.75,
            'features': [f'feature_{i}' for i in range(10)],
            'created_at': datetime.now().isoformat(),
            'is_dummy': True
        }
        
        logger.info(f"Created dummy model: {model_type}")
    
    def predict_lead_quality(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Predict lead quality score (0-1)"""
        try:
            model_type = 'lead_quality_scoring'
            
            # Extract and prepare features
            feature_vector = self.prepare_lead_features(features)
            
            # Make prediction
            if model_type in self.models:
                # Scale features if scaler exists
                if model_type in self.feature_scalers:
                    feature_vector = self.feature_scalers[model_type].transform([feature_vector])
                else:
                    feature_vector = [feature_vector]
                
                prediction = self.models[model_type].predict(feature_vector)[0]
                
                # Get confidence (using prediction variance for tree-based models)
                if hasattr(self.models[model_type], 'estimators_'):
                    predictions = [tree.predict(feature_vector)[0] for tree in self.models[model_type].estimators_]
                    confidence = 1.0 - np.std(predictions)
                else:
                    confidence = 0.8  # Default confidence
                
                # Ensure prediction is between 0 and 1
                prediction = max(0.0, min(1.0, prediction))
                confidence = max(0.0, min(1.0, confidence))
                
            else:
                # Fallback scoring algorithm
                prediction = self.calculate_lead_quality_fallback(features)
                confidence = 0.6
            
            return {
                'prediction': prediction,
                'confidence': confidence,
                'features': features,
                'model_version': self.model_metadata.get(model_type, {}).get('version', '1.0.0')
            }
            
        except Exception as e:
            logger.error(f"Error predicting lead quality: {e}")
            return {
                'prediction': 0.5,  # Neutral score
                'confidence': 0.3,
                'features': features,
                'model_version': '1.0.0',
                'error': str(e)
            }
    
    def predict_conversion_probability(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Predict conversion probability"""
        try:
            model_type = 'conversion_prediction'
            feature_vector = self.prepare_conversion_features(features)
            
            if model_type in self.models:
                if model_type in self.feature_scalers:
                    feature_vector = self.feature_scalers[model_type].transform([feature_vector])
                else:
                    feature_vector = [feature_vector]
                
                prediction = self.models[model_type].predict(feature_vector)[0]
                confidence = 0.8
            else:
                prediction = self.calculate_conversion_probability_fallback(features)
                confidence = 0.6
            
            prediction = max(0.0, min(1.0, prediction))
            
            return {
                'prediction': prediction,
                'confidence': confidence,
                'features': features,
                'model_version': self.model_metadata.get(model_type, {}).get('version', '1.0.0')
            }
            
        except Exception as e:
            logger.error(f"Error predicting conversion: {e}")
            return {'prediction': 0.1, 'confidence': 0.3, 'features': features, 'error': str(e)}
    
    def optimize_budget(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Predict optimal budget allocation"""
        try:
            model_type = 'budget_optimization'
            feature_vector = self.prepare_budget_features(features)
            
            if model_type in self.models:
                if model_type in self.feature_scalers:
                    feature_vector = self.feature_scalers[model_type].transform([feature_vector])
                else:
                    feature_vector = [feature_vector]
                
                prediction = self.models[model_type].predict(feature_vector)[0]
                confidence = 0.8
            else:
                prediction = self.calculate_budget_optimization_fallback(features)
                confidence = 0.6
            
            # Ensure reasonable budget recommendation
            current_budget = features.get('current_budget', 100)
            prediction = max(current_budget * 0.5, min(current_budget * 2.0, prediction))
            
            expected_roas = self.calculate_expected_roas(features, prediction)
            
            return {
                'prediction': prediction,
                'confidence': confidence,
                'features': {**features, 'expected_roas': expected_roas},
                'model_version': self.model_metadata.get(model_type, {}).get('version', '1.0.0')
            }
            
        except Exception as e:
            logger.error(f"Error optimizing budget: {e}")
            return {'prediction': features.get('current_budget', 100), 'confidence': 0.3, 'features': features, 'error': str(e)}
    
    def predict_keyword_performance(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Predict keyword performance metrics"""
        try:
            model_type = 'keyword_performance'
            feature_vector = self.prepare_keyword_features(features)
            
            if model_type in self.models:
                if model_type in self.feature_scalers:
                    feature_vector = self.feature_scalers[model_type].transform([feature_vector])
                else:
                    feature_vector = [feature_vector]
                
                prediction = self.models[model_type].predict(feature_vector)[0]
                confidence = 0.8
            else:
                prediction = self.calculate_keyword_performance_fallback(features)
                confidence = 0.6
            
            # Calculate additional metrics
            expected_ctr = min(0.20, max(0.01, prediction * 0.05))  # 1-20% CTR range
            expected_cpc = features.get('average_cpc', 2.0) * (1 + np.random.normal(0, 0.1))
            
            return {
                'prediction': prediction,
                'confidence': confidence,
                'features': {
                    **features, 
                    'expected_ctr': expected_ctr,
                    'expected_cpc': expected_cpc
                },
                'model_version': self.model_metadata.get(model_type, {}).get('version', '1.0.0')
            }
            
        except Exception as e:
            logger.error(f"Error predicting keyword performance: {e}")
            return {'prediction': 0.5, 'confidence': 0.3, 'features': features, 'error': str(e)}
    
    def analyze_ad_performance(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze ad performance and suggest improvements"""
        try:
            model_type = 'ad_performance'
            feature_vector = self.prepare_ad_features(features)
            
            if model_type in self.models:
                if model_type in self.feature_scalers:
                    feature_vector = self.feature_scalers[model_type].transform([feature_vector])
                else:
                    feature_vector = [feature_vector]
                
                prediction = self.models[model_type].predict(feature_vector)[0]
                confidence = 0.8
            else:
                prediction = self.calculate_ad_performance_fallback(features)
                confidence = 0.6
            
            # Generate improvement suggestions
            improvements = self.generate_ad_improvements(features, prediction)
            
            return {
                'prediction': prediction,
                'confidence': confidence,
                'features': {**features, 'improvements': improvements},
                'model_version': self.model_metadata.get(model_type, {}).get('version', '1.0.0')
            }
            
        except Exception as e:
            logger.error(f"Error analyzing ad performance: {e}")
            return {'prediction': 0.5, 'confidence': 0.3, 'features': features, 'error': str(e)}
    
    # Feature preparation methods
    
    def prepare_lead_features(self, features: Dict[str, Any]) -> List[float]:
        """Prepare features for lead quality scoring"""
        return [
            features.get('lead_source_score', 0.5),
            features.get('company_size_score', 0.5),
            features.get('job_title_score', 0.5),
            features.get('industry_score', 0.5),
            features.get('campaign_performance', 0.5),
            features.get('keyword_relevance', 0.5),
            features.get('ad_quality_score', 0.5),
            features.get('landing_page_score', 0.5),
            features.get('time_to_conversion', 0.0) / 100.0,  # Normalize hours
            features.get('page_views', 0.0) / 10.0  # Normalize page views
        ]
    
    def prepare_conversion_features(self, features: Dict[str, Any]) -> List[float]:
        """Prepare features for conversion prediction"""
        return [
            features.get('campaign_performance', 0.5),
            features.get('keyword_relevance', 0.5),
            features.get('ad_quality_score', 0.5),
            features.get('landing_page_score', 0.5),
            features.get('market_conditions', 0.5),
            features.get('seasonality', 0.5),
            features.get('competitor_activity', 0.5),
            features.get('time_to_conversion', 0.0) / 100.0,
            features.get('bounce_rate', 0.5),
            features.get('session_duration', 0.0) / 300.0  # Normalize to 5 minutes
        ]
    
    def prepare_budget_features(self, features: Dict[str, Any]) -> List[float]:
        """Prepare features for budget optimization"""
        return [
            features.get('campaign_performance', 0.5),
            features.get('current_budget', 100.0) / 1000.0,  # Normalize
            features.get('current_spend', 0.0) / 1000.0,
            features.get('conversion_rate', 0.0),
            features.get('cost_per_conversion', 0.0) / 100.0,
            features.get('market_conditions', 0.5),
            features.get('seasonality', 0.5),
            features.get('competition_level', 0.5),
            features.get('historical_roas', 0.0) / 10.0,
            features.get('lead_quality_score', 0.5)
        ]
    
    def prepare_keyword_features(self, features: Dict[str, Any]) -> List[float]:
        """Prepare features for keyword performance prediction"""
        return [
            features.get('keyword_relevance', 0.5),
            features.get('campaign_performance', 0.5),
            features.get('search_volume', 0.0) / 10000.0,  # Normalize
            features.get('competition_level', 0.5),
            features.get('average_cpc', 0.0) / 10.0,
            features.get('quality_score', 5.0) / 10.0,
            features.get('market_conditions', 0.5),
            features.get('seasonality', 0.5),
            features.get('historical_ctr', 0.0),
            features.get('historical_conversions', 0.0) / 100.0
        ]
    
    def prepare_ad_features(self, features: Dict[str, Any]) -> List[float]:
        """Prepare features for ad performance analysis"""
        return [
            features.get('ad_quality_score', 0.5),
            features.get('headline_count', 1.0) / 3.0,  # Normalize to max 3
            features.get('description_length', 50.0) / 200.0,  # Normalize
            features.get('landing_page_score', 0.5),
            features.get('campaign_performance', 0.5),
            features.get('keyword_relevance', 0.5),
            features.get('market_conditions', 0.5),
            features.get('target_audience_match', 0.5),
            features.get('historical_ctr', 0.0),
            features.get('historical_conversions', 0.0) / 100.0
        ]
    
    # Fallback calculation methods
    
    def calculate_lead_quality_fallback(self, features: Dict[str, Any]) -> float:
        """Fallback lead quality calculation when model is not available"""
        score = 0.0
        
        # Lead source scoring (30%)
        lead_source_map = {
            'organic': 0.8, 'referral': 0.9, 'paid_search': 0.7,
            'social_media': 0.6, 'email': 0.5, 'direct': 0.4
        }
        lead_source = features.get('lead_source', '').lower()
        score += lead_source_map.get(lead_source, 0.3) * 0.3
        
        # Company and job title scoring (25%)
        if features.get('company_size_score', 0) > 0.6:
            score += 0.15
        if features.get('job_title_score', 0) > 0.6:
            score += 0.10
        
        # Campaign performance (20%)
        score += features.get('campaign_performance', 0.5) * 0.2
        
        # Engagement metrics (25%)
        engagement_score = (
            min(features.get('page_views', 0) / 5.0, 1.0) * 0.1 +
            (1.0 - min(features.get('time_to_conversion', 24) / 24.0, 1.0)) * 0.15
        )
        score += engagement_score
        
        return min(1.0, max(0.0, score))
    
    def calculate_conversion_probability_fallback(self, features: Dict[str, Any]) -> float:
        """Fallback conversion probability calculation"""
        base_rate = 0.05  # 5% base conversion rate
        
        # Adjust based on campaign performance
        performance_multiplier = 1 + (features.get('campaign_performance', 0.5) - 0.5)
        
        # Adjust based on landing page quality
        landing_multiplier = 1 + (features.get('landing_page_score', 0.5) - 0.5) * 0.5
        
        # Adjust based on market conditions
        market_multiplier = 1 + (features.get('market_conditions', 0.5) - 0.5) * 0.3
        
        probability = base_rate * performance_multiplier * landing_multiplier * market_multiplier
        
        return min(0.5, max(0.01, probability))  # Cap at 50%
    
    def calculate_budget_optimization_fallback(self, features: Dict[str, Any]) -> float:
        """Fallback budget optimization calculation"""
        current_budget = features.get('current_budget', 100.0)
        performance = features.get('campaign_performance', 0.5)
        
        # Increase budget for high-performing campaigns, decrease for low-performing
        if performance > 0.7:
            multiplier = 1.2  # Increase by 20%
        elif performance > 0.5:
            multiplier = 1.0  # Keep same
        else:
            multiplier = 0.8  # Decrease by 20%
        
        # Adjust for market conditions
        market_conditions = features.get('market_conditions', 0.5)
        market_multiplier = 0.8 + (market_conditions * 0.4)  # 0.8 to 1.2 range
        
        return current_budget * multiplier * market_multiplier
    
    def calculate_keyword_performance_fallback(self, features: Dict[str, Any]) -> float:
        """Fallback keyword performance calculation"""
        base_score = 0.5
        
        # Adjust based on relevance
        relevance_boost = (features.get('keyword_relevance', 0.5) - 0.5) * 0.3
        
        # Adjust based on quality score
        quality_boost = (features.get('quality_score', 5.0) / 10.0 - 0.5) * 0.2
        
        # Adjust based on competition
        competition = features.get('competition_level', 0.5)
        competition_penalty = (competition - 0.5) * 0.1
        
        score = base_score + relevance_boost + quality_boost - competition_penalty
        
        return min(1.0, max(0.1, score))
    
    def calculate_ad_performance_fallback(self, features: Dict[str, Any]) -> float:
        """Fallback ad performance calculation"""
        base_score = 0.5
        
        # Ad quality components
        headline_score = min(features.get('headline_count', 1) / 3.0, 1.0) * 0.2
        description_score = min(features.get('description_length', 50) / 150.0, 1.0) * 0.1
        landing_score = features.get('landing_page_score', 0.5) * 0.3
        relevance_score = features.get('keyword_relevance', 0.5) * 0.2
        
        total_score = base_score + headline_score + description_score + landing_score + relevance_score - 0.5
        
        return min(1.0, max(0.1, total_score))
    
    def calculate_expected_roas(self, features: Dict[str, Any], budget: float) -> float:
        """Calculate expected ROAS based on features and budget"""
        base_roas = 2.0  # 200% base ROAS
        
        performance = features.get('campaign_performance', 0.5)
        roas = base_roas * (0.5 + performance)
        
        # Diminishing returns with higher budget
        budget_factor = features.get('current_budget', 100.0)
        if budget > budget_factor * 1.5:
            roas *= 0.9  # Slight decrease for budget increases
        
        return max(1.0, roas)
    
    def generate_ad_improvements(self, features: Dict[str, Any], performance_score: float) -> List[str]:
        """Generate ad improvement suggestions"""
        improvements = []
        
        if features.get('headline_count', 1) < 3:
            improvements.append("Add more headlines to increase ad real estate")
        
        if features.get('description_length', 50) < 80:
            improvements.append("Expand ad description to better explain value proposition")
        
        if features.get('landing_page_score', 0.5) < 0.6:
            improvements.append("Improve landing page relevance and loading speed")
        
        if features.get('keyword_relevance', 0.5) < 0.6:
            improvements.append("Improve keyword-ad relevance matching")
        
        if performance_score < 0.5:
            improvements.append("Consider testing different call-to-action phrases")
            improvements.append("Test ads with stronger value propositions")
        
        return improvements


def main():
    """Main function to handle command line prediction requests"""
    if len(sys.argv) < 3:
        print(json.dumps({
            'error': 'Usage: python predict.py <model_type> <features_json>',
            'model_types': ['LEAD_QUALITY_SCORING', 'CONVERSION_PREDICTION', 'BUDGET_OPTIMIZATION', 'KEYWORD_PERFORMANCE', 'AD_PERFORMANCE']
        }))
        sys.exit(1)
    
    try:
        model_type = sys.argv[1].upper()
        features_json = sys.argv[2]
        features = json.loads(features_json)
        
        predictor = MLPredictor()
        
        # Route to appropriate prediction method
        if model_type == 'LEAD_QUALITY_SCORING':
            result = predictor.predict_lead_quality(features)
        elif model_type == 'CONVERSION_PREDICTION':
            result = predictor.predict_conversion_probability(features)
        elif model_type == 'BUDGET_OPTIMIZATION':
            result = predictor.optimize_budget(features)
        elif model_type == 'KEYWORD_PERFORMANCE':
            result = predictor.predict_keyword_performance(features)
        elif model_type == 'AD_PERFORMANCE':
            result = predictor.analyze_ad_performance(features)
        else:
            result = {
                'error': f'Unknown model type: {model_type}',
                'available_types': ['LEAD_QUALITY_SCORING', 'CONVERSION_PREDICTION', 'BUDGET_OPTIMIZATION', 'KEYWORD_PERFORMANCE', 'AD_PERFORMANCE']
            }
        
        print(json.dumps(result))
        
    except json.JSONDecodeError as e:
        print(json.dumps({'error': f'Invalid JSON in features: {e}'}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({'error': f'Prediction failed: {e}'}))
        sys.exit(1)


if __name__ == '__main__':
    main()
