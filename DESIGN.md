# ELEVATE Orders — Visual Identity & UX Canon

> Before any UI prompt or implementation: **follow this file**.  
> Product/architecture: [PROJECT.md](PROJECT.md). Snapshot: [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md).  
> Product: premium operational ecommerce SaaS — **not** a generic analytics dashboard.

## Product

Operations workspace for ecommerce teams to:

- identify problematic orders  
- contact customers through WhatsApp  
- understand delivery incidents  
- track shipments  
- review profits  

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

Active transport: **WhatsApp Web via QR** (`whatsapp_web` + `services/whatsapp-gateway/`).

| Show | Hide (active UI) |
| --- | --- |
| WhatsApp · Connect your WhatsApp · QR | Meta · Facebook · WABA · Config ID · Embedded Signup · business verification |

- Green **only** on WhatsApp connect/send CTAs  
- Legacy Meta Cloud isolated — data preserved, UI removed  

## Aesthetic

Premium European SaaS. Blend of Linear, Stripe operations tools, Vercel and modern fintech — with an original ELEVATE identity.

- Geist-style typography  
- Precise **8px** spacing  
- High information density + intentional whitespace  
- 1px subtle borders  
- Extremely subtle shadows  
- Crisp thin icons  
- High-quality tables  
- Segmented controls  
- Compact pill badges  

Desktop reference: **1440×1024** — all screens must feel like the same production application.

Stack: **shadcn/ui + Tailwind 4** · **TanStack Table** · **Motion** (controlled only) · **21st.dev** inspiration only.

Map tokens into `src/styles.css` (prefer CSS variables over hardcoded hex in components).

---

## Foundations

| Token | Value | CSS (target / existing) |
| --- | --- | --- |
| Canvas | `#F7F8FA` | `--elevate-bg` / `--background` |
| Surface | `#FFFFFF` | `--elevate-surface` / `--card` |
| Text | `#0A0C10` | `--elevate-text` / `--foreground` |
| Secondary | `#667085` | `--elevate-muted` / `--muted-foreground` |
| Muted soft | `#98A2B3` | `--elevate-muted-soft` |
| Border | `#E6E8EC` | `--elevate-border` / `--border` |
| Blue | `#2563EB` | `--elevate-blue` / `--primary` |
| Blue hover | `#1D4ED8` | `--elevate-blue-hover` |
| Blue soft | `#EFF6FF` | `--elevate-blue-soft` |
| WhatsApp | `#128C7E` | Prefer `--whatsapp` aligned to this canon |
| Focus ring | Blue @ ~40% mix | focus-visible ring |

### Semantic status colors

| Role | Direction | Use |
| --- | --- | --- |
| **success** | Muted emerald / teal | Connected, delivered, resolved, healthy |
| **warning** | Muted amber | Pending, waiting, action required, reconnecting |
| **incident** | Muted red | Incident, error, destructive risk |
| **muted** | Secondary gray | Idle, unanswered, disconnected chrome |
| **focus** | Brand blue ring | Keyboard / focus-visible only |

Do not invent neon variants. Prefer `bg-*/12` + `border-*/25` + solid text for badges.

Dark sidebar (shell): near-black `#080B10` / surface `#151A22` — chrome only, not content canvas.

---

## Typography

Font stack (existing): `"Geist Sans", "Geist", ui-sans-serif, system-ui, sans-serif` (`--font-sans` / `--font-display`).

| Role | Size | Line | Weight |
| --- | --- | --- | --- |
| Display | 32px | 40px | 600 |
| H1 | 28px | 36px | 600 |
| H2 | 24px | 32px | 600 |
| H3 | 20px | 28px | 600 |
| Title | 16px | 24px | 600 |
| Body | 14px | 20px | 400 |
| Body Medium | 14px | 20px | 500 |
| Small | 13px | 18px | 400–500 |
| Caption | 12px | 16px | 400–500 |

Avoid landing-page giant headings inside the app. Page titles typically Title/H3 scale.

---

## Spacing

Base grid = **8px**.

Prefer: **4 · 8 · 12 · 16 · 24 · 32 · 40 · 48 · 64**.

No arbitrary spacing without a layout reason.

---

## Layout

| Token | Value (derive from current shell) |
| --- | --- |
| Desktop reference | 1440 × 1024 |
| App shell | Dark sidebar + light canvas content |
| Sidebar width (expanded) | ~240px |
| Sidebar width (collapsed) | icon rail ~64–72px |
| Header height | ~56–64px |
| Content max-width | fluid within canvas; tables full width of content pane |
| Page horizontal padding | 16–24px (≥1024 prefer 24) |
| Section spacing | 16–24px |
| Table density | Compact — prefer ~40–44px row height |
| Drawer width (order detail) | ~420–480px desktop; full-bleed sheet &lt;1024 |
| Modal width | sm ~400 · md ~520 · lg ~640 |
| Onboarding max-width | ~560–640px centered content |

---

## Radius

| Element | Radius | CSS |
| --- | --- | --- |
| Large container | 16px | `--radius-xl` |
| Card | 14px | `--radius-lg` |
| Input / button | 10px | `--radius-md` / `--radius` |
| Small control | 8px | `--radius-sm` |
| Badge | pill (`9999px`) | — |

---

## Borders

Default: **1px** `#E6E8EC`.

Avoid overly dark borders on light canvas. Sidebar borders may use dark chrome tokens.

---

## Shadows

**Maximum two levels** (existing):

| Level | Token | Value intent |
| --- | --- | --- |
| subtle | `--shadow-card` | `0 1px 2px rgb(10 12 16 / 0.04)` |
| floating | `--shadow-lift` | `0 1px 2px rgb(10 12 16 / 0.06)` |

No heavy multi-layer dashboard shadows. `--shadow-glow: none`.

---

## Buttons

Shared: radius 10 · text 14 Medium · focus ring · disabled opacity ~50% · loading = spinner + disabled.

| Variant | Height | Padding | Surface | Hover | Notes |
| --- | --- | --- | --- | --- | --- |
| **Primary** | 36px (`h-9`) | 16px x | Blue `#2563EB` | `#1D4ED8` | Default CTA |
| **Secondary** | 36px | 16px x | Blue soft / outline | Soft tint | Non-destructive secondary |
| **Ghost** | 36px | 12–16px x | Transparent | Soft fill | Toolbar / tertiary |
| **Destructive** | 36px | 16px x | Muted danger | Darker danger | Confirm required for irreversible |
| **WhatsApp** | 36px | 16px x | `#128C7E` | Darker teal | **Only** connect/send WhatsApp |

Sizes: `sm` 32px · `default` 36px · `lg` 40px · `icon` 36×36.

---

## Inputs

| Property | Spec |
| --- | --- |
| Height | 36–40px |
| Padding | 10–12px horizontal |
| Border | 1px `#E6E8EC` |
| Radius | 10px |
| Focus | Blue ring / border |
| Error | Incident border + helper text |
| Disabled | Muted bg + reduced opacity |
| Label | Caption/Small · secondary · 4–8px above |
| Helper | Caption · muted · below |

---

## Tables

High information density (Orders, Profits).

| Element | Spec |
| --- | --- |
| Header | Small/Caption · medium · secondary · sticky optional · 1px bottom border |
| Row height | ~40–44px |
| Cell padding | 8–12px |
| Hover | Canvas tint `#F7F8FA` / soft blue 4% |
| Selected | Blue soft background |
| Status | Pill badge (see Status Badges) |
| Numeric | Tabular nums · right-aligned |
| Actions | Trailing · ghost/icon · reveal on hover OK on desktop |
| Empty | Compact operational copy (see Empty States) |
| Loading | Skeleton rows — not fake numbers |

TanStack Table for `/orders` and `/profits`.

---

## Status Badges

Semantic only — never decorative.

| Status | Tone |
| --- | --- |
| connected | success |
| disconnected | muted |
| pending | warning |
| syncing | warning (only during real sync) |
| incident | incident |
| unanswered | muted |
| messaged | blue / info |
| resolved | success |
| delivered | success |

Pill shape · small type · muted fill. Never invent a green “Connected” without backend truth ([PROJECT.md](PROJECT.md) invariants).

---

## Segmented Controls

Primary pattern: **`[ Dropi ] [ Dropea ]`**

| Property | Spec |
| --- | --- |
| Height | 32–36px |
| Padding | 8–12px per segment |
| Active | Surface + subtle shadow or blue soft + medium weight |
| Inactive | Muted text |
| Hover | Soft fill |
| Container | 1px border · radius 10 · canvas bg |

Never a third mixed “All supplies” tab on Inbox/Orders operational queues.

---

## Drawers

Order detail prefers **drawer** when context allows.

| Property | Spec |
| --- | --- |
| Width | ~420–480px desktop; sheet full width mobile |
| Header | Title + order id · close · 56px-ish |
| Sections | Customer · tracking · incident · message · COD — 16px gaps |
| Sticky actions | Bottom bar: WhatsApp / primary actions |
| Scroll | Body scrolls; header + actions fixed |

Motion: 100–200ms enter/exit.

---

## Connection Cards

Official pattern for Connections + Onboarding.

May show **only if real**:

- provider identity  
- short description  
- connection status (backend-derived)  
- account/store identifier  
- last sync (if known)  
- primary action  
- secondary action  

Do **not** show fake last sync, fake Connected, or invented account ids.

Card: surface · radius 14 · 1px border · subtle shadow · padding 16–20.

---

## Connection States

| State | Visual | Source of truth required |
| --- | --- | --- |
| Not connected | Muted badge | No session / no events / no credentials |
| Connecting | Warning + progress | Real pairing/sync in flight |
| Connected | Success | Backend session or real ingest proof |
| Connection error | Incident | Failed auth/API/gateway |
| Reconnecting | Warning | Actual session reconnect policy |
| Action required | Warning | Operator must paste URL / fix config |

---

## Loading

**Skeleton → content.**

Never fake loading with arbitrary `setTimeout`. Loading must reflect real pending queries/mutations.

---

## Empty States

Compact. Operational. One short sentence + optional primary action.  
No giant illustrations or marketing art.

---

## Error States

Explain:

1. what failed  
2. operational impact  
3. possible next action  

Do not hide failures behind a generic toast only. Prefer inline panel + optional toast.

Never surface raw env var names to operators when a human sentence exists.

---

## Motion

Duration **100–200ms** for microinteractions.

Allowed: tabs · drawer · status · currency · skeleton→content · connection transitions.

No ornamental motion, no perpetual fake progress.

---

## Responsive

Desktop-first.

| Breakpoint | Behaviour |
| --- | --- |
| ≥1440 | Full shell · dense tables · drawer beside content |
| 1024–1439 | Shell intact · slightly tighter padding |
| 768–1023 | Collapsible sidebar (sheet) · tables scroll horizontally · drawer as sheet |
| &lt;768 | Single column · bottom/sheet nav patterns · prioritize Inbox actions |

Do not merely scale the entire desktop layout down.

---

## Onboarding

Same product language as the app (not a marketing funnel).

| Element | Spec |
| --- | --- |
| Stepper | Horizontal compact steps · Title/Small · success check when real |
| Content width | ~560–640px |
| Connection cards | Same as Connections |
| Success | Honest — only after backend confirmation |
| QR panel | Surface card · WhatsApp CTA green · no Meta chrome |
| Footer actions | Secondary back · Primary continue (disabled when honestly blocked) |

Target step order: Store → Order source → WhatsApp → Ready ([PROJECT.md](PROJECT.md)).

---

## Forbidden Patterns

- Glassmorphism  
- Neon  
- Huge gradients  
- Generic dashboard card grids  
- Fake metrics / analytics  
- Fake notifications  
- Fake connection status  
- Fake automation (“syncing 98%”, “queue send” without backend)  
- Oversized marketing typography  
- Random radius / random colors  
- Excessive shadows  
- Pricing / Meta Ads / Analytics in chrome  
- WhatsApp green on non-WhatsApp chrome  

---

## CSS variables (reference)

```css
--elevate-bg: #F7F8FA;
--elevate-surface: #FFFFFF;
--elevate-text: #0A0C10;
--elevate-muted: #667085;
--elevate-border: #E6E8EC;
--elevate-blue: #2563EB;
--elevate-blue-hover: #1D4ED8;
--elevate-blue-soft: #EFF6FF;
--whatsapp: #128C7E; /* canon — align implementation */
--shadow-card: 0 1px 2px rgb(10 12 16 / 0.04);
--shadow-lift: 0 1px 2px rgb(10 12 16 / 0.06);
--radius-sm: 8px;
--radius-md: 10px;
--radius-lg: 14px;
--radius-xl: 16px;
```
