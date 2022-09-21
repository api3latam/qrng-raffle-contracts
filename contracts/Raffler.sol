// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.15;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@api3/airnode-protocol/contracts/rrp/requesters/RrpRequesterV0.sol";

/**
* @dev This contract is based out from DecentRaffle which can be found here: 
* https://github.com/camronh/DecentRaffle/blob/master/hardhat/contracts/Raffle.sol
*/
contract Raffler is RrpRequesterV0 {
    using Counters for Counters.Counter;
    Counters.Counter private _ids;

    event RaffleCreated(uint256 indexed _raffleId);
    event WinnersPicked(uint256 indexed _raffleId);

    mapping(uint256 => Raffle) public raffles;
    mapping(address => uint256[]) public accountRaffles;
    mapping(address => uint256[]) public accountEntries;

    // To store pending Airnode requests
    mapping(bytes32 => bool) public pendingRequestIds;
    mapping(bytes32 => uint256) private requestIdToRaffleId;

    // These variables can also be declared as `constant`/`immutable`.
    // However, this would mean that they would not be updatable.
    // Since it is impossible to ensure that a particular Airnode will be
    // indefinitely available, you are recommended to always implement a way
    // to update these parameters.
    address public airnodeRrpAddress;
    address public sponsor;
    address public sponsorWallet;
    address public ANUairnodeAddress =
        0x9d3C147cA16DB954873A498e0af5852AB39139f2;
    bytes32 public endpointId =
        0x27cc2713e7f968e4e86ed274a051a5c8aaee9cca66946f23af6f29ecea9704c3;

    struct Raffle {
        uint256 raffleId;
        string title;
        uint256 price;
        uint256 winnerCount;
        address[] winners;
        address[] entries;
        bool open;
        uint256 startTime;
        uint256 endTime;
        uint256 balance;
        address owner;
        bool airnodeSuccess;
    }

    /// @param _airnodeRrpAddress Airnode RRP contract address (https://docs.api3.org/airnode/v0.6/reference/airnode-addresses.html)
    /// @param _sponsorWallet Sponsor Wallet address (https://docs.api3.org/airnode/v0.6/concepts/sponsor.html#derive-a-sponsor-wallet)
    constructor(address _airnodeRrpAddress, address _sponsorWallet)
        RrpRequesterV0(_airnodeRrpAddress)
    {
        airnodeRrpAddress = _airnodeRrpAddress;
        sponsorWallet = _sponsorWallet;
        sponsor = msg.sender;
    }

    /// @notice Create a new raffle
    /// @param _price The price to enter the raffle
    /// @param _winnerCount The number of winners to be selected
    /// @param _title Title of the raffle
    /// @param _startTime Time the raffle starts
    /// @param _endTime Time the raffle ends
    function create(
        uint256 _price,
        uint16 _winnerCount,
        string memory _title,
        uint256 _startTime,
        uint256 _endTime
    ) public {
        require(_winnerCount > 0, "Winner count must be greater than 0");
        require(
            block.timestamp < _endTime + 60,
            "Raffle must last at least 1 minute"
        );
        _ids.increment();
        Raffle memory raffle = Raffle(
            _ids.current(),
            _title,
            _price,
            _winnerCount,
            new address[](0),
            new address[](0),
            true,
            _startTime,
            _endTime,
            0,
            msg.sender,
            false
        );
        raffles[raffle.raffleId] = raffle;
        accountRaffles[msg.sender].push(raffle.raffleId);
        emit RaffleCreated(raffle.raffleId);
    }

    /// @notice Enter a raffle
    /// @dev To enter more than one entry, send the price * entryCount in
    /// the transaction.
    /// @param _raffleId The raffle id to enter
    /// @param entryCount The number of entries to enter
    function enter(uint256 _raffleId, uint256 entryCount) public payable {
        Raffle storage raffle = raffles[_raffleId];
        require(raffle.open, "Raffle is closed");
        require(entryCount >= 1, "Entry count must be at least 1");
        require(
            block.timestamp >= raffle.startTime &&
                block.timestamp <= raffle.endTime,
            "Raffle is closed"
        );
        require(
            msg.value == raffle.price * entryCount,
            "Entry price does not match"
        );
        raffle.balance += msg.value;
        for (uint256 i = 0; i < entryCount; i++) {
            raffle.entries.push(msg.sender);
        }
        accountEntries[msg.sender].push(raffle.raffleId);
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