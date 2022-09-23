// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.15;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@api3/airnode-protocol/contracts/rrp/requesters/RrpRequesterV0.sol";

/**
* @dev This contract is based out from DecentRaffle which can be found here: 
* https://github.com/camronh/DecentRaffle/blob/master/hardhat/contracts/Raffle.sol
*/

contract Raffle is RrpRequesterV0, Ownable {

    using Counters for Counters.Counter;

    Counters.Counter private _ids;          // Individual Raffle identifier
    address public airnode;                 // The address of the QRNG airnode
    bytes32 public endpointIdUint256;       // The endpointId of the airnode to fetch a single random number
    address public sponsorWallet;           // The address of the sponsorWallet that will be making the fullfillment transaction

    /**
     * @notice Basic metadata for a raffle
     * @dev The time parameters should be used in UNIX time stamp
     */
    struct IndividualRaffle {
        uint256 raffleId;
        string title;
        uint256 price;
        uint256 winnerCount;
        address[] winners;
        address[] entries;
        bool open;
        uint256 startTime;
        uint256 endTime;
        bool airnodeSuccess;
    }

    // Mapping of Raffle id with its struct
    mapping(uint256 => IndividualRaffle) public raffles;
    // Mapping of raffles id in which an address is registered at
    mapping(address => uint256[]) public accountEntries;
    // Mapping that maps the requestId for a random number to the fullfillment status of that request
    mapping(bytes32 => bool) public pendingRequestIds;
    // Mapping that tracks the raffle id which made the request
    mapping(bytes32 => uint256) private requestIdToRaffleId;

    event RaffleCreated(uint256 indexed _raffleId);
    event WinnersPicked(uint256 indexed _raffleId);

    /** 
     * @param _airnodeRrp Airnode address from the network where the contract is being deploy
     */
    constructor(address _airnodeRrp)
        RrpRequesterV0(_airnodeRrp) { }

    /**
     * @notice Creates a new raffle
     * @param _price The price to enter the raffle
     * @param _winnerCount The number of winners to be selected
     * @param _title Title of the raffle
     * @param _endTime Time the raffle ends
     */
    function create(
        uint256 _price,
        uint16 _winnerCount,
        string memory _title,
        uint256 _endTime
    ) public onlyOwner {
        require(
            _winnerCount > 0, 
            "Winner count must be greater than 0"
        );
        require(
            block.timestamp < _endTime + 60,
            "Raffle must last at least 1 minute"
        );
        _ids.increment();
        IndividualRaffle memory raffle = Raffle(
            _ids.current(),
            _title,
            _price,
            _winnerCount,
            new address[](0),
            new address[](0),
            true,
            block.timestamp,
            _endTime,
            false
        );
        raffles[raffle.raffleId] = raffle;
        emit RaffleCreated(raffle.raffleId);
    }

    /**
     * @notice Enter an specific raffle
     * @dev Notice that the entryNumber we are expecting is the result of a
     * QRNG NFT we minted earlier in another contract. In addition, for gasless
     * transactions, we will be pushing the participants only, but you can overwritte
     * the participantAddress with msg.sender at the integration part.
     * @param _raffleId The raffle id to enter
     * @param participantAddress The participant address
     * @param entryNumber The number that the user will use during the raffle.
     */
    function enter(
        uint256 _raffleId,
        address participantAddress,
        uint256 entryNumber
    ) public {
        IndividualRaffle storage raffle = raffles[_raffleId];
        require(
            raffle.open, 
            "Raffle is closed or does not exists"
        );
        require(
            block.timestamp >= raffle.startTime &&
                block.timestamp <= raffle.endTime,
            "Raffle is closed"
        );
        raffle.entries.push(participantAddress);
        accountEntries[participantAddress].push(raffle.raffleId);
    }

    /// @notice Close a raffle
    /// @dev Called by the raffle owner when the raffle is over.
    /// This function will close the raffle to new entries and will
    /// call Airnode for randomness.
    /// @dev send at least .001 ether to fund the sponsor wallet
    /// @param _raffleId The raffle id to close
    function close(uint256 _raffleId) public payable {
        Raffle storage raffle = raffles[_raffleId];
        // require(
        //     msg.sender == raffle.owner,
        //     "Only raffle owner can pick winners"
        // );
        require(raffle.open, "Raffle is closed");
        // require(block.timestamp >= raffle.endTime, "Raffle is still open");
        if (raffle.entries.length == 0) {
            raffle.open = false;
            raffle.airnodeSuccess = true;
            return;
        }
        require(
            raffle.entries.length >= raffle.winnerCount,
            "Not enough entries"
        );

        // Top up the Sponsor Wallet
        require(
            msg.value >= .001 ether,
            "Please send some funds to the sponsor wallet"
        );
        payable(sponsorWallet).transfer(msg.value);

        bytes32 requestId = airnodeRrp.makeFullRequest(
            ANUairnodeAddress,
            endpointId,
            sponsor,
            sponsorWallet,
            address(this),
            this.pickWinners.selector,
            abi.encode(bytes32("1u"), bytes32("size"), raffle.winnerCount)
        );
        pendingRequestIds[requestId] = true;
        requestIdToRaffleId[requestId] = _raffleId;
        raffle.open = false;
    }

    /// @notice Randomness returned by Airnode is used to choose winners
    /// @dev Only callable by Airnode.
    function pickWinners(bytes32 requestId, bytes calldata data)
        external
        onlyAirnodeRrp
    {
        require(pendingRequestIds[requestId], "No such request made");
        delete pendingRequestIds[requestId];
        Raffle storage raffle = raffles[requestIdToRaffleId[requestId]];
        require(!raffle.airnodeSuccess, "Winners already picked");

        uint256[] memory randomNumbers = abi.decode(data, (uint256[])); // array of random numbers returned by Airnode
        for (uint256 i = 0; i < randomNumbers.length; i++) {
            uint256 winnerIndex = randomNumbers[i] % raffle.entries.length;
            raffle.winners.push(raffle.entries[winnerIndex]);
            removeAddress(winnerIndex, raffle.entries);
        }
        raffle.airnodeSuccess = true;
        emit WinnersPicked(raffle.raffleId);
        payable(raffle.owner).transfer(raffle.balance);
    }

    /// @notice Get the raffle entries
    /// @param _raffleId The raffle id to get the entries of
    function getEntries(uint256 _raffleId)
        public
        view
        returns (address[] memory)
    {
        return raffles[_raffleId].entries;
    }

    /// @notice Get the raffle winners
    /// @param _raffleId The raffle id to get the winners of
    function getWinners(uint256 _raffleId)
        public
        view
        returns (address[] memory)
    {
        return raffles[_raffleId].winners;
    }

    /// @notice Get the raffles the user has entered
    /// @param _address Address of the user
    function getEnteredRaffles(address _address)
        public
        view
        returns (uint256[] memory)
    {
        return accountEntries[_address];
    }

    function isWinner(uint256 _raffleId, address _address)
        public
        view
        returns (bool)
    {
        for (uint256 i = 0; i < raffles[_raffleId].winners.length; i++) {
            if (raffles[_raffleId].winners[i] == _address) {
                return true;
            }
        }
        return false;
    }

    function getAccountRaffles(address _account)
        public
        view
        returns (Raffle[] memory)
    {
        uint256[] memory _raffleIds = accountRaffles[_account];
        Raffle[] memory _raffles = new Raffle[](_raffleIds.length);
        for (uint256 i = 0; i < _raffleIds.length; i++) {
            _raffles[i] = raffles[_raffleIds[i]];
        }
        return _raffles;
    }

    function removeAddress(uint256 index, address[] storage array) private {
        require(index < array.length);
        array[index] = array[array.length - 1];
        array.pop();
    }
}