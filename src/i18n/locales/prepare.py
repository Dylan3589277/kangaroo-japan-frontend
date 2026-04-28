#!/usr/bin/env python3
"""
Translation generator for all 16 files x 4 languages.
Run: python3 generate_all.py
This reads EN files and generates prompts for translation,
or directly writes pre-translated content.
"""

import json
import os
import sys
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EN_DIR = os.path.join(BASE_DIR, "en")
ZH_DIR = os.path.join(BASE_DIR, "zh")
OUT_DIR = os.path.join(BASE_DIR, "generated")

LANG_META = {
    "ko": {"name": "Korean", "dir": "ko", "style": "Coupang/Gmarket style - formal friendly"},
    "th": {"name": "Thai", "dir": "th", "style": "Shopee Thailand style - young energetic"},
    "id": {"name": "Indonesian", "dir": "id", "style": "Tokopedia style - relaxed natural"},
    "vi": {"name": "Vietnamese", "dir": "vi", "style": "Tiki style - concise friendly"},
}

FILES = [
    "common.json", "auth.json", "mercari.json", "yahoo.json",
    "amazon.json", "bids.json", "deposit.json", "vip.json",
    "shop.json", "coupons.json", "sign.json", "messages.json",
    "community.json", "articles.json", "orders.json", "warehouse.json",
    "mnp.json"
]

def read_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  ✅ {os.path.basename(path)}")

def extract_strings_with_paths(obj, prefix=""):
    """Extract (path, en_value, zh_value) tuples."""
    items = []
    if isinstance(obj, dict):
        for k in obj:
            pk = f"{prefix}.{k}" if prefix else k
            items.extend(extract_strings_with_paths(type(obj[k], obj[k]) if False else obj[k], pk))
    return items

# Let me just set up the directory structure and prepare everything
os.makedirs(OUT_DIR, exist_ok=True)

if __name__ == "__main__":
    # Generate info for all languages and files
    for lang_code in ["ko", "th", "id", "vi"]:
        meta = LANG_META[lang_code]
        print(f"\n{'='*60}")
        print(f"🌐 Language: {meta['name']} ({lang_code})")
        print(f"   Style: {meta['style']}")
        print(f"   Output dir: {meta['dir']}")
        print(f"{'='*60}")
        
        for filename in FILES:
            en = read_json(os.path.join(EN_DIR, filename))
            zh = read_json(os.path.join(ZH_DIR, filename))
            
            en_str = json.dumps(en, ensure_ascii=False, indent=2)
            zh_str = json.dumps(zh, ensure_ascii=False, indent=2)
            
            # Write combined reference file
            ref_file = os.path.join(OUT_DIR, f"{lang_code}_{filename}.reference.md")
            with open(ref_file, 'w', encoding='utf-8') as f:
                f.write(f"# Translate to {meta['name']}\n")
                f.write(f"Style: {meta['style']}\n\n")
                f.write(f"## English (source)\n```json\n{en_str}\n```\n\n")
                f.write(f"## Chinese (reference)\n```json\n{zh_str}\n```\n")
            
            print(f"  📝 {filename}: {len(json.dumps(en))} chars")
        
        print(f"\n  Total: {len(FILES)} files")
