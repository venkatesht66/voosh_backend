import argparse
import feedparser
from newsplease import NewsPlease

from normalize_save import normalize_article, save_article_json
from config import RSS_FEEDS


def fetch_rss_urls(limit):
    urls = []

    for feed in RSS_FEEDS:
        print(f"📡 Fetching feed: {feed}")
        parsed = feedparser.parse(feed)

        for entry in parsed.entries:
            if "link" in entry:
                urls.append(entry.link)

            if len(urls) >= limit:
                return urls

    return urls


def crawl_articles(urls):
    for idx, url in enumerate(urls, start=1):
        print(f"\n🔍 Crawling ({idx}) {url}")

        try:
            article = NewsPlease.from_url(url)

            if not article or not article.maintext:
                print("⚠ Skipped (no main text)")
                continue

            normalized = normalize_article(article)
            save_article_json(normalized, idx)

        except Exception as e:
            print("❌ Error:", e)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=50, help="Number of articles to fetch")
    
    args = parser.parse_args()

    print(f"🚀 Starting crawl: {args.limit} articles\n")

    urls = fetch_rss_urls(args.limit)
    crawl_articles(urls)