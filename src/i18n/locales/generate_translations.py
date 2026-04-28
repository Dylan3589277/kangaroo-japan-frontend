#!/usr/bin/env python3
"""
Master translation generator.
Generates all 64 translation files (16 files × 4 languages) using embedded translation data.
Each language's translations are provided as complete JSON structures.

Usage: python3 generate_translations.py [lang]
  lang: ko, th, id, vi (optional - generates all if omitted)
"""

import json
import os
import sys
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EN_DIR = os.path.join(BASE_DIR, "en")
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

def read_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def get_flat_translations(en_data, trans_dict):
    """Get flat path→translation mapping from a nested translation dict."""
    result = {}
    
    def extract(en_obj, tr_obj, path=""):
        if isinstance(en_obj, dict) and isinstance(tr_obj, dict):
            for k in en_obj:
                pk = f"{path}.{k}" if path else k
                if k in tr_obj:
                    extract(en_obj[k], tr_obj[k], pk)
        elif isinstance(en_obj, list) and isinstance(tr_obj, list):
            for i in range(min(len(en_obj), len(tr_obj))):
                pk = f"{path}[{i}]" if path else str(i)
                extract(en_obj[i], tr_obj[i], pk)
        elif isinstance(en_obj, str):
            result[path] = tr_obj if isinstance(tr_obj, str) else en_obj
    
    extract(en_data, trans_dict)
    return result

def apply_translations(en_data, translations):
    """Apply flat path→translation mapping to nested en_data."""
    def apply(obj, path=""):
        if isinstance(obj, dict):
            return {k: apply(v, f"{path}.{k}" if path else k) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [apply(v, f"{path}[{i}]" if path else str(i)) for i, v in enumerate(obj)]
        elif isinstance(obj, str):
            return translations.get(path, obj)
        return obj
    return apply(en_data)

def verify_template_vars(en_path, translated_data, lang):
    """Verify all template variables are preserved."""
    en_data = read_json(en_path)
    
    def check(en_obj, tr_obj, path=""):
        issues = []
        if isinstance(en_obj, dict) and isinstance(tr_obj, dict):
            for k in en_obj:
                pk = f"{path}.{k}" if path else k
                if k in tr_obj:
                    issues.extend(check(en_obj[k], tr_obj[k], pk))
                else:
                    issues.append((pk, "Missing key in translation"))
        elif isinstance(en_obj, list) and isinstance(tr_obj, list):
            for i in range(min(len(en_obj), len(tr_obj))):
                pk = f"{path}[{i}]" if path else str(i)
                issues.extend(check(en_obj[i], tr_obj[i], pk))
        elif isinstance(en_obj, str) and isinstance(tr_obj, str):
            en_vars = set(re.findall(r'\{[a-zA-Z_][a-zA-Z0-9_]*\}', en_obj))
            tr_vars = set(re.findall(r'\{[a-zA-Z_][a-zA-Z0-9_]*\}', tr_obj))
            missing = en_vars - tr_vars
            if missing:
                issues.append((path, f"Missing template vars: {missing}", en_obj, tr_obj))
        return issues
    
    return check(en_data, translated_data)

def process_all():
    """Main processing function - reads en files and generates translations."""
    
    target_langs = sys.argv[1:] if len(sys.argv) > 1 else ["ko", "th", "id", "vi"]
    
    for lang in target_langs:
        print(f"\n{'='*60}")
        print(f"🌐 Generating {lang.upper()} translations...")
        print(f"{'='*60}")
        
        # Import the translation module for this language
        trans_module = f"translations_{lang}"
        try:
            trans = __import__(trans_module)
        except ImportError:
            print(f"  ⚠️  Translation module '{trans_module}' not found")
            print(f"  Create a file called {trans_module}.py with a fluent() function")
            print(f"  that returns {{filename: {{json_structure}}}}")
            continue
        
        all_translations = trans.fluent()
        
        for filename in FILES:
            if filename not in all_translations:
                print(f"  ⏭️  {filename}: no translations provided")
                continue
            
            en_path = os.path.join(EN_DIR, filename)
            en_data = read_json(en_path)
            trans_data = all_translations[filename]
            
            # Apply translations
            flat = get_flat_translations(en_data, trans_data)
            result = apply_translations(en_data, flat)
            
            # Write output
            out_path = os.path.join(OUT_DIRS[lang], filename)
            write_json(out_path, result)
            
            # Verify template variables
            issues = verify_template_vars(en_path, result, lang)
            if issues:
                for issue in issues:
                    if len(issue) == 4:
                        print(f"  ⚠️  {issue[0]}: {issue[1]}")
                        print(f"     EN: {issue[2]}")
                        print(f"     {lang.upper()}: {issue[3]}")
                    else:
                        print(f"  ⚠️  {issue[0]}: {issue[1]}")
            
            print(f"  ✅ {filename}")
        
        print(f"\n  Completed {lang.upper()} ({len(FILES)} files)")

if __name__ == "__main__":
    process_all()
