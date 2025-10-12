# Luminary Nexus: Token & Governance Guide

## Introduction

This document provides a comprehensive overview of the Luminary Nexus (LNX) token and the governance structure of the Luminary Nexus DAO. It is intended for community members, developers, and anyone interested in understanding the technical and operational details of our ecosystem. Our goal is to create a transparent, fair, and resilient system that empowers our community to guide the future of the project.

## Tokenomics Summary & Distribution

The total supply of the Luminary Nexus Token (LNX) is fixed at **1,000,000,000 LNX**. The entire supply was minted at the project's inception and distributed by a dedicated contract to ensure transparency.

Here is the breakdown of where those tokens were allocated:

*   **DAO Treasury:** `94.25%` (**942,500,000 LNX**)
    *   **Destination:** The DAO's own treasury wallet.
    *   **Purpose:** These funds are controlled by the community through governance proposals. They are intended for funding project development, community grants, ecosystem initiatives, and any other purpose the DAO votes to approve.

*   **Community Airdrop:** `4.00%` (**40,000,000 LNX**)
    *   **Destination:** A dedicated wallet for airdrop distribution.
    *   **Purpose:** To reward and distribute tokens to early adopters, active community members, and participants in our ecosystem.

*   **Founder's Allocation:** `1.00%` (**10,000,000 LNX**)
    *   **Destination:** The founder's wallet.
    *   **Purpose:** To compensate the founder for their initial vision, development work, and ongoing contributions to the project.

*   **Initial Liquidity:** `0.75%` (**7,500,000 LNX**)
    *   **Destination:** The founder's wallet.
    *   **Purpose:** This allocation is specifically for creating the first liquidity pool on a decentralized exchange (e.g., Uniswap). The founder is responsible for pairing these LNX tokens with an equivalent value of another asset (like USDC) to enable trading.

## Fee Structure Summary

The Luminary Nexus governance system is designed to minimize costs for participation, encouraging broad community involvement.

*   **Protocol Fees:** **There are no protocol-level fees.** The DAO does not take a cut from proposals or votes.
*   **Network Fees (Gas):** The only fees you will pay are the standard transaction fees (gas) required by the Polygon network itself.
    *   **Proposal Creation:** Requires a gas fee to submit the proposal on-chain.
    *   **Token Transfers:** Requires a gas fee, like any standard token transfer.
*   **Gas-less Operations:**
    *   **Voting:** Casting your vote is a **gas-less** operation. You simply sign a message with your wallet, which doesn't require a transaction and costs nothing.
    *   **Delegating Vote:** Delegating your voting power to another community member is also **gas-less**.

## The Luminary Nexus Token (LNX)

The LNX token is the native utility and governance token of the Luminary Nexus ecosystem. It is an ERC20 token on the Polygon network with extended functionalities for governance and security.

### Key Token Details

*   **Name:** Luminary Nexus Token
*   **Symbol:** LNX
*   **Decimals:** 18
*   **Total Supply:** 1,000,000,000 LNX (1 Billion)
*   **Contract Address (Amoy Testnet):** `0xeb00351221478b1A25117bcDa9F0E19BA507cAcC`

### Core Features

*   **Governance:** LNX token holders can participate in the governance of the DAO, including proposing and voting on initiatives. The token implements the `ERC20Votes` standard, which allows for gas-less delegation of voting power.
*   **Security:** The token contract includes several security features:
    *   **Pausable:** The contract can be paused by a designated `PAUSER_ROLE` in case of an emergency, halting all token transfers.
    *   **Access Control:** The contract uses a role-based access control system. Key roles include:
        *   `DEFAULT_ADMIN_ROLE`: Can grant and revoke roles.
        *   `PAUSER_ROLE`: Can pause and unpause the contract.
        *   `MINTER_ROLE`: Can mint new tokens (currently, no new minting is planned beyond the initial supply).
        *   `BURNER_ROLE`: Can burn tokens.
    *   **Reentrancy Guard:** Protects against reentrancy attacks on key functions.

### Initial Token Distribution

The initial 1 billion LNX tokens are distributed in a one-time event managed by the `LuminaryNexusDistribution` contract. The distribution is as follows:

*   **94.25% (942,500,000 LNX):** DAO Treasury. These funds are controlled by the DAO and will be used to fund community initiatives, development, and other projects approved by LNX holders.
*   **4.00% (40,000,000 LNX):** Community Airdrop. Reserved for airdrops to early supporters and community members.
*   **1.00% (10,000,000 LNX):** Founder's Allocation. A direct allocation to the founder for their initial contribution and ongoing work.
*   **0.75% (7,500,000 LNX):** Initial Liquidity. Allocated to the founder to provide the initial LNX/USDC liquidity pool on a decentralized exchange.

## DAO Governance

The Luminary Nexus DAO is governed by the `LuminaryNexusGovernorV2` contract, which works in conjunction with the `LuminaryNexusTimelock` contract. This system ensures that all proposals are subject to community review and a time-delay before execution.

### Governance Architecture

1.  **`LuminaryNexusGovernorV2`:** The core governance module where proposals are created, voted on, and queued for execution.
2.  **`LuminaryNexusTimelock`:** A timelock contract that adds a mandatory delay between a proposal's successful vote and its execution. This provides a crucial window for the community to react and, if necessary, exit their positions if they disagree with a proposal.
    *   **Minimum Delay:** 2 days.

### The Proposal Lifecycle

1.  **Proposal Creation:** Any address can create a proposal. There is no minimum LNX holding requirement to create a proposal. A proposal consists of a set of actions (e.g., transferring funds from the treasury, changing a contract parameter) to be executed.
2.  **Voting Delay:** Once a proposal is created, there is a **1-day voting delay** before voting begins.
3.  **Voting Period:** The community has a **1-week voting period** to cast their votes.
4.  **Voting Outcome:** If the proposal meets the quorum and has more "For" votes than "Against" votes, it is considered successful.
5.  **Queuing:** A successful proposal is queued in the `LuminaryNexusTimelock`.
6.  **Execution:** After the **2-day timelock period**, the proposal can be executed by anyone.

### Quadratic Voting & Reputation

To promote a more democratic and meritocratic governance system, Luminary Nexus employs a unique voting mechanism that combines **quadratic voting** with a **reputation system**. Your voting power is not just based on how many tokens you hold, but also on your reputation within the community.

The formula for calculating your voting power is:

`Voting Power = sqrt(Token Amount) * (1 + Reputation Score / 100)`

*   **Quadratic Voting (`sqrt(Token Amount)`):** This part of the formula drastically diminishes the power of large token holders. For example:
    *   100 LNX = 10 votes
    *   10,000 LNX = 100 votes
    *   1,000,000 LNX = 1,000 votes
    This makes it much harder for a single "whale" to control the outcome of a vote.
*   **Reputation (`1 + Reputation Score / 100`):** Your reputation score, managed by the `Reputation.sol` contract, acts as a multiplier on your voting power. The reputation score ranges from 0 to 100.
    *   A reputation score of 0 gives you no boost.
    *   A reputation score of 100 doubles your quadratic voting power.

The `Reputation.sol` contract is owned by the DAO, meaning that the criteria for earning reputation will be determined by the community through governance proposals.

### Dynamic Quorum

The quorum (the minimum number of votes required for a proposal to be valid) is a dynamic. It adjusts based on the participation in the previous proposal.

*   **Initial Quorum:** 4% of the theoretical maximum quadratic voting power.
*   **Dynamic Adjustment:** The quorum for the next proposal is influenced by the total votes cast in the last one.
*   **Quorum Bounds:** The quorum will always be between a minimum of **2%** and a maximum of **15%** of the theoretical maximum voting power.

This dynamic quorum ensures that the threshold for passing proposals remains relevant to the current level of community engagement.

## Fee Structure

The Luminary Nexus protocol is designed to be as low-cost as possible for participation.

*   **Proposal Creation:** There are no protocol fees for creating a proposal. You only need to pay the standard Polygon network gas fees.
*   **Voting:** Voting is **gas-less**. You can sign a message to cast your vote without paying any gas fees. This is made possible by the `ERC20Votes` standard.
*   **Delegation:** Delegating your voting power to another user is also a gas-less operation.
*   **Token Transfers:** Standard ERC20 token transfers on the Polygon network will incur gas fees.

## Conclusion

The Luminary Nexus token and governance system have been carefully designed to foster a decentralized, resilient, and engaged community. By combining innovative concepts like quadratic voting and reputation with robust security practices, we aim to create a blueprint for a new generation of DAOs. We invite all community members to participate in governance and help shape the future of Luminary Nexus.
