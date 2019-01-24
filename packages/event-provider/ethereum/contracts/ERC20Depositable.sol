/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

/**
 * @title ERC20Depositable
 * @dev ERC20 deposit logic
 */
contract ERC20Depositable is ERC20 {
    event Deposit(address indexed account, uint256 value);

    /**
     * @dev Function to deposit tokens
     * @param value The amount of tokens to deposit.
     * @return A boolean that indicates if the operation was successful.
     */
    function deposit(uint256 value) public returns (bool) {
        _burn(msg.sender, value);
        emit Deposit(msg.sender, value);
        return true;
    }
}
