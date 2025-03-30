// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FileUploadFee {
    address public owner;
    uint256 public uploadFee;

    event FileUploaded(address indexed user, string fileHash);

    constructor(uint256 _fee, address _owner) {
    uploadFee = _fee;
    owner = _owner;
    }


    function uploadFile(string memory fileHash) public payable {
        require(msg.value >= uploadFee, "Insufficient fee");
        emit FileUploaded(msg.sender, fileHash);
    }

    function withdraw() public {
        require(msg.sender == owner, "Only owner can withdraw");
        payable(owner).transfer(address(this).balance);
    }
}
