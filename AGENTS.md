<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## BEFORE MODIFYING THIS REPOSITORY

1. Read [PROJECT.md](PROJECT.md)
2. Read [DESIGN.md](DESIGN.md)
3. Read [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md)

| Doc | Truth |
| --- | --- |
| `PROJECT.md` | Product / architecture |
| `DESIGN.md` | Visual / UX |
| `docs/CURRENT_STATE.md` | Implementation reality snapshot |

**If documentation conflicts:**

- `CURRENT_STATE` + **executable code** determine implementation reality.  
- `PROJECT` determines intended architecture.  
- `DESIGN` determines visual implementation.

Never use `docs/archive/**` as current specification.

## NO GHOST FEATURES

Agents must **not** create:

- fake connection  
- fake loading  
- fake sync  
- fake automation  
- fake analytics  
- fake notification  
- fake success  

“Connected”, “Syncing”, “Reconnecting”, and “Sent” require real backend / provider sources of truth ([PROJECT.md](PROJECT.md) Product Invariants).

## Agentes do projeto

| Agente | Onde | Quando usar |
| --- | --- | --- |
| **elevate-web-qa** | `.cursor/skills/elevate-web-qa/SKILL.md` | Testar/regressão das funções do sistema web |
