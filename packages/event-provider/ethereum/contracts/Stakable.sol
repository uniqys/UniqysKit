/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "./ValidatorSet.sol";

/**
 * @title Stakable
 * @dev ERC20 stake logic
 */
contract Stakable is ERC20, ValidatorSet {
    using SafeMath for uint256;

    event StakeUpdate(address indexed account, uint256 power);
    /**
     * @dev Function to deposit tokens to stake
     * @param _power The amount of tokens to deposit.
     * @return A boolean that indicates if the operation was successful.
     */
    function stakeDeposit(uint256 _power) public returns (bool) {
        _stakeDeposit(msg.sender, _power);
        return true;
    }

    function _stakeDeposit(address _account, uint256 _power) internal {
        require(balanceOf(_account) >= _power, "not enough balance");
        _burn(_account, _power);

        uint256 currentPower = powerOf(_account);
        _updatePower(_account, currentPower.add(_power));
        uint256 _updatedPower = powerOf(_account);
        emit StakeUpdate(_account, _updatedPower);
    }

    /**
     * @dev Function to withdraw tokens from stake
     * @param _power The amount of tokens to withdraw.
     * @return A boolean that indicates if the operation was successful.
     */
    function stakeWithdraw(uint256 _power) public returns (bool) {
        _stakeWithdraw(msg.sender, _power);
        return true;
    }

    function _stakeWithdraw(address _account, uint256 _power) internal {
        require(balanceOf(_account) >= _power, "not enough stake");
        _mint(_account, _power);

        uint256 currentPower = powerOf(_account);
        _updatePower(_account, currentPower.sub(_power));
        uint256 _updatedPower = powerOf(_account);
        emit StakeUpdate(_account, _updatedPower);
    }
}
