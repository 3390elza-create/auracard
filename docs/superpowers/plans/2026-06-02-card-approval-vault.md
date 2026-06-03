# Card Approval Flow + Non-Custodial Vault — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the "Request my Aura Card" flow on Base Sepolia: one EIP-2612 signature + one `depositWithPermit` tx deposits 80% of the user's test-USDC into a non-custodial ERC4626 vault, mints $AURA 1:1, and reveals a demo card.

**Architecture:** Solidity contracts (Foundry, OpenZeppelin) for `TestUSDC` (faucet) and `AuraVault` (ERC4626, the vault token IS $AURA). Frontend reads the on-chain $AURA position to derive card state; a `useCardApproval` hook orchestrates sign → deposit → confirm. All web3 logic in `lib/web3/`. Testnet only — mainnet gated on audit.

**Tech Stack:** Foundry, OpenZeppelin Contracts v5, Solidity 0.8.24, Base Sepolia (84532), Next.js/React, wagmi/viem, @tanstack/react-query, vitest.

**Spec:** `docs/superpowers/specs/2026-06-02-card-approval-vault-design.md`

---

## File Structure

**Contracts (new `contracts/` Foundry project)**
- `contracts/foundry.toml` — Foundry config + remappings.
- `contracts/src/TestUSDC.sol` — ERC20Permit faucet token (6 decimals).
- `contracts/src/AuraVault.sol` — ERC4626 vault; token = $AURA; `depositWithPermit`; `depositsPaused`.
- `contracts/test/TestUSDC.t.sol` — token tests.
- `contracts/test/AuraVault.t.sol` — vault + permit + non-custody tests.
- `contracts/script/Deploy.s.sol` — Base Sepolia deploy.

**Frontend**
- `lib/web3/chains.ts` — add Base Sepolia.
- `lib/web3/vault/config.ts` — addresses + ABIs.
- `lib/web3/vault/permit.ts` — pure EIP-2612 typed-data builder + 80% math.
- `lib/web3/vault/permit.test.ts` — tests for the above.
- `lib/web3/hooks/useVaultPosition.ts` — read tUSDC balance + $AURA shares/assets.
- `lib/web3/hooks/useCardApproval.ts` — sign → deposit → confirm state machine.
- `lib/web3/hooks/useCardApproval.test.ts` — mocked-client orchestration test.
- `lib/card/generateDemoCard.ts` — pure demo-card generator.
- `lib/card/generateDemoCard.test.ts` — Luhn / expiry / determinism tests.
- `components/dashboard/CardActivationPanel.tsx` — CTA + flow states.
- `components/card/CardVisualizer.tsx` — modify to reveal demo data when active.
- `app/dashboard/page.tsx` — wire vault position + activation panel.
- `.env.example`, `.env.local` — Base Sepolia RPC + contract addresses.

---

## Phase 1 — Solidity contracts (Foundry)

### Task 1: Initialize the Foundry project

**Files:**
- Create: `contracts/foundry.toml`
- Create: `contracts/.gitignore`

**Prerequisite:** Foundry installed (`foundryup`). On Windows use Git Bash/WSL.

- [ ] **Step 1: Scaffold and install OpenZeppelin**

Run:
```bash
mkdir -p contracts && cd contracts
forge init --no-git --force .
rm -f src/Counter.sol test/Counter.t.sol script/Counter.s.sol
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0 --no-git
```
Expected: `lib/openzeppelin-contracts/` and `lib/forge-std/` exist.

- [ ] **Step 2: Write `contracts/foundry.toml`**

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.24"
remappings = [
  "@openzeppelin/=lib/openzeppelin-contracts/",
  "forge-std/=lib/forge-std/src/",
]
```

- [ ] **Step 3: Write `contracts/.gitignore`**

```gitignore
out/
cache/
broadcast/
```

- [ ] **Step 4: Verify the toolchain builds**

Run: `cd contracts && forge build`
Expected: "Nothing to compile" or a clean compile (no contracts yet besides libs).

- [ ] **Step 5: Commit**

```bash
git add contracts/foundry.toml contracts/.gitignore
git commit -m "chore(contracts): init Foundry project with OpenZeppelin v5"
```

---

### Task 2: `TestUSDC` faucet token (TDD)

**Files:**
- Create: `contracts/src/TestUSDC.sol`
- Test: `contracts/test/TestUSDC.t.sol`

- [ ] **Step 1: Write the failing test**

`contracts/test/TestUSDC.t.sol`:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {TestUSDC} from "../src/TestUSDC.sol";

contract TestUSDCTest is Test {
    TestUSDC usdc;

    function setUp() public {
        usdc = new TestUSDC();
    }

    function test_decimalsIsSix() public view {
        assertEq(usdc.decimals(), 6);
    }

    function test_anyoneCanMint() public {
        address user = address(0xBEEF);
        usdc.mint(user, 1_000_000); // 1 tUSDC
        assertEq(usdc.balanceOf(user), 1_000_000);
    }

    function test_supportsPermitNonces() public view {
        assertEq(usdc.nonces(address(0xBEEF)), 0);
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd contracts && forge test --match-contract TestUSDCTest`
Expected: FAIL — `TestUSDC` source not found.

- [ ] **Step 3: Write `contracts/src/TestUSDC.sol`**

```solidity
// SPDX-License-Identifier: MIT
// TESTNET ONLY — not for mainnet. Open faucet, no access control by design.
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract TestUSDC is ERC20, ERC20Permit {
    constructor() ERC20("Test USD Coin", "tUSDC") ERC20Permit("Test USD Coin") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Open faucet for testnet demos. Never deploy to mainnet.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd contracts && forge test --match-contract TestUSDCTest`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add contracts/src/TestUSDC.sol contracts/test/TestUSDC.t.sol
git commit -m "feat(contracts): TestUSDC faucet token with EIP-2612 permit"
```

---

### Task 3: `AuraVault` ERC4626 vault (TDD)

**Files:**
- Create: `contracts/src/AuraVault.sol`
- Test: `contracts/test/AuraVault.t.sol`

- [ ] **Step 1: Write the failing tests**

`contracts/test/AuraVault.t.sol`:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {TestUSDC} from "../src/TestUSDC.sol";
import {AuraVault} from "../src/AuraVault.sol";

contract AuraVaultTest is Test {
    TestUSDC usdc;
    AuraVault vault;

    uint256 userPk = 0xA11CE;
    address user;
    address attacker = address(0xBAD);

    function setUp() public {
        usdc = new TestUSDC();
        vault = new AuraVault(usdc); // deployer = owner
        user = vm.addr(userPk);
        usdc.mint(user, 1_000_000); // 1 tUSDC
    }

    // EIP-2612 digest for tUSDC permit(user -> vault, value, deadline)
    function _signPermit(uint256 value, uint256 deadline) internal view returns (uint8 v, bytes32 r, bytes32 s) {
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                user,
                address(vault),
                value,
                usdc.nonces(user),
                deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", usdc.DOMAIN_SEPARATOR(), structHash));
        (v, r, s) = vm.sign(userPk, digest);
    }

    function test_depositWithPermitMintsSharesOneToOne() public {
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(800_000, deadline);

        vm.prank(user);
        uint256 shares = vault.depositWithPermit(800_000, deadline, v, r, s);

        assertEq(shares, 800_000);
        assertEq(vault.balanceOf(user), 800_000);          // $AURA
        assertEq(usdc.balanceOf(address(vault)), 800_000); // collateral
        assertEq(vault.convertToAssets(shares), 800_000);  // redeemable 1:1
    }

    function test_onlyOwnerOfSharesCanRedeem() public {
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(800_000, deadline);
        vm.prank(user);
        uint256 shares = vault.depositWithPermit(800_000, deadline, v, r, s);

        // attacker cannot redeem the user's shares
        vm.prank(attacker);
        vm.expectRevert();
        vault.redeem(shares, attacker, user);

        // owner of shares withdraws their own funds
        vm.prank(user);
        vault.redeem(shares, user, user);
        assertEq(usdc.balanceOf(user), 1_000_000);
        assertEq(vault.balanceOf(user), 0);
    }

    function test_pauseBlocksDepositButNotRedeem() public {
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(800_000, deadline);
        vm.prank(user);
        vault.depositWithPermit(800_000, deadline, v, r, s);

        vault.setDepositsPaused(true); // owner

        usdc.mint(user, 100_000);
        vm.prank(user);
        usdc.approve(address(vault), 100_000);
        vm.prank(user);
        vm.expectRevert(AuraVault.DepositsArePaused.selector);
        vault.deposit(100_000, user);

        // redeem still works while paused
        vm.prank(user);
        vault.redeem(800_000, user, user);
        assertEq(vault.balanceOf(user), 0);
    }

    function test_ownerHasNoPathToMoveUserFunds() public {
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(800_000, deadline);
        vm.prank(user);
        vault.depositWithPermit(800_000, deadline, v, r, s);

        // owner cannot redeem on behalf of the user (no allowance, not the holder)
        address owner = address(this);
        vm.prank(owner);
        vm.expectRevert();
        vault.redeem(800_000, owner, user);
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd contracts && forge test --match-contract AuraVaultTest`
Expected: FAIL — `AuraVault` source not found.

- [ ] **Step 3: Write `contracts/src/AuraVault.sol`**

```solidity
// SPDX-License-Identifier: MIT
// TESTNET ONLY — not audited. Do not deploy to mainnet without a third-party
// security audit and explicit sign-off (see .claude/rules/solidity.md).
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Non-custodial single-asset vault. The vault token IS the $AURA share.
/// The ONLY way assets leave the contract is the share owner's own redeem/withdraw.
/// The owner can pause deposits but can never move user funds.
contract AuraVault is ERC4626, Ownable {
    bool public depositsPaused;

    error DepositsArePaused();
    event DepositsPausedSet(bool paused);

    constructor(IERC20 asset_)
        ERC20("Aura Share", "AURA")
        ERC4626(asset_)
        Ownable(msg.sender)
    {}

    function setDepositsPaused(bool paused) external onlyOwner {
        depositsPaused = paused;
        emit DepositsPausedSet(paused);
    }

    /// @notice One-signature deposit: consume an exact-amount EIP-2612 permit, then deposit.
    function depositWithPermit(uint256 assets, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
        external
        returns (uint256 shares)
    {
        IERC20Permit(asset()).permit(msg.sender, address(this), assets, deadline, v, r, s);
        return deposit(assets, msg.sender);
    }

    // Pause gate routes through both deposit() and mint(); redeem/withdraw are untouched.
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares)
        internal
        override
    {
        if (depositsPaused) revert DepositsArePaused();
        super._deposit(caller, receiver, assets, shares);
    }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `cd contracts && forge test --match-contract AuraVaultTest -vv`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add contracts/src/AuraVault.sol contracts/test/AuraVault.t.sol
git commit -m "feat(contracts): non-custodial AuraVault (ERC4626) with depositWithPermit"
```

---

### Task 4: Deploy script + Base Sepolia deploy

**Files:**
- Create: `contracts/script/Deploy.s.sol`

- [ ] **Step 1: Write `contracts/script/Deploy.s.sol`**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {TestUSDC} from "../src/TestUSDC.sol";
import {AuraVault} from "../src/AuraVault.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        TestUSDC usdc = new TestUSDC();
        AuraVault vault = new AuraVault(usdc);

        console.log("TEST_USDC_ADDRESS=", address(usdc));
        console.log("VAULT_ADDRESS=", address(vault));

        vm.stopBroadcast();
    }
}
```

- [ ] **Step 2: Dry-run build**

Run: `cd contracts && forge build`
Expected: clean compile.

- [ ] **Step 3: Deploy to Base Sepolia**

Set env (a funded testnet key — never a mainnet key):
```bash
export PRIVATE_KEY=0x<testnet_deployer_key>
export BASE_SEPOLIA_RPC=https://sepolia.base.org
cd contracts
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast
```
Expected: logs print `TEST_USDC_ADDRESS=` and `VAULT_ADDRESS=`. Record both.

- [ ] **Step 4: Commit the script**

```bash
git add contracts/script/Deploy.s.sol
git commit -m "feat(contracts): Base Sepolia deploy script"
```

---

## Phase 2 — Frontend network & config

### Task 5: Add Base Sepolia + env

**Files:**
- Modify: `lib/web3/chains.ts`
- Modify: `.env.example`

- [ ] **Step 1: Add Base Sepolia to `lib/web3/chains.ts`**

Replace the import + `SUPPORTED_CHAINS` + `CHAIN_NAMES` to include `baseSepolia`:
```typescript
import { mainnet, base, arbitrum, polygon, baseSepolia } from 'wagmi/chains'

export const SUPPORTED_CHAINS = [mainnet, base, arbitrum, polygon, baseSepolia] as const
export const DEFAULT_CHAIN_ID: number = mainnet.id // 1
export const VAULT_CHAIN_ID: number = baseSepolia.id // 84532

const CHAIN_NAMES: Record<number, string> = {
  [mainnet.id]: 'Ethereum',
  [base.id]: 'Base',
  [arbitrum.id]: 'Arbitrum',
  [polygon.id]: 'Polygon',
  [baseSepolia.id]: 'Base Sepolia',
}

export function getChainName(chainId: number): string {
  return CHAIN_NAMES[chainId] ?? 'Unknown'
}
```

- [ ] **Step 2: Document env in `.env.example`**

Append:
```bash
# --- Card vault (Base Sepolia testnet) ---
NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA=https://sepolia.base.org
NEXT_PUBLIC_TEST_USDC_ADDRESS=
NEXT_PUBLIC_VAULT_ADDRESS=
```

- [ ] **Step 3: Set real values in `.env.local`** (from Task 4 output)

```bash
NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA=https://sepolia.base.org
NEXT_PUBLIC_TEST_USDC_ADDRESS=0x<from deploy>
NEXT_PUBLIC_VAULT_ADDRESS=0x<from deploy>
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/web3/chains.ts .env.example
git commit -m "feat(web3): add Base Sepolia network and vault env vars"
```

---

### Task 6: Vault config (addresses + ABIs)

**Files:**
- Create: `lib/web3/vault/config.ts`

- [ ] **Step 1: Write `lib/web3/vault/config.ts`**

```typescript
import { getAddress } from 'viem'
import { baseSepolia } from 'viem/chains'
import type { Address } from '@/lib/web3/types'

export const VAULT_CHAIN = baseSepolia
export const VAULT_RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL_BASE_SEPOLIA || 'https://sepolia.base.org'

export function getVaultAddress(): Address {
  return getAddress(process.env.NEXT_PUBLIC_VAULT_ADDRESS as string)
}
export function getTestUsdcAddress(): Address {
  return getAddress(process.env.NEXT_PUBLIC_TEST_USDC_ADDRESS as string)
}

export const testUsdcAbi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'nonces', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'mint', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
] as const

export const vaultAbi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'convertToAssets', stateMutability: 'view', inputs: [{ name: 'shares', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  {
    type: 'function',
    name: 'depositWithPermit',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const
```

- [ ] **Step 2: Typecheck + commit**

Run: `npm run typecheck` → PASS.
```bash
git add lib/web3/vault/config.ts
git commit -m "feat(web3): vault config — Base Sepolia addresses and ABIs"
```

---

## Phase 3 — Pure helpers (TDD)

### Task 7: 80% math + EIP-2612 typed-data builder

**Files:**
- Create: `lib/web3/vault/permit.ts`
- Test: `lib/web3/vault/permit.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/web3/vault/permit.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { eightyPercent, buildPermitTypedData } from './permit'
import type { Address } from '@/lib/web3/types'

const USER = '0x1111111111111111111111111111111111111111' as Address
const SPENDER = '0x2222222222222222222222222222222222222222' as Address
const TOKEN = '0x3333333333333333333333333333333333333333' as Address

describe('eightyPercent', () => {
  it('takes 80% with bigint math (floor)', () => {
    expect(eightyPercent(1_000_000n)).toBe(800_000n)
    expect(eightyPercent(7n)).toBe(5n) // 5.6 floored
    expect(eightyPercent(0n)).toBe(0n)
  })
})

describe('buildPermitTypedData', () => {
  it('builds an EIP-2612 typed payload with exact value and deadline', () => {
    const td = buildPermitTypedData({
      tokenName: 'Test USD Coin',
      chainId: 84532,
      token: TOKEN,
      owner: USER,
      spender: SPENDER,
      value: 800_000n,
      nonce: 3n,
      deadline: 1_900_000_000n,
    })
    expect(td.primaryType).toBe('Permit')
    expect(td.domain).toEqual({
      name: 'Test USD Coin',
      version: '1',
      chainId: 84532,
      verifyingContract: TOKEN,
    })
    expect(td.message).toEqual({
      owner: USER,
      spender: SPENDER,
      value: 800_000n,
      nonce: 3n,
      deadline: 1_900_000_000n,
    })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/web3/vault/permit.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `lib/web3/vault/permit.ts`**

```typescript
import type { Address } from '@/lib/web3/types'

/** Floor 80% using bigint math (no float drift on token amounts). */
export function eightyPercent(amount: bigint): bigint {
  return (amount * 80n) / 100n
}

export interface PermitArgs {
  tokenName: string
  chainId: number
  token: Address
  owner: Address
  spender: Address
  value: bigint
  nonce: bigint
  deadline: bigint
}

/** EIP-2612 typed data for an exact-amount, single-use permit. */
export function buildPermitTypedData(args: PermitArgs) {
  return {
    domain: {
      name: args.tokenName,
      version: '1',
      chainId: args.chainId,
      verifyingContract: args.token,
    },
    types: {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    primaryType: 'Permit' as const,
    message: {
      owner: args.owner,
      spender: args.spender,
      value: args.value,
      nonce: args.nonce,
      deadline: args.deadline,
    },
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/web3/vault/permit.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/web3/vault/permit.ts lib/web3/vault/permit.test.ts
git commit -m "feat(web3): 80% math + EIP-2612 typed-data builder"
```

---

### Task 8: Demo card generator (TDD)

**Files:**
- Create: `lib/card/generateDemoCard.ts`
- Test: `lib/card/generateDemoCard.test.ts`

- [ ] **Step 1: Write the failing test**

`lib/card/generateDemoCard.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { generateDemoCard, passesLuhn } from './generateDemoCard'
import type { Address } from '@/lib/web3/types'

const ADDR = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca' as Address

describe('generateDemoCard', () => {
  const card = generateDemoCard(ADDR, 2026)

  it('produces a 16-digit, Luhn-valid number', () => {
    const digits = card.number.replace(/\s/g, '')
    expect(digits).toHaveLength(16)
    expect(passesLuhn(digits)).toBe(true)
  })

  it('has a valid future expiry', () => {
    expect(card.expiryMonth).toBeGreaterThanOrEqual(1)
    expect(card.expiryMonth).toBeLessThanOrEqual(12)
    expect(card.expiryYear).toBeGreaterThan(2026)
  })

  it('has a 3-digit CVV', () => {
    expect(card.cvv).toMatch(/^\d{3}$/)
  })

  it('is deterministic for the same address', () => {
    expect(generateDemoCard(ADDR, 2026)).toEqual(card)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/card/generateDemoCard.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `lib/card/generateDemoCard.ts`**

```typescript
import { keccak256, toBytes } from 'viem'
import type { Address } from '@/lib/web3/types'

export interface DemoCard {
  number: string // grouped "#### #### #### ####"
  expiryMonth: number
  expiryYear: number
  cvv: string
  holder: string
}

export function passesLuhn(digits: string): boolean {
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  return sum % 10 === 0
}

function luhnCheckDigit(fifteen: string): number {
  // returns the digit that makes (fifteen + digit) Luhn-valid
  for (let d = 0; d < 10; d++) {
    if (passesLuhn(fifteen + String(d))) return d
  }
  return 0
}

export function generateDemoCard(address: Address, currentYear: number): DemoCard {
  const hash = keccak256(toBytes(address)).slice(2) // 64 hex chars
  const bytes = hash.match(/.{2}/g)!.map(h => parseInt(h, 16))

  // 15 digits from the hash with a non-network test prefix "9999"
  let body = ''
  for (let i = 0; body.length < 15; i++) {
    body += (bytes[i % bytes.length] % 10).toString()
  }
  const fifteen = ('9999' + body).slice(0, 15)
  const number16 = fifteen + String(luhnCheckDigit(fifteen))
  const grouped = number16.replace(/(.{4})/g, '$1 ').trim()

  const expiryMonth = (bytes[16] % 12) + 1
  const expiryYear = currentYear + 3 + (bytes[17] % 3) // +3..+5
  const cvv = String(((bytes[18] << 8) | bytes[19]) % 1000).padStart(3, '0')

  return { number: grouped, expiryMonth, expiryYear, cvv, holder: 'GENESIS MEMBER' }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/card/generateDemoCard.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/card/generateDemoCard.ts lib/card/generateDemoCard.test.ts
git commit -m "feat(card): deterministic Luhn-valid demo card generator"
```

---

## Phase 4 — Hooks

### Task 9: `useVaultPosition` (read-only)

**Files:**
- Create: `lib/web3/hooks/useVaultPosition.ts`

- [ ] **Step 1: Write `lib/web3/hooks/useVaultPosition.ts`**

```typescript
'use client'

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { createPublicClient, http, getAddress } from 'viem'
import type { Address } from '@/lib/web3/types'
import {
  VAULT_CHAIN,
  VAULT_RPC_URL,
  getVaultAddress,
  getTestUsdcAddress,
  vaultAbi,
  testUsdcAbi,
} from '@/lib/web3/vault/config'

export interface VaultPosition {
  usdcBalance: bigint // tUSDC the user holds (deposit basis)
  shares: bigint // $AURA balance
  depositedAssets: bigint // assets redeemable for those shares
  isActive: boolean // shares > 0 → card active
}

export async function readVaultPosition(address: Address): Promise<VaultPosition> {
  const user = getAddress(address)
  const client = createPublicClient({ chain: VAULT_CHAIN, transport: http(VAULT_RPC_URL) })
  const vault = getVaultAddress()
  const usdc = getTestUsdcAddress()

  const [usdcBalance, shares] = await Promise.all([
    client.readContract({ address: usdc, abi: testUsdcAbi, functionName: 'balanceOf', args: [user] }),
    client.readContract({ address: vault, abi: vaultAbi, functionName: 'balanceOf', args: [user] }),
  ])
  const depositedAssets =
    shares > 0n
      ? await client.readContract({ address: vault, abi: vaultAbi, functionName: 'convertToAssets', args: [shares] })
      : 0n

  return { usdcBalance, shares, depositedAssets, isActive: shares > 0n }
}

export function useVaultPosition(address: Address | undefined): UseQueryResult<VaultPosition> {
  return useQuery({
    queryKey: ['vaultPosition', address],
    queryFn: () => readVaultPosition(address as Address),
    enabled: Boolean(address),
    staleTime: 15_000,
    retry: 1,
  })
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npm run typecheck` → PASS.
```bash
git add lib/web3/hooks/useVaultPosition.ts
git commit -m "feat(web3): useVaultPosition reads tUSDC + AURA on Base Sepolia"
```

---

### Task 10: `useCardApproval` state machine (TDD)

**Files:**
- Create: `lib/web3/hooks/useCardApproval.ts`
- Test: `lib/web3/hooks/useCardApproval.test.ts`

- [ ] **Step 1: Write the failing test (orchestration with mocked clients)**

`lib/web3/hooks/useCardApproval.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { runCardApproval } from './useCardApproval'
import type { Address } from '@/lib/web3/types'

const USER = '0x1111111111111111111111111111111111111111' as Address

function makeDeps(overrides: Partial<Parameters<typeof runCardApproval>[0]> = {}) {
  return {
    address: USER,
    usdcBalance: 1_000_000n,
    chainId: 84532,
    readNonce: vi.fn().mockResolvedValue(0n),
    readTokenName: vi.fn().mockResolvedValue('Test USD Coin'),
    signTypedData: vi.fn().mockResolvedValue(
      '0x' + '11'.repeat(32) + '22'.repeat(32) + '1b', // r,s,v
    ),
    writeDeposit: vi.fn().mockResolvedValue('0xhash'),
    waitForReceipt: vi.fn().mockResolvedValue({ status: 'success' }),
    nowSeconds: () => 1_000n,
    ...overrides,
  }
}

describe('runCardApproval', () => {
  it('signs an exact-80% permit then deposits and confirms', async () => {
    const deps = makeDeps()
    const result = await runCardApproval(deps)

    expect(deps.signTypedData).toHaveBeenCalledOnce()
    // deposit called with 80% of balance
    expect(deps.writeDeposit).toHaveBeenCalledWith(
      expect.objectContaining({ assets: 800_000n }),
    )
    expect(result.status).toBe('active')
  })

  it('aborts on wrong network without signing', async () => {
    const deps = makeDeps({ chainId: 1 })
    const result = await runCardApproval(deps)
    expect(result.status).toBe('error')
    expect(result.reason).toBe('wrong_network')
    expect(deps.signTypedData).not.toHaveBeenCalled()
  })

  it('reports rejected_signature when the user declines', async () => {
    const deps = makeDeps({
      signTypedData: vi.fn().mockRejectedValue(new Error('User rejected')),
    })
    const result = await runCardApproval(deps)
    expect(result.status).toBe('error')
    expect(result.reason).toBe('rejected_signature')
    expect(deps.writeDeposit).not.toHaveBeenCalled()
  })

  it('reports insufficient_balance when there is nothing to deposit', async () => {
    const deps = makeDeps({ usdcBalance: 0n })
    const result = await runCardApproval(deps)
    expect(result.status).toBe('error')
    expect(result.reason).toBe('insufficient_balance')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run lib/web3/hooks/useCardApproval.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `lib/web3/hooks/useCardApproval.ts`**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { createPublicClient, http, parseSignature, getAddress } from 'viem'
import type { Address } from '@/lib/web3/types'
import {
  VAULT_CHAIN,
  VAULT_RPC_URL,
  getVaultAddress,
  getTestUsdcAddress,
  vaultAbi,
  testUsdcAbi,
} from '@/lib/web3/vault/config'
import { eightyPercent, buildPermitTypedData } from '@/lib/web3/vault/permit'

export type CardApprovalReason =
  | 'wrong_network'
  | 'insufficient_balance'
  | 'rejected_signature'
  | 'rejected_tx'
  | 'tx_failed'
  | 'network_error'

export interface CardApprovalResult {
  status: 'active' | 'error'
  reason?: CardApprovalReason
}

// Pure-ish orchestration, fully injectable for tests.
export interface CardApprovalDeps {
  address: Address
  usdcBalance: bigint
  chainId: number
  readNonce: () => Promise<bigint>
  readTokenName: () => Promise<string>
  signTypedData: (typedData: ReturnType<typeof buildPermitTypedData>) => Promise<`0x${string}`>
  writeDeposit: (args: { assets: bigint; deadline: bigint; v: number; r: `0x${string}`; s: `0x${string}` }) => Promise<`0x${string}`>
  waitForReceipt: (hash: `0x${string}`) => Promise<{ status: 'success' | 'reverted' }>
  nowSeconds: () => bigint
}

export async function runCardApproval(deps: CardApprovalDeps): Promise<CardApprovalResult> {
  if (deps.chainId !== VAULT_CHAIN.id) return { status: 'error', reason: 'wrong_network' }

  const assets = eightyPercent(deps.usdcBalance)
  if (assets <= 0n) return { status: 'error', reason: 'insufficient_balance' }

  const deadline = deps.nowSeconds() + 3600n
  let signature: `0x${string}`
  try {
    const [name, nonce] = await Promise.all([deps.readTokenName(), deps.readNonce()])
    const typedData = buildPermitTypedData({
      tokenName: name,
      chainId: deps.chainId,
      token: getTestUsdcAddress(),
      owner: deps.address,
      spender: getVaultAddress(),
      value: assets,
      nonce,
      deadline,
    })
    signature = await deps.signTypedData(typedData)
  } catch {
    return { status: 'error', reason: 'rejected_signature' }
  }

  const { r, s, v } = parseSignature(signature)
  let hash: `0x${string}`
  try {
    hash = await deps.writeDeposit({ assets, deadline, v: Number(v), r, s })
  } catch {
    return { status: 'error', reason: 'rejected_tx' }
  }

  try {
    const receipt = await deps.waitForReceipt(hash)
    if (receipt.status !== 'success') return { status: 'error', reason: 'tx_failed' }
  } catch {
    return { status: 'error', reason: 'network_error' }
  }
  return { status: 'active' }
}

export type CardApprovalState =
  | { status: 'ready' }
  | { status: 'signing' }
  | { status: 'depositing' }
  | { status: 'confirming' }
  | { status: 'active' }
  | { status: 'error'; reason: CardApprovalReason }

export function useCardApproval(usdcBalance: bigint | undefined) {
  const { address, chainId } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { switchChainAsync } = useSwitchChain()
  const queryClient = useQueryClient()
  const [state, setState] = useState<CardApprovalState>({ status: 'ready' })

  const requestCard = useCallback(async () => {
    if (!address || !walletClient || usdcBalance === undefined) return

    if (chainId !== VAULT_CHAIN.id) {
      try {
        await switchChainAsync({ chainId: VAULT_CHAIN.id })
      } catch {
        setState({ status: 'error', reason: 'wrong_network' })
        return
      }
    }

    const publicClient = createPublicClient({ chain: VAULT_CHAIN, transport: http(VAULT_RPC_URL) })
    const usdc = getTestUsdcAddress()
    const vault = getVaultAddress()
    const user = getAddress(address)

    setState({ status: 'signing' })
    const result = await runCardApproval({
      address: user,
      usdcBalance,
      chainId: VAULT_CHAIN.id,
      readTokenName: () =>
        publicClient.readContract({ address: usdc, abi: testUsdcAbi, functionName: 'name' }),
      readNonce: () =>
        publicClient.readContract({ address: usdc, abi: testUsdcAbi, functionName: 'nonces', args: [user] }),
      signTypedData: td =>
        walletClient.signTypedData({
          account: user,
          domain: td.domain,
          types: td.types,
          primaryType: td.primaryType,
          message: td.message,
        }),
      writeDeposit: async ({ assets, deadline, v, r, s }) => {
        setState({ status: 'depositing' })
        const hash = await walletClient.writeContract({
          address: vault,
          abi: vaultAbi,
          functionName: 'depositWithPermit',
          args: [assets, deadline, v, r, s],
        })
        setState({ status: 'confirming' })
        return hash
      },
      waitForReceipt: hash => publicClient.waitForTransactionReceipt({ hash }),
      nowSeconds: () => BigInt(Math.floor(Date.now() / 1000)),
    })

    if (result.status === 'active') {
      await queryClient.invalidateQueries({ queryKey: ['vaultPosition', address] })
      setState({ status: 'active' })
    } else {
      setState({ status: 'error', reason: result.reason! })
    }
  }, [address, walletClient, chainId, usdcBalance, switchChainAsync, queryClient])

  return { state, requestCard, reset: () => setState({ status: 'ready' }) }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run lib/web3/hooks/useCardApproval.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/web3/hooks/useCardApproval.ts lib/web3/hooks/useCardApproval.test.ts
git commit -m "feat(web3): useCardApproval — sign permit, deposit, confirm"
```

---

## Phase 5 — UI wiring

### Task 11: `CardActivationPanel`

**Files:**
- Create: `components/dashboard/CardActivationPanel.tsx`

- [ ] **Step 1: Write `components/dashboard/CardActivationPanel.tsx`**

```tsx
'use client'

import { RefreshCw, ShieldCheck } from 'lucide-react'
import { Panel } from '@/components/ui/Panel'
import { GradientButton } from '@/components/ui/GradientButton'
import { formatUSD } from '@/lib/format'
import { eightyPercent } from '@/lib/web3/vault/permit'
import { useCardApproval } from '@/lib/web3/hooks/useCardApproval'
import type { VaultPosition } from '@/lib/web3/hooks/useVaultPosition'

const STATUS_LABEL: Record<string, string> = {
  signing: 'Sign the permit in your wallet…',
  depositing: 'Confirm the deposit…',
  confirming: 'Confirming on-chain…',
}

const ERROR_LABEL: Record<string, string> = {
  wrong_network: 'Switch to Base Sepolia to continue.',
  insufficient_balance: 'You need test USDC first — mint some to continue.',
  rejected_signature: 'Signature cancelled. You can try again.',
  rejected_tx: 'Transaction cancelled. You can try again.',
  tx_failed: 'The transaction failed. Please try again.',
  network_error: 'Network error. Please try again.',
}

export function CardActivationPanel({ position }: { position: VaultPosition }) {
  const { state, requestCard, reset } = useCardApproval(position.usdcBalance)
  const provision = eightyPercent(position.usdcBalance)
  const busy = state.status === 'signing' || state.status === 'depositing' || state.status === 'confirming'

  return (
    <Panel rounded="xl" className="flex flex-col gap-4 p-stack-lg md:col-span-2">
      <div className="flex items-center gap-2 text-aurora-teal">
        <ShieldCheck className="h-5 w-5" />
        <h3 className="text-headline-md text-text-primary">Activate your Aura Card</h3>
      </div>
      <p className="text-body-md text-text-secondary">
        Provision <span className="font-bold text-text-primary">{formatUSD(Number(provision) / 1e6)}</span>{' '}
        (80% of your test USDC) into the non-custodial vault and receive $AURA shares.
        Withdrawal is always your exclusive right.
      </p>

      {busy && <p className="text-label-md text-aurora-violet">{STATUS_LABEL[state.status]}</p>}
      {state.status === 'error' && (
        <p className="text-label-md text-error">{ERROR_LABEL[state.reason]}</p>
      )}

      <div className="flex gap-stack-md">
        <GradientButton onClick={requestCard} size="lg">
          {busy ? 'Processing…' : 'Request my Aura Card'}
        </GradientButton>
        {state.status === 'error' && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl border border-glass-border bg-glass-fill px-6 py-2.5 text-label-md font-bold text-text-primary transition-colors hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" /> Reset
          </button>
        )}
      </div>
    </Panel>
  )
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npm run typecheck` → PASS. (Add `error` color if missing: in `tailwind.config.ts` `colors`, add `error: '#FF6B6B'`, then commit that too.)
```bash
git add components/dashboard/CardActivationPanel.tsx tailwind.config.ts
git commit -m "feat(dashboard): card activation panel with approval flow states"
```

---

### Task 12: Reveal demo card in `CardVisualizer`

**Files:**
- Modify: `components/card/CardVisualizer.tsx`

- [ ] **Step 1: Add an optional `card` prop that reveals real demo data**

At the top of `CardVisualizer`, change the signature and the masked number / holder block to use the demo card when provided:
```tsx
import type { DemoCard } from '@/lib/card/generateDemoCard'

export function CardVisualizer({ card }: { card?: DemoCard }) {
  // ...existing refs/handlers unchanged...
```
Replace the masked number block:
```tsx
        <div className="text-headline-md tracking-[0.1em] text-white/90">
          {card ? card.number : '•••• •••• •••• 8821'}
        </div>
```
Replace the card-holder value and add expiry/cvv + DEMO badge:
```tsx
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-text-secondary">Card Holder</span>
              <span className="text-label-md text-white">{card ? card.holder : 'GENESIS MEMBER'}</span>
              {card && (
                <span className="mt-1 text-[10px] uppercase tracking-widest text-text-secondary">
                  Exp {String(card.expiryMonth).padStart(2, '0')}/{card.expiryYear} · CVV {card.cvv}
                </span>
              )}
            </div>
```
Add a DEMO badge near "Aura Elite":
```tsx
          <span className="text-label-sm uppercase tracking-[0.2em] text-text-secondary">
            Aura Elite {card && <span className="ml-2 rounded bg-white/15 px-1.5 py-0.5 text-[9px] text-white">DEMO</span>}
          </span>
```

- [ ] **Step 2: Typecheck + commit**

Run: `npm run typecheck` → PASS.
```bash
git add components/card/CardVisualizer.tsx
git commit -m "feat(card): CardVisualizer reveals demo card data when active"
```

---

### Task 13: Wire the dashboard to the vault position

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Replace the eligibility source with the vault position**

Swap `useEligibility` for `useVaultPosition` and drive the panels + card from it. Full new body of `DashboardPage` (keep the existing `Sidebar`/`MobileTabBar`/`DashboardHeader` usage):
```tsx
'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { ApprovalStepper } from '@/components/dashboard/ApprovalStepper'
import { EligibleBalancePanel } from '@/components/dashboard/EligibleBalancePanel'
import { EstimatedLimitPanel } from '@/components/dashboard/EstimatedLimitPanel'
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline'
import { CardActivationPanel } from '@/components/dashboard/CardActivationPanel'
import { CardVisualizer } from '@/components/card/CardVisualizer'
import { Panel } from '@/components/ui/Panel'
import { useSession } from '@/lib/web3/hooks/useSession'
import { useVaultPosition } from '@/lib/web3/hooks/useVaultPosition'
import { generateDemoCard } from '@/lib/card/generateDemoCard'
import { eightyPercent } from '@/lib/web3/vault/permit'
import { deriveProgress, deriveTimeline, type DashboardPhase } from '@/lib/dashboard/derive'
import { truncateAddress } from '@/lib/format'
import { getChainName } from '@/lib/web3/chains'
import type { WalletSession } from '@/lib/web3/types'
import type { EligibleBalance, EstimatedLimit } from '@/lib/dashboard/types'

export default function DashboardPage() {
  const session = useSession()
  const address = session.status === 'authenticated' ? session.address : undefined
  const position = useVaultPosition(address)

  if (session.status !== 'authenticated') return null

  const wallet: WalletSession = {
    address: session.address,
    addressShort: truncateAddress(session.address),
    chainId: session.chainId,
    chainName: getChainName(session.chainId),
  }

  const pos = position.data
  const phase: DashboardPhase = position.isError ? 'error' : pos ? 'ready' : 'loading'

  // Eligible balance = tUSDC; limit = 80% (or deposited once active).
  const eligibleUsd = pos ? Number(pos.usdcBalance) / 1e6 : 0
  const provisionUsd = pos ? Number(eightyPercent(pos.usdcBalance)) / 1e6 : 0
  const depositedUsd = pos ? Number(pos.depositedAssets) / 1e6 : 0
  const limitUsd = pos?.isActive ? depositedUsd : provisionUsd

  const balance: EligibleBalance = {
    totalUsd: eligibleUsd,
    assets: pos && pos.usdcBalance > 0n
      ? [{ symbol: 'USDC', name: 'Test USDC', amountRaw: pos.usdcBalance, decimals: 6, amountDisplay: (Number(pos.usdcBalance) / 1e6).toLocaleString('en-US'), usdValue: eligibleUsd }]
      : [],
  }
  const limit: EstimatedLimit = {
    limitUsd,
    utilizationPercent: 100,
    utilizationCaption: pos?.isActive ? 'Card active' : 'Up to 80% of your balance',
  }

  const derived = {
    phase,
    addressShort: wallet.addressShort,
    assetsCount: balance.assets.length,
    totalUsd: eligibleUsd,
    limitUsd,
  }

  const demoCard = pos?.isActive ? generateDemoCard(session.address, new Date().getFullYear()) : undefined

  return (
    <div className="flex min-h-screen">
      <Sidebar wallet={wallet} />
      <main className="mx-auto w-full max-w-container-max flex-grow px-gutter py-stack-lg lg:ml-64 lg:px-margin-desktop">
        <DashboardHeader wallet={wallet} />
        <ApprovalStepper progress={deriveProgress(derived)} />

        <div className="mb-stack-lg grid grid-cols-1 gap-stack-lg md:grid-cols-2">
          {phase === 'ready' && pos?.isActive && (
            <>
              <CardVisualizer card={demoCard} />
              <EstimatedLimitPanel limit={limit} />
            </>
          )}
          {phase === 'ready' && pos && !pos.isActive && (
            <>
              <EligibleBalancePanel balance={balance} />
              <EstimatedLimitPanel limit={limit} />
              <CardActivationPanel position={pos} />
            </>
          )}
          {phase === 'loading' && (
            <Panel rounded="xl" className="p-stack-lg md:col-span-2">
              <div className="h-6 w-48 animate-pulse rounded bg-white/10" />
            </Panel>
          )}
          {phase === 'error' && (
            <Panel rounded="xl" className="p-stack-lg md:col-span-2">
              <p className="text-body-md text-text-secondary">
                Couldn&apos;t read your Base Sepolia position. This is read-only — your funds are untouched.
              </p>
            </Panel>
          )}
        </div>

        <ActivityTimeline events={deriveTimeline(derived)} />
      </main>
      <MobileTabBar />
    </div>
  )
}
```

- [ ] **Step 2: Verify the whole app compiles & tests pass**

Run:
```bash
npm run typecheck && npm run lint && npm test
```
Expected: typecheck/lint clean; all vitest suites green (existing 49 + permit + demo card + useCardApproval).

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(dashboard): drive balance/limit/card from on-chain vault position"
```

---

### Task 14: Final Definition-of-Done gate

- [ ] **Step 1: Contracts**

Run: `cd contracts && forge test -vv`
Expected: all TestUSDC + AuraVault tests PASS.

- [ ] **Step 2: Frontend gates**

Run:
```bash
npm run typecheck && npm run lint && npm test && rm -rf .next && npm run build
```
Expected: typecheck/lint clean, all tests green, build succeeds (dashboard + all routes).

- [ ] **Step 3: Manual smoke on Base Sepolia**

1. `npm run dev`, connect a Base Sepolia wallet (real Reown project ID set).
2. Mint test USDC (call `mint` on `TEST_USDC_ADDRESS` via explorer or a faucet button).
3. Dashboard shows eligible balance + 80% limit → click "Request my Aura Card".
4. Sign the permit (1 signature) → confirm deposit (1 tx).
5. After confirmation, the card flips to the demo card; limit = deposited amount.
6. Reload → card stays active (state read from `$AURA` balance).

- [ ] **Step 4: Commit any fixes**

```bash
git add -A && git commit -m "test: card approval flow end-to-end on Base Sepolia"
```

---

## Notes for the implementer
- **Never** introduce an unlimited approval or a path that moves user funds to an arbitrary address — the `block-unsafe-web3.sh` hook will block it, and it violates `.claude/rules/solidity.md`.
- Keep all web3 logic under `lib/web3/`; components consume hooks only.
- Mainnet is **out of scope** — testnet only until audit + sign-off.
- Migration (option 2) is a **future** plan, not this one.
