# Élow Estúdio Design — Proposal System

Everything needed to generate proposals for Élow leads via ChatGPT.

---

## How to Use

1. Start a new ChatGPT conversation
2. Upload all four `.md` files as context
3. Paste the meeting transcript or discovery notes
4. ChatGPT follows the `transcript_to_draft` workflow — extracts brief, selects package, drafts copy
5. Once the draft is approved, paste the contents of `proposta-TEMPLATE-ELOW.html` and instruct ChatGPT to fill in the placeholders

---

## Files

| File | Purpose |
|---|---|
| `elow_business_context.md` | Who Élow is, the team (Natália + Rebecca), methodology, proof points, contact |
| `elow_brand_system.md` | Voice, tone, proposal structure, visual identity reference |
| `elow_pricing.md` | All packages with real prices — Naming, IV Básico/Ideal/Completo, combos, add-ons, optional services table |
| `elow_transcript_to_draft.md` | Full ChatGPT workflow: transcript → brief → package selection → proposal draft → HTML |
| `proposta-TEMPLATE-ELOW.html` | Branded HTML template with `[PLACEHOLDER]` slots — fill after draft is approved |

---

## Template Placeholders

The HTML template contains these slots for ChatGPT to fill:

| Placeholder | What goes here |
|---|---|
| `[NOME DO CLIENTE]` | Client business name |
| `[TÍTULO DA PROPOSTA]` | One-line project description (e.g. "Identidade visual para um negócio em crescimento.") |
| `[Uma proposta para...]` | Cover subtitle — one sentence on what the proposal delivers |
| `[SERVIÇO 1]` / `[SERVIÇO 2]` | Service tags (e.g. Identidade Visual, Naming, Redesign de Marca) |
| `[DECLARAÇÃO]` | Bold one-liner statement on the brand gap |
| `[PARÁGRAFO 1/2]` in Sumário | Executive summary paragraphs |
| `[TÍTULO]` + `[PARÁGRAFO 1/2]` in Contexto | Business context section |

Tiers (Combo Básico / Ideal / Completo) are pre-filled with real Élow deliverables and prices. ChatGPT marks the recommended tier and may adjust which tier is highlighted based on the brief.

---

## Package Quick Reference

| Package | Price | Timeline |
|---|---|---|
| Naming Básico | R$3.000 | 30 dias úteis |
| Naming Ideal | R$4.300 | 30 dias úteis |
| IV Combo Básico | R$5.300 | 6–7 semanas |
| IV Combo Ideal ★ | R$5.800 | 6–8 semanas |
| IV Combo Completo | R$7.200 | 8–10 semanas |
| Naming Básico + IV Básico | R$7.880 (combo) | 50 dias úteis |
| Naming Básico + IV Ideal | R$8.360 (combo) | 50 dias úteis |
