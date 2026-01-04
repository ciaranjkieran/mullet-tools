// @shared/api/hooks/timer/useTimeEntries.ts
import { useQuery } from "@tanstack/react-query";
import api from "../../axios";
import { TimeEntryDTO } from "../../../types/Timer";

// Small helper to format a date as YYYY-MM-DD (UTC-safe enough for our use)
function formatYMD(d: Date): string {
  // ISO: 2025-11-29T13:32:19.847Z → "2025-11-29"
  return d.toISOString().slice(0, 10);
}

// 🔑 Export a factory so other code can build the exact same key
export const TIME_ENTRIES_QK = (from?: string, to?: string) => {
  if (!from || !to) {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const resolvedFrom = from ?? formatYMD(yesterday);
    const resolvedTo = to ?? formatYMD(now);

    return ["timer", "entries", resolvedFrom, resolvedTo] as const;
  }

  return ["timer", "entries", from, to] as const;
};

/**
 * Default behaviour:
 * - If caller passes `from`/`to`, use them directly.
 * - If omitted, we fetch a *window* from "yesterday → today".
 *
 * Backend still gets simple YYYY-MM-DD bounds,
 * and the UI (TodayEntriesCard) applies the true 24h filter
 * via `within24hFromEnd`.
 */
export function useTimeEntries(params?: { from?: string; to?: string }) {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Resolve default date range
  const defaultFrom = formatYMD(yesterday);
  const defaultTo = formatYMD(now);

  const from = params?.from ?? defaultFrom;
  const to = params?.to ?? defaultTo;

  const search = new URLSearchParams();
  if (from) search.set("from", from);
  if (to) search.set("to", to);

  return useQuery<TimeEntryDTO[]>({
    queryKey: TIME_ENTRIES_QK(from, to),
    queryFn: async () => {
      const url = `/time-entries${
        search.toString() ? `?${search.toString()}` : ""
      }`;

      const { data } = await api.get(url);
      return data as TimeEntryDTO[];
    },
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });
}
