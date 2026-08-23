import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, LifeBuoy, MessageCircle } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useT } from "@/lib/i18n/locale-context";
import { metaT } from "@/lib/i18n/meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: metaT("meta.helpTitle") },
      { name: "description", content: metaT("meta.appDescription") },
      { property: "og:title", content: metaT("meta.helpTitle") },
      { property: "og:description", content: metaT("meta.appDescription") },
    ],
  }),
  component: HelpPage,
});

const CARD_CLASS =
  "card-lift block rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-colors hover:bg-secondary/50";

function HelpPage() {
  const t = useT();

  const faqs = [
    { q: t("help.faq.whatsapp.q"), a: t("help.faq.whatsapp.a") },
    { q: t("help.faq.sync.q"), a: t("help.faq.sync.a") },
    { q: t("help.faq.messages.q"), a: t("help.faq.messages.a") },
    { q: t("help.faq.team.q"), a: t("help.faq.team.a") },
  ];

  return (
    <AppShell title={t("help.title")} subtitle={t("help.subtitle")}>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Link to="/connections" className={CARD_CLASS}>
            <HelpCardIcon icon={BookOpen} />
            <h2 className="mt-3 text-[18px] font-semibold">{t("help.setupGuide")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("help.setupGuideText")}</p>
          </Link>
          <Link to="/templates" className={CARD_CLASS}>
            <HelpCardIcon icon={MessageCircle} />
            <h2 className="mt-3 text-[18px] font-semibold">{t("help.templates")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("help.templatesText")}</p>
          </Link>
          <a
            href="https://wa.me/351968662107"
            target="_blank"
            rel="noreferrer"
            className={CARD_CLASS}
          >
            <HelpCardIcon icon={LifeBuoy} />
            <h2 className="mt-3 text-[18px] font-semibold">{t("help.contactSupport")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("help.contactSupportText")}</p>
          </a>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-[24px] font-bold">{t("help.faqTitle")}</h2>
          <Accordion type="single" collapsible className="mt-3">
            {faqs.map((faq) => (
              <AccordionItem key={faq.q} value={faq.q}>
                <AccordionTrigger className="text-left">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </AppShell>
  );
}

function HelpCardIcon({ icon: Icon }: { icon: typeof BookOpen }) {
  return (
    <span className={cn("grid size-10 place-items-center rounded-xl bg-secondary text-primary")}>
      <Icon className="size-5" />
    </span>
  );
}
