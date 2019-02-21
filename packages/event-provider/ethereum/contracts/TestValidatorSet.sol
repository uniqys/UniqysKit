/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import "./ValidatorSet.sol";

contract TestValidatorSet is ValidatorSet {
    function updatePower(address _account, uint256 _power) public {
        _updatePower(_account, _power);
    }
}
