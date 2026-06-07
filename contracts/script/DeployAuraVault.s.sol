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
