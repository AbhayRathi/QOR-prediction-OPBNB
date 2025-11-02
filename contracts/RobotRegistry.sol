// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title RobotRegistry
 * @notice Manages robot/agent registration, staking, and reputation on QOR Network
 */
contract RobotRegistry {
    struct Robot {
        address owner;
        string metadataURI;
        int256 reputation;
        uint256 stake;
        bool active;
        uint256 registeredAt;
    }

    // State variables
    mapping(bytes32 => Robot) public robots;
    mapping(address => bytes32[]) public ownerRobots;
    bytes32[] public allRobotIds;
    
    uint256 public minStake = 0.01 ether; // Minimum stake required
    address public oracleAddress;
    address public daoAddress;
    address public owner;

    // Events
    event RobotRegistered(bytes32 indexed robotId, address indexed owner, string metadataURI, uint256 stake);
    event RobotDeactivated(bytes32 indexed robotId);
    event ReputationAdjusted(bytes32 indexed robotId, int256 newReputation, int256 delta);
    event StakeWithdrawn(bytes32 indexed robotId, address indexed owner, uint256 amount);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    modifier onlyOracleOrDAO() {
        require(msg.sender == oracleAddress || msg.sender == daoAddress, "Not authorized");
        _;
    }

    modifier onlyRobotOwner(bytes32 robotId) {
        require(robots[robotId].owner == msg.sender, "Not robot owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Register a new robot/agent on the network
     * @param idHash Unique identifier hash for the robot
     * @param metadataURI IPFS URI containing robot metadata
     */
    function registerRobot(bytes32 idHash, string calldata metadataURI) external payable {
        require(msg.value >= minStake, "Insufficient stake");
        require(robots[idHash].owner == address(0), "Robot already registered");
        require(bytes(metadataURI).length > 0, "Metadata URI required");

        robots[idHash] = Robot({
            owner: msg.sender,
            metadataURI: metadataURI,
            reputation: 100, // Starting reputation
            stake: msg.value,
            active: true,
            registeredAt: block.timestamp
        });

        ownerRobots[msg.sender].push(idHash);
        allRobotIds.push(idHash);

        emit RobotRegistered(idHash, msg.sender, metadataURI, msg.value);
    }

    /**
     * @notice Deactivate a robot
     * @param robotId Robot identifier
     */
    function deactivateRobot(bytes32 robotId) external onlyRobotOwner(robotId) {
        require(robots[robotId].active, "Robot already inactive");
        robots[robotId].active = false;
        emit RobotDeactivated(robotId);
    }

    /**
     * @notice Adjust robot reputation (callable by oracle or DAO)
     * @param robotId Robot identifier
     * @param delta Change in reputation (positive or negative)
     */
    function adjustReputation(bytes32 robotId, int256 delta) external onlyOracleOrDAO {
        require(robots[robotId].owner != address(0), "Robot does not exist");
        
        robots[robotId].reputation += delta;
        
        emit ReputationAdjusted(robotId, robots[robotId].reputation, delta);
    }

    /**
     * @notice Withdraw stake (only for inactive robots)
     * @param robotId Robot identifier
     */
    function withdrawStake(bytes32 robotId) external onlyRobotOwner(robotId) {
        require(!robots[robotId].active, "Robot must be inactive");
        require(robots[robotId].stake > 0, "No stake to withdraw");

        uint256 amount = robots[robotId].stake;
        robots[robotId].stake = 0;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit StakeWithdrawn(robotId, msg.sender, amount);
    }

    /**
     * @notice Set oracle address
     * @param _oracle Oracle contract address
     */
    function setOracleAddress(address _oracle) external onlyOwner {
        oracleAddress = _oracle;
    }

    /**
     * @notice Set DAO address
     * @param _dao DAO contract address
     */
    function setDAOAddress(address _dao) external onlyOwner {
        daoAddress = _dao;
    }

    /**
     * @notice Update minimum stake requirement
     * @param _minStake New minimum stake
     */
    function setMinStake(uint256 _minStake) external onlyOwner {
        minStake = _minStake;
    }

    /**
     * @notice Get robot details
     * @param robotId Robot identifier
     */
    function getRobot(bytes32 robotId) external view returns (Robot memory) {
        return robots[robotId];
    }

    /**
     * @notice Get all robots owned by an address
     * @param ownerAddress Owner address
     */
    function getRobotsByOwner(address ownerAddress) external view returns (bytes32[] memory) {
        return ownerRobots[ownerAddress];
    }

    /**
     * @notice Get total number of registered robots
     */
    function getTotalRobots() external view returns (uint256) {
        return allRobotIds.length;
    }

    /**
     * @notice Get all robot IDs (paginated)
     * @param offset Starting index
     * @param limit Number of results
     */
    function getAllRobots(uint256 offset, uint256 limit) external view returns (bytes32[] memory) {
        require(offset < allRobotIds.length, "Offset out of bounds");
        
        uint256 end = offset + limit;
        if (end > allRobotIds.length) {
            end = allRobotIds.length;
        }
        
        bytes32[] memory result = new bytes32[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = allRobotIds[i];
        }
        
        return result;
    }
}
