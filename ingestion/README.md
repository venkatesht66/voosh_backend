# Ingestion (Python, news-please)

This folder contains a small Python ingestion pipeline that:
- fetches article links from RSS feeds (`feeds.txt`)
- uses `news-please` to download & extract articles
- saves normalized JSON files to `data/articles/`

## Setup

Make sure you have Python 3.8+ installed.

If `pip` is not found, run:
```bash
python3 -m ensurepip --upgrade
python3 -m pip install --upgrade pip