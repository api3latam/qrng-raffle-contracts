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
        address winner;
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

    event RaffleCreated(IndividualRaffle _raffleMetadata);
    event WinnerPicked(uint256 indexed _raffleId, address raffleWinner);

    /** 
     * @param _airnodeRrp Airnode address from the network where the contract is being deploy
     */
    constructor(address _airnodeRrp)
        RrpRequesterV0(_airnodeRrp) { }

    /**
     * @notice Creates a new raffle
     * @param _endTime Time the raffle ends
     */
    function create(
        uint256 _endTime
    ) public onlyOwner {
        require(
            block.timestamp < _endTime + 60,
            "Raffle must last at least 1 minute"
        );
        _ids.increment();
        IndividualRaffle memory raffle = IndividualRaffle(
            _ids.current(),
            address(0),
            new address[](0),
            true,
            block.timestamp,
            _endTime,
            false
        );
        raffles[raffle.raffleId] = raffle;
        emit RaffleCreated(raffle);
    }

    /**
     * @notice Enter an specific raffle
     * @dev For gasless transactions, we will be pushing the participants only, 
     * but you can overwritte this behaviour using the participantAddress 
     * with msg.sender when calling the contract.
     * @param _raffleId The raffle id to enter
     * @param participantAddress The participant address
     */
    function enter(
        uint256 _raffleId,
        address participantAddress
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

    /**
     * @notice Close an especific open raffle
     * @dev Called by the raffle owner when the raffle is over.
     * This function will close the raffle to new entries and will
     * call QRNG Airnode.
     * @param _raffleId The raffle id to close
     */
    function close(
        uint256 _raffleId
    ) public onlyOwner returns (bytes32) {
        IndividualRaffle storage raffle = raffles[_raffleId];
        require(
            raffle.open,
            "Raffle is already closed or does not exists"
        );
        if (raffle.entries.length == 0) {
            raffle.open = false;
            raffle.airnodeSuccess = true;
            return bytes32("Raffle canceled!");
        }
        bytes32 requestId = airnodeRrp.makeFullRequest(
            airnode,
            endpointIdUint256,
            address(this),
            sponsorWallet,
            address(this),
            this.pickWinner.selector,
            ""
        );
        pendingRequestIds[requestId] = true;
        requestIdToRaffleId[requestId] = _raffleId;
        raffle.open = false;
        return requestId;
    }

    /**
     * @notice Callback function for QRNG airnode and Close function.
     * @dev Note the `onlyAirnodeRrp` modifier. You should only accept RRP
     * fulfillments from this protocol contract. Also note that only
     * fulfillments for the requests made by this contract are accepted, and
     * a request cannot be responded to multiple times.
     */
    function pickWinner(
        bytes32 requestId, 
        bytes calldata data
    ) external onlyAirnodeRrp {
        require(
            pendingRequestIds[requestId], 
            "No such request made"
        );
        pendingRequestIds[requestId] = false;
        IndividualRaffle storage raffle = raffles[requestIdToRaffleId[requestId]];
        require(
            !raffle.airnodeSuccess, 
            "Winner already picked"
        );

        uint256 randomNumber = abi.decode(data, (uint256));

        uint256 winnerIndex = randomNumber % raffle.entries.length;
        raffle.winner = raffle.entries[winnerIndex];

        raffle.airnodeSuccess = true;
        emit WinnerPicked(raffle.raffleId, raffle.winner);
    }

    /**
     * @notice Get an individual Raffle entries
     * @param _raffleId The raffle id to get the entries from
     */
    function getEntries(
        uint256 _raffleId
    ) public view returns (address[] memory) {
        return raffles[_raffleId].entries;
    }

    /**
     * @notice Get an individual Raffle winner
     * @param _raffleId The raffle id to get the winner from
     */
    function getWinners(
        uint256 _raffleId
    ) public view returns (address) {
        return raffles[_raffleId].winner;
    }

    /**
     * @notice Get the raffles the user has entered
     * @param _address Target user address
     */
    function getEnteredRaffles(
        address _address
    ) public view returns (uint256[] memory) {
        return accountEntries[_address];
    }
}