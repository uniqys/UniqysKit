/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/cryptography/MerkleProof.sol";
import "solidity-bytes-utils/contracts/BytesLib.sol";

library Uniqys {
    using SafeMath for uint256;
    using BytesLib for bytes;

    uint8 constant PRECOMMIT_ID = 2;

    struct BlockHeader {
        uint64 height;
        uint64 timestamp;
        bytes32 lastBlockHash;
        bytes32 transactionRoot;
        bytes32 lastBlockConsensusRoot;
        bytes32 nextValidatorSetRoot;
        bytes32 appStateHash;
    }

    struct Transaction {
        address signer;
        bytes method;
        bytes path;
        bytes[] headerKeys;
        bytes[] headerValues;
        bytes body;
    }

    function _getPrecommitId() internal pure returns (uint8) {
        return PRECOMMIT_ID;
    }

    function _parseSignature(bytes memory _signature) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        r = _signature.toBytes32(0);
        s = _signature.toBytes32(32);
        v = _signature.toUint8(64);
    }

    function _parseTransaction(bytes memory _coreTransaction) internal pure returns (Transaction memory) {
        bytes32 _r;
        bytes32 _s;
        uint8 _v;

        // Transaction meta
        uint32 i = 1; // skipping coreTx type number

        // SizedBuffer
        bytes memory _transaction;
        (_transaction, i) = _sliceSizedBuffer(_coreTransaction, i);

        // reset
        i = 0;

        bytes memory _signature = _transaction.slice(i, 65);
        i += 65;
        bytes32 _digest = keccak256(_transaction.slice(i, _transaction.length - i));
        (_r, _s, _v) = _parseSignature(_signature);
        if (_v < 2) _v += 27;
        address _signer = ecrecover(_digest, _v, _r, _s);

        // nonce
        i += 8;

        // Transaction body
        bytes memory _method;
        (_method, i) = _sliceSizedBuffer(_transaction, i);
        bytes memory _path;
        (_path, i) = _sliceSizedBuffer(_transaction, i);
        uint32 _headerNum = _transaction.toUint32(i);
        i += 4;

        bytes[] memory _headerKeys = new bytes[](_headerNum);
        bytes[] memory _headerValues = new bytes[](_headerNum);
        for (uint j = 0; j < _headerNum; j++) {
            (_headerKeys[j], i) = _sliceSizedBuffer(_transaction, i);
            (_headerValues[j], i) = _sliceSizedBuffer(_transaction, i);
        }
        bytes memory _body;
        (_body, i) = _sliceSizedBuffer(_transaction, i);

        return Transaction(_signer, _method, _path, _headerKeys, _headerValues, _body);
    }

    function _sliceSizedBuffer(bytes memory _buf, uint32 _from) internal pure returns (bytes memory res, uint32 next) {
        next = _from;

        uint32 _size = _buf.toUint32(next);
        next += 4;

        res = _buf.slice(next, _size);
        next += _size;
    }
}
