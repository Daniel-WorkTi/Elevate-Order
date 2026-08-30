import type { KeyboardEvent } from "react";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n/locale-context";

export function MessageComposer({
  draft,
  sending,
  onDraftChange,
  onSend,
}: {
  draft: string;
  sending: boolean;
  onDraftChange: (value: string) => void;
  onSend: () => void;
}) {
  const t = useT();

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="shrink-0 border-t border-[#E6E8EC] bg-white p-3">
      <div className="flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={sending}
          placeholder={t("inbox.whatsapp.composerPlaceholder")}
          className="min-h-[40px] max-h-[120px] flex-1 resize-none rounded-[10px] border-[#E6E8EC] py-2.5 text-[13px] shadow-none"
        />
        <Button
          type="button"
          disabled={!draft.trim() || sending}
          onClick={onSend}
          className="h-10 shrink-0 rounded-[10px] bg-[#2563EB] px-4 text-[13px] font-medium text-white hover:bg-[#1D4ED8]"
        >
          {sending ? (
            <>
              <Loader2 className="mr-1.5 size-4 animate-spin" strokeWidth={1.75} />
              {t("inbox.whatsapp.sending")}
            </>
          ) : (
            <>
              <Send className="mr-1.5 size-4" strokeWidth={1.75} />
              {t("inbox.whatsapp.send")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
