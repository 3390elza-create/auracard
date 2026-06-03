# Deploy — VPS (Docker Compose + Caddy auto-HTTPS)

Deploys the Next.js app behind Caddy (automatic Let's Encrypt HTTPS) on an
Ubuntu VPS. Caddy preserves the `Host` header, which the SIWE login requires.

> Deploys the current branch **as-is**. The dashboard's card panel stays inactive
> until the Base Sepolia contracts are deployed and their addresses are set in `.env`.

---

## 0. Prerequisites you provide
- A VPS (Ubuntu 22.04/24.04) with a public IP and SSH access.
- A domain name.
- A real `NEXT_PUBLIC_WC_PROJECT_ID` (cloud.reown.com) — and add your domain to the
  project's **Allowed Domains** there, or wallet connect will 403 in production.
- A working `NEXT_PUBLIC_RPC_URL` (Alchemy mainnet URL).

## 1. Point DNS at the VPS
At your domain registrar / DNS provider create:

| Type | Name | Value |
|------|------|-------|
| A    | `@`  | `<VPS_PUBLIC_IP>` |
| A    | `www` | `<VPS_PUBLIC_IP>` (optional) |

Wait for it to resolve (`dig +short yourdomain.com` should return the VPS IP)
**before** starting Caddy, so the certificate can be issued.

## 2. Install Docker on the VPS
```bash
ssh user@<VPS_PUBLIC_IP>
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker   # run docker without sudo
docker --version && docker compose version
```

## 3. Get the code
```bash
git clone <YOUR_REPO_URL> aura && cd aura
git checkout feat/card-approval-vault
```

## 4. Configure environment
```bash
cp .env.production.example .env
# generate two DIFFERENT secrets:
echo "SESSION_SECRET=$(openssl rand -hex 32)"
echo "NONCE_SECRET=$(openssl rand -hex 32)"
nano .env   # set DOMAIN, NEXT_PUBLIC_WC_PROJECT_ID, NEXT_PUBLIC_RPC_URL, the two secrets
```
`DOMAIN` must be the bare domain (e.g. `aura.example.com`) with no scheme/slash.
Do **not** commit `.env`.

## 5. Build and start
```bash
docker compose up -d --build
docker compose logs -f caddy   # watch the TLS certificate get issued
```
Open the firewall for web traffic if needed:
```bash
sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw allow OpenSSH
```

## 6. Verify
- `https://yourdomain.com` loads the landing page over HTTPS.
- Connect wallet → SIWE sign-in works (no `domain_mismatch`, no Reown 403).
- Dashboard loads; the card panel shows the inactive/error state until contracts exist.

## 7. Updating after new commits
```bash
cd aura && git pull
docker compose up -d --build
```

## 8. When the Base Sepolia contracts are deployed
Set in `.env`:
```
NEXT_PUBLIC_TEST_USDC_ADDRESS=0x...
NEXT_PUBLIC_VAULT_ADDRESS=0x...
```
Then rebuild (these are build-time public vars):
```bash
docker compose up -d --build
```

## Troubleshooting
- **Cert not issued:** DNS must resolve to the VPS first; ports 80/443 open; re-run `docker compose up -d`.
- **Reown 403 / wallet won't connect:** real `NEXT_PUBLIC_WC_PROJECT_ID` set at build, and the domain whitelisted in Reown Cloud.
- **`domain_mismatch` on login:** ensure you browse via the real domain (Caddy passes the Host through automatically).
- **Env change not reflected:** `NEXT_PUBLIC_*` are baked at build — always `--build` after changing them.
