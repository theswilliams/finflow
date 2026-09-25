export const PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

/**
 * Reads EVERY row of a query by paging with `.range()`.
 *
 * Supabase's API returns at most `max_rows` rows (1000 by default) per request, silently. A plain
 * `select("*")` therefore truncates large tables without any error: a user with 1,500 transactions
 * would see only 1,000 and wrong balances. The query passed in MUST have a total order (e.g. a
 * unique tie-breaker column) so pages neither overlap nor skip rows.
 *
 * `maxPages` is a safety valve against an infinite loop if the server ignores `.range()`.
 */
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize: number = PAGE_SIZE,
  maxPages = 1000,
): Promise<{ data: T[]; error: { message: string } | null }> {
  const all: T[] = [];
  for (let page = 0; page < maxPages; page++) {
    const from = page * pageSize;
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) return { data: [], error };
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < pageSize) return { data: all, error: null };
  }
  return { data: all, error: { message: `Too many rows (more than ${maxPages * pageSize}).` } };
}
