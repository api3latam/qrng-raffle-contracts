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

contract NFTv1 is ERC721, RrpRequesterV0, Ownable {

    using Strings for uint256;
    using Counters for Counters.Counter;

    bool private shinnyAvailable;           // Turns on and off the possibility to get a special token
    uint256 public shinnyCount;             // Count for the number of special tokens given
    uint256 private expectedShinny;         // Ammount of expect special tokens to be minted
    Counters.Counter private index;	        // Track the next TokenId to be minted
    string private _baseURIextended;        // The Extended baseUrl for ERC721
    address public airnode;                 // The address of the QRNG airnode
    bytes32 public endpointIdUint256;       // The endpointId of the airnode to fetch a single random number
    bytes32 public endpointIdUint256Array;  // The endpointId of the airnode to fetch multiple random numbers at once 
    address private sponsorWallet;           // The address of the sponsorWallet that will be making the fullfillment transaction

    // Mapping a custom URI to a tokenId. In cases when not using root folder from baseURI
    mapping(uint256 => string) private _tokenURIs;
    // Mapping that maps the requestId for a random number to the fullfillment status of that request
    mapping(bytes32 => bool) public expectingRequestWithIdToBeFulfilled;
    // Mapping that tracks the requestId to the address that made the request
    mapping(bytes32 => address[]) private requestToSender;

    event SetBaseURI(string baseURIExtended);
    event SetRequestParameters(
        address airnodeAddress, 
        bytes32 targetEndpoint,
        bytes32 targetArrayEndpoint,
        address sponsorAddress
    );
    event RequestedToken(address requesterAddress, bytes32 idOfRequest);
    event RequestedBatchToken(address[] requesterAddresses, bytes32 idOfRequest);
    event GeneratedToken(address requesterAddress, uint256 generatedTokenId);
    event GeneratedBatchToken(address[] requesterAddresses, uint256[] generatedTokenIds);
    event GenerateShinny(address winnerAddress, uint256 generatedTokenId);

    constructor(address _airnodeRrp, uint256 totalShinnies)
        RrpRequesterV0(_airnodeRrp)
        ERC721("Quantum Choice", "QTC")
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
        bytes32 _endpointIdUint256Array,
        address _sponsorWallet
    ) external onlyOwner {
        airnode = _airnode;
        endpointIdUint256 = _endpointIdUint256;
        endpointIdUint256Array = _endpointIdUint256Array;
        sponsorWallet = _sponsorWallet;
        emit SetRequestParameters(
            airnode, 
            endpointIdUint256Array,
            endpointIdUint256, 
            sponsorWallet
        );
    }

    /**
     * @notice Function to switch the `shinnyAvailable` parameter
     */
    function shinnyAvailability() 
        external onlyOwner {
            if (shinnyAvailable) {
                shinnyAvailable = false;
            } else {
                shinnyAvailable = true;
            }
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
        uint256 random,
        bool isShinny
    ) internal view returns (uint256) {
        uint256 randomNumber;
        if (!isShinny) {
            uint256 prevNumber = uint256(
                keccak256(abi.encodePacked(msg.sender, random)) // Probability of 1/255 as per Wallet address times 0 - 255 from API 
                );
            randomNumber = prevNumber % 255; // Probability of ~ 2/255. 
        } else if (isShinny) {
            randomNumber = 0;
        }
        return randomNumber; // Final probability of 0.031% per mint
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
        requestToSender[requestId].push(targetAddress);
        emit RequestedToken(targetAddress, requestId);
        return requestId;
    }

    /**
     * @notice Call the Airnode in batch for the QRNG Services.
     * @param targetAddresses The addresses that maps to this request.  
     */
    function requestBatchToken(
        address[] memory targetAddresses
    ) public onlyOwner returns (bytes32) {
        bytes32 requestId = airnodeRrp.makeFullRequest(
            airnode,
            endpointIdUint256Array,
            address(this),
            sponsorWallet,
            address(this),
            this.mintBatch.selector,
            abi.encode(bytes32("1u"), bytes32("size"), targetAddresses.length)
        );
        expectingRequestWithIdToBeFulfilled[requestId] = true;
        for (uint256 i=0; i <= targetAddresses.length; i++) {
            requestToSender[requestId].push(targetAddresses[i]);
        }
        emit RequestedBatchToken(targetAddresses, requestId);
        return requestId;
    }

    /**
     * @notice Callback Function for the Airnode, which recieves the Random Id and mints the NFT.
     * @dev Notice the `onlyAirnodeRrp` modifier. You should only accept RRP
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
        uint256 tokenId = _generateId(qrngUint256, false);
        _safeMint(requestToSender[requestId][0], tokenId);
        _setTokenURI(tokenId, tokenId.toString());
        emit GeneratedToken(requestToSender[requestId][0], tokenId);
    }

    /**
     * @notice Callback Function for airnode Batch Request.
     * @param requestId Request ID.
     * @param data ABI-encoded response. The Random Number from the API.
     */
    function mintBatch(
        bytes32 requestId,
        bytes calldata data
    ) external onlyAirnodeRrp {
        require(
            expectingRequestWithIdToBeFulfilled[requestId],
            "Request ID not known"
        );
        expectingRequestWithIdToBeFulfilled[requestId] = false;
        uint256[] memory qrngUintArray = abi.decode(data, (uint256[]));
        uint256[] memory tokenIds;
        for (uint256 i=0; i <= qrngUintArray.length; i++) {
            uint256 generatedToken =  _generateId(qrngUintArray[i], false);
            tokenIds[i]= generatedToken;
            _safeMint(requestToSender[requestId][i], generatedToken);
            _setTokenURI(generatedToken, generatedToken.toString());
        }
        emit GeneratedBatchToken(requestToSender[requestId], tokenIds);
    }

    /**
     * @notice Mint directly one shinny token.
     * @dev This is up to the dev to make use of. Can be good for drops 
     * scenarios in which you need to manually mint them.
     */
    function mintShinny(
        address targetAddress
    ) external onlyOwner {
        uint256 tokenId = _generateId(0, true);
        _safeMint(targetAddress, tokenId);
        _setTokenURI(tokenId, tokenId.toString());
        emit GenerateShinny(targetAddress, tokenId);
    }

    /**
     * @notice Internal function to generate the tokenId based on QRNG result.
     * @dev This function is to be used exclusively inside the `mint` callback logic, 
     * can be use either in batch minting or individually.
     * @param randomUint The result uint from the airnode call.
     */
    function _generateId(
        uint256 randomUint,
        bool shinnyMint
    )   internal returns (uint256) {
        uint256 id = _pickRandomUniqueId(randomUint, shinnyMint);
        uint256 _tokenId;
        if (id == 0 && 
            (shinnyAvailable || shinnyMint) && 
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
