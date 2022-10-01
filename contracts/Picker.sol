// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "@api3/airnode-protocol/contracts/rrp/requesters/RrpRequesterV0.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
* @notice This is a basic contract to get a QRNG number
*/

contract Picker is RrpRequesterV0, Ownable {

    address public airnode;
    bytes32 public endpointIdUint256;
    address private sponsorWallet;

    mapping(bytes32 => bool) public expectingRequestWithIdToBeFulfilled;

    event SetRequestParameters(
        address airnodeAddress, 
        bytes32 targetEndpoint,
        address sponsorAddress
    );
    event RequestedUint(bytes32 requestedId);
    event ReceivedUint256(bytes32 requestedId, uint256 qrngUint);

     constructor(address _airnodeRrp)
        RrpRequesterV0(_airnodeRrp) {}

    /** @notice Sets parameters used in requesting QRNG services.
     *  @dev This is a function modified from the original QRNG example.
     *  @param _airnode Airnode address.
     *  @param _sponsorWallet Sponsor wallet address.
     */
    function setRequestParameters(
        address _airnode,
        bytes32 _endpointIdUint256,
        address _sponsorWallet
    ) external onlyOwner {
        airnode = _airnode;
        endpointIdUint256 = _endpointIdUint256;
        sponsorWallet = _sponsorWallet;
        emit SetRequestParameters(
            airnode,
            endpointIdUint256, 
            sponsorWallet
        );
    }

    /**
     * @notice Calls the Airnode for the QRNG Services.
     * @dev This request will be fulfilled by the contract's sponsor wallet,
     * which means spamming it may drain the sponsor wallet.
     */
    function requestNumber() public onlyOwner returns (bytes32) {
        bytes32 requestId = airnodeRrp.makeFullRequest(
            airnode,
            endpointIdUint256,
            address(this),
            sponsorWallet,
            address(this),
            this.fulfill.selector,
            ""
        );
        expectingRequestWithIdToBeFulfilled[requestId] = true;
        emit RequestedUint(requestId);
        return requestId;
    }

    /**
    * @notice Callback Function for the Airnode, which recieves the Random Id.
    * @param requestId Request ID.
    * @param data ABI-encoded response. The Random Number from the API.
    */
    function fulfill(
        bytes32 requestId,
        bytes calldata data
    ) external onlyAirnodeRrp {
        require(
            expectingRequestWithIdToBeFulfilled[requestId],
            "Request ID not known"
        );
        expectingRequestWithIdToBeFulfilled[requestId] = false;
        uint256 qrngNumber = abi.decode(data, (uint256));
        emit ReceivedUint256(requestId, qrngNumber);
    }

}