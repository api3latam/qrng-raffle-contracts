// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "@api3/airnode-protocol/contracts/rrp/requesters/RrpRequesterV0.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
* @dev This contract is based out from Quantumon which can be found here: 
* https://gist.github.com/Ashar2shahid/e7b70712f23dd33b556aa66a6d8788b4
*/

contract NFT is ERC721, RrpRequesterV0, Ownable {

    using Strings for uint256;

    uint256[9958] public ids;           // Array to store the NFTs Id - This is different from the tokenId
    uint256 private index;	            // Track the next TokenId to be minted
    string private _baseURIextended;    // The Extended baseUrl for ERC721
    address public airnode;             // The address of the QRNG airnode
    bytes32 public endpointIdUint256;   // The endpointId of the airnode to fetch a single random number
    address public sponsorWallet;       // The address of the sponsorWallet that will be making the fullfillment transaction

    // Mapping a custom URI to a tokenId. In cases when not using root folder from baseURI.
    mapping(uint256 => string) private _tokenURIs; 
    // Mapping that maps the requestId for a random number to the fullfillment status of that request
    mapping(bytes32 => bool) public expectingRequestWithIdToBeFulfilled;  
    //Mapping that maps the requestId to the address that made the request
    mapping(bytes32 => address) requestToSender;

    event SetBaseURI(string baseURIExtended);

    constructor(address _airnodeRrp)
        RrpRequesterV0(_airnodeRrp)
        ERC721("LAPI3", "LAPI3") 
    {
        
    }
    
    /** @notice Sets parameters used in requesting QRNG services.
     *  @dev This is a function modified from the original QRNG example.
     *  @param _airnode Airnode address.
     *  @param _endpointIdUint256 Endpoint ID used to request a `uint256`.
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
        emit SetRequestParameters(airnode, endpointIdUint256, sponsorWallet);
    }
    
    /**
     * @notice Sets the string for BaseURI where metadata will be located at
     * @dev This is a convinient function to be able to migrate to other
     * URI without affecting the already minted token.
     * @param baseURI The new URI string to be used.
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseURIextended = baseURI;
        emit SetBaseURI(_baseURIextended);
    }


    function _setTokenURI(
        uint256 tokenId, 
        string memory _tokenURI
    ) internal virtual {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI set of nonexistent token"
        );
        _tokenURIs[tokenId] = _tokenURI;
    }

    /**
     * @notice Returns baseURI for all the tokens.
     * @dev Overrides base function from ERC721 which returns just empty string
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseURIextended;
    }

    /**
     * @notice Returns the full URI for an individual token.
     * @param tokenId The identifier for the specific token.
     */
    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        string memory _tokenURI = _tokenURIs[tokenId];
        string memory base = _baseURI();

        // If there is no base URI, return the token URI.
        if (bytes(base).length == 0) {
            return _tokenURI;
        }
        // If both are set, concatenate the baseURI and tokenURI (via abi.encodePacked).
        if (bytes(_tokenURI).length > 0) {
            return string(abi.encodePacked(base, _tokenURI));
        }
        // If there is a baseURI but no tokenURI, concatenate the tokenID to the baseURI.
        return string(abi.encodePacked(base, tokenId.toString()));
   }
   

    function _pickRandomUniqueId(uint256 random) private returns (uint256 id) {
        uint256 len = ids.length - index++;
        require(len > 0, "no ids left");
        uint256 randomIndex = random % len;
        id = ids[randomIndex] != 0 ? ids[randomIndex] : randomIndex;
        ids[randomIndex] = uint256(ids[len - 1] == 0 ? len - 1 : ids[len - 1]);
        ids[len - 1] = 0;
    }
   
    /**
     * @notice Calls the Airnode for the QRNG Services.
     * @dev This request will be fulfilled by the contract's sponsor wallet,
     * which means spamming it may drain the sponsor wallet.
     */
    function requestToken() public payable returns (bytes32) {
        require(
            msg.value >= 5 ether,
            "Need to send at least 5 ether to the sponsorWallet"
        );
        bytes32 requestId = airnodeRrp.makeFullRequest(
            airnode,
            endpointIdUint256,
            address(this),
            sponsorWallet,
            address(this),
            this.generateQuantumon.selector,
            ""
        );
        expectingRequestWithIdToBeFulfilled[requestId] = true;
        requestToSender[requestId] = msg.sender;
        (bool success, ) = sponsorWallet.call{value: 0.01 ether}("");
        require(success, "Forward failed");
        emit RequestQuantumon(msg.sender, requestId);
        return requestId;
    }

    /**
     * @notice Callback Function for the Airnode, which recieves the Random Id and mints the NFT.
     * @dev Note the `onlyAirnodeRrp` modifier. You should only accept RRP
     * fulfillments from this protocol contract. Also note that only
     * fulfillments for the requests made by this contract are accepted, and
     * a request cannot be responded to multiple times.
     * @param requestId Request ID.
     * @param data ABI-encoded response. The Random Number from the API.
     */
    function mint(
        bytes32 requestId, 
        bytes calldata data
    ) public onlyAirnodeRrp {
        require(
            expectingRequestWithIdToBeFulfilled[requestId],
            "Request ID not known"
        );
        expectingRequestWithIdToBeFulfilled[requestId] = false;
        uint256 qrngUint256 = abi.decode(data, (uint256));
        uint256 id = _pickRandomUniqueId(qrngUint256);
        uint256 tokenId = index - 1;
        _safeMint(requestToSender[requestId], tokenId);
        _setTokenURI(tokenId, id.toString());
        emit GenerateQuantumon(requestToSender[requestId], tokenId);
    }
    
    function withdraw() public payable onlyOwner {
        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "Forward failed");
        emit Withdrew(msg.sender);
    }
}
