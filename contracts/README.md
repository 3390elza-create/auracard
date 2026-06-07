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
