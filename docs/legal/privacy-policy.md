# Privacy Policy — Aura

> ⚠️ DRAFT — template prepared as a starting point. It is NOT legal advice and MUST be reviewed and finalized by a licensed attorney in the applicable jurisdiction(s) before publication.

**Effective Date:** [EFFECTIVE_DATE]
**Data Controller:** [LEGAL_ENTITY_NAME] ("Aura", "we", "us", or "our")
**Registered Address:** [REGISTERED_ADDRESS]
**Contact / Data Protection:** [SUPPORT_EMAIL]

---

## Table of Contents

1. Introduction and Scope
2. Summary — What We Do and Do NOT Collect
3. Data We Collect
4. Data We Do NOT Collect
5. How We Use Data
6. Legal Basis for Processing (GDPR-Style)
7. Cookies and Session Tokens
8. Third Parties and Data Sharing
9. Data Retention
10. Security Measures
11. Your Rights
12. International Data Transfers
13. Children
14. Changes to This Policy
15. Contact

---

## 1. Introduction and Scope

1.1 This Privacy Policy explains how [LEGAL_ENTITY_NAME] handles information in connection with the Aura platform, website, and related services (the "Service"). It should be read together with our Terms of Service.

1.2 Aura is a **non-custodial**, crypto-backed credit card platform. The Service reads public on-chain wallet balances on a read-only basis to assess card eligibility. We are committed to data minimization: we collect as little personal data as practicable.

1.3 This Policy applies to data processed by us through the Service. It does not apply to public blockchains, third-party wallets, or other third-party services, which operate independently and under their own terms and privacy practices.

## 2. Summary — What We Do and Do NOT Collect

**We collect / process:**
- Your **public wallet address**.
- **Public on-chain data** associated with that address (e.g., token balances read via `balanceOf` / `view` / RPC reads).
- A **session token** delivered as an HttpOnly JWT cookie to keep you signed in.
- Standard **technical and log data** (e.g., IP address, browser/device info, timestamps, error logs).

**We do NOT collect — ever:**
- Identity documents, selfies, government IDs (e.g., RG/passport/driver's license), or proof of address.
- KYC data for eligibility, and we do not run a traditional credit-bureau check for eligibility.
- **Private keys or seed phrases** — never, anywhere, in any form.

## 3. Data We Collect

3.1 **Public Wallet Address.** When you connect your wallet, we process your public address to identify your session, perform read-only balance reads, and assess eligibility.

3.2 **Public On-Chain Data.** We read publicly available blockchain data associated with your address (such as token balances) on a read-only basis to assess card eligibility and an estimated limit. This data is public by nature of the blockchain.

3.3 **Authentication Data (SIWE).** To sign you in, our server issues a nonce, and you sign a plain, human-readable login message with your wallet. We process the signature and nonce to verify wallet ownership. **The signature proves ownership only — it is not a transaction or token approval.**

3.4 **Session Token.** Upon successful sign-in, we issue a session token as an **HttpOnly JWT cookie**. This cookie maintains your authenticated session and is not accessible to client-side JavaScript.

3.5 **Technical and Log Data.** Like most online services, our infrastructure may automatically process technical data such as IP address, browser type, device and operating-system information, request timestamps, pages or endpoints accessed, and error/diagnostic logs, for security, reliability, and abuse-prevention purposes.

3.6 **Voluntary Communications.** If you contact us (e.g., by email at [SUPPORT_EMAIL]), we process the information you choose to provide in that communication.

## 4. Data We Do NOT Collect

4.1 We do **not** collect or store **private keys or seed phrases**. We will never ask for them. Anyone asking you for them while claiming to be Aura is acting fraudulently.

4.2 To assess eligibility and show your estimated limit, we do **not** collect identity documents, selfies, government-issued IDs, proof of address, or biometric data, and we do **not** perform a traditional credit-bureau check. Eligibility is assessed from public on-chain data only (no-KYC eligibility).

4.3 We do not take custody of your assets and do not process data that would allow us to move your funds.

4.4 **Note on regulated downstream features.** If you choose to use certain downstream, regulated features that may be provided by or through third parties (for example, final issuance of a fiat-spendable card), those third parties may be legally required to verify identity. In that case, the relevant third party collects and controls that information under its own privacy policy, and we will tell you when this applies. This does not change the no-KYC nature of the eligibility flow.

## 5. How We Use Data

5.1 We use the data described above to:
(a) authenticate you via SIWE and maintain your session;
(b) perform read-only on-chain balance reads to assess card eligibility and an estimated limit;
(c) operate, maintain, secure, and improve the Service;
(d) detect, prevent, and investigate fraud, abuse, security incidents, and violations of our Terms;
(e) comply with applicable legal obligations and respond to lawful requests; and
(f) communicate with you about the Service or your inquiries.

5.2 We do not sell your personal data. We do not use your data for third-party advertising profiling.

## 6. Legal Basis for Processing (GDPR-Style)

6.1 Where the EU/UK General Data Protection Regulation (GDPR/UK GDPR) or a similar framework applies, we rely on the following legal bases:

(a) **Performance of a contract** (Art. 6(1)(b)) — to provide the Service you request (authentication, eligibility assessment, session management).

(b) **Legitimate interests** (Art. 6(1)(f)) — to secure the Service, prevent fraud and abuse, maintain reliability, and improve our offering, balanced against your rights and freedoms.

(c) **Legal obligation** (Art. 6(1)(c)) — to comply with applicable law and lawful requests.

(d) **Consent** (Art. 6(1)(a)) — where we rely on consent (e.g., certain non-essential cookies, if any), which you may withdraw at any time.

6.2 **Applicability note.** Whether GDPR or another data-protection law (e.g., Brazil's LGPD, the California CCPA/CPRA, or others) applies depends on your location and the circumstances of processing. We apply the principles in this Policy as a baseline; specific statutory rights vary by jurisdiction and are subject to the final, attorney-reviewed version of this Policy for [GOVERNING_LAW_JURISDICTION].

## 7. Cookies and Session Tokens

7.1 **Essential session cookie.** We use a strictly necessary **HttpOnly JWT cookie** to maintain your authenticated session after SIWE sign-in. Because it is HttpOnly, it cannot be read by client-side scripts, which helps protect against certain attacks. This cookie is required for the Service to function.

7.2 **Other cookies.** We aim to minimize cookies. If we use any non-essential cookies (e.g., analytics), we will identify them and, where required by law, obtain your consent and provide controls. [If you do not use non-essential cookies, state so here.]

7.3 You can control cookies through your browser settings, but disabling the essential session cookie will prevent you from staying signed in.

## 8. Third Parties and Data Sharing

8.1 We share data only as necessary to operate the Service. Key categories of third parties:

(a) **Blockchain RPC providers** (e.g., **Alchemy**, **Infura**) — to perform read-only on-chain reads. The data shared is typically your **public wallet address** and standard RPC requests. These providers operate under their own terms and privacy policies.

(b) **Wallet connection infrastructure** (e.g., **WalletConnect / Reown AppKit**) — to facilitate connecting your wallet. The data involved is generally your **public wallet address** and connection metadata, under the provider's own terms.

(c) **Hosting and infrastructure providers** — to host the Service and store technical/log data, acting as our processors under appropriate agreements.

(d) **Security, monitoring, and anti-fraud tools** — to keep the Service secure.

(e) **Professional advisers and authorities** — where required by law, regulation, legal process, or to protect our rights, users, or the public.

(f) **Corporate transactions** — in connection with a merger, acquisition, or asset sale, subject to this Policy.

8.2 Public blockchains are, by design, public and immutable. Any on-chain activity associated with your address is visible to anyone and is outside our control.

8.3 We do not sell personal data.

## 9. Data Retention

9.1 We retain personal data only for as long as necessary for the purposes described in this Policy, including providing the Service, security, and compliance with legal obligations.

9.2 Indicative retention:
- **Session tokens (JWT cookie):** retained for the session/token validity period and then expire.
- **Technical and log data:** retained for [LOG_RETENTION_PERIOD] for security and operational purposes, then deleted or anonymized.
- **Support communications:** retained for [SUPPORT_RETENTION_PERIOD].

9.3 Public on-chain data is stored on public blockchains independently of us and cannot be deleted by us.

## 10. Security Measures

10.1 We implement technical and organizational measures appropriate to the risk, including: transport encryption (HTTPS/TLS); HttpOnly cookies for session tokens; the principle of least privilege; the non-custodial architecture (no private keys or seed phrases are ever collected or stored); enforcement of **bounded approvals only** (we never request unlimited approvals or `setApprovalForAll`); access controls; and logging and monitoring.

10.2 No method of transmission or storage is completely secure. While we strive to protect your data, we cannot guarantee absolute security. You are responsible for securing your own wallet, keys, and devices.

## 11. Your Rights

11.1 Depending on your jurisdiction, you may have rights including to:
(a) **access** the personal data we hold about you;
(b) request **rectification** of inaccurate data;
(c) request **erasure** ("right to be forgotten"), subject to legal limits and the technical reality that public blockchain data cannot be deleted by us;
(d) **restrict** or **object** to certain processing;
(e) request **data portability**;
(f) **withdraw consent** where processing is based on consent; and
(g) lodge a **complaint** with a supervisory authority.

11.2 To exercise your rights, contact us at [SUPPORT_EMAIL]. We may need to verify your request (for example, by asking you to demonstrate control of the relevant wallet via a signed message) before acting. We respond within the timeframe required by applicable law.

11.3 **Limits.** Because much of what the Service reads is public on-chain data and because we deliberately do not collect identity data for eligibility, our ability to identify, correct, or erase certain data may be limited. We will explain any such limitation when responding.

## 12. International Data Transfers

12.1 We and our service providers (e.g., RPC providers, hosting, wallet infrastructure) may process data in countries other than yours. Where we transfer personal data internationally, we use appropriate safeguards required by applicable law (e.g., adequacy decisions or Standard Contractual Clauses for GDPR transfers).

12.2 For details about a specific transfer or safeguard, contact us at [SUPPORT_EMAIL].

## 13. Children

13.1 The Service is not intended for, and may not be used by, anyone under 18 (or the age of majority in their jurisdiction, if higher). We do not knowingly process the personal data of children. If you believe a child has provided us data, contact us at [SUPPORT_EMAIL] and we will take appropriate steps.

## 14. Changes to This Policy

14.1 We may update this Policy from time to time. We will post the updated version and revise the "Effective Date". Where required by law, we will provide additional notice. Your continued use of the Service after changes take effect constitutes acceptance of the updated Policy.

## 15. Contact

For privacy questions or to exercise your rights, contact:
**[LEGAL_ENTITY_NAME]**
[REGISTERED_ADDRESS]
Email: [SUPPORT_EMAIL]
[If applicable: Data Protection Officer / EU or UK Representative: [DPO_OR_REPRESENTATIVE_CONTACT]]
