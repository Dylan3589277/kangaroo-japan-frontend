#!/usr/bin/env python3
"""
Universal translator: reads EN JSON files and outputs translations.
Usage: python3 translate.py <lang_code> [filename]
  lang_code: ko, th, id, vi
  filename: optional, single file to translate
"""

import json
import os
import sys
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EN_DIR = os.path.join(BASE_DIR, "en")
ZH_DIR = os.path.join(BASE_DIR, "zh")

OUT_DIRS = {
    "ko": os.path.join(BASE_DIR, "ko"),
    "th": os.path.join(BASE_DIR, "th"),
    "id": os.path.join(BASE_DIR, "id"),
    "vi": os.path.join(BASE_DIR, "vi"),
}

FILES = [
    "common.json", "auth.json", "mercari.json", "yahoo.json",
    "amazon.json", "bids.json", "deposit.json", "vip.json",
    "shop.json", "coupons.json", "sign.json", "messages.json",
    "community.json", "articles.json", "orders.json", "warehouse.json",
    "mnp.json"
]

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def write_file(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def get_all_values(obj, prefix=""):
    """Get all leaf string values with their paths."""
    items = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            pk = f"{prefix}.{k}" if prefix else k
            items.extend(get_all_values(v, pk))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            pk = f"{prefix}[{i}]" if prefix else str(i)
            items.extend(get_all_values(v, pk))
    elif isinstance(obj, str):
        items.append((prefix, obj))
    return items

def set_value(obj, path, value):
    """Set a value in nested JSON by dot-separated path."""
    parts = path.split('.')
    current = obj
    for part in parts[:-1]:
        if part not in current:
            current[part] = {}
        current = current[part]
    current[parts[-1]] = value
    return obj

def translate_native(filename, lang):
    """Generate translation using native AI capability and write to file."""
    en = read_file(os.path.join(EN_DIR, filename))
    zh = read_file(os.path.join(ZH_DIR, filename))
    
    values = get_all_values(en)
    zh_values = dict(get_all_values(zh))
    
    # Build prompt text
    en_json = json.dumps(en, ensure_ascii=False, indent=2)
    zh_json = json.dumps(zh, ensure_ascii=False, indent=2)
    
    lang_names = {"ko": "Korean", "th": "Thai", "id": "Indonesian", "vi": "Vietnamese"}
    lang_name = lang_names.get(lang, lang)
    
    style_guides = {
        "ko": "FORMAL YET FRIENDLY like Coupang/Gmarket. Use polite -요/-니다 forms. E-commerce terms natural for Korean shoppers.",
        "th": "YOUNG AND ENERGETIC like Shopee Thailand. Use casual-friendly Thai with appropriate คะ/ครับ. Natural for Thai shoppers.",
        "id": "RELAXED AND NATURAL like Tokopedia. Friendly Indonesian, not too formal. Natural for Indonesian shoppers.",
        "vi": "CONCISE AND FRIENDLY like Tiki. Natural Vietnamese with appropriate tone. Clear and easy to understand for Vietnamese shoppers.",
    }
    
    print(f"\n{'='*60}")
    print(f"📋 Translate {filename} to {lang_name} ({lang})")
    print(f"{'='*60}")
    print(f"Source file: {os.path.join(EN_DIR, filename)}")
    print(f"Strings to translate: {len(values)}")
    print(f"\nEnglish source:")
    print(en_json)
    print(f"\nChinese reference:")
    print(zh_json)
    print(f"\nStyle: {style_guides.get(lang, 'Natural translation')}")
    print("\n--- GENERATE TRANSLATION ---")
    print("Output the complete translated JSON file. Only translate string values.")
    print("Preserve ALL template variables ({name}, {count}, etc.) exactly as-is.")
    print("Keep JSON structure identical. Keep keys unchanged.")
    print(f"\nTarget: {os.path.join(OUT_DIRS[lang], filename)}")
    print("="*60)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 translate.py <lang> [filename]")
        print("  lang: ko, th, id, vi")
        print("  filename: optional, if omitted shows info for all")
        sys.exit(1)
    
    lang = sys.argv[1]
    files = [sys.argv[2]] if len(sys.argv) > 2 else FILES
    
    for fn in files:
        translate_native(fn, lang)
