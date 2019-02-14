/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

/**
 * @title ERC20Stakable
 * @dev ERC20 stake logic
 */
contract ERC20Stakable is ERC20 {
    mapping (address => uint256) validatorSet;
    event StakeUpdate(address account, uint256 power);

    /**
     * @dev Function to deposit tokens to stake
     * @param power The amount of tokens to deposit.
     * @return A boolean that indicates if the operation was successful.
     */
    function stakeDeposit(uint256 power) public returns (bool) {
        _stakeDeposit(msg.sender, power);
        return true;
    }

    function _stakeDeposit(address account, uint256 power) internal {
        require(balanceOf(account) >= power, "not enough balance");
        validatorSet[account] += power;
        _burn(account, power);
        emit StakeUpdate(account, validatorSet[account]);
    }

    /**
     * @dev Function to withdraw tokens from stake
     * @param power The amount of tokens to withdraw.
     * @return A boolean that indicates if the operation was successful.
     */
    function stakeWithdraw(uint256 power) public returns (bool) {
        _stakeWithdraw(msg.sender, power);
        return true;
    }

    function _stakeWithdraw(address account, uint256 power) internal {
        require(validatorSet[account] >= power, "not enough stake");
        validatorSet[account] -= power;
        _mint(account, power);
        emit StakeUpdate(account, validatorSet[account]);
    }
}
