import { YahooSearchPage } from "@/components/yahoo/yahoo-search-page";

type YahooSearchParams = {
  keyword?: string | string[];
  category?: string | string[];
  sort?: string | string[];
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function YahooPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<YahooSearchParams>;
}) {
  const [{ lang }, query] = await Promise.all([params, searchParams]);

  return (
    <div className="min-h-screen bg-muted/20">
      <YahooSearchPage
        locale={lang}
        initialKeyword={firstValue(query.keyword)}
        initialCategory={firstValue(query.category)}
        initialSort={firstValue(query.sort)}
      />
    </div>
  );
}
