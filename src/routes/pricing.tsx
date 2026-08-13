import { createFileRoute } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — ELEVATE" },
      {
        name: "description",
        content:
          "Free, Pro and Premium ELEVATE plans priced by monthly WhatsApp message volume for dropshipping stores.",
      },
      { property: "og:title", content: "Pricing — ELEVATE" },
      {
        property: "og:description",
        content: "Choose the plan that matches your monthly WhatsApp message volume.",
      },
    ],
  }),
  component: PricingPage,
});

const plans = [
  {
    name: "Free",
    price: "0 €",
    volume: "300 messages / month",
    features: ["1 store integration", "Manual WhatsApp send", "Basic order statuses", "Email support"],
    cta: "Current plan",
    highlight: false,
  },
  {
    name: "Pro",
    price: "29 €",
    volume: "5,000 messages / month",
    features: [
      "Dropi Pro + Dropea sync",
      "One-click incident templates",
      "Analytics dashboard",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    highlight: true,
  },
  {
    name: "Premium",
    price: "79 €",
    volume: "25,000 messages / month",
    features: [
      "Unlimited integrations",
      "Automated follow-up sequences",
      "Team seats & roles",
      "Dedicated success manager",
    ],
    cta: "Go Premium",
    highlight: false,
  },
];

function PricingPage() {
  return (
    <AppShell title="Pricing" subtitle="Plans scale with your monthly WhatsApp message volume.">
      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              "card-lift relative flex flex-col rounded-2xl border p-6 shadow-[var(--shadow-card)]",
              plan.highlight
                ? "border-electric/40 bg-card ring-2 ring-electric/25"
                : "border-border bg-card",
            )}
          >
            {plan.highlight ? (
              <span className="absolute -top-3 left-6 inline-flex items-center gap-1.5 rounded-full gradient-cta px-3 py-1 text-xs font-semibold">
                <Sparkles className="size-3.5" />
                Most popular
              </span>
            ) : null}
            <h2 className="text-[24px] font-bold">{plan.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{plan.volume}</p>
            <p className="mt-5 text-[48px] font-bold leading-none tracking-tight text-foreground">
              {plan.price}
              <span className="text-base font-normal text-muted-foreground"> / month</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Billed monthly. Cancel anytime.
            </p>

            <ul className="mt-6 flex-1 space-y-3 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" />
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              className={cn("mt-6 rounded-xl", plan.highlight && "gradient-cta border-0")}
              variant={plan.highlight ? "default" : "outline"}
              onClick={() => toast.success(`${plan.name} plan selected`)}
            >
              {plan.cta}
            </Button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
