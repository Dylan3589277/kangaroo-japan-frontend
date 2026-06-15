import { YahooDetailPage } from "@/components/yahoo/yahoo-detail-page";

export default async function YahooGoodsDetailPage({
  params,
}: {
  params: Promise<{ lang: string; goodsNo: string }>;
}) {
  const { lang, goodsNo } = await params;

  return <YahooDetailPage key={goodsNo} goodsNo={goodsNo} locale={lang} />;
}
