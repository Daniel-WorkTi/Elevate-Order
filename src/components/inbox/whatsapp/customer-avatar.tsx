import { inboxInitials } from "@/lib/inbox/inbox-display";
import { cn } from "@/lib/utils";

export function CustomerAvatar({
  name,
  size = 40,
  className,
}: {
  name?: string;
  size?: number;
  className?: string;
}) {
  const initials = name ? inboxInitials(name) : "?";
  const fontSize = Math.max(11, Math.round(size * 0.32));

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-[#DFE5E7] font-semibold text-[#54656F]",
        className,
      )}
      style={{ width: size, height: size, fontSize }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
