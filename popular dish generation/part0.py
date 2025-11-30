import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import random
import os
from urllib.parse import urlparse

OUTPUT_FILE = "sources.txt"

# Search queries refined based on your successful manual findings
# Focused on "Popularity", "Lists", "Menus", and "Traditional"
SEARCH_QUERIES = [
    "top 50 most popular Pakistani dishes of all time",
    "ultimate list of traditional Pakistani food names",
    "common dishes served at Pakistani weddings menu",
    "most consumed food items in Pakistan household",
    "famous Pakistani meat dishes list",
    "famous Pakistani vegetarian dishes list",
    "Pakistani street food menu list",
    "essential Pakistani cuisine dishes for beginners",
    "ranking of best Pakistani curries and rice dishes",
    "popular Pakistani desserts and sweets names",
    "Pakistani restaurant menu popular items",
    "traditional Hunza and Balochi food list"
]

# Domains to explicitly IGNORE (Garbage Filter)
BLACKLIST_DOMAINS = [
    "wikipedia.org", "wiktionary.org", "britannica.com", "dictionary.com", 
    "cambridge.org", "merriam-webster.com", "collinsdictionary.com",
    "reddit.com", "quora.com", "pinterest.com", "facebook.com", "instagram.com", 
    "youtube.com", "tiktok.com", "twitter.com", "linkedin.com",
    "tripadvisor.com", "yelp.com", "zomato.com", "foodpanda.pk", "daraz.pk",
    "lonelyplanet.com", "wikitravel.org", "wikivoyage.org", 
    "baidu.com", "zhihu.com", "namu.wiki",
    "fressnapf", "zoohandlung", "overwatch", "blizzard", "google.com",
    "amazon.com", "ebay.com"
]

# How many pages of Google results to scrape per query
PAGES_PER_QUERY = 3 

def is_valid_url(url):
    try:
        if not url: return False
        domain = urlparse(url).netloc.lower()
        if not domain: return False
        if any(blocked in domain for blocked in BLACKLIST_DOMAINS):
            return False
        if url.endswith(('.pdf', '.jpg', '.png', '.docx')):
            return False
        return True
    except:
        return False

def random_mouse_movement(driver):
    try:
        action = ActionChains(driver)
        x_offset = random.randint(-50, 50)
        y_offset = random.randint(-50, 50)
        action.move_by_offset(x_offset, y_offset).perform()
        action.move_by_offset(-x_offset, -y_offset).perform()
    except:
        pass

def setup_driver():
    options = uc.ChromeOptions()
    # options.add_argument("--headless") # Keep headless OFF to solve Captchas
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    
    driver = uc.Chrome(options=options, use_subprocess=True)
    return driver

def discover_urls():
    print(f"Starting Multi-Page Google Search for {len(SEARCH_QUERIES)} queries...")
    print("NOTE: If a CAPTCHA appears, solve it in the browser, then press ENTER in this terminal.")
    
    unique_urls = set()
    driver = setup_driver()

    try:
        for i, query in enumerate(SEARCH_QUERIES):
            # We append '-review' to filter generic reviews, but keep guides/lists
            refined_query = f"{query} -review -tripadvisor"
            print(f"\n[{i+1}/{len(SEARCH_QUERIES)}] Query: '{refined_query}'")
            
            # Start search
            driver.get("https://www.google.com/search?q=" + refined_query.replace(" ", "+"))
            
            # Pagination Loop
            for page_num in range(1, PAGES_PER_QUERY + 1):
                print(f"   > Processing Page {page_num}...")
                
                # --- HUMAN BEHAVIOR ---
                time.sleep(random.uniform(4, 7))
                random_mouse_movement(driver)
                driver.execute_script(f"window.scrollTo(0, {random.randint(300, 700)});")
                
                # Check for CAPTCHA
                if "sorry/index" in driver.current_url or "recaptcha" in driver.page_source.lower():
                    print(">>> CAPTCHA DETECTED! Please solve it in the browser window.")
                    input("Press Enter here once solved...")

                # Extract Links (Looking for H3 titles as primary anchor)
                try:
                    WebDriverWait(driver, 5).until(
                        EC.presence_of_element_located((By.TAG_NAME, "h3"))
                    )
                except:
                    print("     ! Timed out waiting for results.")

                title_elements = driver.find_elements(By.TAG_NAME, 'h3')
                
                found_on_page = 0
                for h3 in title_elements:
                    try:
                        # Find the parent 'a' tag of this h3
                        parent_link = h3.find_element(By.XPATH, "./..")
                        url = parent_link.get_attribute('href')
                        title = h3.text
                        
                        if url and is_valid_url(url):
                            if url not in unique_urls:
                                unique_urls.add(url)
                                found_on_page += 1
                                print(f"     + Found: {title[:40]}...")
                    except Exception:
                        continue 
                
                print(f"     -> Added {found_on_page} new URLs from Page {page_num}.")

                # Try to go to next page
                if page_num < PAGES_PER_QUERY:
                    try:
                        # "pnnext" is the ID of the 'Next' button in Google Search
                        next_button = driver.find_element(By.ID, "pnnext")
                        next_button.click()
                    except Exception:
                        print("     ! No 'Next' button found. Stopping query.")
                        break

    except Exception as e:
        print(f"Critical Error: {e}")
    finally:
        print("Closing driver...")
        try:
            driver.quit()
        except OSError:
            pass 

    print(f"\nTotal unique valid sources found: {len(unique_urls)}")
    
    # Append the manually found URLs to the list if you want to keep them
    # For now, we overwrite, but you can change 'w' to 'a' to append
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for url in unique_urls:
            f.write(url + "\n")
    
    print(f"Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    discover_urls()