import json
import os

def normalize_article(article_obj):
    """
    Takes NewsPlease article object and extracts only clean fields.
    """
    data = article_obj.get_serializable_dict()

    return {
        "title": data.get("title"),
        "maintext": data.get("maintext"),
        "summary": data.get("summary"),
        "authors": data.get("authors"),
        "url": data.get("url"),
        "date_publish": data.get("date_publish"),
        "source_domain": data.get("source_domain")
    }


def save_article_json(article, index, out_dir="articles"):
    """
    Saves normalized article JSON to disk.
    """
    os.makedirs(out_dir, exist_ok=True)

    filename = os.path.join(out_dir, f"article_{index:03d}.json")

    with open(filename, "w", encoding="utf-8") as f:
        json.dump(article, f, ensure_ascii=False, indent=2)

    print(f"✔ Saved: {filename}")