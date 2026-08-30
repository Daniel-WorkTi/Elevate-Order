import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/locale-context";

/** Compact search row — page title lives in AppShell header. */
export function InboxHeader({
  search,
  onSearchChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const t = useT();

  return (
    <div className="flex justify-end border-b border-[#E6E8EC] px-4 py-3 sm:px-5">
      <div className="relative w-full sm:max-w-[320px]">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#98A2B3]"
          strokeWidth={1.75}
        />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("inbox.whatsapp.searchPlaceholder")}
          className="h-9 rounded-[10px] border-[#E6E8EC] bg-[#F7F8FA] pl-9 text-[13px] shadow-none placeholder:text-[#98A2B3]"
        />
      </div>
    </div>
  );
}
