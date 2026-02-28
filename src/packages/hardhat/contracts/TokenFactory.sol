// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PumpToken.sol";
import "./VestingVault.sol";
import "./MarketHealthOracle.sol";
import "./LiquidityBootstrapper.sol";
import "./BondingCurveSale.sol";

contract TokenFactory {
    // We will hardcode or require the DEX router for simplicity
    address public dexRouter;
    address public owner;

    event TokenLaunched(
        address indexed tokenAddress,
        address indexed saleAddress,
        address indexed vaultAddress,
        address oracleAddress,
        address bootstrapperAddress
    );

    constructor(address _dexRouter) {
        dexRouter = _dexRouter;
        owner = msg.sender;
    }

    function createTokenLaunch(
        string memory name,
        string memory symbol
    ) external returns (address, address, address) {
        // 1. Deploy Token
        PumpToken token = new PumpToken(name, symbol, address(this));

        // 2. Deploy Oracle
        MarketHealthOracle oracle = new MarketHealthOracle(address(this));

        // 3. Deploy Bootstrapper
        LiquidityBootstrapper bootstrapper = new LiquidityBootstrapper(
            address(token),
            address(oracle),
            dexRouter,
            address(this)
        );

        // 4. Deploy Vault
        VestingVault vault = new VestingVault(
            address(token),
            address(oracle),
            address(this) // Factory is temporary owner
        );

        // 5. Deploy Sale Contract
        BondingCurveSale sale = new BondingCurveSale(
            address(token),
            address(vault),
            address(oracle),
            address(bootstrapper),
            address(this) // Factory is temporary owner
        );

        // 6. Hook them up
        token.setMinter(address(sale));

        // Let the sale contract drive the Oracle and Vault during the sale phase
        oracle.transferOwnership(address(sale));
        vault.transferOwnership(address(sale));

        // Bootstrapper needs sale contract for trusted checks (if we add them)
        // or just transfer ownership to msg.sender to withdraw LP tokens later
        bootstrapper.transferOwnership(msg.sender);

        // Transfer final ownership of Sale and Token to the creator
        token.transferOwnership(msg.sender);
        sale.transferOwnership(msg.sender);

        emit TokenLaunched(
            address(token),
            address(sale),
            address(vault),
            address(oracle),
            address(bootstrapper)
        );

        return (address(token), address(sale), address(vault));
    }
}
