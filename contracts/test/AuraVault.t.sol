// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AuraVault} from "../src/AuraVault.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

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
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(amount, block.timestamp + 1 hours);

        vm.prank(relayer);
        vm.expectRevert(); // permit recovers `user`, not `relayer`
        vault.depositWithPermit(amount, relayer, block.timestamp + 1 hours, v, r, s);
    }

    function testDepositSucceedsEvenIfPermitFrontRun() public {
        uint256 amount = 150e6;
        uint256 deadline = block.timestamp + 1 hours;
        (uint8 v, bytes32 r, bytes32 s) = _signPermit(amount, deadline);

        // Griefer pre-submits the permit, consuming the nonce.
        usdc.permit(user, address(vault), amount, deadline, v, r, s);

        // Same (now-spent) signature passed; deposit still works via allowance check.
        vm.prank(relayer);
        uint256 shares = vault.depositWithPermit(amount, user, deadline, v, r, s);
        assertEq(vault.balanceOf(user), shares);
        assertEq(usdc.balanceOf(address(vault)), amount);
    }

    function testForcedDepositWithStandingAllowanceCreditsOwner() public {
        // If `user` already approved the vault, anyone can submit the deposit, but
        // funds/shares still land on `user` (no theft) and the relayer gets nothing.
        uint256 amount = 100e6;
        vm.prank(user);
        usdc.approve(address(vault), amount);

        vm.prank(relayer);
        uint256 shares = vault.depositWithPermit(amount, user, block.timestamp + 1 hours, 27, bytes32(0), bytes32(0));
        assertEq(vault.balanceOf(user), shares, "shares to owner");
        assertEq(vault.balanceOf(relayer), 0, "relayer gets nothing");
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
