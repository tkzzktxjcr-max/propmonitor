/**
 * Legacy Query Patch — for Appwrite Server < 1.8.0
 * Intercepts fetch() to rewrite JSON-object queries into legacy strings.
 */

function jsonQueryToString(q: unknown): string {
  try {
    const obj = q as Record<string, unknown>;
    const method = String(obj.method ?? "");
    if (!method) return String(q);
    return `${method}(${JSON.stringify(obj.attribute ?? "")},${JSON.stringify(obj.values ?? [])})`;
  } catch {
    return String(q);
  }
}

export function installQueryPatch(): void {
  try {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async function patchedFetch(
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      const url = input.toString();

      if (!url.includes("/databases/") && !url.includes("/teams/")) {
        return originalFetch(input, init);
      }

      try {
        const parsed = new URL(url);
        const queries = parsed.searchParams.getAll("queries[]");
        if (queries.length === 0) return originalFetch(input, init);

        let modified = false;
        const newQueries: string[] = [];

        for (const raw of queries) {
          if (raw.trim().startsWith("{")) {
            newQueries.push(jsonQueryToString(JSON.parse(raw)));
            modified = true;
          } else {
            newQueries.push(raw);
          }
        }

        if (modified) {
          const newUrl = new URL(parsed);
          newUrl.searchParams.delete("queries[]");
          for (const q of newQueries) {
            newUrl.searchParams.append("queries[]", q);
          }
          return originalFetch(newUrl.toString(), init);
        }
      } catch {
        // Patch failed silently, fall back to original request
      }

      return originalFetch(input, init);
    } as typeof fetch;
  } catch (e) {
    console.warn("[QueryPatch] Failed to install:", e);
  }
}
