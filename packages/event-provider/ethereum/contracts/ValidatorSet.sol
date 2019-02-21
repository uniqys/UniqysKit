/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

pragma solidity 0.5.2;
pragma experimental ABIEncoderV2;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./Uniqys.sol";

contract ValidatorSet {
    using SafeMath for uint256;

    mapping (address => uint256) powers;
    address[] public validators;
    uint256 public totalPower;

    function getValidatorsCount() public view returns (uint256) {
        return validators.length;
    }

    function powerOf(address _account) public view returns (uint256) {
        return powers[_account];
    }

    function _updatePower(address _account, uint256 _power) internal {
        uint256 currentPower = powers[_account];
        powers[_account] = _power;

        if (currentPower == 0) {
            validators.push(_account);
            totalPower = totalPower.add(_power);
        }
        else {
            if (currentPower < _power) {
                totalPower = totalPower.add(_power.sub(currentPower));
            }
            else {
                totalPower = totalPower.sub(currentPower.sub(_power));
            }
        }

        if (_power == 0) {
            address[] memory newValidators = new address[](validators.length - 1);
            uint8 j = 0;
            for(uint8 i = 0; i < validators.length; i++) {
                if (validators[i] != _account) {
                    newValidators[j] = validators[i];
                    j++;
                }
            }

            validators = newValidators;
        }
    }

    function isConsented(
        bytes32 _target,
        bytes[] memory _signatures
    )
        public
        view
        returns (bool)
    {
        uint256 _sum = 0;
        for (uint i = 0; i < _signatures.length; i++) {
            bytes32 _r;
            bytes32 _s;
            uint8 _v;
            (_r, _s, _v) = Uniqys._parseSignature(_signatures[i]);

            address _signer = ecrecover(_target, _v, _r, _s);
            if (_signer != address(0)) {
                // valid signature
                _sum = _sum.add(powers[_signer]);
            }
        }

        if (_sum.mul(3) > totalPower.mul(2)) return true;
        return false;
    }

    function verifyBlockHeader(
        Uniqys.BlockHeader memory _header,
        uint32 _consensusRound,
        bytes32 _genesisHash,
        bytes[] memory _signatures
    )
        public
        view
    {
        bytes32 _blockHash = keccak256(
            abi.encodePacked(
                _header.height, _header.timestamp,
                _header.lastBlockHash, _header.transactionRoot, _header.lastBlockConsensusRoot,
                _header.nextValidatorSetRoot, _header.appStateHash
            )
        );
        bytes32 _digest = keccak256(
            abi.encodePacked(
                _genesisHash, Uniqys._getPrecommitId(), _header.height, _consensusRound, _blockHash
            )
        );
        require(isConsented(_digest, _signatures), "Consensus could not be verified");
    }

    function verifyTransaction(
        bytes32[] memory _proof,
        bytes32 _root,
        bytes32 _txHash
    )
        public
        pure
    {
        require(
            MerkleProof.verify(_proof, _root, _txHash),
            "Could not prove transaction existence from proof"
        );
    }
}
