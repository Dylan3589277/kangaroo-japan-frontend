/**
 * JsonLd —— 渲染一段 schema.org JSON-LD 结构化数据（服务端组件，零客户端 JS）。
 * AI 引擎与搜索引擎靠它机器可读地理解页面（Organization / FAQPage / BreadcrumbList 等）。
 * data 只接受我们自己构造的字面量对象（见 src/lib/seo.ts 的 *JsonLd 构造器），非用户输入。
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify 输出中转义 < 防止 </script> 提前闭合（数据虽为自家常量，仍按惯例防御）
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
