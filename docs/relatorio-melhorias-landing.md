# Relatório de Melhorias — Página Inicial (Landing Page)

**Produto:** Aura — Cartão de crédito lastreado em cripto
**Autor:** Design (revisão profissional de UI/UX)
**Data:** 2026-06-02
**Status:** Para análise do Gerente de Projetos — aprovar / adiar / descartar item a item

---

## Como ler este relatório

Cada melhoria é independente e tem:

- **Prioridade** — 🔴 Crítica · 🟠 Alta · 🟡 Média · ⚪ Baixa
- **Esforço** — P (pequeno, < 2h) · M (médio, meio dia) · G (grande, 1+ dia)
- **Regra/justificativa** — referência à `security.md`, `frontend.md` ou ao guia de UI/UX
- **Caixa de decisão do GP** — `[ ] Aprovar  [ ] Adiar  [ ] Descartar`

> ⚠️ **Importante:** este relatório **não altera código**. Vários itens tocam em
> **integridade de marketing e compliance** (KYC, "investidores de elite", logos de
> bandeira de cartão). Esses estão sinalizados e precisam de validação de negócio/
> jurídico antes de qualquer implementação.

---

## Resumo executivo

A landing atual está visualmente coerente com o sistema de design (glassmorphism,
gradiente aurora, grid editorial) e bem componentizada. Os problemas concentram-se em
**três frentes**:

1. **Marca incompleta** — o logo é um *placeholder* (quadrado com a letra "A"); existe
   um logo oficial em anexo que ainda não foi aplicado.
2. **Falta de informação real e confiável** — a página vende "luxo" e "elite", mas não
   responde às perguntas concretas de quem vai conectar uma carteira: *quais redes,
   quais tokens, quais carteiras, precisa de KYC?, vocês movem meu dinheiro?, qual o
   limite/LTV?*. Para um produto cripto, **sinais de confiança são o coração da
   conversão** e hoje estão ausentes.
3. **Acessibilidade e navegação** — sem menu mobile, links mortos (`#`), parallax sem
   respeitar `prefers-reduced-motion`, e o herói abaixo da escala tipográfica prevista.

Há também **3 riscos de integridade/compliance** que recomendo resolver antes do
lançamento (ver itens 03, 12 e 13).

---

## PARTE A — Itens solicitados explicitamente

### 01 · Aplicar o logo oficial 🔴 · Esforço: P

**Situação atual:** `public/logo.svg` é um placeholder — um quadrado com gradiente e a
letra "A". É usado no `TopNav`, `Footer` e no `CardVisualizer`.

**Proposta:** substituir pelo logo em anexo (gota/chama neon dentro de um círculo, com
o gradiente violeta→azul→teal). Ele **já está alinhado com o gradiente aurora oficial**
(`#7C5CFF → #4F8CFF → #2DD4BF`), o que reforça a identidade sem retrabalho de paleta.

**Recomendações técnicas (regra `frontend.md` + UI "Vector-Only Assets"):**
- **Vetorizar o logo para SVG** em vez de usar o PNG cru. O anexo é raster e vai
  borrar/pixelar em tamanhos maiores e em telas retina, além de gerar CLS.
- Fornecer 2 variantes: **ícone isolado** (nav/card/favicon) e **lockup horizontal**
  (ícone + wordmark "Aura").
- Definir *clear space* mínimo e tamanho mínimo legível (o brilho neon perde definição
  abaixo de ~24px — para favicon, usar uma versão simplificada).
- Gerar `favicon`, `apple-touch-icon` e `og:image` a partir do novo mark.
- No `CardVisualizer`, o logo entra com `aria-hidden` (decorativo) — manter assim.

`[ ] Aprovar   [ ] Adiar   [ ] Descartar`

---

### 02 · Comunicar "Sem KYC" — com precisão 🔴 · Esforço: P · ⚠️ Compliance

**O que foi pedido:** destacar que "não precisa de KYC".

**Cuidado necessário (integridade):** o roadmap do projeto (`CLAUDE.md`, Sprint 5)
prevê **KYC na fase de onboarding/persistência**. Afirmar "sem KYC" de forma absoluta
seria **impreciso e um risco de compliance**. O que é verdade hoje e dá para comunicar
com honestidade:

> A **avaliação de elegibilidade é read-only e não exige documentos**: você conecta a
> carteira, o sistema lê seus saldos on-chain (`view`/`balanceOf`) e calcula seu limite
> **sem pedir RG, comprovante ou selfie**.

**Proposta de copy (EN — UI do produto é em inglês):**
- Badge no herói: **"No paperwork to check your limit"**
- Texto de apoio: *"Connect your wallet and see your eligibility instantly — read-only,
  no documents, no credit check."*
- Em uma futura seção de FAQ (item 09): pergunta *"Do I need KYC?"* com resposta honesta
  ("Checking your limit needs zero documents. Final card issuance may require identity
  verification where the law requires it.").

**Decisão do GP:** confirmar com negócio/jurídico **até onde** podemos prometer "sem
KYC". Recomendo a versão precisa acima em vez de um "No KYC" cru.

`[ ] Aprovar (versão precisa)   [ ] Aprovar "No KYC" absoluto (assumindo risco)   [ ] Adiar`

---

### 03 · Adicionar informação real e verificável 🟠 · Esforço: M

**Situação atual:** a página usa linguagem aspiracional ("luxo", "elite", "entrega VIP")
mas **não dá nenhum fato concreto**. Quem vai conectar a carteira quer respostas, não
adjetivos.

**Proposta — adicionar fatos reais do produto** (a serem confirmados pelo GP; deixar
como conteúdo configurável, **nunca fabricar dados** — regra `CLAUDE.md`):

| Informação | Por que importa | Onde exibir |
|---|---|---|
| **Redes suportadas** (Ethereum, Base, etc.) | Usuário precisa saber se a rede dele é aceita | Faixa de logos + seção "Supported networks" |
| **Tokens aceitos como colateral** (ETH, USDC, WBTC…) | Define se ele é elegível | Seção "Supported assets" com chips/badges |
| **Carteiras suportadas** (MetaMask, WalletConnect, Coinbase, Rainbow, Ledger) | Já existem ícones em `public/wallets/` | Faixa de logos no herói ou "How it works" |
| **LTV / como o limite é calculado** (ex.: "até X% do seu colateral") | Pergunta nº1 de quem usa cripto como garantia | Seção "How it works" ou FAQ |
| **Modelo não-custodial** | Diferencial central e exigência de `security.md` | Seção de segurança dedicada (item 04) |

> **Princípio:** todo número exibido (LTV, taxas, nº de usuários) deve vir de fonte real
> e configurável. Enquanto não houver dado real, usar texto qualitativo honesto em vez
> de inventar métrica.

`[ ] Aprovar   [ ] Adiar   [ ] Descartar`   ·   GP preenche os valores reais: ______

---

## PARTE B — Confiança e segurança (o que mais move conversão em cripto)

### 04 · Seção de Segurança / Não-custódia 🔴 · Esforço: M

**Por que é crítico:** o produto inteiro depende de o usuário **confiar a leitura da
carteira** sem medo de perder fundos. Hoje a landing **não diz uma palavra** sobre isso.
A `security.md` define o modelo não-custodial como inegociável — ele deveria ser o
**argumento de venda principal**, não um detalhe.

**Proposta — nova seção "Your keys, your funds" com 3 garantias:**
1. **Read-only access** — *"We only read your balances. Assessing your card never
   requires a transaction or an approval."*
2. **Non-custodial** — *"No operator key can ever move your funds. Withdrawal is your
   exclusive right."*
3. **Sign-in, not spend** — *"You sign a plain login message (SIWE) with a nonce — never
   a blank cheque, never `setApprovalForAll`."*

Usar ícones de cadeado/escudo "thin line" (1.5px, regra do DESIGN.md), tom sóbrio,
sem alarme. Isso converte o requisito de segurança em diferencial competitivo.

`[ ] Aprovar   [ ] Adiar   [ ] Descartar`

---

### 05 · Faixa de prova social / parceiros — honesta 🟡 · Esforço: P · ⚠️ Integridade

**Situação atual:** o `ClosingCTA` diz *"Join elite investors already benefiting from
Aura around the world"* — isso **afirma que já existe uma base de usuários**, o que pode
não ser verdade ainda (produto em Sprint 2).

**Proposta:**
- Enquanto não houver base real, trocar por copy honesta orientada a benefício:
  *"Be among the first to turn on-chain wealth into everyday spending power."*
- Quando houver dados reais, adicionar uma faixa com **métricas verificáveis** (TVL
  avaliado, nº de carteiras conectadas, redes suportadas) — nunca números inventados.
- Faixa de "As seen on" / auditorias / parceiros **só com logos reais e autorizados**.

`[ ] Aprovar   [ ] Adiar   [ ] Descartar`

---

## PARTE C — Acessibilidade e navegação (qualidade técnica)

### 06 · Menu mobile ausente 🔴 · Esforço: M

**Bug de UX:** no `TopNav`, os links (Home, Cards, Investments, Security) estão em
`hidden md:flex` — **somem no mobile e não há hambúrguer/drawer**. Em telas pequenas o
usuário perde toda a navegação secundária. Regra `nav-hierarchy` / `bottom-nav-limit`.

**Proposta:** adicionar menu hambúrguer com drawer no mobile, mantendo o CTA "Connect
Wallet" sempre visível.

`[ ] Aprovar   [ ] Adiar   [ ] Descartar`

---

### 07 · Links mortos (`#`) 🟠 · Esforço: P

**Situação:** `TopNav` (Cards, Investments, Security) e `Footer` (Terms, Privacy,
Support, Blog) apontam todos para `#`. Links que não levam a lugar nenhum quebram
confiança — especialmente **Terms/Privacy**, que são esperados em fintech.

**Proposta:** ou criar as páginas/âncoras de destino, ou ocultar os links até existirem.
Priorizar **Terms** e **Privacy** (expectativa legal). Decisão do GP sobre escopo.

`[ ] Aprovar   [ ] Adiar   [ ] Descartar`

---

### 08 · Parallax sem `prefers-reduced-motion` 🟠 · Esforço: P

**Situação:** o `CardVisualizer` faz rotação 3D no movimento do mouse sem respeitar a
preferência de movimento reduzido (regra `reduced-motion` — CRÍTICA de acessibilidade).
Pode causar desconforto/vertigem em usuários sensíveis.

**Proposta:** desativar a inclinação quando `prefers-reduced-motion: reduce` estiver
ativo; o card permanece estático e legível.

`[ ] Aprovar   [ ] Adiar   [ ] Descartar`

---

### 09 · Adicionar FAQ 🟡 · Esforço: M

**Por quê:** concentra as dúvidas reais (KYC, custódia, redes, taxas, segurança) em um
formato escaneável e melhora SEO. Casa com os itens 02, 03 e 04.

**Perguntas sugeridas:** *Do I need KYC? · Do you ever move my funds? · Which networks
and tokens are supported? · How is my limit calculated? · What happens if my collateral
drops? · Which wallets can I use?*

`[ ] Aprovar   [ ] Adiar   [ ] Descartar`

---

## PARTE D — Refinamento visual e de marca

### 10 · Escala do herói abaixo do previsto 🟡 · Esforço: P

**Situação:** o DESIGN.md reserva `display-lg` (64px) para "hero balances and marketing
statements", mas o `Hero` usa `headline-lg` (40px). O título principal está **menor do
que o sistema de design pede**, enfraquecendo a hierarquia editorial.

**Proposta:** elevar o `<h1>` do herói para `display-lg` no desktop (com a variante
mobile já existente), mantendo a medida de linha confortável.

`[ ] Aprovar   [ ] Adiar   [ ] Descartar`

---

### 11 · Padronizar a marca: "Aura" vs "Aura Finance" 🟡 · Esforço: P

**Situação:** `TopNav` e `Footer` mostram "Aura"; `BrandingAnchor` mostra "Aura Finance";
o DESIGN.md chama o sistema de "Aura Finance". Inconsistência de nome.

**Proposta:** o GP define o nome canônico (recomendo **"Aura"** como marca e "Finance"
apenas como descritor opcional) e aplicamos de forma consistente em nav, footer e
metadados.

`[ ] Aprovar como "Aura"   [ ] Aprovar como "Aura Finance"   [ ] Adiar`

---

### 12 · Círculos vermelho/laranja no card ⚠️ · Esforço: P · Compliance

**Situação:** o `CardVisualizer` desenha dois círculos sobrepostos vermelho/laranja —
visualmente idênticos ao **logo da Mastercard**. Se não há parceria de bandeira firmada,
isso **sugere uma associação inexistente** (risco de marca/jurídico).

**Proposta:** substituir por um selo neutro/genérico até haver parceria real e
autorizada. Decisão de negócio.

`[ ] Aprovar (tornar genérico)   [ ] Manter (parceria confirmada)   [ ] Adiar`

---

### 13 · Linguagem "elite/VIP" vs promessas verificáveis ⚪ · Esforço: P

**Situação:** "entrega física VIP", "investidores de elite", "luxo digital" são
promessas sem lastro. Não é mentira grave, mas dilui a credibilidade técnica que o
público cripto valoriza.

**Proposta:** manter o tom premium, mas ancorar em fatos (itens 03 e 04). Ex.: trocar
parte do "luxo" por "self-custody", "instant on-chain assessment", "no credit bureau".

`[ ] Aprovar   [ ] Adiar   [ ] Descartar`

---

## PARTE E — Observações de manutenção (não exigem decisão de produto)

- **Conflito de documentação:** `DESIGN.md` diz que a microcópia deve ser em
  **português do Brasil**, mas `CLAUDE.md` determina **UI inteiramente em inglês** (e a
  implementação atual está em inglês — correto). Sugiro atualizar a nota do DESIGN.md
  para remover a contradição.
- **Performance do logo:** ao aplicar o novo logo (item 01), declarar `width`/`height`
  e usar SVG/WebP para evitar *layout shift* (CLS) — regra `image-dimension`.

---

## Quadro-resumo para decisão rápida

| # | Item | Prioridade | Esforço | Flag |
|---|------|:---:|:---:|------|
| 01 | Aplicar logo oficial (vetorizado) | 🔴 | P | — |
| 02 | "Sem KYC" com precisão | 🔴 | P | ⚠️ Compliance |
| 03 | Informação real (redes/tokens/carteiras/LTV) | 🟠 | M | Dados reais |
| 04 | Seção de segurança / não-custódia | 🔴 | M | — |
| 05 | Prova social honesta | 🟡 | P | ⚠️ Integridade |
| 06 | Menu mobile | 🔴 | M | A11y |
| 07 | Corrigir links mortos | 🟠 | P | Legal |
| 08 | Parallax + reduced-motion | 🟠 | P | A11y |
| 09 | Seção de FAQ | 🟡 | M | — |
| 10 | Escala do herói (display-lg) | 🟡 | P | — |
| 11 | Padronizar nome da marca | 🟡 | P | — |
| 12 | Remover visual de bandeira no card | ⚠️ | P | ⚠️ Compliance |
| 13 | Tom "elite" → fatos | ⚪ | P | — |

**Sequência recomendada de implementação** (após aprovação): 01 → 02 → 04 → 03 → 06 →
08 → 07 → 10/11/12 → 09 → 05/13.

---

*Próximo passo: o GP marca aprovar/adiar/descartar em cada item. Na próxima rodada,
implemento apenas os itens aprovados, seguindo TDD para qualquer hook e respeitando as
regras de `security.md`.*
