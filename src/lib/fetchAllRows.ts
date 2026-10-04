// Supabase/PostgREST returns at most 1,000 rows per request no matter what
// `.limit()` asks for, so a query for a long date range silently came back
// truncated to the newest 1,000 rows — which made the 30-day, 90-day and
// all-time analytics all show the same numbers. This pages through with
// `.range()` until a short page comes back. The query must have a stable
// order (end it with `.order('id')`) so rows aren't skipped or repeated
// between pages.
const PAGE_SIZE = 1000

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null }>,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data } = await page(from, from + PAGE_SIZE - 1)
    if (!data) break
    rows.push(...(data as T[]))
    if (data.length < PAGE_SIZE) break
  }
  return rows
}
