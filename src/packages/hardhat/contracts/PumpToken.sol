// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PumpToken is ERC20, Ownable {
    // Only the bonding curve contract can mint
    address public minter;

    constructor(
        string memory name,
        string memory symbol,
        address _owner // the factory will be the initial owner until setup is complete
    ) ERC20(name, symbol) Ownable(_owner) {}

    function setMinter(address _minter) external onlyOwner {
        require(minter == address(0), "Minter already set");
        minter = _minter;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == minter, "Only minter can mint");
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        require(msg.sender == minter, "Only minter can burn");
        _burn(from, amount);
    }
}
