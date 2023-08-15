// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Lottery is Ownable {
    address[] internal participants;
    uint256 internal prize;
    mapping(address => bool) internal participantsMap;

    event ParticipantEntered(address participant);

    event WinnerFound(address winner);

    function participate() public payable {
        require(msg.sender != super.owner(), "The administrator cannot participate as a user in the lottery!");
        require(!contains(msg.sender), "You are already participating in the lottery!");
        require(msg.value >= 0.5 ether, "The minimum ticket price (lot) is 0.5 Ether!");
        participants.push(msg.sender);
        participantsMap[msg.sender] = true;
        prize += msg.value;
        emit ParticipantEntered(msg.sender);
    }

    function pickTheWinner() public payable {
        require(msg.sender == super.owner(), "Only the administrator can pick the winner!");
        require(participants.length >= 3, "A minimum of 3 users is required to participate in the lottery!");
        address payable winner = getWinner();
        (bool success, ) = winner.call{value: prize}("");
        require(success, "Transfer failed");
        emit WinnerFound(msg.sender);
        restart();
    }

    function getWinner() internal view returns (address payable) {
        uint256 lenght = participants.length;
        uint256 winnerIndex = randomFromLength(lenght);
        return payable(participants[winnerIndex]);
    }

    function randomFromLength(uint256 lenght) internal view returns (uint256) {
        return (uint256(keccak256(abi.encodePacked(block.timestamp, lenght))) % lenght);
    }

    function contains(address participant) internal view returns (bool) {
        return participantsMap[participant];
    }

    function restart() internal {
        prize = 0;
        for (uint256 i = 0; i < participants.length; i++) {
            delete (participantsMap[participants[i]]);
        }
        participants = new address[](0);
    }
}
