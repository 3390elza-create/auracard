# Análise do Gerente de Projetos — Página Inicial

**Base:** `docs/relatorio-melhorias-landing.md`
**Data:** 2026-06-02
**Status:** Decisões consolidadas. Itens marcados ✅ APROVADO entram na próxima rodada de implementação.

---

## Decisões do dono do produto (registradas nesta rodada)

1. **KYC** → o produto **será "No KYC"** (sem KYC). Mensagem absoluta aprovada.
2. **Prova social** → usar **"+11.000 usuários de elite"** como número real.
3. **Círculos do cartão** → **manter** o visual de bandeira no `CardVisualizer`.
4. **Links** → **nenhum link pode estar morto**; se a página de destino não existir, ela
   **deve ser criada**.
5. **Termos e Política de Privacidade** → **devem existir**; **especialista jurídico
   acionado** para redigir (em andamento — ver "Trabalho em andamento" no fim).

---

## Veredito item a item

| # | Item | Prioridade | Veredito do GP | Observação / ajuste |
|---|------|:---:|:---:|---|
| 01 | Aplicar logo oficial (vetorizado) | 🔴 | ✅ **APROVADO** | Vetorizar p/ SVG antes de aplicar; gerar favicon + og:image. |
| 02 | Mensagem "No KYC" | 🔴 | ✅ **APROVADO — versão absoluta** | Decisão do dono: produto **é** no-KYC. Ver **Ação A** abaixo (reconciliar roadmap). |
| 03 | Informação real (redes/tokens/carteiras/LTV) | 🟠 | ✅ **APROVADO** | Carteiras já temos (ícones em `public/wallets/`). **Faltam dados** — ver **Inputs necessários**. |
| 04 | Seção de segurança / não-custódia | 🔴 | ✅ **APROVADO** | Vira argumento de venda principal. Casa com os Termos. |
| 05 | Prova social | 🟡 | ✅ **APROVADO com número** | Usar **"+11,000 elite users"**. Ver **Ação B** (responsabilidade pela métrica). |
| 06 | Menu mobile | 🔴 | ✅ **APROVADO** | Bug de acessibilidade real; navegação some no celular hoje. |
| 07 | Corrigir links mortos | 🟠 | ✅ **APROVADO — escopo ampliado** | **Gerar todas as páginas de destino** (ver mapa de páginas abaixo). |
| 08 | Parallax + `prefers-reduced-motion` | 🟠 | ✅ **APROVADO** | A11y crítica; baixo custo. |
| 09 | Seção de FAQ | 🟡 | ✅ **APROVADO** | Concentra dúvidas (KYC, custódia, redes, LTV). Vira também uma página `/faq`. |
| 10 | Escala do herói (`display-lg`) | 🟡 | ✅ **APROVADO** | Alinha com o DESIGN.md (64px no herói). |
| 11 | Padronizar nome da marca | 🟡 | ✅ **APROVADO → "Aura"** | "Aura" como marca; "Finance" só descritor opcional. |
| 12 | Círculos vermelho/laranja no card | ⚠️ | ✅ **MANTER** (decisão do dono) | Ver **Ação C** — registrar base da decisão (parceria/estilo) p/ proteção de marca. |
| 13 | Tom "elite/VIP" → fatos | ⚪ | ✅ **APROVADO (híbrido)** | **Manter** o tom "elite" (coerente com o item 05) **e** ancorar em fatos (itens 03/04). |
| — | Conflito DESIGN.md (PT-BR vs EN) | — | ✅ **CORRIGIR** | Atualizar nota do DESIGN.md p/ refletir UI em inglês (`CLAUDE.md`). |

**Resultado: 13/13 aprovados** (2 com ressalva de ação de negócio: itens 02 e 05; 1 mantido por decisão do dono: item 12).

---

## Mapa de páginas a gerar (item 07 — nenhum link morto)

Hoje apontam para `#` e precisam de destino real:

| Link | Origem | Decisão |
|---|---|---|
| **Cards** | TopNav | Criar `/cards` (visão geral do produto cartão) |
| **Investments** | TopNav | Criar `/investments` **ou** remover do nav até a fase do vault (Sprint 6, gated). **GP decide** — ver Input 4. |
| **Security** | TopNav | Criar `/security` (reaproveita a seção de não-custódia do item 04) |
| **Terms** | Footer | Criar `/terms` (conteúdo do jurídico — em andamento) |
| **Privacy** | Footer | Criar `/privacy` (conteúdo do jurídico — em andamento) |
| **Support** | Footer | Criar `/support` (contato/ajuda) ou linkar canal real |
| ~~**Blog**~~ | Footer | ❌ **REMOVER do footer** (decisão do GP) |
| **FAQ** | (novo) | Criar `/faq` (item 09) |

> Princípio aplicado: link só existe se leva a algo real. Onde não houver conteúdo,
> a recomendação é **remover** em vez de publicar página vazia — exceto Terms/Privacy,
> que são obrigatórios.

---

## Ações de negócio que o GP precisa fechar

- **Ação A — Reconciliar o roadmap com "No KYC".** O `CLAUDE.md` (Sprint 5) ainda lista
  "KYC" no onboarding. Se o produto é oficialmente no-KYC, o `CLAUDE.md` e os Termos
  precisam ser ajustados para **não se contradizerem**. Recomendo atualizar a Sprint 5
  para "persistência/onboarding (sem KYC)". *(Confirmar antes de publicar a copy "No KYC".)*
- **Ação B — Métrica de prova social.** "+11.000 usuários de elite" será exibido como
  fato. O dono do produto assume a veracidade/atualização do número. Sugiro guardá-lo
  como **valor configurável** (não hard-coded) para auditoria e atualização fácil.
- **Ação C — Visual de bandeira no cartão.** Mantido por decisão do dono. Registrar a
  base (parceria de bandeira firmada **ou** escolha puramente estilística) para proteção
  de marca, já que o visual remete à Mastercard.

---

## Dados reais confirmados pelo GP (item 03)

1. **Redes suportadas:** **Ethereum, Base, Arbitrum, Polygon** ✅
2. **Tokens aceitos como colateral:** **ETH, BNB, WBTC, USDC** ✅
3. **LTV / regra do limite:** "o mais indicado do mercado" → ver recomendação abaixo.
4. **Blog:** **REMOVER** ✅ · **Investments:** manter no nav (apontando para `/investments`,
   página a gerar). *(Se preferir remover Investments também, é só avisar.)*

> Carteiras já definidas pelos assets existentes: **MetaMask, WalletConnect,
> Coinbase Wallet, Rainbow** (`public/wallets/`).

### Recomendação de LTV (padrão de mercado prudente)

"O mais indicado do mercado" para crédito lastreado em cripto é um **LTV escalonado por
risco do ativo**, com folga para evitar liquidação em volatilidade. Referências de
mercado (Nexo, Aave, etc.) convergem para limites conservadores. Proposta:

| Ativo | LTV recomendado | Racional |
|---|---|---|
| **USDC** (stablecoin) | **até 80%** | Baixíssima volatilidade |
| **ETH** | **até 60%** | Blue-chip, liquidez alta |
| **WBTC** | **até 60%** | Blue-chip, liquidez alta |
| **BNB** | **até 50%** | Mais volátil / maior folga de segurança |

- **Headline honesto para a landing (EN):** *"Spend up to 50% of your crypto — up to 80%
  on stablecoins."*
- Exibir o LTV como **valor configurável**, não hard-coded, para ajuste sem deploy.

> ⚠️ **Reconciliação técnica (rede × token):** as redes confirmadas são Ethereum, Base,
> Arbitrum e Polygon — **nenhuma é a BNB Chain**. "BNB" como colateral só funciona se for
> uma versão *wrapped* numa dessas redes. **Confirmar** com o time de engenharia/produto
> qual representação de BNB será lida on-chain (regra: validar e checksumar cada endereço).

---

## Sequência de implementação aprovada

**Fase 1 (marca + confiança + correções críticas):** 01 → 02 → 04 → 06 → 08
**Fase 2 (conteúdo real + páginas):** 03 → 07 (gerar páginas) → 09 (FAQ) → 05 → 13
**Fase 3 (polimento):** 10 → 11 → 12 (registrar decisão) → correção do DESIGN.md

Páginas legais (Terms/Privacy) entram na Fase 2 assim que o jurídico entregar o texto.

---

## Trabalho em andamento

- **Especialista jurídico acionado** para redigir **Termos de Serviço** e **Política de
  Privacidade** (modelo não-custodial, read-only, SIWE, no-KYC). Entrega em:
  - `docs/legal/terms-of-service.md`
  - `docs/legal/privacy-policy.md`
  - Os documentos saem como **DRAFT** e exigem **revisão de advogado licenciado** na
    jurisdição aplicável antes de publicar (preenchendo os placeholders `[ENTRE COLCHETES]`:
    razão social, jurisdição, endereço, e-mail de contato, data de vigência).

---

*Próximo passo sugerido: o GP preenche os 4 inputs acima e confirma a Ação A. Com isso,
inicio a implementação pela Fase 1 (que não depende desses inputs).*

---

## Log de implementação (Fases 1–3)

**Fase 1 — concluída e verificada** (typecheck/lint/build/39 testes ✅)
- Item 01 logo oficial vetorizado (`public/logo.svg`) + favicon (`app/icon.svg`).
- Item 02 mensagem "No KYC" no herói.
- Item 04 seção de segurança / não-custódia.
- Item 06 menu mobile (hambúrguer + drawer, acessível).
- Item 08 parallax do cartão respeita `prefers-reduced-motion`.
- Item 10 (bônus) herói em `display-lg`.

**Fase 2 — concluída e verificada** (build com 7 páginas estáticas ✅)
- Item 03 redes/tokens/LTV/carteiras (`lib/content/marketing.ts` — fonte única).
  - LTV aprovado: "up to 50% — up to 80% on stablecoins". BNB **fora** da lista.
- Item 05 prova social "+11.000" (configurável, não hard-coded → Ação B atendida).
- Item 09 FAQ (seção na home + página `/faq`).
- Item 07 páginas geradas: `/cards`, `/investments` (gated/coming-soon honesto),
  `/security`, `/support`, `/faq`, `/terms`, `/privacy`. **Blog removido.**
- E-mail de suporte: `contact@auracard.io`.
- **Ação A resolvida:** `CLAUDE.md` Sprint 5 ajustada para "NO KYC".

**Fase 3 — concluída**
- Item 11: marca padronizada como **"Aura"**; "Finance" mantido só como descritor no
  `BrandingAnchor` (uso permitido). Sem inconsistências.
- Item 12: círculos do cartão **mantidos** por decisão do dono. *(Ação C — registrar a
  base, parceria ou estilo, fica com o GP/jurídico para proteção de marca.)*
- DESIGN.md: nota de localização corrigida para **inglês** (alinha com `CLAUDE.md`).

## Pendências de negócio (não bloqueiam o código, bloqueiam o "go-live")
1. **`/terms` e `/privacy`** renderizam o DRAFT do jurídico com placeholders
   (`[LEGAL_ENTITY_NAME]`, `[GOVERNING_LAW_JURISDICTION]`, `[EFFECTIVE_DATE]`, etc.).
   Preencher e ter revisão de advogado licenciado antes de publicar.
2. **WalletConnect/Reown project ID** em `.env.local` está como `test_project_id_for_dev`
   (placeholder) → causa erros 403 no console (ver diagnóstico abaixo). Trocar por um ID
   real de https://cloud.reown.com.
3. **Ação C** (base da decisão dos círculos do cartão) a registrar.

## Diagnóstico dos erros do console (print do GP)
| Erro | Causa | Ação |
|---|---|---|
| `403` em `api.web3modal.org/.../config` e `/project-limits` | `projectId=test_project_id_for_dev` é inválido | Definir `NEXT_PUBLIC_WC_PROJECT_ID` real (cloud.reown.com). Não-fatal: o AppKit usa defaults locais. **Não é bug de código.** |
| `ERR_BLOCKED_BY_CLIENT` em `cca-lite.coinbase.com`, `pulse.walletconnect.org` | **Ad-blocker** do navegador bloqueando telemetria/analytics de terceiros | Inofensivo. Analytics já está **desligado** na nossa config do AppKit (`features.analytics: false`). |
| `Analytics SDK: Failed to fetch` | Mesma telemetria da Coinbase bloqueada pelo ad-blocker | Inofensivo. |
| `link preload ... not used` (warning) | Preload de fonte/recurso do Next/AppKit | Cosmético. |
