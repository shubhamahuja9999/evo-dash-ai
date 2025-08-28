"""
Simple Google Ads API authentication helper
"""

import os
from google.oauth2.credentials import Credentials
from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.oauth2 import get_installed_app_credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow

class GoogleAdsSimpleAuth:
    def __init__(self, client_config_path=None, token_path=None):
        self.client_config_path = client_config_path or os.getenv('GOOGLE_ADS_CLIENT_CONFIG')
        self.token_path = token_path or os.getenv('GOOGLE_ADS_TOKEN')
        self.scopes = ['https://www.googleapis.com/auth/adwords']
        self.credentials = None
        self.client = None

    async def authenticate(self):
        """Authenticate with Google Ads API"""
        try:
            # Try to load existing credentials
            if os.path.exists(self.token_path):
                self.credentials = Credentials.from_authorized_user_file(
                    self.token_path, self.scopes)

            # If credentials don't exist or are invalid, refresh them
            if not self.credentials or not self.credentials.valid:
                if self.credentials and self.credentials.expired and self.credentials.refresh_token:
                    self.credentials.refresh(Request())
                else:
                    # Get new credentials
                    flow = InstalledAppFlow.from_client_secrets_file(
                        self.client_config_path, self.scopes)
                    self.credentials = flow.run_local_server(port=0)

                # Save credentials
                with open(self.token_path, 'w') as token:
                    token.write(self.credentials.to_json())

            # Create Google Ads client
            self.client = GoogleAdsClient.load_from_dict({
                'credentials': {
                    'refresh_token': self.credentials.refresh_token,
                    'client_id': self.credentials.client_id,
                    'client_secret': self.credentials.client_secret,
                },
                'developer_token': os.getenv('GOOGLE_ADS_DEVELOPER_TOKEN'),
                'login_customer_id': os.getenv('GOOGLE_ADS_LOGIN_CUSTOMER_ID')
            })

            return self.client

        except Exception as e:
            raise Exception(f"Failed to authenticate with Google Ads: {str(e)}")

    def get_client(self):
        """Get the authenticated Google Ads client"""
        if not self.client:
            raise Exception("Not authenticated. Call authenticate() first.")
        return self.client
