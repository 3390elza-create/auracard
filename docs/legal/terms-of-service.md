# Terms of Service — Aura

> ⚠️ DRAFT — template prepared as a starting point. It is NOT legal advice and MUST be reviewed and finalized by a licensed attorney in the applicable jurisdiction(s) before publication.

**Effective Date:** [EFFECTIVE_DATE]
**Operated by:** [LEGAL_ENTITY_NAME] ("Aura", "we", "us", or "our")
**Registered Address:** [REGISTERED_ADDRESS]
**Contact:** [SUPPORT_EMAIL]

---

## Table of Contents

1. Acceptance of Terms
2. Eligibility and Age
3. Description of the Service (Non-Custodial)
4. Wallet Connection and SIWE Authentication
5. The Card and Credit Assessment
6. Collateral, Bounded Approvals, and Liquidation Risk
7. No-KYC Eligibility (and Where Verification May Still Apply)
8. User Responsibilities and Prohibited Use
9. Risk Disclosures (Crypto)
10. Intellectual Property
11. Disclaimers
12. Limitation of Liability
13. Indemnification
14. Modification of These Terms
15. Suspension and Termination
16. Governing Law and Dispute Resolution
17. General Provisions
18. Contact

---

## 1. Acceptance of Terms

1.1 These Terms of Service ("Terms") form a binding agreement between you ("you", "User") and [LEGAL_ENTITY_NAME] governing your access to and use of the Aura platform, website, application, and related services (collectively, the "Service").

1.2 By accessing the Service, connecting a wallet, signing the Sign-In with Ethereum ("SIWE") login message, or otherwise using any feature, you confirm that you have read, understood, and agree to be bound by these Terms and by our Privacy Policy, which is incorporated by reference.

1.3 If you do not agree with any part of these Terms, you must not access or use the Service.

1.4 If you are entering into these Terms on behalf of a legal entity, you represent that you have authority to bind that entity, and "you" refers to that entity.

## 2. Eligibility and Age

2.1 You must be at least 18 years old (or the age of legal majority in your jurisdiction, if higher) to use the Service.

2.2 You represent and warrant that:
(a) you are not located in, under the control of, or a resident of any country, region, or jurisdiction subject to comprehensive sanctions, and you are not on any sanctions or denied-persons list;
(b) your use of the Service does not violate any law or regulation applicable to you; and
(c) you have not been previously suspended or removed from the Service.

2.3 The Service may not be available in all jurisdictions. You are responsible for determining whether your use of the Service is lawful in your location.

## 3. Description of the Service (Non-Custodial)

3.1 Aura is a crypto-backed credit card platform. The Service reads publicly available on-chain wallet balances on a **read-only** basis to assess credit-card eligibility and to suggest a credit limit, and (subject to applicable phases and approvals) facilitates the use of crypto assets as collateral.

3.2 **Non-Custodial.** The Service is non-custodial. We never take custody of, store, or control your crypto assets, private keys, or seed phrases. No operator, system, or administrative key controlled by us can transfer your funds to an arbitrary address. **Withdrawal of your assets is your exclusive right**, exercisable directly from your own wallet or via non-custodial smart-contract functions.

3.3 **Read-Only Assessment.** Assessing eligibility and a credit limit relies only on read-only blockchain reads (for example, `view` calls, `balanceOf`, and standard RPC reads). Assessing the card **never requires a transaction**, an approval, or any movement of your funds.

3.4 We may modify, suspend, or discontinue any part of the Service at any time. Certain features (including any future managed-trading or vault functionality) may be gated, released in phases, or made available only after additional review, audit, or regulatory clearance.

3.5 The Service is a software interface. We are not a bank, a deposit-taking institution, a money transmitter (except where expressly licensed), an investment adviser, or a fiduciary, and nothing in the Service constitutes such a relationship unless expressly stated in writing.

## 4. Wallet Connection and SIWE Authentication

4.1 To use the Service you connect a self-custodied crypto wallet (for example, via WalletConnect / Reown AppKit).

4.2 **SIWE.** Authentication uses Sign-In with Ethereum. You sign a plain, human-readable login message containing a server-issued nonce. **Signing this message proves ownership of the wallet only.** It is not a transaction, not a token approval, and does not authorize any movement of funds.

4.3 Upon successful sign-in, we issue a session token delivered as an HttpOnly cookie to maintain your authenticated session. You are responsible for keeping your device and browser secure.

4.4 You are solely responsible for safeguarding your wallet, private keys, seed phrases, and any device used to access the Service. We will **never** ask you for your private key or seed phrase, and you must never disclose them to anyone. Any request claiming to come from Aura that asks for your private key or seed phrase is fraudulent.

4.5 You are responsible for all activity that occurs through your connected wallet and authenticated session. Blockchain transactions are generally irreversible; we cannot reverse, cancel, or refund them.

## 5. The Card and Credit Assessment

5.1 **Eligibility and Limit.** Based on read-only on-chain data, the Service may indicate whether you are eligible for a card and may display an estimated credit limit. Eligibility indications and estimated limits are informational, are not an offer of credit, and may change as on-chain conditions change.

5.2 **Not Custody.** The credit assessment process does not take custody of your assets and does not move your funds. It is based on reading public balances.

5.3 **Not Investment Advice.** Nothing in the Service constitutes investment, financial, legal, tax, or accounting advice or a recommendation to buy, hold, or sell any asset. Eligibility indications, limits, and collateral parameters are not advice. You should consult your own qualified advisers.

5.4 **Final Issuance.** Final issuance of any payment card, line of credit, or related product may depend on additional conditions, third-party card issuers or program managers, network rules, and applicable law (see Section 7). We do not guarantee that any card will be issued or that any indicated limit will be made available.

5.5 **Fees.** Any fees, interest, spreads, or charges associated with a card or related product will be disclosed before you incur them, and your acceptance of such fees is required before they apply.

## 6. Collateral, Bounded Approvals, and Liquidation Risk

6.1 **Collateral.** Crypto assets may be used as collateral to support a card or related product. Collateral arrangements are effected through non-custodial smart contracts and/or your own wallet.

6.2 **Bounded Approvals Only.** Any deposit or collateral action uses only **bounded approvals** — an exact-amount `approve` tied to a real deposit, or a single-use Permit2 authorization with a specific amount and expiry. The Service will **never** request:
(a) unlimited or open-ended ERC-20 approvals (e.g., `type(uint256).max` / `MaxUint256`);
(b) `setApprovalForAll`;
(c) blind signatures (e.g., `eth_sign`); or
(d) any approval that grants an operator-controlled address open-ended authority to move your funds.

If you are ever prompted for an approval that does not match these constraints, do not approve it and contact us at [SUPPORT_EMAIL].

6.3 **Liquidation Risk.** Where collateral secures an obligation, a decline in the value of your collateral (or other parameters defined by the applicable smart contract or program) may trigger **liquidation** of some or all of your collateral, potentially at unfavorable prices and without prior notice. You may lose part or all of your collateral. You are responsible for monitoring your collateralization and managing this risk.

6.4 **Your Control.** Because the Service is non-custodial, you retain the exclusive right to withdraw your assets in accordance with the applicable smart-contract terms, subject to any obligations you have secured.

## 7. No-KYC Eligibility (and Where Verification May Still Apply)

7.1 **No-KYC Eligibility.** Checking eligibility and viewing an estimated limit does **not** require Know-Your-Customer ("KYC") verification. To assess eligibility, the Service does **not** collect identity documents, selfies, government IDs, proof of address, or run a traditional credit-bureau check. Eligibility is assessed from public on-chain data only.

7.2 **Legal Requirements for Final Issuance.** Notwithstanding Section 7.1, certain downstream services — in particular the final issuance of a fiat-spendable payment card, fiat settlement, or other regulated activity provided by or through third parties — may be subject to identity verification, anti-money-laundering ("AML"), counter-terrorist-financing, sanctions screening, or similar legal obligations imposed on those third parties or on us by applicable law. Where such obligations apply, completing the corresponding verification with the relevant provider may be a condition of accessing those specific features. This does not change the no-KYC nature of the eligibility flow described in Section 7.1.

7.3 We will be transparent about when any such verification is required and which party collects and controls that information. Any such verification is separate from, and not a precondition of, viewing your eligibility or estimated limit.

## 8. User Responsibilities and Prohibited Use

8.1 You agree to use the Service only for lawful purposes and in compliance with these Terms and all applicable laws.

8.2 You must not:
(a) use the Service to launder money, finance terrorism, evade sanctions, or facilitate any illegal activity;
(b) use the Service if you are barred under Section 2;
(c) access the Service through automated means in a manner that disrupts or overloads it, except for documented, permitted API use;
(d) attempt to gain unauthorized access to any account, system, smart contract, or data;
(e) reverse-engineer, decompile, or tamper with the Service except to the extent such restriction is prohibited by law;
(f) introduce malware, exploit vulnerabilities, or conduct unauthorized security testing;
(g) misrepresent your identity or impersonate any person or entity;
(h) use another person's wallet without authorization; or
(i) interfere with the non-custodial security controls of the Service (for example, by attempting to induce unbounded approvals).

8.3 You are responsible for any taxes arising from your use of the Service and for reporting and paying them.

## 9. Risk Disclosures (Crypto)

9.1 **You acknowledge and accept the following risks**, which are inherent and not exhaustive:

(a) **Volatility.** Crypto asset prices are highly volatile and can change rapidly and unpredictably. The value of your collateral can decrease significantly.

(b) **Liquidation.** Collateral may be liquidated as described in Section 6, potentially resulting in partial or total loss.

(c) **Smart-Contract Risk.** Smart contracts may contain bugs, vulnerabilities, or be subject to exploits, governance changes, or failures, which may result in loss of funds.

(d) **Irreversibility.** Blockchain transactions are generally final and irreversible. Errors (e.g., wrong address, wrong network) may cause permanent loss.

(e) **Network and Third-Party Risk.** Blockchain networks, RPC providers, wallet software, and other third-party infrastructure may experience downtime, congestion, forks, reorganizations, or attacks.

(f) **Regulatory Risk.** Laws and regulations applicable to crypto assets are evolving and may adversely affect the Service or your use of it.

(g) **Key-Management Risk.** Loss of your private keys or seed phrase means permanent and irrecoverable loss of access to your assets. We cannot recover them.

9.2 You use the Service at your own risk and are solely responsible for your decisions. Do not commit assets you cannot afford to lose.

## 10. Intellectual Property

10.1 The Service, including its software, design, "Aura" branding, logos, text, graphics, and other content (excluding open-source components under their own licenses, and excluding public blockchain data), is owned by or licensed to [LEGAL_ENTITY_NAME] and is protected by intellectual-property laws.

10.2 Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service for its intended purpose. No other rights are granted.

10.3 You must not copy, modify, distribute, sell, lease, or create derivative works of the Service except as expressly permitted or as allowed by applicable open-source licenses or mandatory law.

10.4 Any feedback you provide may be used by us without restriction or obligation to you.

## 11. Disclaimers

11.1 THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WITHOUT LIMITATION IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.

11.2 We do not warrant that the Service will be uninterrupted, secure, error-free, or free of harmful components, or that on-chain data, price feeds, eligibility indications, or estimated limits will be accurate, complete, or current.

11.3 We are not responsible for the operation of blockchain networks, third-party wallets, RPC providers, smart contracts not deployed by us, or any third-party services. Your interactions with such third parties are at your own risk and may be governed by their own terms.

11.4 Nothing in these Terms excludes or limits any liability that cannot lawfully be excluded or limited.

## 12. Limitation of Liability

12.1 TO THE MAXIMUM EXTENT PERMITTED BY LAW, [LEGAL_ENTITY_NAME] AND ITS AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR CRYPTO ASSETS, ARISING OUT OF OR RELATED TO THE SERVICE, WHETHER IN CONTRACT, TORT, OR OTHERWISE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

12.2 WITHOUT LIMITING SECTION 12.1, WE ARE NOT LIABLE FOR LOSSES ARISING FROM: PRICE VOLATILITY; LIQUIDATION OF COLLATERAL; SMART-CONTRACT BUGS OR EXPLOITS; BLOCKCHAIN IRREVERSIBILITY OR REORGANIZATIONS; THIRD-PARTY INFRASTRUCTURE FAILURE; YOUR LOSS OF KEYS OR SEED PHRASE; OR YOUR FAILURE TO SECURE YOUR WALLET OR DEVICE.

12.3 TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE TOTAL FEES YOU PAID TO US FOR THE SERVICE IN THE [TWELVE (12)] MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR (B) [LIABILITY_CAP_AMOUNT].

12.4 Some jurisdictions do not allow certain limitations; in those jurisdictions, the above limitations apply to the fullest extent permitted by law.

## 13. Indemnification

13.1 You agree to indemnify, defend, and hold harmless [LEGAL_ENTITY_NAME] and its affiliates, officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or related to:
(a) your use of the Service;
(b) your violation of these Terms or any applicable law;
(c) your violation of any third-party right; or
(d) your crypto-asset transactions, collateral, or tax obligations.

## 14. Modification of These Terms

14.1 We may modify these Terms from time to time. We will post the updated Terms and update the "Effective Date". Where required by law, we will provide additional notice.

14.2 Changes take effect when posted (or on the date stated). Your continued use of the Service after changes take effect constitutes acceptance. If you do not agree, you must stop using the Service.

## 15. Suspension and Termination

15.1 You may stop using the Service at any time. Because the Service is non-custodial, you retain control of your assets and may withdraw them in accordance with the applicable smart-contract terms, subject to obligations you have secured.

15.2 We may suspend or terminate your access to the Service (in whole or in part), with or without notice, if we reasonably believe you have violated these Terms or applicable law, or to protect the Service, other users, or us, or to comply with legal requirements.

15.3 Sections that by their nature should survive termination (including Sections 9–13, 16, and 17) survive.

## 16. Governing Law and Dispute Resolution

16.1 These Terms are governed by the laws of [GOVERNING_LAW_JURISDICTION], without regard to conflict-of-laws rules.

16.2 Subject to any mandatory consumer-protection rights you may have, the courts located in [JURISDICTION_VENUE] will have exclusive jurisdiction over any dispute arising out of or related to these Terms or the Service, unless the parties agree to alternative dispute resolution (e.g., binding arbitration) as set out below.

16.3 **[Optional — Arbitration / Class-Action Waiver.]** [If applicable, insert arbitration agreement, arbitral institution and seat, and any class-action waiver, drafted and reviewed for enforceability in the applicable jurisdiction(s).]

16.4 To the extent permitted by law, any claim must be brought within [LIMITATION_PERIOD] of the event giving rise to it.

## 17. General Provisions

17.1 **Entire Agreement.** These Terms and the Privacy Policy constitute the entire agreement between you and us regarding the Service.

17.2 **Severability.** If any provision is held unenforceable, the remaining provisions remain in effect.

17.3 **No Waiver.** Our failure to enforce any provision is not a waiver.

17.4 **Assignment.** You may not assign these Terms without our consent. We may assign them to an affiliate or successor.

17.5 **Force Majeure.** We are not liable for delays or failures caused by events beyond our reasonable control.

17.6 **Language.** These Terms are drafted in English; the English version controls unless mandatory law requires otherwise.

## 18. Contact

Questions about these Terms may be sent to:
**[LEGAL_ENTITY_NAME]**
[REGISTERED_ADDRESS]
Email: [SUPPORT_EMAIL]
