// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IRobotRegistry {
    function adjustReputation(bytes32 robotId, int256 delta) external;
}

interface ITaskMarket {
    function finalize(bytes32 taskId, bool success, string calldata evidenceURI) external;
    function setSolutionURI(bytes32 taskId, string calldata solutionURI) external;
}

/**
 * @title QuantumOracle
 * @notice Oracle for submitting optimization results and verifying task outcomes
 */
contract QuantumOracle {
    struct OptimizationResult {
        bytes32 taskId;
        string solutionURI;
        uint256 score;
        address submitter;
        uint256 timestamp;
    }

    // State variables
    mapping(address => bool) public authorizedNodes;
    mapping(bytes32 => OptimizationResult) public results;
    mapping(bytes32 => bool) public verified;
    
    address public owner;
    address public robotRegistryAddress;
    address public taskMarketAddress;

    // Events
    event NodeAuthorized(address indexed node, bool authorized);
    event ResultSubmitted(bytes32 indexed taskId, string solutionURI, uint256 score, address indexed submitter);
    event TaskVerified(bytes32 indexed taskId, bool success, uint256 score, string evidenceURI);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    modifier onlyAuthorizedNode() {
        require(authorizedNodes[msg.sender], "Not authorized node");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedNodes[msg.sender] = true; // Owner is authorized by default
    }

    /**
     * @notice Authorize or revoke an oracle node
     * @param node Node address
     * @param authorized Authorization status
     */
    function setNode(address node, bool authorized) external onlyOwner {
        authorizedNodes[node] = authorized;
        emit NodeAuthorized(node, authorized);
    }

    /**
     * @notice Submit optimization result
     * @param taskId Task identifier
     * @param solutionURI IPFS URI with optimization solution
     * @param score Optimization score
     */
    function submitResult(
        bytes32 taskId,
        string calldata solutionURI,
        uint256 score
    ) external onlyAuthorizedNode {
        require(bytes(solutionURI).length > 0, "Solution URI required");
        require(results[taskId].timestamp == 0, "Result already submitted");

        results[taskId] = OptimizationResult({
            taskId: taskId,
            solutionURI: solutionURI,
            score: score,
            submitter: msg.sender,
            timestamp: block.timestamp
        });

        // Update task market with solution URI
        if (taskMarketAddress != address(0)) {
            ITaskMarket(taskMarketAddress).setSolutionURI(taskId, solutionURI);
        }

        emit ResultSubmitted(taskId, solutionURI, score, msg.sender);
    }

    /**
     * @notice Verify task completion and finalize market
     * @param taskId Task identifier
     * @param robotId Robot that performed task
     * @param requiredScore Minimum score for success
     * @param evidenceURI IPFS URI with evidence
     */
    function verifyTask(
        bytes32 taskId,
        bytes32 robotId,
        uint256 requiredScore,
        string calldata evidenceURI
    ) external onlyAuthorizedNode {
        require(!verified[taskId], "Already verified");
        require(results[taskId].timestamp > 0, "No result submitted");
        require(bytes(evidenceURI).length > 0, "Evidence URI required");

        verified[taskId] = true;

        // Determine success based on score
        bool success = results[taskId].score >= requiredScore;

        // Update reputation in robot registry
        if (robotRegistryAddress != address(0)) {
            int256 reputationDelta = success ? int256(10) : int256(-5);
            IRobotRegistry(robotRegistryAddress).adjustReputation(robotId, reputationDelta);
        }

        // Finalize market
        if (taskMarketAddress != address(0)) {
            ITaskMarket(taskMarketAddress).finalize(taskId, success, evidenceURI);
        }

        emit TaskVerified(taskId, success, results[taskId].score, evidenceURI);
    }

    /**
     * @notice Set robot registry contract address
     * @param _registry Robot registry address
     */
    function setRobotRegistry(address _registry) external onlyOwner {
        robotRegistryAddress = _registry;
    }

    /**
     * @notice Set task market contract address
     * @param _market Task market address
     */
    function setTaskMarket(address _market) external onlyOwner {
        taskMarketAddress = _market;
    }

    /**
     * @notice Get optimization result
     * @param taskId Task identifier
     */
    function getResult(bytes32 taskId) external view returns (OptimizationResult memory) {
        return results[taskId];
    }

    /**
     * @notice Check if task has been verified
     * @param taskId Task identifier
     */
    function isVerified(bytes32 taskId) external view returns (bool) {
        return verified[taskId];
    }
}
