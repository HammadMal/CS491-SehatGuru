import os
import json
import time
import random
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException, WebDriverException
import trafilatura

INPUT_FILE = "sources.txt"
OUTPUT_DIR = "scraped_data"
INDEX_FILE = os.path.join(OUTPUT_DIR, "index.json")

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

def setup_driver():
    options = uc.ChromeOptions()
    # options.add_argument("--headless") # Set to headless if you don't need to see it
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--blink-settings=imagesEnabled=false") 
    options.page_load_strategy = 'eager' # Don't wait for all resources to load
    
    driver = uc.Chrome(options=options, use_subprocess=True)
    driver.set_page_load_timeout(20) # Stricter timeout (20s)
    return driver

def scroll_page(driver):
    """
    Smart Scroll with Timeout: Scrolls to trigger content but gives up if it takes too long.
    """
    print("   -> Scrolling to trigger lazy content...")
    
    start_time = time.time()
    max_duration = 15 # Max seconds to spend scrolling
    
    last_height = driver.execute_script("return document.body.scrollHeight")
    max_scrolls = 15 
    
    for i in range(max_scrolls):
        # Timeout Check
        if time.time() - start_time > max_duration:
            print("   -> [TIMEOUT] Scroll took too long. Stopping early.")
            break

        # Scroll down by ~80% of the viewport height
        try:
            driver.execute_script("window.scrollBy(0, window.innerHeight * 0.8);")
            time.sleep(1.0) # Reduced wait time
            
            # Check if height grew
            new_height = driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                driver.execute_script("window.scrollBy(0, 200);")
                time.sleep(0.5)
                new_height_2 = driver.execute_script("return document.body.scrollHeight")
                if new_height_2 == last_height:
                    break 
            
            last_height = new_height
        except Exception:
            break

def scrape_with_trafilatura(driver, url, index):
    try:
        print(f"[{index}] Navigating: {url[:60]}...")
        try:
            driver.get(url)
        except TimeoutException:
            print("   -> [WARN] Page load timed out. Stopping load and scraping visible content...")
            try:
                driver.execute_script("window.stop();")
            except:
                pass
        except WebDriverException as e:
            print(f"   -> [SKIP] Navigation failed: {e}")
            return None
        
        # 1. Scroll to load everything (protected by timeout)
        scroll_page(driver)
        
        # 2. Get HTML
        try:
            html_content = driver.page_source
        except:
            print("   -> [SKIP] Could not get page source.")
            return None
        
        # 3. Extract with Trafilatura
        extracted_text = trafilatura.extract(html_content, include_comments=False, include_tables=True)
        
        # 4. Fallback
        if not extracted_text or len(extracted_text) < 200:
            print("   -> Trafilatura parsing weak. Fallback to raw body text.")
            try:
                extracted_text = driver.find_element(By.TAG_NAME, "body").text
            except:
                extracted_text = ""

        # 5. Metadata
        title = driver.title
        
        # 6. Save Data
        if not extracted_text or len(extracted_text) < 100:
            print("   -> [SKIP] Content too short/empty.")
            return None

        data = {
            "id": index,
            "url": url,
            "title": title,
            "text": extracted_text,
            "method": "selenium_trafilatura"
        }
        
        filename = f"page_{index}.json"
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
            
        print(f"   -> [SUCCESS] Saved {len(extracted_text)} chars.")
        return {"id": index, "url": url, "file": filename}

    except Exception as e:
        print(f"   -> [ERROR] {e}")
        return None

def run_scraper():
    if not os.path.exists(INPUT_FILE):
        print("Error: sources.txt not found.")
        return

    with open(INPUT_FILE, "r") as f:
        urls = [line.strip() for line in f if line.strip()]

    print(f"Loaded {len(urls)} URLs. Launching Browser...")
    
    driver = setup_driver()
    metadata = []
    
    try:
        for i, url in enumerate(urls):
            # Refresh driver every 15 pages to prevent memory leaks/freezes
            if i > 0 and i % 15 == 0:
                print("--- Refreshing Browser Session ---")
                try:
                    driver.quit()
                except:
                    pass
                time.sleep(2)
                driver = setup_driver()

            res = scrape_with_trafilatura(driver, url, i)
            if res:
                metadata.append(res)
                
            # Update index incrementally
            with open(INDEX_FILE, "w", encoding="utf-8") as f:
                json.dump(metadata, f, indent=4)

    except KeyboardInterrupt:
        print("\nStopping scraper...")
    finally:
        print("Closing browser...")
        try:
            driver.quit()
        except:
            pass
        
    print(f"\nScraping Complete! Successfully saved {len(metadata)} pages.")

if __name__ == "__main__":
    run_scraper()