/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import "./Uniqys.sol";

library TestUniqys {
    function getPrecommitId() public pure returns (uint8) {
        return Uniqys._getPrecommitId();
    }

    function parseSignature(bytes memory _signature) public pure returns (bytes32 r, bytes32 s, uint8 v) {
        return Uniqys._parseSignature(_signature);
    }

    function parseTransaction(bytes memory _coreTransaction) public pure returns (Uniqys.Transaction memory) {
        return Uniqys._parseTransaction(_coreTransaction);
    }
    function sliceSizedBuffer(bytes memory _buf, uint32 _from) public pure returns (bytes memory res, uint32 next) {
        return Uniqys._sliceSizedBuffer(_buf, _from);
    }
}
