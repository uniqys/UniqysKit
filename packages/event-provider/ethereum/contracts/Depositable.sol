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
import "solidity-bytes-utils/contracts/BytesLib.sol";
import "./Uniqys.sol";
import "./ValidatorSet.sol";

/**
 * @title Depositable
 * @dev ERC20 deposit logic
 */
contract Depositable is ERC20, ValidatorSet {
    using SafeMath for uint256;
    using BytesLib for bytes;

    event Deposit(address indexed account, uint256 value);
    event Withdraw(address indexed account, bytes32 txHash);

    bytes WITHDRAW_PATH = bytes("/withdraw");
    mapping (bytes32 => bool) public usedTx;
    bytes32 public genesisHash;

    constructor (bytes32 _genesisHash) public {
        genesisHash = _genesisHash;
    }

    /**
     * @dev Function to deposit tokens
     * @param _value The amount of tokens to deposit.
     * @return A boolean that indicates if the operation was successful.
     */
    function deposit(uint256 _value) public returns (bool) {
        _burn(msg.sender, _value);
        emit Deposit(msg.sender, _value);
        return true;
    }

    /**
     * @dev Function to withdraw tokens
     * @param _transaction The amount of tokens to withdraw.
     * @return A boolean that indicates if the operation was successful.
     */
    function withdraw(
        bytes memory _transaction,
        bytes32[] memory _transactionProof,
        Uniqys.BlockHeader memory _header,
        uint32 _consensusRound,
        bytes[] memory _signatures
    )
        public
        returns (bool)
    {
        bytes32 _txHash = keccak256(_transaction);
        uint256 _value = _parseWithdrawTransaction(_transaction);
        require(_value > 0, "Invalid transaction");

        verifyBlockHeader(_header, _consensusRound, genesisHash, _signatures);
        verifyTransaction(_transactionProof, _header.appStateHash, keccak256(abi.encodePacked(_transaction)));

        require(!usedTx[_txHash], "Transaction already withdrawn");
        _mint(msg.sender, _value);
        usedTx[_txHash] = true;
        emit Withdraw(msg.sender, _txHash);
        return true;
    }

    function _parseWithdrawTransaction(bytes memory _transaction) private view returns (uint256 value) {
        Uniqys.Transaction memory _parsed = Uniqys._parseTransaction(_transaction);
        require(_parsed.signer == msg.sender, "Signer and sender mismatch");
        require(
            keccak256(abi.encodePacked(WITHDRAW_PATH)) == keccak256(abi.encodePacked(_parsed.path)),
            "Not withdraw transaction"
        );
        value = _stringToUint(_parsed.body);
    }

    function _stringToUint(bytes memory _b) private pure returns (uint256 result) {
        result = 0;
        for (uint i = 0; i < _b.length; i++) {
            uint256 _c = _b.toUint8(i);
            require(_c >= 48 && _c <= 57, "Invalid value");
            result = result.mul(10).add(_c.sub(48));
        }
    }
}
