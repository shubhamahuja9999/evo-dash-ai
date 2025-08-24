// Import types only
import type { Browser, Page } from 'playwright';
import { ComputerAction } from './cua';

// We'll dynamically import playwright to avoid bundling issues
let chromium: any = null;

let browser: Browser | null = null;
let page: Page | null = null;

/**
 * Initialize the browser instance
 */
export async function initBrowser() {
  try {
    // Dynamically import playwright only when needed
    if (!chromium) {
      const playwright = await import('playwright');
      chromium = playwright.chromium;
    }

    if (!browser) {
      browser = await chromium.launch({
        headless: false,
        chromiumSandbox: true,
        env: {},
        args: ['--disable-extensions', '--disable-file-system'],
      });
    }
    
    if (!page) {
      page = await browser.newPage();
      await page.setViewportSize({ width: 1024, height: 768 });
    }
    
    return { browser, page };
  } catch (error) {
    console.error('Failed to initialize browser:', error);
    throw error;
  }
}

/**
 * Close the browser instance
 */
export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
    page = null;
  }
}

/**
 * Navigate to a URL
 */
export async function navigateTo(url: string) {
  if (!page) {
    await initBrowser();
  }
  
  if (page) {
    await page.goto(url);
  }
}

/**
 * Take a screenshot of the current page
 */
export async function takeScreenshot(): Promise<Buffer | null> {
  if (!page) {
    await initBrowser();
  }
  
  if (page) {
    return await page.screenshot();
  }
  
  return null;
}

/**
 * Execute a computer action on the page
 */
export async function executeAction(action: ComputerAction): Promise<void> {
  if (!page) {
    await initBrowser();
  }
  
  if (!page) {
    throw new Error('Browser page not initialized');
  }
  
  const actionType = action.type;
  
  try {
    switch (actionType) {
      case 'click': {
        const { x, y, button = 'left' } = action;
        console.log(`Action: click at (${x}, ${y}) with button '${button}'`);
        await page.mouse.click(x, y, { button: button as 'left' | 'right' | 'middle' });
        break;
      }
      
      case 'double_click': {
        const { x, y, button = 'left' } = action;
        console.log(`Action: double click at (${x}, ${y}) with button '${button}'`);
        await page.mouse.dblclick(x, y, { button: button as 'left' | 'right' | 'middle' });
        break;
      }
      
      case 'scroll': {
        const { x, y, scrollX, scrollY } = action;
        console.log(`Action: scroll at (${x}, ${y}) with offsets (scrollX=${scrollX}, scrollY=${scrollY})`);
        await page.mouse.move(x, y);
        await page.evaluate(`window.scrollBy(${scrollX}, ${scrollY})`);
        break;
      }
      
      case 'keypress': {
        const { keys } = action;
        for (const k of keys) {
          console.log(`Action: keypress '${k}'`);
          // A simple mapping for common keys; expand as needed.
          if (k.includes('ENTER')) {
            await page.keyboard.press('Enter');
          } else if (k.includes('SPACE')) {
            await page.keyboard.press(' ');
          } else {
            await page.keyboard.press(k);
          }
        }
        break;
      }
      
      case 'type': {
        const { text } = action;
        console.log(`Action: type text '${text}'`);
        await page.keyboard.type(text);
        break;
      }
      
      case 'wait': {
        console.log(`Action: wait`);
        await page.waitForTimeout(2000);
        break;
      }
      
      case 'screenshot': {
        // Nothing to do as screenshot is taken at each turn
        console.log(`Action: screenshot`);
        break;
      }
      
      default:
        console.log('Unrecognized action:', action);
    }
    
    // Wait a bit after each action to allow the page to update
    await page.waitForTimeout(500);
    
  } catch (e) {
    console.error('Error handling action', action, ':', e);
    throw e;
  }
}
