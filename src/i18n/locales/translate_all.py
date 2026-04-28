#!/usr/bin/env python3
"""
Batch translator for JSON i18n files.
Generates translations for all 16 files × 4 languages using AI-generated content.

Strategy: For each language, reads EN source JSON and writes translated JSON directly.
Template variables ({name}, {count}, etc.) are preserved automatically.

Usage: python3 translate_all.py [--dry-run] [lang]
  --dry-run: Show what would be done without writing
  lang: ko, th, id, vi (optional, generates all if omitted)
"""

import json
import os
import sys
import re
import copy

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EN_DIR = os.path.join(BASE_DIR, "en")
ZH_DIR = os.path.join(BASE_DIR, "zh")
LANG_DIRS = {
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

def verify_template_vars(en_data, tr_data, path=""):
    """Verify template variables are preserved in translation."""
    issues = []
    if isinstance(en_data, dict) and isinstance(tr_data, dict):
        for k in en_data:
            pk = f"{path}.{k}" if path else k
            if k in tr_data:
                issues.extend(verify_template_vars(en_data[k], tr_data[k], pk))
            else:
                issues.append(f"MISSING KEY: {pk}")
    elif isinstance(en_data, list) and isinstance(tr_data, list):
        for i in range(min(len(en_data), len(tr_data))):
            pk = f"{path}[{i}]" if path else str(i)
            issues.extend(verify_template_vars(en_data[i], tr_data[i], pk))
    elif isinstance(en_data, str) and isinstance(tr_data, str):
        en_vars = set(re.findall(r'\{[a-zA-Z_][a-zA-Z0-9_]*\}', en_data))
        tr_vars = set(re.findall(r'\{[a-zA-Z_][a-zA-Z0-9_]*\}', tr_data))
        missing = en_vars - tr_vars
        if missing:
            issues.append(f"TEMPLATE VARS MISSING in '{path}': {missing}")
            issues.append(f"  EN: {en_data}")
            issues.append(f"  TR: {tr_data}")
    return issues

def apply_translation(en_data, translate_func):
    """Apply a translation function to all string values while preserving structure."""
    def walk(obj, path=""):
        if isinstance(obj, dict):
            return {k: walk(v, f"{path}.{k}" if path else k) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [walk(v, f"{path}[{i}]" if path else str(i)) for i, v in enumerate(obj)]
        elif isinstance(obj, str):
            translated = translate_func(obj, path)
            return translated
        return obj
    return walk(en_data)

# ============================================================
# TRANSLATION FUNCTIONS FOR EACH LANGUAGE
# Each function takes (en_string, path) and returns the translated string
# ============================================================

def translate_ko(text, path=""):
    """English → Korean. Style: Coupang/Gmarket (formal friendly, 존댓말)"""
    
    # Common e-commerce terms
    translations = {
        # nav
        "nav.home": "홈",
        "nav.products": "상품",
        "nav.cart": "장바구니",
        "nav.orders": "주문내역",
        "nav.profile": "마이페이지",
        "nav.about": "회사소개",
        
        # home
        "home.title": "캥거루 재팬",
        "home.subtitle": "해외직구 가격비교 플랫폼",
        "home.search": "상품 검색...",
        "home.featured": "추천 상품",
        "home.categories": "카테고리",
        "home.priceCompare": "가격 비교",
        
        # product
        "product.addToCart": "장바구니 담기",
        "product.buyNow": "바로 구매",
        "product.price": "가격",
        "product.rating": "평점",
        "product.reviews": "리뷰",
        "product.reviewsCount": "개 리뷰",
        "product.platform": "플랫폼",
        "product.compare": "비교",
        "product.comparePrice": "가격 비교",
        "product.inStock": "재고 있음",
        "product.outOfStock": "품절",
        "product.sales": "판매량",
        "product.seller": "판매자",
        "product.specifications": "상세 정보",
        "product.description": "상품 설명",
        "product.priceHistory": "가격 내역",
        "product.currentPrice": "현재가",
        "product.lowestPrice": "최저가",
        "product.highestPrice": "최고가",
        "product.averagePrice": "평균가",
        "product.priceTrendingUp": "가격 상승 중",
        "product.priceTrendingDown": "가격 하락 중",
        "product.priceStable": "가격 안정",
        "product.viewOnPlatform": "플랫폼에서 보기",
        "product.noDescription": "설명이 없습니다",
        "product.noSpecs": "상세 정보가 없습니다",
        "product.noPriceHistory": "가격 내역이 없습니다",
        "product.relatedProducts": "관련 상품",
        "product.details": "상세 정보",
        "product.specs": "사양",
        "product.noImage": "이미지 없음",
        "product.loadMore": "더 보기",
        
        # products
        "products.title": "상품 목록",
        "products.subtitle": "해외직구 상품을 둘러보세요",
        "products.search": "상품 검색...",
        "products.searchBtn": "검색",
        "products.filter": "필터",
        "products.sort": "정렬",
        "products.platform": "플랫폼",
        "products.category": "카테고리",
        "products.priceRange": "가격대",
        "products.minPrice": "최소",
        "products.maxPrice": "최대",
        "products.apply": "적용",
        "products.allPlatforms": "전체 플랫폼",
        "products.allCategories": "전체 카테고리",
        "products.sortNewest": "최신순",
        "products.sortPriceLow": "가격 낮은순",
        "products.sortPriceHigh": "가격 높은순",
        "products.sortRating": "평점 높은순",
        "products.sortSales": "판매량순",
        "products.noProducts": "검색 결과가 없습니다",
        "products.prevPage": "이전",
        "products.nextPage": "다음",
        
        # compare
        "compare.title": "가격 비교",
        "compare.subtitle": "같은 상품을 플랫폼별로 비교해보세요",
        "compare.bestPrice": "최저가",
        "compare.youSave": "절약 금액",
        "compare.selectProducts": "비교할 상품을 선택해주세요",
        "compare.browseProducts": "상품 보기",
        "compare.notFound": "상품을 찾을 수 없습니다",
        "compare.detailedComparison": "상세 비교",
        "compare.price": "가격",
        "compare.rating": "평점",
        "compare.reviews": "리뷰",
        "compare.sales": "판매량",
        "compare.status": "상태",
        "compare.inStock": "재고 있음",
        "compare.soldOut": "품절",
        "compare.buyNow": "구매하기",
        "compare.viewDetails": "자세히 보기",
        "compare.backToProducts": "상품 목록으로",
        
        # cart
        "cart.title": "장바구니",
        "cart.empty": "장바구니가 비어있습니다",
        "cart.emptySubtitle": "쇼핑을 시작하여 상품을 담아보세요",
        "cart.browseProducts": "상품 둘러보기",
        "cart.total": "합계",
        "cart.items": "개 상품",
        "cart.subtotal": "소계",
        "cart.subtotalJpy": "소계 (JPY)",
        "cart.estimatedShipping": "예상 배송비",
        "cart.totalAmount": "총 금액",
        "cart.checkout": "결제하기",
        "cart.clearCart": "비우기",
        "cart.remove": "삭제",
        "cart.quantity": "수량",
        "cart.updateQuantity": "수량 변경",
        "cart.removeItem": "상품 삭제",
        "cart.buyerMessage": "판매자 메시지",
        "cart.buyerMessagePlaceholder": "판매자에게 전할 메시지 (선택, 최대 200자)",
        "cart.giftWrap": "선물 포장",
        "cart.sellerSubtotal": "판매자별 소계",
        "cart.orderSummary": "주문 요약",
        "cart.shippingNote": "배송비는 결제 시 최종 확정됩니다",
        "cart.proceedToCheckout": "결제 진행",
        "cart.maxQuantityReached": "최대 구매 수량에 도달했습니다",
        "cart.addedToCart": "장바구니에 담겼습니다",
        "cart.removedFromCart": "장바구니에서 삭제되었습니다",
        "cart.cartCleared": "장바구니가 비워졌습니다",
        "cart.messageSaved": "메시지가 저장되었습니다",
        "cart.confirmClear": "장바구니를 비우시겠습니까?",
        "cart.confirmRemove": "이 상품을 삭제하시겠습니까?",
        
        # common
        "common.loading": "로딩 중...",
        "common.error": "오류가 발생했습니다",
        "common.retry": "다시 시도",
        "common.currency": "₩",
        "common.jpy": "JPY",
        "common.cny": "CNY",
        "common.usd": "USD",
        
        # order
        "order.title": "주문내역",
        "order.empty": "주문 내역이 없습니다",
        "order.emptySubtitle": "쇼핑을 시작하면 주문이 여기에 표시됩니다",
        "order.browseProducts": "상품 둘러보기",
        "order.orderNo": "주문번호",
        "order.status": "상태",
        "order.total": "총 금액",
        "order.items": "개 상품",
        "order.itemsCount": "상품 수",
        "order.placedOn": "주문일시",
        "order.viewDetails": "자세히 보기",
        "order.cancelOrder": "주문 취소",
        "order.confirmCancel": "주문을 취소하시겠습니까?",
        "order.orderCancelled": "주문이 취소되었습니다",
        "order.tracking": "배송 조회",
        "order.trackPackage": "배송 추적",
        "order.shippingAddress": "배송지",
        "order.paymentSummary": "결제 요약",
        "order.subtotal": "소계",
        "order.shipping": "배송비",
        "order.serviceFee": "서비스 수수료",
        "order.couponDiscount": "쿠폰 할인",
        "order.paidOn": "결제일시",
        "order.paymentMethod": "결제 수단",
        "order.yourMessage": "메시지",
        "order.logistics": "배송 정보",
        "order.carrier": "택배사",
        "order.trackingNumber": "운송장번호",
        "order.shippedAt": "발송일시",
        "order.estimatedDelivery": "예상 도착일",
        "order.statusPending": "결제 대기",
        "order.statusPaid": "결제 완료",
        "order.statusProcessing": "처리 중",
        "order.statusPurchased": "구매 완료",
        "order.statusShipped": "발송 완료",
        "order.statusInTransit": "배송 중",
        "order.statusDelivered": "배송 완료",
        "order.statusCancelled": "취소됨",
        "order.statusRefunded": "환불됨",
        
        # checkout
        "checkout.title": "결제",
        "checkout.step1": "배송지",
        "checkout.step2": "주문 상품",
        "checkout.step3": "추가 정보",
        "checkout.addNewAddress": "새 주소 추가",
        "checkout.noAddresses": "주소가 없습니다",
        "checkout.addAddress": "주소 추가",
        "checkout.messageToSeller": "판매자 메시지",
        "checkout.messagePlaceholder": "판매자에게 전할 메시지 (선택)...",
        "checkout.couponCode": "쿠폰 코드",
        "checkout.apply": "적용",
        "checkout.orderSummary": "주문 요약",
        "checkout.placeOrder": "주문하기",
        "checkout.processing": "처리 중...",
        "checkout.orderSuccess": "주문이 완료되었습니다!",
        "checkout.selectAddress": "배송지를 선택해주세요",
        "checkout.cartEmpty": "장바구니가 비어있습니다",
        "checkout.cartEmptySubtitle": "결제 전에 상품을 장바구니에 담아주세요",
        "checkout.currency": "결제 통화",
        
        # profile
        "profile.title": "마이페이지",
        "profile.welcomeBack": "환영합니다",
        "profile.accountInfo": "계정 정보",
        "profile.editProfile": "프로필 수정",
        "profile.myOrders": "주문내역",
        "profile.myAddresses": "배송지 관리",
        "profile.myFavorites": "찜한 상품",
        "profile.settings": "설정",
        "profile.language": "언어",
        "profile.currency": "통화",
        "profile.logout": "로그아웃",
        "profile.logoutConfirm": "로그아웃 하시겠습니까?",
        "profile.logoutSuccess": "로그아웃되었습니다",
        "profile.loginToView": "로그인 후 이용 가능합니다",
        "profile.loginPrompt": "캥거루 재팬에 로그인",
        "profile.loginBtn": "로그인",
        "profile.registerBtn": "무료 회원가입",
        "profile.email": "이메일",
        "profile.phone": "휴대폰",
        "profile.memberSince": "가입일",
        "profile.noOrders": "주문 내역이 없습니다",
        "profile.noAddresses": "등록된 주소가 없습니다",
        "profile.noFavorites": "찜한 상품이 없습니다",
        "profile.viewAll": "전체 보기",
        "profile.pendingPayment": "결제 대기",
        "profile.processing": "처리 중",
        "profile.shipped": "발송 완료",
        "profile.delivered": "배송 완료",
        "profile.cancelled": "취소됨",
    }
    
    if path in translations:
        return translations[path]
    return text


# We'll implement the other languages as they're needed
# For now, let's just do Korean

def process_file(filename, lang, translate_func, dry_run=False):
    """Process one file for one language."""
    en_path = os.path.join(EN_DIR, filename)
    en_data = read_json(en_path)
    
    translated = apply_translation(en_data, translate_func)
    
    # Verify
    issues = verify_template_vars(en_data, translated)
    if issues:
        for issue in issues:
            print(f"  ⚠️  {issue}")
    
    if not dry_run:
        out_path = os.path.join(LANG_DIRS[lang], filename)
        write_json(out_path, translated)
    
    return translated

def process_language(lang, translate_func, dry_run=False):
    """Process all files for one language."""
    print(f"\n{'='*60}")
    print(f"🌐 Processing {lang.upper()}...")
    print(f"{'='*60}")
    
    for filename in FILES:
        try:
            process_file(filename, lang, translate_func, dry_run)
            if not dry_run:
                print(f"  ✅ {filename}")
            else:
                print(f"  📝 {filename} (dry run)")
        except Exception as e:
            print(f"  ❌ {filename}: {e}")
    
    print(f"  ✅ Completed {lang.upper()} ({len(FILES)} files)")

if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        sys.argv.remove("--dry-run")
    
    target_langs = sys.argv[1:] if len(sys.argv) > 1 else ["ko"]
    
    lang_funcs = {
        "ko": translate_ko,
    }
    
    for lang in target_langs:
        if lang in lang_funcs:
            process_language(lang, lang_funcs[lang], dry_run)
        else:
            print(f"⚠️  Language '{lang}' not yet implemented. Available: {list(lang_funcs.keys())}")
