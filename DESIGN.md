# ELEVATE Orders — Visual Identity & UX Canon

> Before any UI prompt or implementation: **follow this file**.  
> Product: premium operational ecommerce SaaS — **not** a generic analytics dashboard.

## Product

Operations workspace for ecommerce teams to:

- identify problematic orders  
- contact customers through WhatsApp  
- understand delivery incidents  
- track shipments  
- review profits  

## Visual language

| Token | Value |
| --- | --- |
| Primary canvas | `#F7F8FA` |
| Surface | `#FFFFFF` |
| Primary text | `#0A0C10` |
| Secondary text | `#667085` |
| Border | `#E6E8EC` |
| Brand blue | `#2563EB` |
| Blue hover | `#1D4ED8` |
| Blue soft | `#EFF6FF` |
| Near black | `#0A0C10` |
| Success | muted emerald |
| Waiting | muted amber |
| Incident | muted red |
| WhatsApp green | **only** for actual WhatsApp-related actions |

### Aesthetic

Premium European SaaS. Blend of Linear, Stripe operations tools, Vercel and modern fintech — with an original ELEVATE identity.

### Use

- Geist-style typography  
- Precise **8px** spacing system  
- High information density + intentional whitespace  
- 1px subtle borders  
- Extremely subtle shadows  
- Crisp thin icons  
- High-quality tables  
- Beautiful segmented controls  
- Compact status badges  

### Border radius

| Element | Radius |
| --- | --- |
| Large container | 16px |
| Cards | 14px |
| Inputs | 10px |
| Buttons | 10px |
| Small controls | 8px |
| Badges | pill |

### Avoid

- Generic dashboard card grids  
- Glassmorphism  
- Neon  
- Excessive gradients  
- Large marketing illustrations  
- Oversized typography  
- Fake analytics  
- Fake notifications  
- Fake automation states  
- Excessive shadows  

### Desktop target

**1440×1024** — all screens must feel like the same production application.

## Main navigation (ONLY)

1. Inbox  
2. Orders  
3. Templates  
4. Profits  
5. Connections  

### Forbidden in chrome

- Pricing  
- Meta Ads  
- Analytics  
- Upgrade CTA  
- Fake global search  
- Fake notification bell  

## Supply isolation (core UX)

Operational screens:

```
[ Dropi ] [ Dropea ]
```

- Never mix Dropi and Dropea orders in the same operational queue.  
- Profits may aggregate both supplies using filters.  
- Customer messages may only use information from the supply associated with that specific order.

## WhatsApp (Connections)

Active transport: **WhatsApp Web via QR** (`whatsapp_web` provider + `services/whatsapp-gateway/`).

| Show | Hide (active UI) |
| --- | --- |
| WhatsApp · Connect your WhatsApp · QR stub | Meta · Facebook · WABA · Config ID · Embedded Signup · business verification |

- Green `#128C7E` only on WhatsApp connect/send CTAs  
- Phase 1: conceptual QR panel + disabled connect button OK  
- Legacy Meta Cloud (`meta_cloud`) isolated — data preserved, UI removed  

## Stack (visual implementation)

- **shadcn/ui + Tailwind 4** — base components in-repo  
- **TanStack Table** — `/orders`, `/profits`  
- **Motion** — controlled only (tabs, drawers, status, currency, skeleton→content)  
- **21st.dev** — inspiration only, adapt to these tokens  

## CSS variables (target)

Map into `src/styles.css` (or theme):

```css
--elevate-canvas: #F7F8FA;
--elevate-surface: #FFFFFF;
--elevate-text: #0A0C10;
--elevate-text-secondary: #667085;
--elevate-border: #E6E8EC;
--elevate-blue: #2563EB;
--elevate-blue-hover: #1D4ED8;
--elevate-blue-soft: #EFF6FF;
--elevate-ink: #0A0C10;
/* success / waiting / incident = muted emerald / amber / red */
/* whatsapp = green, WhatsApp CTAs only */
```
