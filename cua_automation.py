#!/usr/bin/env python3
import os
import sys
import time
import json
import openai
from datetime import datetime
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
        self.setup_logging()
        self.driver = None
        self.ist_timezone = pytz.timezone('Asia/Kolkata')
        self.openai_client = None
        self.load_config()
        
    def setup_logging(self):
        """Setup logging configuration"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(message)s',
            handlers=[logging.StreamHandler()]
        )
        self.logger = logging.getLogger(__name__)
        
    def load_config(self):
        """Load configuration from environment variables"""
        try:
            openai_api_key = os.getenv('OPENAI_API_KEY')
            if openai_api_key:
                openai.api_key = openai_api_key
                self.openai_client = openai
            return True
        except Exception as e:
            self.logger.error(f"Error loading configuration: {e}")
            return False
    
    def test_cursor_visibility(self):
        """Test cursor visibility by moving it around"""
        try:
            self.logger.info("🧪 Testing cursor visibility...")
            
            # Test cursor movement
            test_script = """
            const cursor = document.getElementById('cua-cursor');
            if (cursor) {
                // Move cursor to different positions
                const positions = [
                    {x: 100, y: 100},
                    {x: 300, y: 200},
                    {x: 500, y: 300},
                    {x: 700, y: 400}
                ];
                
                let i = 0;
                const moveInterval = setInterval(() => {
                    if (i < positions.length) {
                        cursor.style.left = positions[i].x + 'px';
                        cursor.style.top = positions[i].y + 'px';
                        cursor.style.background = '#00ff00';
                        cursor.style.transform = 'scale(1.5)';
                        i++;
                    } else {
                        clearInterval(moveInterval);
                        cursor.style.background = '#ff0000';
                        cursor.style.transform = 'scale(1)';
                    }
                }, 500);
                
                return true;
            }
            return false;
            """
            
            result = self.driver.execute_script(test_script)
            if result:
                self.logger.info("✅ Cursor test completed - you should see it moving around")
                time.sleep(3)  # Wait for test to complete
            else:
                self.logger.warning("⚠️ Cursor test failed - cursor may not be visible")
                
        except Exception as e:
            self.logger.warning(f"Could not test cursor: {e}")
    
    def setup_browser(self):
        """Setup Chrome browser with appropriate options"""
        try:
            from selenium.webdriver.chrome.service import Service
            from webdriver_manager.chrome import ChromeDriverManager
            
            chrome_options = Options()
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-blink-features=AutomationControlled")
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)
            
            # Make cursor visible and add visual indicators
            chrome_options.add_argument("--disable-extensions-except")
            chrome_options.add_argument("--disable-plugins-discovery")
            chrome_options.add_argument("--disable-default-apps")
            
            if os.getenv('BROWSER_HEADLESS', 'false').lower() == 'true':
                chrome_options.add_argument("--headless")
            
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            
            # Set window size and position for better visibility
            width = int(os.getenv('BROWSER_WINDOW_WIDTH', 1920))
            height = int(os.getenv('BROWSER_WINDOW_HEIGHT', 1080))
            self.driver.set_window_size(width, height)
            self.driver.set_window_position(0, 0)  # Position at top-left for visibility
            
            # Set timeouts
            timeout = int(os.getenv('BROWSER_TIMEOUT', 10))
            self.driver.set_page_load_timeout(timeout)
            self.driver.implicitly_wait(5)
            
            # Add visual cursor indicator
            self.add_cursor_indicator()
            
            # Add progress indicator
            self.add_progress_indicator()
            
            # Test cursor visibility
            self.test_cursor_visibility()
            
            return True
        except Exception as e:
            self.logger.error(f"Failed to setup browser: {e}")
            return False
    
    def add_cursor_indicator(self):
        """Add a visible cursor indicator to show automation progress"""
        try:
            cursor_script = """
            // Create a highly visible cursor indicator
            const cursor = document.createElement('div');
            cursor.id = 'cua-cursor';
            cursor.style.cssText = `
                position: fixed;
                width: 30px;
                height: 30px;
                background: #ff0000;
                border: 3px solid #ffffff;
                border-radius: 50%;
                pointer-events: none;
                z-index: 999999;
                transition: all 0.2s ease;
                box-shadow: 0 0 20px #ff0000, 0 0 40px #ff0000;
                animation: pulse 1s infinite;
            `;
            
            // Add pulse animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
            
            document.body.appendChild(cursor);
            
            // Position cursor at center initially
            cursor.style.left = '50%';
            cursor.style.top = '50%';
            cursor.style.transform = 'translate(-50%, -50%)';
            
            // Add cursor movement tracking
            document.addEventListener('mousemove', function(e) {
                cursor.style.left = (e.clientX - 15) + 'px';
                cursor.style.top = (e.clientY - 15) + 'px';
                cursor.style.transform = 'none';
            });
            
            // Add click indicator
            document.addEventListener('click', function(e) {
                cursor.style.background = '#00ff00';
                cursor.style.boxShadow = '0 0 20px #00ff00, 0 0 40px #00ff00';
                cursor.style.transform = 'scale(1.5)';
                setTimeout(() => {
                    cursor.style.background = '#ff0000';
                    cursor.style.boxShadow = '0 0 20px #ff0000, 0 0 40px #ff0000';
                    cursor.style.transform = 'scale(1)';
                }, 500);
            });
            
            // Make cursor more visible
            cursor.style.display = 'block';
            cursor.style.visibility = 'visible';
            
            console.log('CUA Cursor indicator added successfully');
            """
            self.driver.execute_script(cursor_script)
            self.logger.info("✅ Added highly visible cursor indicator")
            
            # Verify cursor was added
            cursor_check = self.driver.execute_script("return document.getElementById('cua-cursor') !== null;")
            if cursor_check:
                self.logger.info("✅ Cursor indicator verified and active")
            else:
                self.logger.warning("⚠️ Cursor indicator may not be visible")
                
        except Exception as e:
            self.logger.warning(f"Could not add cursor indicator: {e}")
    
    def add_progress_indicator(self):
        """Add a visual progress indicator to show automation steps"""
        try:
            progress_script = """
            // Create a progress indicator
            const progress = document.createElement('div');
            progress.id = 'cua-progress';
            progress.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 15px;
                border-radius: 10px;
                font-family: Arial, sans-serif;
                font-size: 14px;
                z-index: 999998;
                min-width: 250px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            `;
            
            progress.innerHTML = `
                <div style="margin-bottom: 10px; font-weight: bold; color: #00ff00;">
                    🤖 CUA Automation Running
                </div>
                <div id="cua-step" style="margin-bottom: 5px;">
                    Initializing...
                </div>
                <div id="cua-status" style="font-size: 12px; color: #ccc;">
                    Status: Starting
                </div>
            `;
            
            document.body.appendChild(progress);
            window.cuaProgress = progress;
            """
            self.driver.execute_script(progress_script)
            self.logger.info("✅ Added progress indicator")
        except Exception as e:
            self.logger.warning(f"Could not add progress indicator: {e}")
    
    def update_progress(self, step, status):
        """Update the progress indicator"""
        try:
            if not self.driver:
                return
            update_script = f"""
            if (window.cuaProgress) {{
                const stepEl = window.cuaProgress.querySelector('#cua-step');
                const statusEl = window.cuaProgress.querySelector('#cua-status');
                if (stepEl) stepEl.textContent = '{step}';
                if (statusEl) statusEl.textContent = 'Status: {status}';
            }}
            """
            self.driver.execute_script(update_script)
        except Exception as e:
            self.logger.warning(f"Could not update progress: {e}")
    
    def remove_indicators(self):
        """Remove all visual indicators"""
        try:
            cleanup_script = """
            // Remove cursor indicator
            const cursor = document.getElementById('cua-cursor');
            if (cursor) cursor.remove();
            
            // Remove progress indicator
            const progress = document.getElementById('cua-progress');
            if (progress) progress.remove();
            
            // Clean up global references
            delete window.cuaProgress;
            """
            self.driver.execute_script(cleanup_script)
            self.logger.info("✅ Removed visual indicators")
        except Exception as e:
            self.logger.warning(f"Could not remove indicators: {e}")
    
    def highlight_element(self, element, color="red"):
        """Highlight an element to show what the automation is interacting with"""
        try:
            highlight_script = f"""
            const element = arguments[0];
            const originalStyle = element.style.cssText;
            element.style.cssText += `
                outline: 3px solid {color} !important;
                outline-offset: 2px !important;
                box-shadow: 0 0 10px {color} !important;
                transition: all 0.3s ease !important;
            `;
            setTimeout(() => {{
                element.style.cssText = originalStyle;
            }}, 2000);
            """
            self.driver.execute_script(highlight_script, element)
        except Exception as e:
            self.logger.warning(f"Could not highlight element: {e}")
    
    def move_cursor_to_element(self, element, description="element"):
        """Move cursor to element with visual feedback"""
        try:
            # Get element location
            location = element.location
            size = element.size
            
            # Move cursor to element center
            center_x = location['x'] + size['width'] // 2
            center_y = location['y'] + size['height'] // 2
            
            # Execute cursor movement
            move_script = f"""
            const cursor = document.getElementById('cua-cursor');
            if (cursor) {{
                cursor.style.left = '{center_x}px';
                cursor.style.top = '{center_y}px';
                cursor.style.background = '#ffff00';
                cursor.style.boxShadow = '0 0 20px #ffff00, 0 0 40px #ffff00';
                cursor.style.transform = 'scale(1.3)';
                
                // Reset after 1 second
                setTimeout(() => {{
                    cursor.style.background = '#ff0000';
                    cursor.style.boxShadow = '0 0 20px #ff0000, 0 0 40px #ff0000';
                    cursor.style.transform = 'scale(1)';
                }}, 1000);
            }}
            """
            self.driver.execute_script(move_script)
            
            self.logger.info(f"🖱️ Moved cursor to {description}")
            time.sleep(0.5)
            
        except Exception as e:
            self.logger.warning(f"Could not move cursor: {e}")
    
    def click_with_visibility(self, element, description="element"):
        """Click an element with enhanced visual feedback"""
        try:
            self.logger.info(f"🖱️ Clicking {description}...")
            
            # Move cursor to element first
            self.move_cursor_to_element(element, description)
            
            # Highlight the element before clicking
            self.highlight_element(element, "blue")
            time.sleep(0.5)
            
            # Move to element and click with ActionChains for better visibility
            from selenium.webdriver.common.action_chains import ActionChains
            actions = ActionChains(self.driver)
            
            # Move to element, pause, then click
            actions.move_to_element(element).pause(1).click().perform()
            
            # Show click feedback
            click_feedback = f"""
            const cursor = document.getElementById('cua-cursor');
            if (cursor) {{
                cursor.style.background = '#00ff00';
                cursor.style.boxShadow = '0 0 20px #00ff00, 0 0 40px #00ff00';
                cursor.style.transform = 'scale(2)';
                setTimeout(() => {{
                    cursor.style.background = '#ff0000';
                    cursor.style.boxShadow = '0 0 20px #ff0000, 0 0 40px #ff0000';
                    cursor.style.transform = 'scale(1)';
                }}, 800);
            }}
            """
            self.driver.execute_script(click_feedback)
            
            self.logger.info(f"✅ Clicked {description}")
            time.sleep(1)  # Pause to show the action
            
        except Exception as e:
            self.logger.error(f"❌ Failed to click {description}: {e}")
            raise
    
    def login_to_google_ads(self):
        """Login to Google Ads dashboard"""
        try:
            self.logger.info("Starting Google Ads login process...")
            self.logger.info("Please login to your Google Ads account in the browser window")
            self.logger.info("DO NOT CLOSE THE BROWSER WINDOW MANUALLY")
            
            self.driver.get("https://ads.google.com")
            
            try:
                WebDriverWait(self.driver, 300).until(
                    lambda driver: any([
                        "ads.google.com/aw" in driver.current_url,
                        "ads.google.com/home" in driver.current_url,
                        "ads.google.com/nav" in driver.current_url,
                        "ads.google.com/my-account" in driver.current_url
                    ])
                )
                return True
            except TimeoutException:
                self.logger.error("Login timeout - please try again")
                return False
            
        except Exception as e:
            self.logger.error(f"Login failed: {e}")
            if "no such window" in str(e) or "target window already closed" in str(e):
                self.logger.error("Browser window was closed manually. Please do not close the browser during automation.")
            return False
    
    def navigate_to_campaign(self, campaign_name):
        """Navigate to a specific campaign by name"""
        try:
            self.logger.info(f"🧭 Navigating to campaign: {campaign_name}")
            
            try:
                current_url = self.driver.current_url
            except Exception as window_error:
                self.logger.error("Browser window appears to be closed")
                return False
            
            if not self.navigate_to_campaigns_overview():
                return False
            
            time.sleep(3)
            
            # First try exact match
            try:
                campaign_link = WebDriverWait(self.driver, 10).until(
                    EC.element_to_be_clickable((By.XPATH, f"//a[contains(text(), '{campaign_name}')]"))
                )
                self.click_with_visibility(campaign_link, f"campaign: {campaign_name}")
                return True
            except Exception as e:
                self.logger.warning(f"Could not find exact match for campaign: '{campaign_name}'")
            
            # Try partial matches with different strategies
            search_strategies = [
                # Strategy 1: Look for any element containing campaign name
                f"//*[contains(text(), '{campaign_name}')]",
                # Strategy 2: Look for links containing campaign name
                f"//a[contains(text(), '{campaign_name}')]",
                # Strategy 3: Look for divs containing campaign name
                f"//div[contains(text(), '{campaign_name}')]",
                # Strategy 4: Look for spans containing campaign name
                f"//span[contains(text(), '{campaign_name}')]"
            ]
            
            for strategy in search_strategies:
                try:
                    elements = self.driver.find_elements(By.XPATH, strategy)
                    if elements:
                        for element in elements:
                            try:
                                if element.is_displayed() and element.is_enabled():
                                    self.click_with_visibility(element, f"campaign using strategy: {strategy}")
                                    return True
                            except:
                                continue
                except:
                    continue
            
            # Strategy 5: Try breaking down the campaign name into parts
            name_parts = campaign_name.split()
            for part in name_parts:
                if len(part) > 2:  # Only use meaningful parts
                    try:
                        # Look for any clickable element containing this part
                        elements = self.driver.find_elements(By.XPATH, f"//*[contains(text(), '{part}')]")
                        for element in elements:
                            try:
                                if element.is_displayed() and element.is_enabled():
                                    self.click_with_visibility(element, f"campaign containing part: '{part}'")
                                    return True
                            except:
                                continue
                    except:
                        continue
            
            # Strategy 6: Look for any campaign-like elements
            try:
                campaign_elements = self.driver.find_elements(By.XPATH, "//a[contains(@href, 'campaign') or contains(text(), 'Campaign')]")
                if campaign_elements:
                    # Click on the first available campaign
                    self.click_with_visibility(campaign_elements[0], "generic campaign element")
                    return True
            except:
                pass
            
            self.logger.warning(f"Could not find campaign: {campaign_name}")
            return False
                
        except Exception as e:
            self.logger.error(f"Failed to navigate to campaign: {e}")
            return False
    
    def navigate_to_campaigns_overview(self):
        """Navigate to the campaigns overview page"""
        try:
            self.logger.info("🧭 Navigating to campaigns overview...")
            
            try:
                current_url = self.driver.current_url
            except Exception as window_error:
                self.logger.error("Browser window appears to be closed")
                return False
            
            try:
                self.driver.get("https://ads.google.com/aw/campaigns")
                time.sleep(5)
                
                current_url = self.driver.current_url
                if current_url and "campaigns" in current_url.lower():
                    self.logger.info("✅ Successfully navigated to campaigns overview")
                    return True
                
                # Try to find and click on Campaigns in the navigation
                campaigns_link = WebDriverWait(self.driver, 10).until(
                    EC.element_to_be_clickable((By.XPATH, "//a[contains(text(), 'Campaign') or contains(@href, 'campaign')]"))
                )
                self.click_with_visibility(campaigns_link, "campaigns navigation link")
                time.sleep(3)
                
                current_url = self.driver.current_url
                return current_url and "campaigns" in current_url.lower()
                
            except Exception as e:
                self.logger.error(f"Navigation error: {e}")
                return False
                
        except Exception as e:
            self.logger.error(f"Failed to navigate to campaigns overview: {e}")
            return False
    
    def perform_campaign_audit(self, campaign_name=None):
        """Perform an audit on a campaign"""
        try:
            self.logger.info("🔍 Performing campaign audit...")
            self.update_progress("Extracting campaign metrics", "In Progress")
            
            # Wait for page to load
            time.sleep(3)
            
            metrics = {}
            
            # Strategy 1: Look for common metric patterns
            try:
                metric_selectors = [
                    "//div[contains(@class, 'metric')]",
                    "//div[contains(@class, 'stat')]",
                    "//div[contains(@class, 'number')]",
                    "//span[contains(@class, 'metric')]",
                    "//span[contains(@class, 'stat')]",
                    "//div[contains(@class, 'performance')]",
                    "//div[contains(@class, 'data')]"
                ]
                
                for selector in metric_selectors:
                    elements = self.driver.find_elements(By.XPATH, selector)
                    for element in elements:
                        try:
                            text = element.text.strip()
                            if text and any(char.isdigit() for char in text):
                                # Try to find a label nearby
                                parent = element.find_element(By.XPATH, "./..")
                                siblings = parent.find_elements(By.XPATH, ".//*")
                                
                                for sibling in siblings:
                                    sibling_text = sibling.text.strip()
                                    if sibling_text and not any(char.isdigit() for char in sibling_text) and len(sibling_text) > 2:
                                        metrics[sibling_text] = text
                                        break
                                else:
                                    # If no label found, use element's own text as both label and value
                                    if len(text) < 20:  # Avoid very long text
                                        metrics[f"Metric_{len(metrics)+1}"] = text
                        except:
                            continue
            except Exception as e:
                self.logger.warning(f"Strategy 1 failed: {e}")
            
            # Strategy 2: Look for specific metric patterns
            try:
                metric_patterns = [
                    "//*[contains(text(), 'Impressions')]",
                    "//*[contains(text(), 'Clicks')]",
                    "//*[contains(text(), 'Conversions')]",
                    "//*[contains(text(), 'Cost')]",
                    "//*[contains(text(), 'CTR')]",
                    "//*[contains(text(), 'CPC')]",
                    "//*[contains(text(), 'CPA')]",
                    "//*[contains(text(), 'Budget')]",
                    "//*[contains(text(), 'Spent')]",
                    "//*[contains(text(), 'Revenue')]"
                ]
                
                for pattern in metric_patterns:
                    try:
                        elements = self.driver.find_elements(By.XPATH, pattern)
                        for element in elements:
                            try:
                                # Get the parent container to find the value
                                parent = element.find_element(By.XPATH, "./..")
                                value_elements = parent.find_elements(By.XPATH, ".//*[contains(@class, 'value') or contains(@class, 'number') or contains(@class, 'metric')]")
                                
                                if value_elements:
                                    value = value_elements[0].text.strip()
                                    if value and any(char.isdigit() for char in value):
                                        label = element.text.strip()
                                        metrics[label] = value
                            except:
                                continue
                    except Exception as e:
                        self.logger.warning(f"Pattern {pattern} failed: {e}")
                        continue
            except Exception as e:
                self.logger.warning(f"Strategy 2 failed: {e}")
            
            # Strategy 3: Look for table data
            try:
                tables = self.driver.find_elements(By.TAG_NAME, "table")
                for table in tables:
                    rows = table.find_elements(By.TAG_NAME, "tr")
                    for row in rows:
                        cells = row.find_elements(By.TAG_NAME, "td")
                        if len(cells) >= 2:
                            try:
                                label = cells[0].text.strip()
                                value = cells[1].text.strip()
                                if label and value and any(char.isdigit() for char in value):
                                    metrics[label] = value
                            except:
                                continue
            except Exception as e:
                self.logger.warning(f"Strategy 3 failed: {e}")
            
            # Strategy 4: Look for Google Ads specific patterns
            try:
                # Look for metric cards or panels
                metric_containers = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'metric') or contains(@class, 'stat') or contains(@class, 'card') or contains(@class, 'panel')]")
                
                for container in metric_containers:
                    try:
                        text = container.text.strip()
                        if text and len(text) < 200:  # Avoid very long text
                            # Look for patterns like "Label: Value" or "Label Value"
                            lines = text.split('\n')
                            for line in lines:
                                line = line.strip()
                                if ':' in line:
                                    parts = line.split(':', 1)
                                    if len(parts) == 2:
                                        label = parts[0].strip()
                                        value = parts[1].strip()
                                        if label and value and any(char.isdigit() for char in value):
                                            metrics[label] = value
                                elif any(char.isdigit() for char in line):
                                    # Try to split on common separators
                                    for separator in [' ', '\t', '-', '|']:
                                        if separator in line:
                                            parts = line.split(separator, 1)
                                            if len(parts) == 2:
                                                label = parts[0].strip()
                                                value = parts[1].strip()
                                                if label and value and any(char.isdigit() for char in value) and len(label) < 50:
                                                    metrics[label] = value
                                                    break
                    except:
                        continue
            except Exception as e:
                self.logger.warning(f"Strategy 4 failed: {e}")
            
            # Strategy 5: Look for any text containing numbers that might be metrics
            try:
                # Get all text elements and look for metric-like patterns
                all_elements = self.driver.find_elements(By.XPATH, "//*[text()]")
                for element in all_elements:
                    try:
                        text = element.text.strip()
                        if text and len(text) < 100 and any(char.isdigit() for char in text):
                            # Look for common metric patterns
                            if any(keyword in text.lower() for keyword in ['impression', 'click', 'conversion', 'cost', 'ctr', 'cpc', 'cpa', 'budget', 'spent', 'revenue']):
                                # Try to extract label and value
                                if ':' in text:
                                    parts = text.split(':', 1)
                                    if len(parts) == 2:
                                        label = parts[0].strip()
                                        value = parts[1].strip()
                                        if label and value and any(char.isdigit() for char in value):
                                            metrics[label] = value
                    except:
                        continue
            except Exception as e:
                self.logger.warning(f"Strategy 5 failed: {e}")
            
            # Log the results
            if metrics:
                self.logger.info("📊 Campaign Metrics Found:")
                for label, value in metrics.items():
                    self.logger.info(f"   {label}: {value}")
                    self.update_progress(f"Found metric: {label}", "In Progress")
            else:
                self.logger.info("⚠️ No metrics found using standard methods")
                
                # Take a screenshot for debugging
                try:
                    self.driver.save_screenshot("campaign_audit_debug.png")
                    self.logger.info("📸 Screenshot saved for debugging")
                except:
                    pass
                
                # Try to get page source for analysis
                try:
                    page_source = self.driver.page_source
                    if "impression" in page_source.lower() or "click" in page_source.lower():
                        self.logger.info("ℹ️ Page contains metric-related text, but couldn't extract structured data")
                except:
                    pass
            
            self.update_progress("Campaign audit completed", "Success")
            return True
            
        except Exception as e:
            self.logger.error(f"Error performing campaign audit: {e}")
            self.update_progress("Campaign audit failed", "Error")
            return False
    
    def set_date_range(self, months=3):
        """Set the date range for performance analysis"""
        try:
            self.logger.info(f"📅 Setting date range to {months} months")
            self.update_progress(f"Setting date range: {months} months", "In Progress")
            
            # Look for date picker elements
            date_selectors = [
                "//button[contains(@aria-label, 'Date')]",
                "//button[contains(@aria-label, 'Range')]",
                "//div[contains(@class, 'date')]",
                "//input[contains(@type, 'date')]",
                "//button[contains(text(), 'Date')]",
                "//button[contains(text(), 'Range')]",
                "//button[contains(text(), 'Last')]",
                "//div[contains(text(), 'Date')]"
            ]
            
            date_button = None
            for selector in date_selectors:
                try:
                    elements = self.driver.find_elements(By.XPATH, selector)
                    for element in elements:
                        if element.is_displayed() and element.is_enabled():
                            date_button = element
                            break
                    if date_button:
                        break
                except:
                    continue
            
            if date_button:
                self.click_with_visibility(date_button, "date picker button")
                time.sleep(2)
                
                # Try to find and click on "Last 3 months" or similar
                range_options = [
                    "//*[contains(text(), 'Last 3 months')]",
                    "//*[contains(text(), '3 months')]",
                    "//*[contains(text(), '90 days')]",
                    "//*[contains(text(), 'Quarter')]",
                    "//*[contains(text(), 'Last quarter')]"
                ]
                
                for option in range_options:
                    try:
                        elements = self.driver.find_elements(By.XPATH, option)
                        for element in elements:
                            if element.is_displayed() and element.is_enabled():
                                self.click_with_visibility(element, f"date range: {element.text}")
                                time.sleep(2)
                                self.logger.info(f"✅ Set date range to: {element.text}")
                                return True
                    except:
                        continue
                
                self.logger.warning("Could not find specific date range option")
            else:
                self.logger.info("No date picker found, continuing with default range")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error setting date range: {e}")
            return False
    
    def run_automation(self, command=None, description=None):
        """Run the automation workflow"""
        try:
            self.update_progress("Setting up browser", "Initializing")
            if not self.setup_browser():
                self.logger.error("Failed to setup browser")
                return False
            
            self.update_progress("Logging into Google Ads", "In Progress")
            if not self.login_to_google_ads():
                self.logger.error("Failed to login to Google Ads")
                return False
            
            # Check if 3-month analysis is requested
            if description and '3 months' in description.lower():
                self.update_progress("Setting 3-month date range", "In Progress")
                self.set_date_range(3)
            
            if command and 'audit' in command.lower():
                self.update_progress("Analyzing command", "Processing")
                campaign_name = None
                import re
                patterns = [
                    r'named\s+([^,\.]+)',
                    r'for\s+([^,\.]+)',
                    r'on\s+([^,\.]+)',
                    r'campaign\s+([^,\.]+)',
                    r'the\s+([^,\.]+)\s+campaign',
                    r'my\s+([^,\.]+)\s+campaign'
                ]
                
                for pattern in patterns:
                    match = re.search(pattern, command, re.IGNORECASE)
                    if match:
                        campaign_name = match.group(1).strip()
                        campaign_name = re.sub(r'^(the|my)\s+', '', campaign_name, flags=re.IGNORECASE)
                        break
                
                if campaign_name:
                    self.logger.info(f"🎯 Target campaign identified: {campaign_name}")
                    self.update_progress(f"Navigating to campaign: {campaign_name}", "In Progress")
                    if self.navigate_to_campaign(campaign_name):
                        self.update_progress("Performing campaign audit", "In Progress")
                        self.perform_campaign_audit(campaign_name)
                    else:
                        self.logger.error(f"Could not navigate to campaign: {campaign_name}")
                else:
                    self.logger.info("ℹ️ No specific campaign identified")
                    self.update_progress("Navigating to campaigns overview", "In Progress")
                    if self.navigate_to_campaigns_overview():
                        self.update_progress("Performing general audit", "In Progress")
                        self.perform_campaign_audit()
            
            self.update_progress("Automation completed", "Success")
            return True
            
        except Exception as e:
            self.logger.error(f"Error in automation: {e}")
            self.update_progress("Error occurred", "Failed")
            return False
        finally:
            if self.driver:
                self.remove_indicators()
                self.driver.quit()
                self.logger.info("Browser closed")

def main():
    try:
        command = sys.argv[1] if len(sys.argv) > 1 else None
        description = sys.argv[2] if len(sys.argv) > 2 else None
        
        automation = GoogleAdsCUAAutomation()
        success = automation.run_automation(command, description)
        
        if success:
            print("Automation completed successfully")
            sys.exit(0)
        else:
            print("Automation failed")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\nAutomation interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()