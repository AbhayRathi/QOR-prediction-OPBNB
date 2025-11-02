// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title TaskMarket
 * @notice Binary prediction market for robot mission outcomes with escrow
 */
contract TaskMarket {
    struct Task {
        bytes32 robotId;
        string description;
        string waypointsURI;
        uint256 deadline;
        uint256 requiredScore;
        address resolver;
        uint256 yesPool;
        uint256 noPool;
        uint256 yesShares;
        uint256 noShares;
        bool resolved;
        bool success;
        string solutionURI;
        string evidenceURI;
        uint256 createdAt;
    }

    struct Position {
        address trader;
        bool isYes;
        uint256 shares;
        uint256 cost;
        bool redeemed;
    }

    // State variables
    mapping(bytes32 => Task) public tasks;
    mapping(bytes32 => Position[]) public taskPositions;
    mapping(bytes32 => mapping(address => uint256[])) public userPositions;
    bytes32[] public allTaskIds;

    address public oracleAddress;
    address public owner;
    uint256 public minTaskStake = 0.001 ether;

    // Events
    event TaskCreated(bytes32 indexed taskId, bytes32 indexed robotId, address indexed creator, uint256 deadline);
    event SharesPurchased(bytes32 indexed taskId, address indexed buyer, bool isYes, uint256 shares, uint256 cost);
    event TaskResolved(bytes32 indexed taskId, bool success, string evidenceURI);
    event PositionRedeemed(bytes32 indexed taskId, address indexed redeemer, uint256 payout);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracleAddress, "Not oracle");
        _;
    }

    modifier taskExists(bytes32 taskId) {
        require(tasks[taskId].createdAt > 0, "Task does not exist");
        _;
    }

    modifier taskActive(bytes32 taskId) {
        require(!tasks[taskId].resolved, "Task already resolved");
        require(block.timestamp < tasks[taskId].deadline, "Task deadline passed");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Create a new task and prediction market
     * @param taskId Unique task identifier
     * @param robotId Robot assigned to task
     * @param description Task description
     * @param waypointsURI IPFS URI with waypoints data
     * @param deadline Task deadline timestamp
     * @param requiredScore Minimum score for success
     * @param resolver Address authorized to resolve (usually oracle)
     */
    function createTask(
        bytes32 taskId,
        bytes32 robotId,
        string calldata description,
        string calldata waypointsURI,
        uint256 deadline,
        uint256 requiredScore,
        address resolver
    ) external payable {
        require(msg.value >= minTaskStake, "Insufficient task stake");
        require(tasks[taskId].createdAt == 0, "Task already exists");
        require(deadline > block.timestamp, "Deadline must be in future");
        require(bytes(description).length > 0, "Description required");
        require(resolver != address(0), "Resolver required");

        tasks[taskId] = Task({
            robotId: robotId,
            description: description,
            waypointsURI: waypointsURI,
            deadline: deadline,
            requiredScore: requiredScore,
            resolver: resolver,
            yesPool: 0,
            noPool: 0,
            yesShares: 0,
            noShares: 0,
            resolved: false,
            success: false,
            solutionURI: "",
            evidenceURI: "",
            createdAt: block.timestamp
        });

        allTaskIds.push(taskId);

        emit TaskCreated(taskId, robotId, msg.sender, deadline);
    }

    /**
     * @notice Buy YES shares in a market
     * @param taskId Task identifier
     */
    function buyYes(bytes32 taskId) external payable taskExists(taskId) taskActive(taskId) {
        require(msg.value > 0, "Must send value");

        // Simple 1:1 pricing for MVP
        uint256 shares = msg.value;

        tasks[taskId].yesPool += msg.value;
        tasks[taskId].yesShares += shares;

        // Record position
        Position memory position = Position({
            trader: msg.sender,
            isYes: true,
            shares: shares,
            cost: msg.value,
            redeemed: false
        });

        taskPositions[taskId].push(position);
        userPositions[taskId][msg.sender].push(taskPositions[taskId].length - 1);

        emit SharesPurchased(taskId, msg.sender, true, shares, msg.value);
    }

    /**
     * @notice Buy NO shares in a market
     * @param taskId Task identifier
     */
    function buyNo(bytes32 taskId) external payable taskExists(taskId) taskActive(taskId) {
        require(msg.value > 0, "Must send value");

        // Simple 1:1 pricing for MVP
        uint256 shares = msg.value;

        tasks[taskId].noPool += msg.value;
        tasks[taskId].noShares += shares;

        // Record position
        Position memory position = Position({
            trader: msg.sender,
            isYes: false,
            shares: shares,
            cost: msg.value,
            redeemed: false
        });

        taskPositions[taskId].push(position);
        userPositions[taskId][msg.sender].push(taskPositions[taskId].length - 1);

        emit SharesPurchased(taskId, msg.sender, false, shares, msg.value);
    }

    /**
     * @notice Resolve a task (callable by oracle)
     * @param taskId Task identifier
     * @param success Whether task succeeded
     * @param evidenceURI IPFS URI with evidence
     */
    function finalize(bytes32 taskId, bool success, string calldata evidenceURI) external onlyOracle taskExists(taskId) {
        require(!tasks[taskId].resolved, "Already resolved");

        tasks[taskId].resolved = true;
        tasks[taskId].success = success;
        tasks[taskId].evidenceURI = evidenceURI;

        emit TaskResolved(taskId, success, evidenceURI);
    }

    /**
     * @notice Set solution URI (called by oracle after optimization)
     * @param taskId Task identifier
     * @param solutionURI IPFS URI with solution
     */
    function setSolutionURI(bytes32 taskId, string calldata solutionURI) external onlyOracle taskExists(taskId) {
        tasks[taskId].solutionURI = solutionURI;
    }

    /**
     * @notice Redeem winning positions
     * @param taskId Task identifier
     */
    function redeem(bytes32 taskId) external taskExists(taskId) {
        require(tasks[taskId].resolved, "Task not resolved");

        uint256[] memory positionIds = userPositions[taskId][msg.sender];
        require(positionIds.length > 0, "No positions");

        uint256 totalPayout = 0;
        uint256 totalPool = tasks[taskId].yesPool + tasks[taskId].noPool;

        for (uint256 i = 0; i < positionIds.length; i++) {
            Position storage position = taskPositions[taskId][positionIds[i]];
            
            if (!position.redeemed && position.isYes == tasks[taskId].success) {
                // Winner
                uint256 payout;
                if (tasks[taskId].success && tasks[taskId].yesShares > 0) {
                    // YES won
                    payout = (position.shares * totalPool) / tasks[taskId].yesShares;
                } else if (!tasks[taskId].success && tasks[taskId].noShares > 0) {
                    // NO won
                    payout = (position.shares * totalPool) / tasks[taskId].noShares;
                }

                position.redeemed = true;
                totalPayout += payout;
            }
        }

        require(totalPayout > 0, "No winnings to redeem");

        (bool success, ) = msg.sender.call{value: totalPayout}("");
        require(success, "Transfer failed");

        emit PositionRedeemed(taskId, msg.sender, totalPayout);
    }

    /**
     * @notice Set oracle address
     * @param _oracle Oracle contract address
     */
    function setOracleAddress(address _oracle) external onlyOwner {
        oracleAddress = _oracle;
    }

    /**
     * @notice Get task details
     * @param taskId Task identifier
     */
    function getTask(bytes32 taskId) external view returns (Task memory) {
        return tasks[taskId];
    }

    /**
     * @notice Get all positions for a task
     * @param taskId Task identifier
     */
    function getTaskPositions(bytes32 taskId) external view returns (Position[] memory) {
        return taskPositions[taskId];
    }

    /**
     * @notice Get user positions for a task
     * @param taskId Task identifier
     * @param user User address
     */
    function getUserPositions(bytes32 taskId, address user) external view returns (uint256[] memory) {
        return userPositions[taskId][user];
    }

    /**
     * @notice Get total number of tasks
     */
    function getTotalTasks() external view returns (uint256) {
        return allTaskIds.length;
    }

    /**
     * @notice Calculate potential payout for a position
     * @param taskId Task identifier
     * @param positionId Position index
     */
    function calculatePayout(bytes32 taskId, uint256 positionId) external view returns (uint256) {
        require(tasks[taskId].resolved, "Task not resolved");
        
        Position memory position = taskPositions[taskId][positionId];
        if (position.redeemed || position.isYes != tasks[taskId].success) {
            return 0;
        }

        uint256 totalPool = tasks[taskId].yesPool + tasks[taskId].noPool;
        
        if (tasks[taskId].success && tasks[taskId].yesShares > 0) {
            return (position.shares * totalPool) / tasks[taskId].yesShares;
        } else if (!tasks[taskId].success && tasks[taskId].noShares > 0) {
            return (position.shares * totalPool) / tasks[taskId].noShares;
        }
        
        return 0;
    }
}
