import assert from "node:assert/strict";
import { test } from "node:test";
import { subMonths } from "date-fns";

import {
  formatDateTime,
  formatDayMonth,
  formatRelativeDistance,
} from "@/lib/i18n/date-locale";

test("Portuguese datetime uses de particles, not English MMM", () => {
  const date = new Date(2026, 6, 4, 14, 44);
  assert.equal(formatDateTime(date, "pt"), "4 de julho de 2026 · 14:44");
  assert.equal(formatDayMonth(date, "pt"), "4 de jul");
});

test("Portuguese relative time does not say aproximadamente", () => {
  const date = subMonths(new Date(), 2);
  const relative = formatRelativeDistance(date, "pt");
  assert.equal(relative.includes("aproximadamente"), false);
  assert.match(relative, /^há \d+ meses?$/);
});
