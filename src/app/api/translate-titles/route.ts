import { NextRequest, NextResponse } from "next/server";
import { translateTitlesJaToZh } from "@/lib/server/translate-zh";

/**
 * POST /api/translate-titles
 * body: { titles: string[] } → { translations: (string|null)[] }
 *
 * zh 站列表卡片用：批量把日文商品标题译成中文。由
 * `useTitleTranslations` hook 调用（客户端分块 + 去重后再打到这里）。
 * 内部失败（无 key / 超时 / DeepSeek 挂了）仍返回 200 + 全 null，
 * 让调用方静默回退日文原名——翻译本就是锦上添花，不该让列表页报错。
 * 真正 400 的只有请求本身不合法（越界/超限），防止误用把这条打成放大器。
 */
const MAX_TITLES = 40;
const MAX_TITLE_LENGTH = 300;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const titles = (body as { titles?: unknown })?.titles;
  if (!Array.isArray(titles) || titles.length === 0) {
    return NextResponse.json(
      { error: "titles must be a non-empty array" },
      { status: 400 },
    );
  }
  if (titles.length > MAX_TITLES) {
    return NextResponse.json(
      { error: `titles must have at most ${MAX_TITLES} items` },
      { status: 400 },
    );
  }
  if (
    !titles.every(
      (title) => typeof title === "string" && title.length <= MAX_TITLE_LENGTH,
    )
  ) {
    return NextResponse.json(
      { error: `each title must be a string of at most ${MAX_TITLE_LENGTH} chars` },
      { status: 400 },
    );
  }

  try {
    const translations = await translateTitlesJaToZh(titles as string[]);
    return NextResponse.json({ translations });
  } catch (e) {
    // translateTitlesJaToZh 内部已把所有失败路径收敛成 null，理论上不会走到这里；
    // 万一有意外异常，仍要 200 + 全 null 静默降级，不让列表页因为翻译挂掉。
    console.warn(
      `[api/translate-titles] unexpected error :: ${e instanceof Error ? e.message : String(e)}`,
    );
    return NextResponse.json({ translations: titles.map(() => null) });
  }
}
