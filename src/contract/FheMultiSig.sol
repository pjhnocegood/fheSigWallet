// SPDX-License-Identifier: MIT

pragma solidity >=0.8.13 <0.9.0;

import "@fhenixprotocol/contracts/FHE.sol";
import {Permissioned, Permission} from "@fhenixprotocol/contracts/access/Permissioned.sol";

contract FheMultiSig is Permissioned {

  event Submission(uint indexed transactionId);
  event Confirmation(address indexed sender, uint indexed nonce);
  event Execution(uint indexed transactionId);
  event ExecutionFailure(uint indexed transactionId);
  event VotingResult(uint nonce,bool indexed result);


  euint32 private counter;
  euint32 one = FHE.asEuint32(1);

  mapping (address => bool) public isOwner;
  address[] public owners;
  mapping(uint256 => FheTransaction) internal fheTransactions;
  mapping (uint256 => mapping (address => inEuint32)) public confirmations;
  mapping (uint256 => mapping (address => bool)) public isConfirmations;
  mapping (uint256 => euint32) public finalizations;
  uint256 internal ownerCount;
  uint256 internal executeThreshold;
  uint256 internal voteThreshold;
  uint256 internal nonce;

  struct FheTransaction {
    address to;
    uint256 value;
    bool executed;
    bool finalized;
    uint256 voteNumber;
    uint256 votingResult;
    bytes data;
  }

  constructor(address[] memory _owners, uint256 _voteThreshold, uint _executeThreshold) {
    _setupOwners(_owners, _voteThreshold, _executeThreshold);
  }
  // 이더를 받을 수 있는 payable 함수
  receive() external payable {}



  function getFheTransactions(address owner) public view returns (FheTransaction[] memory,address[] memory,bool[] memory,uint,uint,uint) {
    FheTransaction[] memory transactions = new FheTransaction[](nonce);
    bool[] memory isConfimationByaddress = new bool[](nonce);
    for (uint256 i = 0; i < nonce; i++) {
      transactions[i] = fheTransactions[i];
      isConfimationByaddress[i] = isConfirmations[i][owner];
    }

    return (transactions,owners, isConfimationByaddress,voteThreshold ,executeThreshold,address(this).balance);
  }



  function submitTransaction(address destination, uint value, bytes calldata data)
  public
  returns (uint nonce)
  {
    nonce = addTransaction(destination, value, data);
  }

  function addTransaction(address to, uint value, bytes calldata data) internal returns (uint currentNonce){
    currentNonce = nonce;
    fheTransactions[nonce] = FheTransaction({
      to: to,
      value: value,
      executed: false,
      finalized: false,
      voteNumber:0,
      votingResult:0,
      data:data
    });
    nonce += 1;
    emit Submission(nonce);
  }

  function finalize(uint nonce) public notExecuted(nonce) notFinalized(nonce) {
    if (isConfirmed(nonce)) {
      FheTransaction storage txn = fheTransactions[nonce];
      txn.finalized = true;
      //동형암호화 로직필요
      euint32 total;
      for (uint i=0; i<ownerCount; i++) {
        if(isConfirmations[nonce][owners[i]]) {
          euint32 voteBytes = FHE.asEuint32(confirmations[nonce][owners[i]]);
          ebool amountOrZero = voteBytes.eq(one);
          total = total + amountOrZero.toU32();
        }
      }
      finalizations[nonce] = total;

    }
  }

  function executeTransaction(uint nonce) public
  ownerExists(msg.sender)
  finalized(nonce)
  notExecuted(nonce)
  {

    if(FHE.decrypt(finalizations[nonce]) >= executeThreshold){
      FheTransaction storage txn = fheTransactions[nonce];

      if (external_call(txn.to, txn.value, txn.data.length, txn.data)){
        emit Execution(nonce);
        txn.executed = true;
        txn.votingResult = 2;
        emit VotingResult(nonce,true);
      }
      else {
        emit ExecutionFailure(nonce);
        txn.executed = false;

      }
    }
    else{
      FheTransaction storage txn = fheTransactions[nonce];
      txn.executed = true;
      txn.votingResult = 1;
      emit VotingResult(nonce,false);
    }


  }



  function confirmTransaction(uint nonce,inEuint32 calldata vote) public
  ownerExists(msg.sender)
  transactionExists(nonce)
  notVotedConfirmed(nonce, msg.sender)
  {
    confirmations[nonce][msg.sender] = vote;
    fheTransactions[nonce].voteNumber=fheTransactions[nonce].voteNumber+1;
    isConfirmations[nonce][msg.sender] = true;
    emit Confirmation(msg.sender, nonce);
  }

  modifier ownerExists(address owner) {
    require(isOwner[owner]);
    _;
  }

  modifier transactionExists(uint nonce) {
    require(fheTransactions[nonce].to != address(0));
    _;
  }

  modifier notVotedConfirmed(uint nonce, address owner) {
    require(!isConfirmations[nonce][owner]);
    _;
  }
  modifier notExecuted(uint nonce) {
    require(!fheTransactions[nonce].executed);
    _;
  }

  modifier notFinalized(uint nonce) {
    require(!fheTransactions[nonce].finalized);
    _;
  }

  modifier finalized(uint nonce) {
    require(fheTransactions[nonce].finalized);
    _;
  }

  function isConfirmed(uint nonce) public returns (bool){
    uint count = 0;
    for (uint i=0; i<ownerCount; i++) {
      if (isConfirmations[nonce][owners[i]] == true)
        count += 1;
      if (count == voteThreshold)
        return true;
    }
    return false;
  }

  function _setupOwners(address[] memory _owners, uint256 _voteThreshold, uint _executeThreshold) internal {
    if (_executeThreshold > _owners.length) revert("");
    if (_executeThreshold == 0) revert("");
    address currentOwner;
    for (uint256 i = 0; i < _owners.length; i++) {
      address owner = _owners[i];
      if (owner == address(0) || owner == address(this))
        revert("");
      if (isOwner[owner]) revert("duplicate owner");
      currentOwner = owner;
      owners.push(currentOwner);
      isOwner[currentOwner] = true;
    }


    ownerCount = _owners.length;
    voteThreshold = _voteThreshold;
    executeThreshold = _executeThreshold;
  }


  function add(inEuint32 calldata encryptedValue) public {
    euint32 value = FHE.asEuint32(encryptedValue);
    counter = counter + value;
  }

  function getCounter() public view returns (uint256) {
    return FHE.decrypt(counter);
  }

  function getCounterPermit(
    Permission memory permission
  ) public view onlySender(permission) returns (uint256) {
    return FHE.decrypt(counter);
  }

  function getCounterPermitSealed(
    Permission memory permission
  ) public view onlySender(permission) returns (bytes memory) {
    return FHE.sealoutput(counter, permission.publicKey);
  }

  /*
  function transferEth(address payable _to, uint _amount) public {
          _to.call{value: _amount}("");
  }
  */




  function external_call(address destination, uint value, uint dataLength, bytes memory data)  internal returns (bool) {
    bool result;
    uint256 gasLeft = gasleft();
    assembly {

      let x := mload(0x40)   // "Allocate" memory for output (0x40 is where "free memory" pointer is stored by convention)
      let d := add(data, 32) // First 32 bytes are the padded length of data, so exclude that
      result := call(
        sub(gasLeft, 34710),   // 34710 is the value that solidity is currently emitting
      // It includes callGas (700) + callVeryLow (3, to pay for SUB) + callValueTransferGas (9000) +
      // callNewAccountGas (25000, in case the destination address does not exist and needs creating)
        destination,
        value,
        d,
        dataLength,        // Size of the input (in bytes) - this is what fixes the padding problem
        x,
        0                  // Output is ignored, therefore the output size is zero
      )
    }
    return result;
  }

}
