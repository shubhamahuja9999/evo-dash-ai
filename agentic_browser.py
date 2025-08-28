#!/usr/bin/env python3

"""
Agentic Browser - An intelligent browser agent that can understand goals,
plan actions, execute them, and adapt based on results.
"""

import asyncio
import json
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
from playwright.async_api import async_playwright, Page, Browser
from google_ads_simple_auth import GoogleAdsSimpleAuth
import openai

class ActionType(Enum):
    NAVIGATE = "navigate"
    CLICK = "click"
    TYPE = "type"
    SCROLL = "scroll"
    WAIT = "wait"
    EXTRACT = "extract"
    ANALYZE = "analyze"
    API_CALL = "api_call"
    SCREENSHOT = "screenshot"

class GoalStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    BLOCKED = "blocked"

@dataclass
class Action:
    type: ActionType
    target: str
    value: Optional[str] = None
    reasoning: str = ""
    expected_outcome: str = ""
    confidence: float = 0.8
    timeout: int = 30

@dataclass
class Goal:
    id: str
    description: str
    success_criteria: List[str]
    status: GoalStatus = GoalStatus.PENDING
    sub_goals: List['Goal'] = None
    context: Dict[str, Any] = None
    priority: int = 1  # 1 = highest

@dataclass
class ExecutionResult:
    success: bool
    data: Any = None
    error: str = ""
    screenshot_path: str = ""
    page_state: Dict[str, Any] = None

class AgenticBrowser:
    """
    An intelligent browser agent that can:
    1. Understand high-level goals
    2. Break them down into actionable steps
    3. Execute actions autonomously
    4. Adapt based on results
    5. Handle errors and unexpected situations
    """
    
    def __init__(self, openai_api_key: str = None):
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.google_ads_auth = GoogleAdsSimpleAuth()
        self.execution_history: List[Dict] = []
        self.current_goals: List[Goal] = []
        self.knowledge_base: Dict[str, Any] = {}
        
        # Initialize OpenAI if API key is provided
        if openai_api_key:
            self.openai_client = openai.OpenAI(api_key=openai_api_key)
        else:
            self.openai_client = None
            print("⚠️ OpenAI API key not provided. Running in basic mode.")

    async def initialize(self, headless: bool = False):
        """Initialize the browser with optimized settings"""
        playwright = await async_playwright().__aenter__()
        
        self.browser = await playwright.chromium.launch(
            headless=headless,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--no-sandbox',
                '--disable-features=IsolateOrigins,site-per-process'
            ]
        )
        
        context = await self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        
        self.page = await context.new_page()
        
        # Add stealth scripts
        await self.page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            window.chrome = { runtime: {} };
        """)
        
        print("🚀 Agentic Browser initialized")

    def parse_natural_language_goal(self, user_input: str) -> List[Goal]:
        """Parse natural language into structured goals"""
        if not self.openai_client:
            # Basic parsing without AI
            return self._basic_goal_parsing(user_input)
        
        try:
            prompt = f"""
            Parse this user request into structured goals for a browser automation agent:
            "{user_input}"
            
            Return a JSON array of goals with this structure:
            {{
                "id": "unique_id",
                "description": "what to accomplish",
                "success_criteria": ["criterion1", "criterion2"],
                "priority": 1-5,
                "context": {{"domain": "google_ads|general|ecommerce", "data_needed": []}}
            }}
            
            Be specific about success criteria and identify if this relates to Google Ads.
            """
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2
            )
            
            goals_data = json.loads(response.choices[0].message.content)
            goals = []
            
            for goal_data in goals_data:
                goal = Goal(
                    id=goal_data["id"],
                    description=goal_data["description"],
                    success_criteria=goal_data["success_criteria"],
                    priority=goal_data.get("priority", 1),
                    context=goal_data.get("context", {})
                )
                goals.append(goal)
                
            return goals
            
        except Exception as e:
            print(f"⚠️ AI goal parsing failed: {e}. Using basic parsing.")
            return self._basic_goal_parsing(user_input)

    def _basic_goal_parsing(self, user_input: str) -> List[Goal]:
        """Basic goal parsing without AI"""
        # Simple keyword-based parsing
        goal_id = f"goal_{int(time.time())}"
        
        context = {"domain": "general"}
        if any(word in user_input.lower() for word in ["google ads", "campaign", "advertising"]):
            context["domain"] = "google_ads"
        
        goal = Goal(
            id=goal_id,
            description=user_input,
            success_criteria=["Task completed successfully"],
            context=context
        )
        
        return [goal]

    async def plan_actions(self, goal: Goal) -> List[Action]:
        """Generate a plan of actions to achieve a goal"""
        if not self.openai_client:
            return self._basic_action_planning(goal)
        
        try:
            # Get current page state
            current_url = await self.page.url() if self.page else "about:blank"
            page_title = await self.page.title() if self.page else ""
            
            prompt = f"""
            Plan actions to achieve this goal:
            Goal: {goal.description}
            Success Criteria: {goal.success_criteria}
            Context: {goal.context}
            Current URL: {current_url}
            Current Page: {page_title}
            
            Available actions: navigate, click, type, scroll, wait, extract, analyze, api_call, screenshot
            
            Return a JSON array of actions:
            {{
                "type": "action_type",
                "target": "css_selector_or_url",
                "value": "text_to_type_or_null",
                "reasoning": "why this action",
                "expected_outcome": "what should happen",
                "confidence": 0.8
            }}
            
            Be specific with selectors and consider Google Ads interface if relevant.
            """
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3
            )
            
            actions_data = json.loads(response.choices[0].message.content)
            actions = []
            
            for action_data in actions_data:
                action = Action(
                    type=ActionType(action_data["type"]),
                    target=action_data["target"],
                    value=action_data.get("value"),
                    reasoning=action_data.get("reasoning", ""),
                    expected_outcome=action_data.get("expected_outcome", ""),
                    confidence=action_data.get("confidence", 0.8)
                )
                actions.append(action)
                
            return actions
            
        except Exception as e:
            print(f"⚠️ AI action planning failed: {e}. Using basic planning.")
            return self._basic_action_planning(goal)

    def _basic_action_planning(self, goal: Goal) -> List[Action]:
        """Basic action planning without AI"""
        actions = []
        
        if goal.context.get("domain") == "google_ads":
            actions = [
                Action(
                    type=ActionType.NAVIGATE,
                    target="https://ads.google.com",
                    reasoning="Navigate to Google Ads",
                    expected_outcome="Google Ads interface loads"
                ),
                Action(
                    type=ActionType.WAIT,
                    target="5",
                    reasoning="Wait for page to load",
                    expected_outcome="Page fully loaded"
                )
            ]
        else:
            # Generic web task
            actions = [
                Action(
                    type=ActionType.SCREENSHOT,
                    target="current_state",
                    reasoning="Capture current state",
                    expected_outcome="Screenshot taken"
                )
            ]
        
        return actions

    async def execute_action(self, action: Action) -> ExecutionResult:
        """Execute a single action with error handling and adaptation"""
        try:
            print(f"🔄 Executing: {action.type.value} - {action.reasoning}")
            
            if action.type == ActionType.NAVIGATE:
                await self.page.goto(action.target, wait_until="networkidle")
                success = True
                data = {"url": action.target}
                
            elif action.type == ActionType.CLICK:
                element = await self.page.wait_for_selector(action.target, timeout=action.timeout * 1000)
                await element.click()
                success = True
                data = {"clicked": action.target}
                
            elif action.type == ActionType.TYPE:
                element = await self.page.wait_for_selector(action.target, timeout=action.timeout * 1000)
                await element.fill(action.value)
                success = True
                data = {"typed": action.value, "into": action.target}
                
            elif action.type == ActionType.SCROLL:
                if action.target == "down":
                    await self.page.evaluate("window.scrollBy(0, window.innerHeight)")
                elif action.target == "up":
                    await self.page.evaluate("window.scrollBy(0, -window.innerHeight)")
                success = True
                data = {"scrolled": action.target}
                
            elif action.type == ActionType.WAIT:
                await asyncio.sleep(int(action.target))
                success = True
                data = {"waited": action.target}
                
            elif action.type == ActionType.EXTRACT:
                elements = await self.page.query_selector_all(action.target)
                extracted_data = []
                for element in elements:
                    text = await element.inner_text()
                    extracted_data.append(text)
                success = True
                data = {"extracted": extracted_data}
                
            elif action.type == ActionType.SCREENSHOT:
                timestamp = int(time.time())
                screenshot_path = f"screenshots/screenshot_{timestamp}.png"
                await self.page.screenshot(path=screenshot_path, full_page=True)
                success = True
                data = {"screenshot": screenshot_path}
                
            elif action.type == ActionType.API_CALL:
                # Use Google Ads API
                if "campaigns" in action.target.lower():
                    campaigns = self.google_ads_auth.get_campaigns()
                    success = True
                    data = {"campaigns": campaigns}
                else:
                    success = False
                    data = {"error": "Unknown API call"}
                    
            else:
                success = False
                data = {"error": f"Unknown action type: {action.type}"}
            
            # Get page state after action
            page_state = {
                "url": await self.page.url(),
                "title": await self.page.title(),
                "timestamp": time.time()
            }
            
            result = ExecutionResult(
                success=success,
                data=data,
                page_state=page_state
            )
            
            # Log execution
            self.execution_history.append({
                "action": action.__dict__,
                "result": result.__dict__,
                "timestamp": time.time()
            })
            
            print(f"✅ Action completed: {action.type.value}")
            return result
            
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Action failed: {action.type.value} - {error_msg}")
            
            return ExecutionResult(
                success=False,
                error=error_msg
            )

    async def handle_error(self, error: str) -> None:
        """Handle browser errors"""
        print(f"❌ Browser error: {error}")
        # Take a screenshot for debugging
        try:
            timestamp = int(time.time())
            await self.page.screenshot(path=f"error_screenshot_{timestamp}.png")
        except:
            pass

    async def execute_goal(self, goal: Goal) -> bool:
        """Execute a complete goal with planning, execution, and adaptation"""
        print(f"\n🎯 Starting goal: {goal.description}")
        goal.status = GoalStatus.IN_PROGRESS
        
        try:
            # Plan initial actions
            actions = await self.plan_actions(goal)
            print(f"📋 Planned {len(actions)} actions")
            
            for i, action in enumerate(actions):
                print(f"\n📝 Step {i+1}/{len(actions)}: {action.reasoning}")
                
                result = await self.execute_action(action)
                
                if not result.success:
                    print(f"❌ Action failed, attempting adaptation...")
                    
                    # Try to adapt
                    adaptive_actions = await self.adapt_strategy(goal, action, result.error)
                    
                    if adaptive_actions:
                        print(f"🔄 Trying {len(adaptive_actions)} adaptive actions...")
                        
                        for adaptive_action in adaptive_actions:
                            adaptive_result = await self.execute_action(adaptive_action)
                            if adaptive_result.success:
                                break
                        else:
                            print(f"❌ All adaptive actions failed")
                            goal.status = GoalStatus.FAILED
                            return False
                    else:
                        print(f"❌ No adaptation strategy available")
                        goal.status = GoalStatus.FAILED
                        return False
                
                # Check if goal is completed early
                if await self.check_goal_completion(goal):
                    goal.status = GoalStatus.COMPLETED
                    print(f"✅ Goal completed early!")
                    return True
            
            # Final check
            if await self.check_goal_completion(goal):
                goal.status = GoalStatus.COMPLETED
                print(f"✅ Goal completed successfully!")
                return True
            else:
                goal.status = GoalStatus.FAILED
                print(f"❌ Goal not achieved after all actions")
                return False
                
        except Exception as e:
            print(f"❌ Goal execution failed: {e}")
            goal.status = GoalStatus.FAILED
            return False

    async def check_goal_completion(self, goal: Goal) -> bool:
        """Check if a goal has been completed"""
        if not self.openai_client:
            # Basic completion check
            return len(self.execution_history) > 0 and self.execution_history[-1]["result"]["success"]
        
        try:
            # Get current page state
            current_url = await self.page.url()
            page_text = await self.page.inner_text("body")
            
            prompt = f"""
            Check if this goal has been completed:
            Goal: {goal.description}
            Success Criteria: {goal.success_criteria}
            Current URL: {current_url}
            Page Content (first 1000 chars): {page_text[:1000]}
            
            Return JSON: {{"completed": true/false, "reasoning": "explanation"}}
            """
            
            response = self.openai_client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1
            )
            
            result = json.loads(response.choices[0].message.content)
            print(f"🔍 Completion check: {result['reasoning']}")
            
            return result["completed"]
            
        except Exception as e:
            print(f"⚠️ Goal completion check failed: {e}")
            return False

    async def run(self, user_request: str) -> Dict[str, Any]:
        """Main entry point - run the agentic browser"""
        print(f"\n🤖 Agentic Browser starting...")
        print(f"📝 User request: {user_request}")
        
        # Parse goals
        goals = self.parse_natural_language_goal(user_request)
        print(f"🎯 Identified {len(goals)} goals")
        
        # Sort by priority
        goals.sort(key=lambda g: g.priority)
        
        results = {
            "success": True,
            "goals_completed": 0,
            "goals_failed": 0,
            "execution_summary": [],
            "data_collected": {}
        }
        
        # Execute each goal
        for goal in goals:
            success = await self.execute_goal(goal)
            
            if success:
                results["goals_completed"] += 1
            else:
                results["goals_failed"] += 1
                results["success"] = False
            
            results["execution_summary"].append({
                "goal": goal.description,
                "status": goal.status.value,
                "success": success
            })
        
        # Collect any data that was extracted
        for entry in self.execution_history:
            if entry["result"].get("data"):
                results["data_collected"].update(entry["result"]["data"])
        
        print(f"\n🏁 Execution complete!")
        print(f"✅ Goals completed: {results['goals_completed']}")
        print(f"❌ Goals failed: {results['goals_failed']}")
        
        return results

    async def cleanup(self):
        """Clean up resources"""
        if self.browser:
            await self.browser.close()
        print("🧹 Browser closed")

# Usage example
async def main():
    # Example usage
    agent = AgenticBrowser()
    await agent.initialize(headless=False)
    
    try:
        # Test with Google Ads task
        result = await agent.run(
            "Navigate to Google Ads and show me the performance of my B2B campaigns"
        )
        
        print(f"\n📊 Final Results:")
        print(json.dumps(result, indent=2))
        
    finally:
        await agent.cleanup()

if __name__ == "__main__":
    asyncio.run(main())
