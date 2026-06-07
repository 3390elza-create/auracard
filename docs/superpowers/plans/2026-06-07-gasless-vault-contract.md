# Gasless Vault — Contract (Plan 1 of 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and test a strictly non-custodial ERC-4626 card vault (`AuraVault`) with a gasless `depositWithPermit`, ready to deploy to Polygon Amoy and (after audit) mainnet.

**Architecture:** A Foundry project under `contracts/`. `AuraVault` extends OpenZeppelin `ERC4626` (no `Ownable`, no owner/operator/withdraw-out functions, non-upgradeable) and adds one `depositWithPermit` entry point whose funds and shares are bound to the EIP-2612 permit signer, so a relayer can submit it and the user needs no native gas.

**Tech Stack:** Solidity ^0.8.20, Foundry (`forge`), OpenZeppelin Contracts v5, forge-std.

**Scope note:** This is Plan 1 (the contract). Plan 2 (the relay route + `useGaslessDeposit` hook + modal wiring) follows once this vault is deployed to Amoy and a Gelato account exists. Mainnet deploy is gated on a third-party audit.

---

## File structure

- `contracts/foundry.toml` — Foundry config + remappings.
- `contracts/.gitignore` — ignore `out/`, `cache/`, `lib/`, `broadcast/`.
- `contracts/src/AuraVault.sol` — the vault (single responsibility: non-custodial ERC-4626 + gasless deposit).
- `contracts/test/mocks/MockUSDC.sol` — a 6-decimal ERC-20 with EIP-2612 permit, for tests only.
- `contracts/test/AuraVault.t.sol` — the test suite.
- `contracts/script/DeployAuraVault.s.sol` — deploy script (Amoy / mainnet).
- `contracts/README.md` — how to build, test, deploy.

OpenZeppelin and forge-std are installed as Foundry libs under `contracts/lib/`.

---

## Task 1: Foundry scaffold

**Files:**
- Create: `contracts/foundry.toml`
- Create: `contracts/.gitignore`
- Create: `contracts/README.md`

- [ ] **Step 1: Ensure Foundry is installed**

Run: `forge --version`
Expected: prints a version (e.g. `forge 0.2.0`). If "command not found", install Foundry:
`curl -L https://foundry.paradigm.xyz | bash` then `foundryup` (Windows: use Git Bash / WSL, or `winget install Foundry`). Re-run `forge --version` to confirm.

- [ ] **Step 2: Initialize libs (OpenZeppelin v5 + forge-std)**

From the repo root, run:
```bash
cd contracts
forge init --no-git --no-commit --force .
rm -rf src/Counter.sol test/Counter.t.sol script/Counter.s.sol
forge install OpenZeppelin/openzeppelin-contracts@v5.0.2 --no-git
```
(`forge init` creates `lib/forge-std`; the install adds `lib/openzeppelin-contracts`.)
Expected: `lib/forge-std/` and `lib/openzeppelin-contracts/` exist.

- [ ] **Step 3: Write `contracts/foundry.toml`**

```toml
[profile.default]
src = "src"
test = "test"
out = "out"
libs = ["lib"]
solc = "0.8.24"
optimizer = true
optimizer_runs = 200
remappings = [
  "@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/",
  "forge-std/=lib/forge-std/src/",
]

[rpc_endpoints]
amoy = "${POLYGON_AMOY_RPC_URL}"
polygon = "${NEXT_PUBLIC_RPC_URL_POLYGON}"
```

- [ ] **Step 4: Write `contracts/.gitignore`**

```gitignore
out/
cache/
lib/
broadcast/
```

- [ ] **Step 5: Write `contracts/README.md`**

```markdown
# Aura contracts (Foundry)

Non-custodial ERC-4626 card vault with gasless deposits.

## Setup
    forge install        # restores lib/ (OpenZeppelin v5, forge-std)

## Test
    forge test -vvv

## Deploy (Polygon Amoy testnet)
    export PRIVATE_KEY=0x...            # deployer (testnet key only)
    export POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
    export USDC_ADDRESS=0x...           # Amoy test USDC (EIP-2612 permit)
    forge script script/DeployAuraVault.s.sol --rpc-url amoy --broadcast --verify

Mainnet deploy is GATED on a third-party audit (see .claude/rules/solidity.md).
```

- [ ] **Step 6: Verify the toolchain builds**

Run: `cd contracts && forge build`
Expected: compiles (no contracts yet beyond libs) with exit 0.

- [ ] **Step 7: Commit**

```bash
git add contracts/foundry.toml contracts/.gitignore contracts/README.md
git commit -m "chore(contracts): foundry scaffold with OpenZeppelin v5 + forge-std"
```

---

## Task 2: The `AuraVault` contract

**Files:**
- Create: `contracts/src/AuraVault.sol`

- [ ] **Step 1: Write `contracts/src/AuraVault.sol`**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";

/// @title AuraVault
/// @notice Non-custodial ERC-4626 vault for the Aura card. There is NO owner,
///         operator, admin, or rescue path: the ONLY way funds leave the vault
///         is a share holder calling the standard ERC-4626 withdraw/redeem for
///         their own position. The contract is not upgradeable, so this is
///         immutable. `depositWithPermit` lets a relayer submit a deposit that a
///         user authorized off-chain (EIP-2612), so the user needs no native gas;
///         funds and shares are bound to the permit signer.
contract AuraVault is ERC4626 {
    constructor(IERC20 asset_) ERC20("Aura Share", "AURA") ERC4626(asset_) {}

    /// @dev Virtual-shares offset that blunts the classic ERC-4626 first-deposit
    ///      inflation/donation attack.
    function _decimalsOffset() internal pure override returns (uint8) {
        return 6;
    }

    /// @notice Gasless deposit: pull `assets` from `owner` (authorized by the
    ///         owner's EIP-2612 signature) and mint shares to `owner`. Anyone
    ///         may submit (a relayer), but `msg.sender` can redirect neither the
    ///         funds nor the shares.
    /// @return shares The amount of vault shares minted to `owner`.
    function depositWithPermit(
        uint256 assets,
        address owner,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 shares) {
        // Front-running safe: if the permit was already consumed (allowance set),
        // skip permit() so a griefer spending the nonce can't brick the deposit.
        if (IERC20(asset()).allowance(owner, address(this)) < assets) {
            IERC20Permit(asset()).permit(owner, address(this), assets, deadline, v, r, s);
        }
        shares = previewDeposit(assets);
        _deposit(owner, owner, assets, shares); // pull from `owner`, mint to `owner`
    }
}
```

- [ ] **Step 2: Build**

Run: `cd contracts && forge build`
Expected: compiles with exit 0.

- [ ] **Step 3: Commit**

```bash
git add contracts/src/AuraVault.sol
git commit -m "feat(contracts): non-custodial AuraVault with gasless depositWithPermit"
```

---

## Task 3: Tests

**Files:**
- Create: `contracts/test/mocks/MockUSDC.sol`
- Create: `contracts/test/AuraVault.t.sol`

- [ ] **Step 1: Write the permit-enabled mock token `contracts/test/mocks/MockUSDC.sol`**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// 6-decimal ERC-20 with EIP-2612 permit, mirroring native USDC, for tests.
contract MockUSDC is ERC20, ERC20Permit {
    constructor() ERC20("USD Coin", "USDC") ERC20Permit("USD Coin") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

- [ ] **Step 2: Write the test suite `contracts/test/AuraVault.t.sol`**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AuraVault} from "../src/AuraVault.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

contract AuraVaultTest is Test {
    MockUSDC usdc;
    AuraVault vault;

    uint256 userPk = 0xA11CE;
    address user;
    address relayer = address(0xBEEF);

    bytes32 constant PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    function setUp() public {
        user = vm.addr(userPk);
        usdc = new MockUSDC();
        vault = new AuraVault(IERC20(address(usdc)));
        usdc.mint(user, 1_000e6); // 1000 USDC
    }

    function _signPermit(uint256 value, uint256 deadline)
        internal
        view
        returns (uint8 v, bytes32 r, bytes32 s)
    {
        bytes32 structHash = keccak256(
            abi.encode(PERMIT_TYPEHASH, user, address(vault), value, usdc.nonces(user), deadline)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", usdc.DOMAIN_SEPARATOR(), structHash));
        (v, r, s) = vm.sign(userPk, digest);
    }

    function testDepositWithPermitCreditsSigner() public {
        uint256 amount = 200e6;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(amount, block.timestamp + 1 hours);

        vm.prank(relayer); // a different msg.sender submits it
        uint256 shares = vault.depositWithPermit(amount, user, block.timestamp + 1 hours, v, r, s);

        assertEq(vault.balanceOf(user), shares, "shares to signer");
        assertEq(vault.balanceOf(relayer), 0, "relayer gets nothing");
        assertEq(usdc.balanceOf(address(vault)), amount, "vault holds the USDC");
        assertEq(usdc.balanceOf(user), 800e6, "user USDC reduced");
        assertEq(usdc.allowance(user, address(vault)), 0, "exact allowance fully consumed");
    }

    function testRelayerCannotRedirectToAnotherOwner() public {
        uint256 amount = 100e6;
        // signature authorizes `user`; relayer tries to pass a different owner.
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(amount, block.timestamp + 1 hours);

        vm.prank(relayer);
        vm.expectRevert(); // permit() recovers `user`, not `relayer`; signature invalid for `relayer`
        vault.depositWithPermit(amount, relayer, block.timestamp + 1 hours, v, r, s);
    }

    function testDepositSucceedsEvenIfPermitFrontRun() public {
        uint256 amount = 150e6;
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(amount, deadline);

        // Griefer pre-submits the permit, consuming the nonce.
        usdc.permit(user, address(vault), amount, deadline, v, r, s);

        // The same (now-spent) signature is passed; deposit still works via the
        // allowance check.
        vm.prank(relayer);
        uint256 shares = vault.depositWithPermit(amount, user, deadline, v, r, s);
        assertEq(vault.balanceOf(user), shares);
        assertEq(usdc.balanceOf(address(vault)), amount);
    }

    function testExpiredPermitReverts() public {
        uint256 amount = 100e6;
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(amount, deadline);
        vm.warp(deadline + 1);
        vm.prank(relayer);
        vm.expectRevert();
        vault.depositWithPermit(amount, user, deadline, v, r, s);
    }

    function testStandardDepositAndWithdraw() public {
        vm.startPrank(user);
        usdc.approve(address(vault), 300e6);
        uint256 shares = vault.deposit(300e6, user);
        assertEq(vault.balanceOf(user), shares);
        uint256 assetsBack = vault.redeem(shares, user, user);
        assertEq(assetsBack, 300e6, "round trips 1:1 on an empty vault");
        assertEq(usdc.balanceOf(user), 1_000e6);
        vm.stopPrank();
    }

    function testNoOwnerFunction() public {
        // The vault is not Ownable: a call to owner() hits no function and reverts.
        (bool ok, ) = address(vault).staticcall(abi.encodeWithSignature("owner()"));
        assertFalse(ok, "vault must expose no owner()");
    }

    function testInflationOffsetKeepsSharesNonZero() public {
        // First deposit + a large direct donation; a tiny second deposit must
        // still mint > 0 shares (decimalsOffset mitigation).
        vm.startPrank(user);
        usdc.approve(address(vault), 1e6);
        vault.deposit(1e6, user);
        vm.stopPrank();
        usdc.mint(address(vault), 500e6); // donation/inflation attempt

        address user2 = address(0xCAFE);
        usdc.mint(user2, 10e6);
        vm.startPrank(user2);
        usdc.approve(address(vault), 10e6);
        uint256 shares = vault.deposit(10e6, user2);
        vm.stopPrank();
        assertGt(shares, 0, "offset prevents zero-share griefing");
    }
}
```

- [ ] **Step 3: Run the tests (expect PASS)**

Run: `cd contracts && forge test -vvv`
Expected: all tests pass. If `testRelayerCannotRedirectToAnotherOwner` or
`testExpiredPermitReverts` fail because the revert is swallowed, keep the broad
`vm.expectRevert()` (no selector) — different OZ/USDC permit impls revert with
different errors.

- [ ] **Step 4: Commit**

```bash
git add contracts/test/mocks/MockUSDC.sol contracts/test/AuraVault.t.sol
git commit -m "test(contracts): AuraVault permit deposit, non-divertibility, no owner, inflation guard"
```

---

## Task 4: Deploy script + Amoy deploy + bytecode safety check

**Files:**
- Create: `contracts/script/DeployAuraVault.s.sol`

- [ ] **Step 1: Write `contracts/script/DeployAuraVault.s.sol`**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AuraVault} from "../src/AuraVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DeployAuraVault is Script {
    function run() external {
        address usdc = vm.envAddress("USDC_ADDRESS");
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        AuraVault vault = new AuraVault(IERC20(usdc));
        vm.stopBroadcast();
        console2.log("AuraVault deployed at:", address(vault));
        console2.log("asset (USDC):", vault.asset());
    }
}
```

- [ ] **Step 2: Build the script**

Run: `cd contracts && forge build`
Expected: compiles, exit 0.

- [ ] **Step 3: Deploy to Polygon Amoy (testnet)**

```bash
cd contracts
export PRIVATE_KEY=0x<testnet-deployer-key>
export POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
export USDC_ADDRESS=0x<amoy-test-usdc-with-eip2612-permit>
forge script script/DeployAuraVault.s.sol --rpc-url amoy --broadcast
```
Expected: prints `AuraVault deployed at: 0x...`. Record that address.

(Use an Amoy USDC that implements EIP-2612 permit. If none is handy, deploy the
`MockUSDC` from Task 3 to Amoy first and use its address — it is permit-enabled.)

- [ ] **Step 4: Verify the deployed bytecode exposes NO owner/drain selectors**

Run (replace `<VAULT>` with the deployed address):
```bash
cast code <VAULT> --rpc-url amoy > /tmp/vault.hex
for sig in "owner()" "ownerWithdraw(address,uint256)" "ownerDepositBack(uint256)" "transferOwnership(address)"; do
  sel=$(cast sig "$sig" | sed 's/0x//')
  if grep -qi "$sel" /tmp/vault.hex; then echo "PRESENT  $sel  $sig"; else echo "absent   $sel  $sig"; fi
done
# Confirm depositWithPermit IS present:
sel=$(cast sig "depositWithPermit(uint256,address,uint256,uint8,bytes32,bytes32)" | sed 's/0x//')
grep -qi "$sel" /tmp/vault.hex && echo "PRESENT depositWithPermit" || echo "MISSING depositWithPermit"
```
Expected: `owner()`, `ownerWithdraw`, `ownerDepositBack`, `transferOwnership` all **absent**; `depositWithPermit` **PRESENT**. (This is the regression guard for the Blockaid/non-custodial issue.)

- [ ] **Step 5: Commit the deploy script and record the testnet address**

```bash
git add contracts/script/DeployAuraVault.s.sol
git commit -m "chore(contracts): AuraVault deploy script (Amoy/mainnet)"
```
Record the Amoy `AuraVault` address in the PR / handoff notes — Plan 2 sets it as
`NEXT_PUBLIC_VAULT_ADDRESS` for testnet integration.

---

## Definition of done (Plan 1)

`forge build` and `forge test -vvv` pass; `AuraVault` deployed to Amoy; the
deployed bytecode check shows no owner/drain selectors and a present
`depositWithPermit`. Mainnet deploy remains gated on a third-party audit.

## Self-review notes

- **Spec coverage:** non-custodial vault (no owner/drain) — Task 2 + tests
  `testNoOwnerFunction` + the Task 4 bytecode check; gasless `depositWithPermit`
  bound to signer — Task 2 + `testDepositWithPermitCreditsSigner` /
  `testRelayerCannotRedirectToAnotherOwner`; permit front-run safety — Task 2
  allowance check + `testDepositSucceedsEvenIfPermitFrontRun`; inflation
  mitigation — `_decimalsOffset` + `testInflationOffsetKeepsSharesNonZero`;
  standard deposit/withdraw — `testStandardDepositAndWithdraw`; toolchain — Task 1.
  Relay + frontend are intentionally Plan 2.
- **No placeholders:** all steps have concrete code/commands.
- **Type/name consistency:** `depositWithPermit(uint256 assets, address owner,
  uint256 deadline, uint8 v, bytes32 r, bytes32 s)` is identical in the contract,
  tests, and the Task 4 selector check; `_decimalsOffset` returns `6` consistently.
```
