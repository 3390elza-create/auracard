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
