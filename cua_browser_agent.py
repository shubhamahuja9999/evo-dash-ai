import asyncio
from playwright.async_api import async_playwright
from openai import OpenAI
import json
import re
import random

# Initialize OpenAI
client = OpenAI()

# ---- SYSTEM PROMPT (CUA Agent) ----
CUA_SYSTEM_PROMPT = """
You are a Computer Using Agent (CUA) with two modes:

1. Normal Mode: Answer directly with reasoning.
2. Browser Mode: If the task requires live data or navigating the web, follow this loop:

   a. search(query) → form best search query
   b. open_url(url) → choose relevant result
   c. extract(content) → retrieve needed info
   d. repeat if necessary
   e. summarize results for the user with sources

Available browser actions: search(query), open_url(url), click(text), scroll(direction), extract(content).

Always explain what action you're taking before executing it.
Do not fabricate sources.

Return your response in this JSON format:
{
    "mode": "normal" or "browser",
    "reasoning": "explanation of your thought process",
    "actions": [
        {
            "type": "search" | "open_url" | "click" | "scroll" | "extract",
            "params": { parameters for the action },
            "explanation": "why this action is needed"
        }
    ],
    "summary": "final answer or next steps"
}
"""

class BrowserAgent:
    def __init__(self):
        self.current_url = None
        self.history = []
        self.extracted_content = {}

    async def execute_action(self, page, action):
        action_type = action["type"]
        params = action["params"]
        
        # Add random delay between actions to appear more human-like
        await asyncio.sleep(random.uniform(1, 3))
        
        try:
            if action_type == "search":
                query = params["query"]
                print(f"\n🔍 Searching for: {query}")
                await page.goto(f"https://www.google.com/search?q={query}")
                self.current_url = page.url
                
                # Extract search results
                results = await page.evaluate("""() => {
                    const results = [];
                    document.querySelectorAll('div.g').forEach(el => {
                        const title = el.querySelector('h3')?.textContent;
                        const link = el.querySelector('a')?.href;
                        const snippet = el.querySelector('div.VwiC3b')?.textContent;
                        if (title && link) {
                            results.push({ title, link, snippet });
                        }
                    });
                    return results;
                }""")
                
                return {
                    "type": "search_results",
                    "url": self.current_url,
                    "results": results[:5]  # Top 5 results
                }

            elif action_type == "open_url":
                url = params["url"]
                print(f"\n🌐 Opening URL: {url}")
                await page.goto(url)
                self.current_url = page.url
                return {
                    "type": "page_loaded",
                    "url": self.current_url,
                    "title": await page.title()
                }

            elif action_type == "click":
                selector = params.get("selector") or params.get("text")
                print(f"\n🖱️ Clicking: {selector}")
                if params.get("text"):
                    await page.click(f"text={params['text']}")
                else:
                    await page.click(selector)
                return {
                    "type": "click_completed",
                    "selector": selector
                }

            elif action_type == "scroll":
                direction = params["direction"]
                print(f"\n📜 Scrolling: {direction}")
                if direction == "down":
                    await page.evaluate("window.scrollBy(0, window.innerHeight)")
                else:
                    await page.evaluate("window.scrollBy(0, -window.innerHeight)")
                return {
                    "type": "scroll_completed",
                    "direction": direction
                }

            elif action_type == "extract":
                selector = params.get("selector", "body")
                print(f"\n📑 Extracting content from: {selector}")
                content = await page.inner_text(selector)
                self.extracted_content[self.current_url] = content
                return {
                    "type": "extracted_content",
                    "url": self.current_url,
                    "content": content[:1000] + "..." if len(content) > 1000 else content
                }

        except Exception as e:
            print(f"\n❌ Error executing {action_type}: {str(e)}")
            return {
                "type": "error",
                "action": action_type,
                "error": str(e)
            }

    async def process_request(self, user_input):
        print("\n🤖 Processing request:", user_input)

        # Step 1: Get initial analysis from GPT
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": CUA_SYSTEM_PROMPT},
                {"role": "user", "content": user_input}
            ],
            temperature=0.2
        )

        try:
            decision = json.loads(response.choices[0].message.content)
            print(f"\n🧠 Agent Decision:", json.dumps(decision, indent=2))

            if decision["mode"] == "normal":
                return {
                    "type": "response",
                    "content": decision["summary"]
                }

            # Browser Mode - Execute actions
            async with async_playwright() as p:
                # Launch browser with specific options to avoid 403
                browser = await p.chromium.launch(
                    headless=False,
                    args=[
                        '--disable-blink-features=AutomationControlled',
                        '--disable-web-security',
                        '--no-sandbox',
                        '--disable-features=IsolateOrigins,site-per-process',
                        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                    ]
                )
                # Configure the page to avoid detection
                context = await browser.new_context(
                    viewport={'width': 1920, 'height': 1080},
                    user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                )
                page = await context.new_page()
                
                # Add scripts to mask automation
                await page.add_init_script("""
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    });
                    window.chrome = {
                        runtime: {}
                    };
                """)
                
                results = []
                for action in decision["actions"]:
                    result = await self.execute_action(page, action)
                    results.append(result)
                    
                    # After each action, ask GPT to analyze and decide next steps
                    analysis = client.chat.completions.create(
                        model="gpt-4",
                        messages=[
                            {"role": "system", "content": CUA_SYSTEM_PROMPT},
                            {"role": "user", "content": user_input},
                            {"role": "assistant", "content": json.dumps(decision)},
                            {"role": "user", "content": f"Action result: {json.dumps(result)}. Should we take more actions or summarize the findings?"}
                        ],
                        temperature=0.2
                    )
                    
                    next_step = json.loads(analysis.choices[0].message.content)
                    if not next_step.get("actions"):
                        # No more actions needed, return summary
                        await browser.close()
                        return {
                            "type": "response",
                            "content": next_step["summary"],
                            "sources": list(self.extracted_content.keys())
                        }
                    
                    # Continue with next actions
                    decision = next_step

                await browser.close()
                return {
                    "type": "response",
                    "content": "Browser actions completed",
                    "results": results
                }

        except json.JSONDecodeError:
            return {
                "type": "error",
                "content": "Failed to parse agent response"
            }
        except Exception as e:
            return {
                "type": "error",
                "content": f"Error: {str(e)}"
            }

async def main():
    agent = BrowserAgent()
    while True:
        user_input = input("\n💬 Enter your request (or 'exit' to quit): ")
        if user_input.lower() == 'exit':
            break
            
        result = await agent.process_request(user_input)
        print("\n🤖 Agent Response:", json.dumps(result, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
