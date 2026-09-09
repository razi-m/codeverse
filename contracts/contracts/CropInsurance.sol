// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title CropInsurance
/// @notice Parametric crop insurance (PS3). A funded policy pays out
///         automatically when two independent oracle readings agree, within
///         tolerance, that a measurement fell below the policy threshold.
///         No manual claim, no insurer discretion — see docs/TRD.md.
contract CropInsurance is Ownable {
    enum TriggerType { RainfallBelow, VegetationIndexBelow }
    enum PolicyStatus { Active, PaidOut, Expired, Cancelled }

    struct Policy {
        uint256 id;
        address farmer;
        string cropType;
        string regionId;
        uint256 coverageAmount; // wei, escrowed
        TriggerType triggerType;
        uint256 thresholdValue; // scaled x100 — see docs/Schema.md Units
        uint256 toleranceValue; // max spread between agreeing oracles, scaled x100
        uint64 startDate;
        uint64 endDate;
        PolicyStatus status;
        bool funded;
    }

    struct Reading {
        uint256 policyId;
        address oracle;
        uint256 value; // scaled x100, same scale as thresholdValue
        uint64 periodId;
        uint64 submittedAt;
    }

    mapping(uint256 => Policy) private policies;
    uint256 public policyCount;

    // policyId => periodId => readings
    mapping(uint256 => mapping(uint64 => Reading[])) private readings;
    // policyId => periodId => oracle => already submitted
    mapping(uint256 => mapping(uint64 => mapping(address => bool))) private hasSubmitted;

    mapping(address => bool) public registeredOracles;
    address[] public oracleList;
    uint256 public oracleCount;

    event PolicyCreated(
        uint256 indexed policyId,
        address indexed farmer,
        string cropType,
        string regionId,
        uint256 coverageAmount,
        uint256 thresholdValue
    );
    event PolicyFunded(uint256 indexed policyId, uint256 amount);
    event OracleRegistered(address indexed oracle);
    event OracleDeregistered(address indexed oracle);
    event PolicyCancelled(uint256 indexed policyId);
    event ReadingSubmitted(
        uint256 indexed policyId,
        address indexed oracle,
        uint256 value,
        uint64 periodId,
        uint64 submittedAt
    );
    event ConsensusReached(uint256 indexed policyId, uint64 periodId, uint256 consensusValue, uint256 spread);
    event ConsensusFailed(uint256 indexed policyId, uint64 periodId, uint256 spread, uint256 tolerance);
    event PayoutTriggered(
        uint256 indexed policyId,
        address indexed farmer,
        uint256 amount,
        uint256 consensusValue,
        uint256 thresholdValue
    );
    event PayoutRejected(
        uint256 indexed policyId,
        uint64 periodId,
        uint8 reasonCode,
        uint256 consensusValue,
        uint256 thresholdValue
    );

    error InvalidFarmer();
    error EmptyCropType();
    error EmptyRegionId();
    error ZeroCoverageAmount();
    error ZeroThreshold();
    error ZeroTolerance();
    error InvalidDateRange();
    error PolicyNotFound(uint256 policyId);
    error InsufficientFunding(uint256 sent, uint256 required);
    error AlreadyFunded(uint256 policyId);
    error OracleAlreadyRegistered(address oracle);
    error OracleNotRegistered(address oracle);
    error NotActive(uint256 policyId);
    error RefundFailed();
    error DuplicateReading(uint256 policyId, uint64 periodId, address oracle);
    error PayoutTransferFailed();

    modifier onlyRegisteredOracle() {
        if (!registeredOracles[msg.sender]) revert OracleNotRegistered(msg.sender);
        _;
    }

    constructor() Ownable(msg.sender) {}

    /// @notice Records policy terms and assigns a sequential ID starting at 1.
    function createPolicy(
        address farmer,
        string calldata cropType,
        string calldata regionId,
        uint256 coverageAmount,
        TriggerType triggerType,
        uint256 thresholdValue,
        uint256 toleranceValue,
        uint64 startDate,
        uint64 endDate
    ) external onlyOwner returns (uint256 id) {
        if (farmer == address(0)) revert InvalidFarmer();
        if (bytes(cropType).length == 0) revert EmptyCropType();
        if (bytes(regionId).length == 0) revert EmptyRegionId();
        if (coverageAmount == 0) revert ZeroCoverageAmount();
        if (thresholdValue == 0) revert ZeroThreshold();
        if (toleranceValue == 0) revert ZeroTolerance();
        if (startDate >= endDate) revert InvalidDateRange();

        id = ++policyCount;
        policies[id] = Policy({
            id: id,
            farmer: farmer,
            cropType: cropType,
            regionId: regionId,
            coverageAmount: coverageAmount,
            triggerType: triggerType,
            thresholdValue: thresholdValue,
            toleranceValue: toleranceValue,
            startDate: startDate,
            endDate: endDate,
            status: PolicyStatus.Active,
            funded: false
        });

        emit PolicyCreated(id, farmer, cropType, regionId, coverageAmount, thresholdValue);
    }

    /// @notice Escrows msg.value against a policy's coverage amount.
    function fundPolicy(uint256 policyId) external payable onlyOwner {
        Policy storage policy = policies[policyId];
        if (policy.id == 0) revert PolicyNotFound(policyId);
        if (policy.funded) revert AlreadyFunded(policyId);
        if (msg.value < policy.coverageAmount) {
            revert InsufficientFunding(msg.value, policy.coverageAmount);
        }

        policy.funded = true;
        emit PolicyFunded(policyId, msg.value);
    }

    /// @notice Cancels an active policy and refunds any escrow to the owner.
    function cancelPolicy(uint256 policyId) external onlyOwner {
        Policy storage policy = policies[policyId];
        if (policy.id == 0) revert PolicyNotFound(policyId);
        if (policy.status != PolicyStatus.Active) revert NotActive(policyId);

        bool wasFunded = policy.funded;
        uint256 refundAmount = policy.coverageAmount;
        policy.status = PolicyStatus.Cancelled;

        emit PolicyCancelled(policyId);

        if (wasFunded) {
            (bool ok, ) = payable(owner()).call{value: refundAmount}("");
            if (!ok) revert RefundFailed();
        }
    }

    function registerOracle(address oracle) external onlyOwner {
        if (oracle == address(0)) revert InvalidFarmer();
        if (registeredOracles[oracle]) revert OracleAlreadyRegistered(oracle);

        registeredOracles[oracle] = true;
        oracleList.push(oracle);
        oracleCount++;

        emit OracleRegistered(oracle);
    }

    function deregisterOracle(address oracle) external onlyOwner {
        if (!registeredOracles[oracle]) revert OracleNotRegistered(oracle);

        registeredOracles[oracle] = false;
        oracleCount--;
        uint256 len = oracleList.length;
        for (uint256 i = 0; i < len; i++) {
            if (oracleList[i] == oracle) {
                oracleList[i] = oracleList[len - 1];
                oracleList.pop();
                break;
            }
        }

        emit OracleDeregistered(oracle);
    }

    /// @notice Records one oracle's reading for a policy/period. One reading
    ///         per oracle per period — a second submission would let a single
    ///         feed manufacture agreement with itself.
    function submitReading(
        uint256 policyId,
        uint256 value,
        uint64 periodId
    ) external onlyRegisteredOracle {
        if (policies[policyId].id == 0) revert PolicyNotFound(policyId);
        if (hasSubmitted[policyId][periodId][msg.sender]) {
            revert DuplicateReading(policyId, periodId, msg.sender);
        }

        hasSubmitted[policyId][periodId][msg.sender] = true;
        readings[policyId][periodId].push(
            Reading({
                policyId: policyId,
                oracle: msg.sender,
                value: value,
                periodId: periodId,
                submittedAt: uint64(block.timestamp)
            })
        );

        emit ReadingSubmitted(policyId, msg.sender, value, periodId, uint64(block.timestamp));
    }

    /// @notice Runs consensus and trigger evaluation for a policy/period, and
    ///         pays out when satisfied. Deliberately permissionless (D6) — an
    ///         insurer who alone could call this could suppress a payout by
    ///         simply never calling. Every terminating branch emits an event;
    ///         nothing reverts, so a farmer can be shown why they were or
    ///         were not paid (D10).
    function evaluatePolicy(uint256 policyId, uint64 periodId) external {
        Policy storage policy = policies[policyId];
        if (policy.id == 0) revert PolicyNotFound(policyId);

        Reading[] storage periodReadings = readings[policyId][periodId];
        if (periodReadings.length < 2) {
            emit PayoutRejected(policyId, periodId, 2, 0, policy.thresholdValue);
            return;
        }

        uint256 minValue = periodReadings[0].value;
        uint256 maxValue = periodReadings[0].value;
        uint256 sum = periodReadings[0].value;
        for (uint256 i = 1; i < periodReadings.length; i++) {
            uint256 v = periodReadings[i].value;
            if (v < minValue) minValue = v;
            if (v > maxValue) maxValue = v;
            sum += v;
        }
        uint256 spread = maxValue - minValue;

        if (spread > policy.toleranceValue) {
            emit ConsensusFailed(policyId, periodId, spread, policy.toleranceValue);
            emit PayoutRejected(policyId, periodId, 3, 0, policy.thresholdValue);
            return;
        }

        uint256 consensusValue = sum / periodReadings.length;
        emit ConsensusReached(policyId, periodId, consensusValue, spread);

        if (policy.status != PolicyStatus.Active) {
            emit PayoutRejected(policyId, periodId, 4, consensusValue, policy.thresholdValue);
            return;
        }
        // periodId is days-since-epoch (docs/Schema.md); startDate/endDate are
        // Unix seconds. Convert before comparing so the two share a unit.
        uint256 periodSeconds = uint256(periodId) * 1 days;
        if (periodSeconds < policy.startDate || periodSeconds > policy.endDate) {
            emit PayoutRejected(policyId, periodId, 5, consensusValue, policy.thresholdValue);
            return;
        }
        if (!policy.funded) {
            emit PayoutRejected(policyId, periodId, 6, consensusValue, policy.thresholdValue);
            return;
        }

        if (consensusValue >= policy.thresholdValue) {
            emit PayoutRejected(policyId, periodId, 1, consensusValue, policy.thresholdValue);
            return;
        }

        // Checks-effects-interactions: status is set before the transfer so
        // a farmer address that is a rejecting/reentering contract cannot
        // reopen this path.
        policy.status = PolicyStatus.PaidOut;
        uint256 amount = policy.coverageAmount;
        address farmer = policy.farmer;

        emit PayoutTriggered(policyId, farmer, amount, consensusValue, policy.thresholdValue);

        (bool ok, ) = payable(farmer).call{value: amount}("");
        if (!ok) revert PayoutTransferFailed();
    }

    function getPolicy(uint256 policyId) external view returns (Policy memory) {
        if (policies[policyId].id == 0) revert PolicyNotFound(policyId);
        return policies[policyId];
    }

    function getReadings(uint256 policyId, uint64 periodId) external view returns (Reading[] memory) {
        return readings[policyId][periodId];
    }

    function getPolicyCount() external view returns (uint256) {
        return policyCount;
    }

    function isRegisteredOracle(address oracle) external view returns (bool) {
        return registeredOracles[oracle];
    }
}
