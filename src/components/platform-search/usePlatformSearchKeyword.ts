"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export function usePlatformSearchKeyword(defaultKeyword: string) {
  const searchParams = useSearchParams();
  const urlKeyword = useMemo(() => {
    return (
      searchParams.get("keyword") ||
      searchParams.get("q") ||
      searchParams.get("search") ||
      ""
    ).trim();
  }, [searchParams]);

  const [keyword, setKeyword] = useState(urlKeyword);
  const [submittedKeyword, setSubmittedKeyword] = useState(
    urlKeyword || defaultKeyword,
  );

  // Sync local state to the URL keyword when it changes (e.g. client-side
  // navigation to a new search query) by adjusting state during render — the
  // pattern React recommends instead of setState inside an effect.
  const [lastUrlKeyword, setLastUrlKeyword] = useState(urlKeyword);
  if (urlKeyword && urlKeyword !== lastUrlKeyword) {
    setLastUrlKeyword(urlKeyword);
    setKeyword(urlKeyword);
    setSubmittedKeyword(urlKeyword);
  }

  return {
    keyword,
    setKeyword,
    submittedKeyword,
    setSubmittedKeyword,
  };
}
