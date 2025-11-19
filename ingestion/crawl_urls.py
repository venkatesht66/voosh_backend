import argparse
from newsplease import NewsPlease
from normalize_save import normalize_article, save_article_json
from tqdm import tqdm
import time
import os

def load_urls(urls_file):
    with open(urls_file, "r", encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip() and not line.strip().startswith("#")]

def crawl_urls(urls, start_index=1, delay=1.0):
    idx = start_index
    for u in tqdm(urls, desc="Crawling URLs"):
        try:
            article = NewsPlease.from_url(u)
            if article and (article.title or article.maintext):
                norm = normalize_article(article)
                saved = save_article_json(norm, idx)
                print("Saved:", saved)
                idx += 1
            else:
                print("[SKIP] no content:", u)
        except Exception as e:
            print("[ERROR] failed:", u, e)
        time.sleep(delay)
    return idx - 1

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Crawl list of article URLs using news-please")
    parser.add_argument("--urls", default="urls.txt", help="file with article URLs, one per line")
    parser.add_argument("--limit", type=int, default=None, help="limit number of urls to process")
    parser.add_argument("--delay", type=float, default=1.0, help="delay between article downloads (seconds)")
    args = parser.parse_args()

    urls_file = args.urls
    if not os.path.exists(urls_file):
        print("URLs file not found:", urls_file)
        raise SystemExit(1)

    urls = load_urls(urls_file)
    if args.limit:
        urls = urls[:args.limit]

    crawl_urls(urls, start_index=1, delay=args.delay)
    print("Done.")