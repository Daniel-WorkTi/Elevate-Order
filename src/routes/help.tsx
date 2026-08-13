import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, LifeBuoy, MessageCircle } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help Center — ELEVATE" },
      {
        name: "description",
        content:
          "Guides and answers for connecting Dropi Pro, Dropea and the WhatsApp Business API to ELEVATE.",
      },
      { property: "og:title", content: "Help Center — ELEVATE" },
      {
        property: "og:description",
        content: "Setup guides, FAQs and support channels for ELEVATE users.",
      },
    ],
  }),
  component: HelpPage,
});

const faqs = [
  {
    q: "How does the one-click WhatsApp button work?",
    a: "Each order card builds a pre-filled message with the customer name, order ID and delivery details, then opens WhatsApp so you only need to press send.",
  },
  {
    q: "How often do orders sync?",
    a: "Dropi Pro syncs every 2 minutes and Dropea every 5 minutes. You can force a sync any time from Settings.",
  },
  {
    q: "What counts as a message in my plan?",
    a: "Every outbound WhatsApp message counts once, whether sent manually or by an automation. Replies from customers are free.",
  },
  {
    q: "Can my team share one account?",
    a: "Team seats with roles and per-agent analytics are included in the Premium plan.",
  },
];

function HelpPage() {
  return (
    <AppShell title="Help Center" subtitle="Setup guides, FAQs and ways to reach our team.">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: BookOpen, title: "Setup guide", text: "Connect your store in under 10 minutes." },
            { icon: MessageCircle, title: "Templates", text: "Best-performing incident messages." },
            { icon: LifeBuoy, title: "Contact support", text: "Average reply time: 24 minutes.", href: "https://wa.me/351968662107" },
          ].map((card) => {
            const CardWrapper = card.href ? "a" : "div";
            return (
              <CardWrapper
                key={card.title}
                href={card.href}
                target={card.href ? "_blank" : undefined}
                rel={card.href ? "noreferrer" : undefined}
                className="card-lift block rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-colors hover:bg-secondary/50"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
                  <card.icon className="size-5" />
                </span>
                <h2 className="mt-3 text-[18px] font-semibold">{card.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{card.text}</p>
              </CardWrapper>
            );
          })}

        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-[24px] font-bold">Frequently asked questions</h2>
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
