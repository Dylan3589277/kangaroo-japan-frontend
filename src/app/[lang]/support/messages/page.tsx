import { getH5UidSignature, getNumericH5UserId } from "../h5/identity";
import { fetchSellerMessagesList } from "@/lib/seller-messages-visitor";
import SellerMessagesH5Page from "./MessagesClient";
import { getRecord, parseTask, type VisitorTask } from "./shared";

// SSR 外壳：不执行客户端 JS 的旧小程序 webview（煤炉供销社 wx208645d960d3f104 /
// iOS 15.4.1）打开本页时，客户端 fetch 永远不会发出，列表会一直空/加载中。
// 这里在服务端用同一套身份（uid|user_id + ts + sig，来自 URL query）直接取第一页
// 列表，作为 initialTasks 传给 Client 组件首屏渲染；取数失败不抛错，返回空数组，
// 交由 Client 组件的错误态/空态处理（与原客户端行为一致）。
export const dynamic = "force-dynamic";

type SearchParamReader = {
  get(name: string): string | null;
};

function toSearchParamReader(
  searchParams: Record<string, string | string[] | undefined>,
): SearchParamReader {
  return {
    get(name: string) {
      const value = searchParams[name];
      if (Array.isArray(value)) return value[0] ?? null;
      return value ?? null;
    },
  };
}

export default async function SellerMessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const reader = toSearchParamReader(resolvedSearchParams);
  const userId = getNumericH5UserId(reader);
  const { ts, sig } = getH5UidSignature(reader);

  let initialTasks: VisitorTask[] = [];
  if (userId) {
    const result = await fetchSellerMessagesList({
      userId,
      ts,
      sig,
      page: 1,
      includeHidden: false,
    });
    if (result.ok) {
      const data = getRecord(result.data);
      const rawList = Array.isArray(data.list) ? data.list : [];
      initialTasks = rawList
        .map((item) => parseTask(item))
        .filter((item): item is VisitorTask => item !== null);
    }
  }

  return <SellerMessagesH5Page initialTasks={initialTasks} />;
}
