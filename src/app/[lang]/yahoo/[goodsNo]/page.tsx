import { YahooDetailPage } from "@/components/yahoo/yahoo-detail-page";

export default async function YahooGoodsDetailPage({
  params,
}: {
  params: Promise<{ lang: string; goodsNo: string }>;
}) {
  const { lang, goodsNo } = await params;

  return (
    <div className="min-h-screen bg-muted/20">
      <YahooDetailPage key={goodsNo} goodsNo={goodsNo} locale={lang} />
    </div>
  );
}
