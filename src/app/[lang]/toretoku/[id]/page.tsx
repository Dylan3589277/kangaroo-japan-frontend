import { ToretokuDetailClassic } from "@/components/toretoku/ToretokuDetailClassic";
import { ToretokuDetailDesignA } from "@/components/toretoku/ToretokuDetailDesignA";

/**
 * /[lang]/toretoku/[id] — トレトク 商品详情页。
 *
 * 按 locale 分支呈现，与 cardrush 详情完全平行：
 * - en：设计 A（橙红卡牌风）ToretokuDetailDesignA，显美元，TCG quote。
 * - 其它语言：经典版（浅色 + 橙红点缀）ToretokuDetailClassic，显人民币，中文 quote。
 *
 * 两个正文组件均为 client component，自行用 useParams() 读 id/lang；本页仅做 locale 路由。
 */
export default async function ToretokuDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang } = await params;

  if (lang === "en") {
    return <ToretokuDetailDesignA />;
  }

  return <ToretokuDetailClassic />;
}
