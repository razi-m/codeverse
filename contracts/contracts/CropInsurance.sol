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
