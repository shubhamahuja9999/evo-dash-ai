#!/usr/bin/env python3
"""
Google Ads CUA (Customer User Access) Automation with AI Agent
Uses browser automation and AI to manage customer user access and permissions
"""

import os
import sys
import time
import json
import yaml
import openai
from datetime import datetime, timedelta
import pytz
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import logging

class GoogleAdsCUAAutomation:
    def __init__(self):
        # Setup logging first
        self.setup_logging()
        
        # Initialize other attributes
        self.driver = None
        self.ist_timezone = pytz.timezone('Asia/Kolkata')
        self.openai_client = None
        
        # Load configuration after logging is setup
        self.load_config()
        
    def setup_logging(self):
        """Setup logging configuration"""
        log_level = os.getenv('LOG_LEVEL', 'INFO')
        log_file = os.getenv('LOG_FILE', 'cua_automation.log')
        
        # Create logs directory if it doesn't exist
        log_dir = os.path.dirname(log_file)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir)
        
        logging.basicConfig(
            level=getattr(logging, log_level.upper()),
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
    def load_config(self):
        """Load configuration from environment variables"""
        try:
            # Set OpenAI configuration (only if provided)
            openai_api_key = os.getenv('OPENAI_API_KEY')
            if openai_api_key:
                openai.api_key = openai_api_key
                self.openai_client = openai
                self.logger.info("✅ OpenAI client configured")
            else:
                self.logger.info("ℹ️ OpenAI features will be disabled (no API key provided)")
            
            self.logger.info("✅ Configuration loaded successfully")
            return True
                
        except Exception as e:
            self.logger.error(f"❌ Error loading configuration: {e}")
            return False
    
    def setup_browser(self):
        """Setup Chrome browser with appropriate options"""
        try:
            from selenium.webdriver.chrome.service import Service
            from webdriver_manager.chrome import ChromeDriverManager
            
            self.logger.info("🔧 Setting up Chrome browser...")
            
            chrome_options = Options()
            
            # Add options for automation
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-blink-features=AutomationControlled")
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)
            
            # Check headless mode from environment
            if os.getenv('BROWSER_HEADLESS', 'false').lower() == 'true':
                chrome_options.add_argument("--headless")
            
            # Initialize WebDriver with automatic ChromeDriver management
            self.logger.info("📥 Installing/updating ChromeDriver if needed...")
            service = Service(ChromeDriverManager().install())
            
            self.logger.info("🌐 Starting Chrome browser...")
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            
            # Set window size from environment or defaults
            width = int(os.getenv('BROWSER_WINDOW_WIDTH', 1920))
            height = int(os.getenv('BROWSER_WINDOW_HEIGHT', 1080))
            self.driver.set_window_size(width, height)
            
            # Set timeouts from environment
            timeout = int(os.getenv('BROWSER_TIMEOUT', 10))
            implicit_wait = int(os.getenv('BROWSER_IMPLICIT_WAIT', 5))
            self.driver.set_page_load_timeout(timeout)
            self.driver.implicitly_wait(implicit_wait)
            
            self.logger.info("✅ Browser setup completed successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to setup browser: {e}")
            return False
    
    def login_to_google_ads(self):
        """Login to Google Ads dashboard"""
        try:
            self.logger.info("🔐 Starting Google Ads login process...")
            self.logger.info("👉 Please login to your Google Ads account in the browser window")
            
            # Navigate to Google Ads
            self.driver.get("https://ads.google.com")
            
            # Wait for user to complete login process
            self.logger.info("⏳ Waiting for login completion...")
            self.logger.info("✨ Tips:")
            self.logger.info("  1. Sign in with your Google Ads account")
            self.logger.info("  2. Complete 2FA if required")
            self.logger.info("  3. The automation will continue once you're logged in")
            
            # Wait for successful login (max 5 minutes)
            try:
                WebDriverWait(self.driver, 300).until(
                    lambda driver: any([
                        "ads.google.com/aw" in driver.current_url,
                        "ads.google.com/home" in driver.current_url,
                        "ads.google.com/nav" in driver.current_url,
                        "ads.google.com/my-account" in driver.current_url
                    ])
                )
                self.logger.info("✅ Successfully logged into Google Ads")
                return True
            except TimeoutException:
                self.logger.error("❌ Login timeout - please try again")
                return False
            
        except Exception as e:
            self.logger.error(f"❌ Login failed: {e}")
            return False
    
    def navigate_to_cua_section(self):
        """Navigate to Customer User Access section"""
        try:
            self.logger.info("🧭 Navigating to CUA section...")
            
            # Click on Tools & Settings menu
            tools_menu = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//span[contains(text(), 'Tools & Settings') or contains(text(), 'Tools')]"))
            )
            tools_menu.click()
            time.sleep(2)
            
            # Click on Access and Security
            access_security = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//span[contains(text(), 'Access & Security') or contains(text(), 'Access and Security')]"))
            )
            access_security.click()
            time.sleep(2)
            
            # Click on Customer User Access
            cua_link = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//a[contains(text(), 'Customer User Access') or contains(text(), 'User Access')]"))
            )
            cua_link.click()
            time.sleep(3)
            
            self.logger.info("✅ Navigated to CUA section successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to navigate to CUA section: {e}")
            return False
    
    def get_current_cua_status(self):
        """Get current Customer User Access status"""
        try:
            self.logger.info("📊 Getting current CUA status...")
            
            # Wait for the CUA table to load
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.XPATH, "//table[contains(@class, 'table') or contains(@class, 'grid')]"))
            )
            
            # Extract user access information
            users = []
            user_rows = self.driver.find_elements(By.XPATH, "//tr[contains(@class, 'row') or position() > 1]")
            
            for row in user_rows:
                try:
                    cells = row.find_elements(By.TAG_NAME, "td")
                    if len(cells) >= 4:
                        user_info = {
                            'email': cells[0].text.strip() if cells[0].text.strip() else 'N/A',
                            'access_level': cells[1].text.strip() if len(cells) > 1 and cells[1].text.strip() else 'N/A',
                            'status': cells[2].text.strip() if len(cells) > 2 and cells[2].text.strip() else 'N/A',
                            'last_access': cells[3].text.strip() if len(cells) > 3 and cells[3].text.strip() else 'N/A'
                        }
                        users.append(user_info)
                except Exception as e:
                    self.logger.warning(f"⚠️ Error parsing row: {e}")
                    continue
            
            self.logger.info(f"✅ Found {len(users)} user access records")
            return users
            
        except Exception as e:
            self.logger.error(f"❌ Failed to get CUA status: {e}")
            return []
    
    def ask_ai_agent(self, context, action_needed):
        """Ask AI agent for decision on what actions to take"""
        try:
            if not self.openai_client:
                self.logger.warning("⚠️ OpenAI client not available, using default actions")
                return self.get_default_actions(context, action_needed)
            
            prompt = f"""
            You are an AI agent managing Google Ads Customer User Access (CUA). 
            
            Current Context:
            {json.dumps(context, indent=2)}
            
            Action Needed: {action_needed}
            
            Based on this information, provide a JSON response with the following structure:
            {{
                "actions": [
                    {{
                        "action_type": "invite_user|update_access|remove_access|audit|no_action",
                        "email": "user@example.com",
                        "access_level": "STANDARD|ADMIN|READ_ONLY",
                        "reason": "Explanation for this action",
                        "priority": "high|medium|low"
                    }}
                ],
                "reasoning": "Explanation of why these actions are recommended",
                "risk_assessment": "low|medium|high"
            }}
            
            Consider security best practices, access management principles, and the current state.
            """
            
            # Get OpenAI settings from environment
            model = os.getenv('OPENAI_MODEL', 'gpt-4')
            temperature = float(os.getenv('OPENAI_TEMPERATURE', '0.3'))
            max_tokens = int(os.getenv('OPENAI_MAX_TOKENS', '1000'))
            
            response = self.openai_client.ChatCompletion.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are a Google Ads CUA management expert."},
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            ai_response = response.choices[0].message.content
            self.logger.info(f"🤖 AI Agent Response: {ai_response}")
            
            # Parse JSON response
            try:
                return json.loads(ai_response)
            except json.JSONDecodeError:
                self.logger.warning("⚠️ Failed to parse AI response, using default actions")
                return self.get_default_actions(context, action_needed)
            
        except Exception as e:
            self.logger.error(f"❌ Error asking AI agent: {e}")
            return self.get_default_actions(context, action_needed)
    
    def get_default_actions(self, context, action_needed):
        """Get default actions when AI is not available"""
        actions = []
        
        if action_needed == "audit":
            actions.append({
                "action_type": "audit",
                "email": "N/A",
                "access_level": "N/A",
                "reason": "Standard security audit",
                "priority": "medium"
            })
        
        return {
            "actions": actions,
            "reasoning": "Default actions based on standard CUA management practices",
            "risk_assessment": "low"
        }
    
    def execute_ai_actions(self, actions):
        """Execute actions recommended by AI agent"""
        try:
            self.logger.info("🤖 Executing AI-recommended actions...")
            
            for action in actions:
                action_type = action.get('action_type')
                email = action.get('email')
                access_level = action.get('access_level')
                reason = action.get('reason')
                priority = action.get('priority')
                
                self.logger.info(f"🔄 Executing: {action_type} for {email} (Priority: {priority})")
                self.logger.info(f"   Reason: {reason}")
                
                if action_type == "invite_user":
                    success = self.invite_user_via_ui(email, access_level)
                    if success:
                        self.logger.info(f"✅ Successfully invited {email}")
                    else:
                        self.logger.error(f"❌ Failed to invite {email}")
                
                elif action_type == "update_access":
                    success = self.update_user_access_via_ui(email, access_level)
                    if success:
                        self.logger.info(f"✅ Successfully updated access for {email}")
                    else:
                        self.logger.error(f"❌ Failed to update access for {email}")
                
                elif action_type == "remove_access":
                    success = self.remove_user_access_via_ui(email)
                    if success:
                        self.logger.info(f"✅ Successfully removed access for {email}")
                    else:
                        self.logger.error(f"❌ Failed to remove access for {email}")
                
                elif action_type == "audit":
                    self.logger.info("🔍 Performing security audit...")
                    self.perform_security_audit()
                
                elif action_type == "no_action":
                    self.logger.info("⏸️ No action required")
                
                # Small delay between actions
                time.sleep(2)
            
            self.logger.info("✅ AI actions execution completed")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error executing AI actions: {e}")
            return False
    
    def invite_user_via_ui(self, email, access_level):
        """Invite a new user via the UI"""
        try:
            # Click on Add User button
            add_user_button = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Add User') or contains(text(), 'Invite User')]"))
            )
            add_user_button.click()
            time.sleep(2)
            
            # Enter email address
            email_input = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.NAME, "email") or (By.XPATH, "//input[@type='email']"))
            )
            email_input.clear()
            email_input.send_keys(email)
            
            # Select access level
            access_dropdown = self.driver.find_element(By.XPATH, "//select[@name='access_level'] or //div[@role='button']")
            access_dropdown.click()
            time.sleep(1)
            
            # Select the appropriate access level
            access_option = self.driver.find_element(By.XPATH, f"//option[contains(text(), '{access_level}')] or //div[contains(text(), '{access_level}')]")
            access_option.click()
            
            # Click Send Invitation
            send_button = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Send') or contains(text(), 'Invite')]")
            send_button.click()
            time.sleep(3)
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error inviting user {email}: {e}")
            return False
    
    def update_user_access_via_ui(self, email, new_access_level):
        """Update user access level via the UI"""
        try:
            # Find the user row
            user_row = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.XPATH, f"//tr[contains(., '{email}')]"))
            )
            
            # Click on the access level cell or edit button
            access_cell = user_row.find_element(By.XPATH, ".//td[contains(@class, 'access') or position()=2]")
            access_cell.click()
            time.sleep(1)
            
            # Update access level
            access_dropdown = self.driver.find_element(By.XPATH, "//select[@name='access_level'] or //div[@role='button']")
            access_dropdown.click()
            time.sleep(1)
            
            new_access_option = self.driver.find_element(By.XPATH, f"//option[contains(text(), '{new_access_level}')] or //div[contains(text(), '{new_access_level}')]")
            new_access_option.click()
            
            # Save changes
            save_button = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Save') or contains(text(), 'Update')]")
            save_button.click()
            time.sleep(2)
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error updating access for {email}: {e}")
            return False
    
    def remove_user_access_via_ui(self, email):
        """Remove user access via the UI"""
        try:
            # Find the user row
            user_row = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.XPATH, f"//tr[contains(., '{email}')]"))
            )
            
            # Click on remove/delete button
            remove_button = user_row.find_element(By.XPATH, ".//button[contains(@title, 'Remove') or contains(@aria-label, 'Remove')]")
            remove_button.click()
            time.sleep(1)
            
            # Confirm removal
            confirm_button = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Remove') or contains(text(), 'Delete') or contains(text(), 'Confirm')]"))
            )
            confirm_button.click()
            time.sleep(2)
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error removing access for {email}: {e}")
            return False
    
    def perform_security_audit(self):
        """Perform a security audit of current user access"""
        try:
            self.logger.info("🔍 Performing security audit...")
            
            # Get current CUA status
            current_users = self.get_current_cua_status()
            
            # Get security settings from environment
            max_admin_users = int(os.getenv('SECURITY_MAX_ADMIN_USERS', 2))
            audit_frequency = os.getenv('SECURITY_AUDIT_FREQUENCY', 'daily')
            
            # Analyze for security issues
            security_issues = []
            admin_count = 0
            
            for user in current_users:
                if user['access_level'] == 'ADMIN' and user['status'] == 'ACTIVE':
                    admin_count += 1
                    if admin_count > max_admin_users:
                        security_issues.append({
                            'type': 'admin_user',
                            'email': user['email'],
                            'severity': 'high',
                            'description': f'Active admin user detected (exceeds limit of {max_admin_users})'
                        })
                
                if user['status'] == 'PENDING':
                    security_issues.append({
                        'type': 'pending_invitation',
                        'email': user['email'],
                        'severity': 'medium',
                        'description': 'Pending user invitation'
                    })
            
            # Log security issues
            if security_issues:
                self.logger.warning(f"⚠️ Found {len(security_issues)} security issues:")
                for issue in security_issues:
                    self.logger.warning(f"   {issue['severity'].upper()}: {issue['description']} - {issue['email']}")
            else:
                self.logger.info("✅ No security issues found")
            
            # Log audit frequency
            self.logger.info(f"ℹ️ Security audit frequency: {audit_frequency}")
            
            # Create audit summary
            audit_summary = {
                'timestamp': datetime.now(self.ist_timezone).isoformat(),
                'total_users': len(current_users),
                'admin_users': admin_count,
                'security_issues': security_issues,
                'risk_level': 'HIGH' if security_issues else 'LOW',
                'recommendations': self._generate_audit_recommendations(security_issues, current_users)
            }
            
            # Log audit summary
            self.logger.info("📊 Audit Summary:")
            self.logger.info(f"   Total Users: {audit_summary['total_users']}")
            self.logger.info(f"   Admin Users: {audit_summary['admin_users']}")
            self.logger.info(f"   Risk Level: {audit_summary['risk_level']}")
            self.logger.info(f"   Issues Found: {len(security_issues)}")
            
            # Save audit results to file for API access
            self._save_audit_results(audit_summary)
            
            return audit_summary
            
        except Exception as e:
            self.logger.error(f"❌ Error performing security audit: {e}")
            return {'error': str(e), 'timestamp': datetime.now(self.ist_timezone).isoformat()}
    
    def _generate_audit_recommendations(self, security_issues, current_users):
        """Generate recommendations based on audit findings"""
        recommendations = []
        
        # Check for too many admin users
        admin_count = len([u for u in current_users if u['access_level'] == 'ADMIN' and u['status'] == 'ACTIVE'])
        if admin_count > 2:
            recommendations.append({
                'priority': 'HIGH',
                'action': 'REDUCE_ADMIN_ACCESS',
                'description': f'Reduce admin users from {admin_count} to maximum of 2 for security',
                'affected_users': [u['email'] for u in current_users if u['access_level'] == 'ADMIN' and u['status'] == 'ACTIVE']
            })
        
        # Check for pending invitations
        pending_users = [u for u in current_users if u['status'] == 'PENDING']
        if pending_users:
            recommendations.append({
                'priority': 'MEDIUM',
                'action': 'FOLLOW_UP_INVITATIONS',
                'description': f'Follow up on {len(pending_users)} pending user invitations',
                'affected_users': [u['email'] for u in pending_users]
            })
        
        # Check for inactive users
        inactive_users = [u for u in current_users if u['status'] == 'INACTIVE']
        if inactive_users:
            recommendations.append({
                'priority': 'LOW',
                'action': 'REVIEW_INACTIVE_USERS',
                'description': f'Review {len(inactive_users)} inactive users for potential removal',
                'affected_users': [u['email'] for u in inactive_users]
            })
        
        # Add general security recommendations
        if not recommendations:
            recommendations.append({
                'priority': 'LOW',
                'action': 'MAINTAIN_CURRENT_SETUP',
                'description': 'Current user access setup appears secure',
                'affected_users': []
            })
        
        return recommendations
    
    def _save_audit_results(self, audit_summary):
        """Save audit results to a file for API access"""
        try:
            timestamp = datetime.now(self.ist_timezone).strftime('%Y%m%d_%H%M%S')
            audit_file = f"audit_results_{timestamp}.json"
            
            with open(audit_file, 'w') as f:
                json.dump(audit_summary, f, indent=2, default=str)
            
            self.logger.info(f"💾 Audit results saved to {audit_file}")
            
            # Also save to a latest audit file for easy access
            with open("latest_audit_results.json", 'w') as f:
                json.dump(audit_summary, f, indent=2, default=str)
            
            self.logger.info("💾 Latest audit results saved for API access")
            
        except Exception as e:
            self.logger.error(f"❌ Error saving audit results: {e}")
    
    def get_latest_audit_results(self):
        """Get the latest audit results from file"""
        try:
            if os.path.exists("latest_audit_results.json"):
                with open("latest_audit_results.json", 'r') as f:
                    return json.load(f)
            else:
                return None
        except Exception as e:
            self.logger.error(f"❌ Error reading latest audit results: {e}")
            return None
    
    def trigger_audit_from_api(self):
        """Trigger audit from external API call"""
        try:
            self.logger.info("🚀 Audit triggered from external API call")
            
            # Check if browser is ready
            if not self.driver:
                self.logger.error("❌ Browser not initialized. Please run setup first.")
                return {'error': 'Browser not initialized', 'status': 'failed'}
            
            # Check if we're on the CUA page
            try:
                current_url = self.driver.current_url
                if 'access' not in current_url.lower() and 'security' not in current_url.lower():
                    self.logger.info("🔄 Navigating to CUA section for audit...")
                    if not self.navigate_to_cua_section():
                        return {'error': 'Failed to navigate to CUA section', 'status': 'failed'}
            except Exception as e:
                self.logger.warning(f"⚠️ Navigation check failed: {e}")
            
            # Perform the audit
            audit_results = self.perform_security_audit()
            
            if 'error' in audit_results:
                return {'error': audit_results['error'], 'status': 'failed'}
            else:
                return {
                    'status': 'completed',
                    'audit_results': audit_results,
                    'message': 'Security audit completed successfully'
                }
                
        except Exception as e:
            self.logger.error(f"❌ Error in API-triggered audit: {e}")
            return {'error': str(e), 'status': 'failed'}
    
    def run_automation(self):
        """Run the complete CUA automation workflow"""
        try:
            self.logger.info("\n🚀 Starting Google Ads CUA Automation with AI Agent...")
            self.logger.info("=" * 60)
            self.logger.info(f"⏰ Start time: {datetime.now(self.ist_timezone).strftime('%Y-%m-%d %H:%M:%S')}")
            self.logger.info("=" * 60)
            
            # Setup browser
            if not self.setup_browser():
                self.logger.error("❌ Failed to setup browser. Exiting.")
                return False
            
            # Login to Google Ads (interactive)
            if not self.login_to_google_ads():
                self.logger.error("❌ Failed to login to Google Ads. Exiting.")
                return False
            
            # Navigate to CUA section
            if not self.navigate_to_cua_section():
                self.logger.error("❌ Failed to navigate to CUA section. Exiting.")
                return False
            
            # Get current CUA status
            current_users = self.get_current_cua_status()
            
            # Ask AI agent for recommendations
            context = {
                'current_users': current_users,
                'total_users': len(current_users),
                'timestamp': datetime.now(self.ist_timezone).isoformat()
            }
            
            ai_recommendations = self.ask_ai_agent(context, "audit_and_optimize")
            
            # Execute AI recommendations
            if ai_recommendations and 'actions' in ai_recommendations:
                self.execute_ai_actions(ai_recommendations['actions'])
            
            # Final audit
            final_audit = self.perform_security_audit()
            
            self.logger.info("✅ CUA automation completed successfully!")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error in CUA automation: {e}")
            return False
        finally:
            if self.driver:
                self.driver.quit()
                self.logger.info("🔒 Browser closed")

def main():
    """Main function"""
    try:
        automation = GoogleAdsCUAAutomation()
        success = automation.run_automation()
        
        if success:
            print("🎯 CUA automation completed successfully!")
            sys.exit(0)
        else:
            print("❌ CUA automation failed!")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n🛑 CUA automation interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"💥 Fatal error in CUA automation: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()