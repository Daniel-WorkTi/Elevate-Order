import { differenceInHours, differenceInMinutes, format, isToday, isYesterday } from "date-fns";

export type RelativeTimestamp = {
  relative: string;
  exact: string;
};

/** Compact relative time for operational tables. Pass ISO timestamps only. */
export function formatRelativeTimestamp(iso: string | null | undefined): RelativeTimestamp | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const exact = format(date, "d MMM yyyy, HH:mm");
  const now = new Date();
  const mins = differenceInMinutes(now, date);

  if (mins < 1) return { relative: "Just now", exact };
  if (mins < 60) return { relative: `${mins} min ago`, exact };

  const hours = differenceInHours(now, date);
  if (hours < 24 && isToday(date)) return { relative: `${hours}h ago`, exact };
  if (isYesterday(date)) return { relative: "Yesterday", exact };

  return { relative: format(date, "d MMM yyyy"), exact };
}
