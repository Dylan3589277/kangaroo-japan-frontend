import { YahooDetailPage } from "@/components/yahoo/yahoo-detail-page";
import { YahooDetailDesignA } from "@/components/yahoo/YahooDetailDesignA";

/**
 * /[lang]/yahoo/[goodsNo] —— Yahoo Auctions 商品详情页。
 *
 * 按 locale 分支呈现，逻辑层（取数/倒计时/相关商品/read-only 边界）两版共用：
 * - en：设计 A（深色高级感）YahooDetailDesignA，与新 TcgHeader/Footer 外壳视觉连贯。
 * - 其它语言：现有经典版（浅色）YahooDetailPage，原样不变。
 */
export default async function YahooGoodsDetailPage({
  params,
}: {
  params: Promise<{ lang: string; goodsNo: string }>;
}) {
  const { lang, goodsNo } = await params;

  if (lang === "en") {
    return <YahooDetailDesignA key={goodsNo} goodsNo={goodsNo} locale={lang} />;
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <YahooDetailPage key={goodsNo} goodsNo={goodsNo} locale={lang} />
    </div>
  );
}
