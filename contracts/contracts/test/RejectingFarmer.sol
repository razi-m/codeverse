// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Test-only helper for E6 — a farmer address that rejects incoming
///         transfers, used to prove evaluatePolicy does not leave the policy
///         marked PaidOut when the payout transfer fails.
contract RejectingFarmer {
    receive() external payable {
        revert("RejectingFarmer: no");
    }
}
