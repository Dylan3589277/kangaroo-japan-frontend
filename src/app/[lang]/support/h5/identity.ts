type SearchParamReader = {
  get(name: string): string | null;
};

const NUMERIC_UID_PATTERN = /^\d+$/;

export function getNumericH5UserId(searchParams: SearchParamReader) {
  const rawUserId = searchParams.get("user_id") || searchParams.get("uid") || "";
  const userId = rawUserId.trim();
  return NUMERIC_UID_PATTERN.test(userId) ? userId : undefined;
}

export function getH5UidSignature(searchParams: SearchParamReader) {
  const ts = searchParams.get("ts")?.trim() || undefined;
  const sig = searchParams.get("sig")?.trim() || undefined;
  return { ts, sig };
}
