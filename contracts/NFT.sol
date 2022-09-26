// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

import "@api3/airnode-protocol/contracts/rrp/requesters/RrpRequesterV0.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
* @dev This contract is based out from Quantumon which can be found here: 
* https://gist.github.com/Ashar2shahid/e7b70712f23dd33b556aa66a6d8788b4
*/

contract NFT is ERC721, RrpRequesterV0, Ownable {

    using Strings for uint256;
    using Counters for Counters.Counter;

    bool private shinnyAvailable;       // Turns on and off the possibility to get a special token
    uint256 private shinnyCount;        // Count for the number of special tokens given
    uint256 private expectedShinny;     // Ammount of expect special tokens to be minted
    Counters.Counter private index;	    // Track the next TokenId to be minted
    string private _baseURIextended;    // The Extended baseUrl for ERC721
    address public airnode;             // The address of the QRNG airnode
    bytes32 public endpointIdUint256;   // The endpointId of the airnode to fetch a single random number
    address public sponsorWallet;       // The address of the sponsorWallet that will be making the fullfillment transaction

    // Mapping a custom URI to a tokenId. In cases when not using root folder from baseURI
    mapping(uint256 => string) private _tokenURIs;
    // Mapping standard and special URIs for Tokens to specific id
    mapping(uint256 => string) private _baseTokenURIs;
    // Mapping that maps the requestId for a random number to the fullfillment status of that request
    mapping(bytes32 => bool) public expectingRequestWithIdToBeFulfilled;
    // Mapping that tracks the requestId to the address that made the request
    mapping(bytes32 => address) private requestToSender;

    event SetBaseURI(string baseURIExtended);
    event SetRequestParameters(address airnodeAddress, bytes32 targetEndpoint, address sponsorAddress);
    event RequestedToken(address requesterAddress, bytes32 idOfRequest);
    event GeneratedToken(address requesterAddress, uint256 generatedTokenId);

    constructor(address _airnodeRrp, uint256 totalShinnies)
        RrpRequesterV0(_airnodeRrp)
        ERC721("LAPI3", "LAPI3")
    {
        shinnyCount = 0;
        expectedShinny = totalShinnies;
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
    function setBaseURI(
        string memory baseURI
    ) external onlyOwner {
        _baseURIextended = baseURI;
        emit SetBaseURI(_baseURIextended);
    }

    /**
     * @notice Sets the URIs for specific type of token.
     * @dev This is reusing specific URIs for specific types of token without
     * duplicating the same metadata.
     * @param baseIdentifier The id to identify this specific URI
     * @param desiredURI The actual URI string.
     */
    function setTokenBaseURI(
        uint256 baseIdentifier, 
        string memory desiredURI    
    ) external onlyOwner {
        _baseTokenURIs[baseIdentifier] = desiredURI;
    }

    /**
     * @notice Sets the string URI for an individual tokenId.
     * @dev This function shouldn't be called individually.
     * It will be use from the `mint` function instead.
     * @param tokenId The TokenId.
     * @param _tokenURI The string with the tokenURI.
     */
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
   
    /**
     * @notice Random generator. Makes use of the input from the QRNG Oracle.
     * @dev You can set a target number that equalsl to a special token.
     * Like getting a `0` out of this function.
     * @param random The uint256 from the Quantum API.
     */
    function _pickRandomUniqueId(
        uint256 random
    ) private view returns (uint256) {
        uint256 prevNumber = uint256(
            keccak256(abi.encodePacked(msg.sender, random))
            );
        uint256 randomNumber = prevNumber % 255; // Probability of 2/255
        return randomNumber;
    }
   
    /**
     * @notice Calls the Airnode for the QRNG Services.
     * @dev This request will be fulfilled by the contract's sponsor wallet,
     * which means spamming it may drain the sponsor wallet.
     * Thus, we'll limit to only be called by the owner, so we can later
     * transfer the Token.
     */
    function requestToken(
        address targetAddress
    ) public onlyOwner returns (bytes32) {
        bytes32 requestId = airnodeRrp.makeFullRequest(
            airnode,
            endpointIdUint256,
            address(this),
            sponsorWallet,
            address(this),
            this.mint.selector,
            ""
        );
        expectingRequestWithIdToBeFulfilled[requestId] = true;
        requestToSender[requestId] = targetAddress;
        emit RequestedToken(targetAddress, requestId);
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
    ) external onlyAirnodeRrp {
        require(
            expectingRequestWithIdToBeFulfilled[requestId],
            "Request ID not known"
        );
        expectingRequestWithIdToBeFulfilled[requestId] = false;
        uint256 qrngUint256 = abi.decode(data, (uint256));
        uint256 tokenId = _generateId(qrngUint256);
        _safeMint(requestToSender[requestId], tokenId);
        if (tokenId < expectedShinny) {
            _setTokenURI(tokenId, tokenId.toString());
        } else {
            _setTokenURI(tokenId, tokenId.toString());
        }
        emit GeneratedToken(requestToSender[requestId], tokenId);
    }

    /**
     * @notice Internal function to generate the tokenId based on QRNG result.
     * @dev This function is to be used exclusively inside the `mint` callback logic, 
     * can be use either in batch minting or individually.
     * @param randomUint The result uint from the airnode call.
     */
    function _generateId(
        uint256 randomUint
    )   internal returns (uint256) {
        uint256 id = _pickRandomUniqueId(randomUint);
        uint256 _tokenId;
        if (id == 0 && 
            shinnyAvailable && 
            shinnyCount < expectedShinny
        ) {
            shinnyCount += 1;
            _tokenId = shinnyCount;
            shinnyAvailable = false;
        } else {
            index.increment();
            _tokenId = index.current() + expectedShinny;
        }
        return _tokenId;
    }
}
