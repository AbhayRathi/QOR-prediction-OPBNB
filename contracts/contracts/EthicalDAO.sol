// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title EthicalDAO
 * @notice Decentralized governance for QOR Network
 */
contract EthicalDAO {
    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        bytes callData;
        address target;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 createdAt;
        uint256 votingEnds;
        bool executed;
        bool passed;
    }

    struct Vote {
        bool voted;
        bool support;
        uint256 weight;
    }

    // State variables
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => Vote)) public votes;
    uint256 public proposalCount;
    uint256 public votingPeriod = 3 days;
    uint256 public minProposalWeight = 1; // Minimum weight to create proposal
    
    address public owner;
    address public robotRegistryAddress;

    // Events
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId, bool passed);

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    modifier proposalExists(uint256 proposalId) {
        require(proposalId < proposalCount, "Proposal does not exist");
        _;
    }

    modifier votingActive(uint256 proposalId) {
        require(block.timestamp < proposals[proposalId].votingEnds, "Voting ended");
        require(!proposals[proposalId].executed, "Already executed");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Create a new governance proposal
     * @param title Proposal title
     * @param description Proposal description
     * @param target Contract address to call (address(0) for parameter changes)
     * @param callData Encoded function call data
     */
    function propose(
        string calldata title,
        string calldata description,
        address target,
        bytes calldata callData
    ) external returns (uint256) {
        require(bytes(title).length > 0, "Title required");
        require(bytes(description).length > 0, "Description required");

        uint256 proposalId = proposalCount++;

        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            title: title,
            description: description,
            callData: callData,
            target: target,
            yesVotes: 0,
            noVotes: 0,
            createdAt: block.timestamp,
            votingEnds: block.timestamp + votingPeriod,
            executed: false,
            passed: false
        });

        emit ProposalCreated(proposalId, msg.sender, title);

        return proposalId;
    }

    /**
     * @notice Vote on a proposal
     * @param proposalId Proposal identifier
     * @param support True for yes, false for no
     */
    function vote(uint256 proposalId, bool support) external proposalExists(proposalId) votingActive(proposalId) {
        require(!votes[proposalId][msg.sender].voted, "Already voted");

        // Simple 1 vote per address for MVP
        // In production, weight by reputation + stake from RobotRegistry
        uint256 weight = 1;

        votes[proposalId][msg.sender] = Vote({
            voted: true,
            support: support,
            weight: weight
        });

        if (support) {
            proposals[proposalId].yesVotes += weight;
        } else {
            proposals[proposalId].noVotes += weight;
        }

        emit Voted(proposalId, msg.sender, support, weight);
    }

    /**
     * @notice Execute a proposal after voting ends
     * @param proposalId Proposal identifier
     */
    function execute(uint256 proposalId) external proposalExists(proposalId) {
        Proposal storage proposal = proposals[proposalId];
        
        require(block.timestamp >= proposal.votingEnds, "Voting still active");
        require(!proposal.executed, "Already executed");

        proposal.executed = true;
        proposal.passed = proposal.yesVotes > proposal.noVotes;

        // Execute call if proposal passed and has a target
        if (proposal.passed && proposal.target != address(0)) {
            (bool success, ) = proposal.target.call(proposal.callData);
            require(success, "Execution failed");
        }

        emit ProposalExecuted(proposalId, proposal.passed);
    }

    /**
     * @notice Set voting period duration
     * @param _votingPeriod New voting period in seconds
     */
    function setVotingPeriod(uint256 _votingPeriod) external onlyOwner {
        votingPeriod = _votingPeriod;
    }

    /**
     * @notice Set robot registry address for weighted voting
     * @param _registry Robot registry address
     */
    function setRobotRegistry(address _registry) external onlyOwner {
        robotRegistryAddress = _registry;
    }

    /**
     * @notice Get proposal details
     * @param proposalId Proposal identifier
     */
    function getProposal(uint256 proposalId) external view proposalExists(proposalId) returns (Proposal memory) {
        return proposals[proposalId];
    }

    /**
     * @notice Get vote details for a user
     * @param proposalId Proposal identifier
     * @param voter Voter address
     */
    function getVote(uint256 proposalId, address voter) external view returns (Vote memory) {
        return votes[proposalId][voter];
    }

    /**
     * @notice Check if proposal can be executed
     * @param proposalId Proposal identifier
     */
    function canExecute(uint256 proposalId) external view proposalExists(proposalId) returns (bool) {
        Proposal memory proposal = proposals[proposalId];
        return block.timestamp >= proposal.votingEnds && !proposal.executed;
    }

    /**
     * @notice Get total vote count for a proposal
     * @param proposalId Proposal identifier
     */
    function getTotalVotes(uint256 proposalId) external view proposalExists(proposalId) returns (uint256) {
        return proposals[proposalId].yesVotes + proposals[proposalId].noVotes;
    }
}
