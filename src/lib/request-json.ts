import { unstable_rethrow } from "next/navigation";

export type RequestJsonObjectResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false };

export async function parseRequestJsonObject(request: Request): Promise<RequestJsonObjectResult> {
  let text: string;

  try {
    text = await request.text();
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false };
  }

  if (!text.trim()) {
    return { ok: false };
  }

  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false };
  }

  if (!isJsonObject(data)) {
    return { ok: false };
  }

  return { ok: true, data };
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
