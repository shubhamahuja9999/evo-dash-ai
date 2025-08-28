#!/usr/bin/env python3
"""
ML Model Training Service for Advertising Automation
Trains ML models using historical campaign and lead data
"""

import sys
import json
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple
import warnings
warnings.filterwarnings('ignore')

# Import ML libraries
try:
    from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
    from sklearn.linear_model import LinearRegression, LogisticRegression
    from sklearn.preprocessing import StandardScaler, LabelEncoder
    from sklearn.model_selection import train_test_split, cross_val_score
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    import xgboost as xgb
except ImportError as e:
    print(f"Missing ML library: {e}")
    print("Install with: pip install scikit-learn xgboost pandas numpy")
    sys.exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MLModelTrainer:
    def __init__(self):
        self.models_dir = Path(__file__).parent / 'models'
        self.models_dir.mkdir(exist_ok=True)
        
        self.models = {}
        self.scalers = {}
        self.metadata = {}
        
        # Model configurations
        self.model_configs = {
            'lead_quality_scoring': {
                'algorithm': 'xgboost',
                'target_type': 'regression',
                'features': ['lead_source_score', 'company_size_score', 'job_title_score', 
                           'campaign_performance', 'time_to_conversion', 'page_views']
            },
            'conversion_prediction': {
                'algorithm': 'random_forest',
                'target_type': 'regression',
                'features': ['campaign_performance', 'landing_page_score', 'keyword_relevance',
                           'market_conditions', 'bounce_rate', 'session_duration']
            },
            'budget_optimization': {
                'algorithm': 'gradient_boosting',
                'target_type': 'regression',
                'features': ['campaign_performance', 'current_spend', 'conversion_rate',
                           'cost_per_conversion', 'market_conditions', 'seasonality']
            },
            'keyword_performance': {
                'algorithm': 'random_forest',
                'target_type': 'regression',
                'features': ['keyword_relevance', 'search_volume', 'competition_level',
                           'quality_score', 'historical_ctr', 'market_conditions']
            },
            'ad_performance': {
                'algorithm': 'xgboost',
                'target_type': 'regression',
                'features': ['headline_count', 'description_length', 'landing_page_score',
                           'keyword_relevance', 'historical_ctr', 'target_audience_match']
            }
        }
    
    def train_all_models(self, training_data: Dict[str, Any]) -> Dict[str, Any]:
        """Train all ML models with provided data"""
        results = {}
        
        logger.info("Starting ML model training pipeline...")
        
        # Prepare datasets
        datasets = self.prepare_training_datasets(training_data)
        
        # Train each model
        for model_type, config in self.model_configs.items():
            try:
                logger.info(f"Training {model_type} model...")
                
                if model_type in datasets:
                    result = self.train_model(model_type, datasets[model_type], config)
                    results[model_type] = result
                    logger.info(f"✅ {model_type} training completed - Accuracy: {result.get('accuracy', 0):.3f}")
                else:
                    logger.warning(f"⚠️  No training data available for {model_type}")
                    results[model_type] = {'error': 'No training data available'}
                    
            except Exception as e:
                logger.error(f"❌ Error training {model_type}: {e}")
                results[model_type] = {'error': str(e)}
        
        # Save training summary
        self.save_training_summary(results)
        
        logger.info("🎉 ML model training pipeline completed!")
        return results
    
    def prepare_training_datasets(self, training_data: Dict[str, Any]) -> Dict[str, pd.DataFrame]:
        """Prepare training datasets from raw data"""
        datasets = {}
        
        leads_data = training_data.get('leads', [])
        campaigns_data = training_data.get('campaigns', [])
        
        logger.info(f"Preparing datasets from {len(leads_data)} leads and {len(campaigns_data)} campaigns")
        
        # Prepare lead quality scoring dataset
        if leads_data:
            datasets['lead_quality_scoring'] = self.prepare_lead_quality_dataset(leads_data)
        
        # Prepare conversion prediction dataset
        if leads_data:
            datasets['conversion_prediction'] = self.prepare_conversion_dataset(leads_data)
        
        # Prepare budget optimization dataset
        if campaigns_data:
            datasets['budget_optimization'] = self.prepare_budget_dataset(campaigns_data)
        
        # Prepare keyword performance dataset
        if campaigns_data:
            datasets['keyword_performance'] = self.prepare_keyword_dataset(campaigns_data)
        
        # Prepare ad performance dataset
        if campaigns_data:
            datasets['ad_performance'] = self.prepare_ad_dataset(campaigns_data)
        
        return datasets
    
    def prepare_lead_quality_dataset(self, leads_data: List[Dict]) -> pd.DataFrame:
        """Prepare dataset for lead quality scoring"""
        rows = []
        
        for lead in leads_data:
            try:
                # Calculate lead quality target (0-1 based on actual outcome)
                quality_target = self.calculate_lead_quality_target(lead)
                
                # Extract features
                row = {
                    'lead_source_score': self.score_lead_source(lead.get('leadSource')),
                    'company_size_score': self.score_company_size(lead.get('company')),
                    'job_title_score': self.score_job_title(lead.get('jobTitle')),
                    'campaign_performance': self.get_campaign_performance(lead.get('campaign')),
                    'time_to_conversion': self.calculate_time_to_conversion(lead.get('leadActivities', [])),
                    'page_views': len([a for a in lead.get('leadActivities', []) if a.get('activityType') == 'WEBSITE_VISIT']),
                    'industry_score': self.score_industry(lead.get('company')),
                    'engagement_score': self.calculate_engagement_score(lead.get('leadActivities', [])),
                    'target': quality_target
                }
                rows.append(row)
                
            except Exception as e:
                logger.debug(f"Error processing lead {lead.get('id', 'unknown')}: {e}")
                continue
        
        df = pd.DataFrame(rows)
        logger.info(f"Prepared lead quality dataset: {len(df)} samples")
        return df
    
    def prepare_conversion_dataset(self, leads_data: List[Dict]) -> pd.DataFrame:
        """Prepare dataset for conversion prediction"""
        rows = []
        
        for lead in leads_data:
            try:
                # Target: 1 if converted, 0 if not
                converted = 1 if lead.get('leadStage') == 'CUSTOMER' else 0
                
                row = {
                    'campaign_performance': self.get_campaign_performance(lead.get('campaign')),
                    'landing_page_score': self.score_landing_page(lead.get('landingPage')),
                    'keyword_relevance': self.score_keyword_relevance(lead.get('keyword')),
                    'market_conditions': 0.5,  # Would be calculated from external data
                    'bounce_rate': np.random.uniform(0.3, 0.8),  # Placeholder
                    'session_duration': np.random.uniform(30, 300),  # Placeholder
                    'lead_source_score': self.score_lead_source(lead.get('leadSource')),
                    'time_on_site': self.calculate_time_on_site(lead.get('leadActivities', [])),
                    'target': converted
                }
                rows.append(row)
                
            except Exception as e:
                logger.debug(f"Error processing lead for conversion: {e}")
                continue
        
        df = pd.DataFrame(rows)
        logger.info(f"Prepared conversion dataset: {len(df)} samples")
        return df
    
    def prepare_budget_dataset(self, campaigns_data: List[Dict]) -> pd.DataFrame:
        """Prepare dataset for budget optimization"""
        rows = []
        
        for campaign in campaigns_data:
            try:
                analytics = campaign.get('analytics', [])
                if not analytics:
                    continue
                
                # Calculate optimal budget based on performance
                total_cost = sum(a.get('cost', 0) for a in analytics)
                total_conversions = sum(a.get('conversions', 0) for a in analytics)
                total_revenue = sum(a.get('conversionValue', 0) for a in analytics)
                
                roas = total_revenue / total_cost if total_cost > 0 else 0
                optimal_budget = campaign.get('budget', 100) * min(2.0, max(0.5, roas / 2.0))
                
                row = {
                    'campaign_performance': self.calculate_campaign_performance_score(analytics),
                    'current_budget': campaign.get('budget', 100),
                    'current_spend': total_cost,
                    'conversion_rate': total_conversions / max(sum(a.get('clicks', 0) for a in analytics), 1),
                    'cost_per_conversion': total_cost / max(total_conversions, 1),
                    'market_conditions': 0.5,
                    'seasonality': self.get_seasonality_score(),
                    'historical_roas': roas,
                    'days_running': len(analytics),
                    'target': optimal_budget
                }
                rows.append(row)
                
            except Exception as e:
                logger.debug(f"Error processing campaign for budget: {e}")
                continue
        
        df = pd.DataFrame(rows)
        logger.info(f"Prepared budget dataset: {len(df)} samples")
        return df
    
    def prepare_keyword_dataset(self, campaigns_data: List[Dict]) -> pd.DataFrame:
        """Prepare dataset for keyword performance prediction"""
        rows = []
        
        for campaign in campaigns_data:
            try:
                keywords = campaign.get('keywords', [])
                
                for keyword in keywords:
                    if keyword.get('clicks', 0) == 0:
                        continue
                    
                    ctr = keyword.get('clicks', 0) / max(keyword.get('impressions', 1), 1)
                    
                    row = {
                        'keyword_relevance': self.score_keyword_relevance(keyword.get('text')),
                        'search_volume': np.random.uniform(100, 10000),  # Placeholder
                        'competition_level': np.random.uniform(0.3, 0.9),  # Placeholder
                        'quality_score': keyword.get('qualityScore', 5),
                        'historical_ctr': ctr,
                        'market_conditions': 0.5,
                        'campaign_performance': self.calculate_campaign_performance_score(campaign.get('analytics', [])),
                        'cost_per_click': keyword.get('cost', 0) / max(keyword.get('clicks', 1), 1),
                        'target': min(1.0, ctr * 10)  # Performance score 0-1
                    }
                    rows.append(row)
                    
            except Exception as e:
                logger.debug(f"Error processing keywords: {e}")
                continue
        
        df = pd.DataFrame(rows)
        logger.info(f"Prepared keyword dataset: {len(df)} samples")
        return df
    
    def prepare_ad_dataset(self, campaigns_data: List[Dict]) -> pd.DataFrame:
        """Prepare dataset for ad performance analysis"""
        rows = []
        
        for campaign in campaigns_data:
            try:
                for ad_group in campaign.get('adGroups', []):
                    for ad in ad_group.get('ads', []):
                        # Calculate ad performance score
                        performance_score = self.calculate_ad_performance_score(ad, campaign)
                        
                        row = {
                            'headline_count': len([h for h in [ad.get('headline1'), ad.get('headline2'), ad.get('headline3')] if h]),
                            'description_length': len(ad.get('description', '')),
                            'landing_page_score': self.score_landing_page(ad.get('finalUrl')),
                            'keyword_relevance': 0.6,  # Would be calculated from keyword matching
                            'historical_ctr': np.random.uniform(0.01, 0.15),  # Placeholder
                            'target_audience_match': 0.7,  # Placeholder
                            'campaign_performance': self.calculate_campaign_performance_score(campaign.get('analytics', [])),
                            'ad_type_numeric': 1 if ad.get('type') == 'RESPONSIVE_SEARCH_AD' else 0,
                            'target': performance_score
                        }
                        rows.append(row)
                        
            except Exception as e:
                logger.debug(f"Error processing ads: {e}")
                continue
        
        df = pd.DataFrame(rows)
        logger.info(f"Prepared ad dataset: {len(df)} samples")
        return df
    
    def train_model(self, model_type: str, dataset: pd.DataFrame, config: Dict) -> Dict[str, Any]:
        """Train a specific model"""
        if len(dataset) < 10:
            raise ValueError(f"Insufficient training data: {len(dataset)} samples")
        
        # Prepare features and target
        feature_columns = [col for col in dataset.columns if col != 'target']
        X = dataset[feature_columns].fillna(0)
        y = dataset['target'].fillna(0)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Create and train model
        model = self.create_model(config['algorithm'], config['target_type'])
        model.fit(X_train_scaled, y_train)
        
        # Evaluate model
        y_pred = model.predict(X_test_scaled)
        
        # Calculate metrics
        if config['target_type'] == 'regression':
            accuracy = r2_score(y_test, y_pred)
            mae = mean_absolute_error(y_test, y_pred)
            mse = mean_squared_error(y_test, y_pred)
            metrics = {'r2_score': accuracy, 'mae': mae, 'mse': mse}
        else:
            from sklearn.metrics import accuracy_score, classification_report
            accuracy = accuracy_score(y_test, (y_pred > 0.5).astype(int))
            metrics = {'accuracy': accuracy}
        
        # Cross-validation
        cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=5)
        
        # Save model and metadata
        self.save_model(model_type, model, scaler, {
            'version': '1.0.0',
            'accuracy': accuracy,
            'cv_scores': cv_scores.tolist(),
            'metrics': metrics,
            'features': feature_columns,
            'training_samples': len(X_train),
            'algorithm': config['algorithm'],
            'trained_at': datetime.now().isoformat()
        })
        
        return {
            'accuracy': accuracy,
            'cv_mean': cv_scores.mean(),
            'cv_std': cv_scores.std(),
            'metrics': metrics,
            'training_samples': len(X_train),
            'test_samples': len(X_test)
        }
    
    def create_model(self, algorithm: str, target_type: str):
        """Create ML model based on algorithm and target type"""
        if algorithm == 'random_forest':
            if target_type == 'regression':
                return RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
            else:
                from sklearn.ensemble import RandomForestClassifier
                return RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
        
        elif algorithm == 'xgboost':
            if target_type == 'regression':
                return xgb.XGBRegressor(n_estimators=100, random_state=42, n_jobs=-1)
            else:
                return xgb.XGBClassifier(n_estimators=100, random_state=42, n_jobs=-1)
        
        elif algorithm == 'gradient_boosting':
            if target_type == 'regression':
                return GradientBoostingRegressor(n_estimators=100, random_state=42)
            else:
                from sklearn.ensemble import GradientBoostingClassifier
                return GradientBoostingClassifier(n_estimators=100, random_state=42)
        
        else:
            # Default to linear models
            if target_type == 'regression':
                return LinearRegression()
            else:
                return LogisticRegression(random_state=42, max_iter=1000)
    
    def save_model(self, model_type: str, model, scaler, metadata: Dict):
        """Save trained model, scaler, and metadata"""
        # Save model
        model_path = self.models_dir / f'{model_type}_model.pkl'
        with open(model_path, 'wb') as f:
            pickle.dump(model, f)
        
        # Save scaler
        scaler_path = self.models_dir / f'{model_type}_scaler.pkl'
        with open(scaler_path, 'wb') as f:
            pickle.dump(scaler, f)
        
        # Save metadata
        metadata_path = self.models_dir / f'{model_type}_metadata.json'
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Saved model artifacts for {model_type}")
    
    def save_training_summary(self, results: Dict[str, Any]):
        """Save training summary"""
        summary = {
            'training_date': datetime.now().isoformat(),
            'models_trained': len([r for r in results.values() if 'accuracy' in r]),
            'results': results
        }
        
        summary_path = self.models_dir / 'training_summary.json'
        with open(summary_path, 'w') as f:
            json.dump(summary, f, indent=2)
        
        logger.info(f"Saved training summary to {summary_path}")
    
    # Helper methods for feature engineering
    
    def calculate_lead_quality_target(self, lead: Dict) -> float:
        """Calculate target lead quality score based on actual outcome"""
        if lead.get('leadStage') == 'CUSTOMER':
            return 1.0
        elif lead.get('leadStage') == 'OPPORTUNITY':
            return 0.8
        elif lead.get('leadStage') == 'QUALIFIED':
            return 0.6
        elif lead.get('leadStage') == 'CONTACTED':
            return 0.4
        elif lead.get('leadStage') == 'LOST':
            return 0.1
        else:
            return 0.3  # NEW
    
    def score_lead_source(self, source: str) -> float:
        """Score lead source quality"""
        source_scores = {
            'organic': 0.8, 'referral': 0.9, 'paid_search': 0.7,
            'social_media': 0.6, 'email': 0.5, 'direct': 0.4
        }
        return source_scores.get(source.lower() if source else '', 0.3)
    
    def score_company_size(self, company: str) -> float:
        """Score company size (placeholder)"""
        if not company:
            return 0.3
        # In real implementation, this would use company databases
        return np.random.uniform(0.4, 0.8)
    
    def score_job_title(self, title: str) -> float:
        """Score job title seniority"""
        if not title:
            return 0.3
        
        title_lower = title.lower()
        high_value_titles = ['ceo', 'cto', 'cfo', 'director', 'manager', 'vp', 'president', 'founder']
        
        return 0.8 if any(hvt in title_lower for hvt in high_value_titles) else 0.4
    
    def score_industry(self, company: str) -> float:
        """Score industry attractiveness"""
        # Placeholder - would use industry classification
        return np.random.uniform(0.3, 0.7)
    
    def get_campaign_performance(self, campaign: Dict) -> float:
        """Get campaign performance score"""
        if not campaign or not campaign.get('analytics'):
            return 0.5
        
        return self.calculate_campaign_performance_score(campaign['analytics'])
    
    def calculate_campaign_performance_score(self, analytics: List[Dict]) -> float:
        """Calculate campaign performance score from analytics"""
        if not analytics:
            return 0.5
        
        total_clicks = sum(a.get('clicks', 0) for a in analytics)
        total_impressions = sum(a.get('impressions', 0) for a in analytics)
        total_conversions = sum(a.get('conversions', 0) for a in analytics)
        
        ctr = total_clicks / max(total_impressions, 1)
        conversion_rate = total_conversions / max(total_clicks, 1)
        
        # Normalize and combine metrics
        score = min(1.0, (ctr * 10 + conversion_rate * 100) / 2)
        return score
    
    def calculate_time_to_conversion(self, activities: List[Dict]) -> float:
        """Calculate time to conversion in hours"""
        if len(activities) < 2:
            return 0.0
        
        first_activity = min(activities, key=lambda x: x.get('timestamp', ''))
        last_activity = max(activities, key=lambda x: x.get('timestamp', ''))
        
        # Placeholder calculation - would parse actual timestamps
        return np.random.uniform(1, 72)  # 1-72 hours
    
    def calculate_engagement_score(self, activities: List[Dict]) -> float:
        """Calculate engagement score from activities"""
        if not activities:
            return 0.3
        
        activity_weights = {
            'WEBSITE_VISIT': 0.1,
            'FORM_SUBMISSION': 0.3,
            'EMAIL_OPENED': 0.1,
            'EMAIL_CLICKED': 0.2,
            'DEMO_REQUEST': 0.5,
            'MEETING_SCHEDULED': 0.7
        }
        
        score = sum(activity_weights.get(a.get('activityType'), 0.1) for a in activities)
        return min(1.0, score)
    
    def score_landing_page(self, url: str) -> float:
        """Score landing page quality (placeholder)"""
        if not url:
            return 0.4
        # In real implementation, this would analyze page speed, content, etc.
        return np.random.uniform(0.5, 0.9)
    
    def score_keyword_relevance(self, keyword: str) -> float:
        """Score keyword relevance (placeholder)"""
        if not keyword:
            return 0.5
        # In real implementation, this would use NLP to analyze relevance
        return np.random.uniform(0.4, 0.8)
    
    def calculate_time_on_site(self, activities: List[Dict]) -> float:
        """Calculate time on site in seconds"""
        website_visits = [a for a in activities if a.get('activityType') == 'WEBSITE_VISIT']
        return len(website_visits) * np.random.uniform(30, 300)  # Placeholder
    
    def get_seasonality_score(self) -> float:
        """Get current seasonality score"""
        month = datetime.now().month
        # Higher scores for high-activity months
        seasonality_map = [0.4, 0.3, 0.5, 0.6, 0.7, 0.6, 0.5, 0.8, 0.9, 0.8, 0.9, 1.0]
        return seasonality_map[month - 1]
    
    def calculate_ad_performance_score(self, ad: Dict, campaign: Dict) -> float:
        """Calculate ad performance score"""
        base_score = 0.5
        
        # Check ad completeness
        if ad.get('headline1'):
            base_score += 0.1
        if ad.get('headline2'):
            base_score += 0.1
        if ad.get('headline3'):
            base_score += 0.1
        if ad.get('description') and len(ad['description']) > 50:
            base_score += 0.2
        
        return min(1.0, base_score)


def main():
    """Main function to handle training requests"""
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: python train_models.py <training_data_json>'}))
        sys.exit(1)
    
    try:
        training_data_json = sys.argv[1]
        training_data = json.loads(training_data_json)
        
        trainer = MLModelTrainer()
        results = trainer.train_all_models(training_data)
        
        print(json.dumps({
            'status': 'completed',
            'results': results,
            'timestamp': datetime.now().isoformat()
        }))
        
    except json.JSONDecodeError as e:
        print(json.dumps({'error': f'Invalid JSON in training data: {e}'}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({'error': f'Training failed: {e}'}))
        sys.exit(1)


if __name__ == '__main__':
    main()
