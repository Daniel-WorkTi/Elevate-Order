import { cn } from "@/lib/utils";

const WHATSAPP_LOGO_SRC = "/brands/whatsapp.svg";

type WhatsAppLogoProps = {
  size?: number;
  className?: string;
};

/** Official WhatsApp mark (Wikimedia SVG). */
export function WhatsAppLogo({ size = 40, className }: WhatsAppLogoProps) {
  return (
    <img
      src={WHATSAPP_LOGO_SRC}
      alt=""
      width={size}
      height={size}
      draggable={false}
      decoding="async"
      className={cn("block shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}
