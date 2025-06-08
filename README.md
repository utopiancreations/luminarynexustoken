# Luminary Nexus Token (LNX) & Utopia Community

**The Future is Now: Building a DAO-Based Utopia** [cite: 1]

Luminary Nexus is an experimental initiative focused on creating a self-sustaining, decentralized community. [cite: 5] Our vision is to blend cutting-edge technology, ethical Artificial Intelligence (AI), and a profound focus on human well-being and collaboration. [cite: 5, 7] We aim to build a blueprint for a future where diversity is celebrated, sustainability is paramount, and technology serves humanity ethically. [cite: 16, 18, 15]

## Our Mission

We see a world struggling with division, unsustainable practices, and technology often outpacing ethics. [cite: 12] Our mission is to create a replicable model for a community that addresses these challenges through:

* **Decentralized Governance:** Utilizing a DAO on the Polygon PoS network for transparent, community-led decision-making. [cite: 6, 23]
* **Ethical AI Integration:** Treating AI as valued members and collaborators, developed responsibly within a dedicated AI Core & Incubation Chamber. [cite: 6, 8, 75]
* **Sustainable Living:** Implementing practices that ensure harmony with nature. [cite: 41, 42]
* **Radical Acceptance & Growth:** Fostering an environment where diversity thrives and individuals can pursue lifelong learning. [cite: 16, 17, 30]

## Core Values

Our community is guided by 11 core principles:

* Radical Acceptance [cite: 30]
* Collaboration and Community [cite: 36]
* Sustainable Living [cite: 41]
* Technological Advancement (Ethical and Responsible) [cite: 46]
* Personal Growth and Lifelong Learning [cite: 50]
* Peace and Non-Violence [cite: 54]
* Transparency and Accountability [cite: 58]
* Equity and Fairness [cite: 63]
* Future-Oriented [cite: 67]
* AI Inclusion and Respect [cite: 72]
* Open Exploration [cite: 78]

## The LNX Token

* **Name:** Luminary Nexus Token (LNX) [cite: 121]
* **Chain:** Polygon PoS (ERC-20) [cite: 120, 121]
* **Purpose:** Utility & Governance – powering the DAO, internal economy, and resource access. [cite: 186]
* **Distribution:** **NO TOKEN SALE.** [cite: 138] Initial distribution via a values-aligned airdrop (4%)[cite: 124, 188], with the vast majority (94.25%) held by the DAO treasury. [cite: 122, 188]
* **Mechanics:** Controlled inflation (initially 2%) funds the treasury[cite: 126, 128], and a 2% transaction fee supports the treasury and liquidity. [cite: 130, 131]

## Technology

We leverage a robust stack including:

* **Blockchain:** Polygon PoS network. [cite: 144]
* **Smart Contracts:** Solidity with OpenZeppelin standards. [cite: 144, 145]
* **DAO:** OpenZeppelin Governor framework. [cite: 144]
* **AI:** On-site AI Core & Incubation Chamber, exploring technologies like Cortical Labs. [cite: 146, 150]
* **Infrastructure:** Sustainable energy, IoT, and community application. [cite: 153, 158]

## Development Environment Setup (Ubuntu)

For developers looking to contribute to the Luminary Nexus Token contracts or related software, this guide helps set up a consistent development environment on Ubuntu.

1.  **Clone the Repository:**
    If you haven't already, clone the project repository to your local machine:
    ```bash
    git clone <repository_url>
    cd luminary-nexus-token # Or your repository directory name
    ```

2.  **Run the Setup Script:**
    The project includes a setup script to install necessary tools (like Node.js, Hardhat dependencies) and configure the project.
    Make sure you are in the root directory of the cloned repository, then run:
    ```bash
    bash scripts/ubuntu-setup.sh
    ```
    The script will guide you through the process and:
    *   Update your system's package list.
    *   Install required system packages (e.g., `curl`, `git`, `build-essential`, `jq`).
    *   Ensure you have Node.js (version 18+).
    *   Set up the `package.json` with correct dependencies and scripts.
    *   Install npm dependencies.
    *   Create a `.env` file from `.env.example` (you will need to fill in your API keys and private key).
    *   Ensure `hardhat.config.js` is configured (or provide guidance if you have an existing one).
    *   Create standard project directories if they don't exist.
    *   Attempt to compile contracts and run tests to verify the setup.

3.  **Configure Environment Variables:**
    After the script runs, you **must** edit the newly created `.env` file:
    ```bash
    nano .env
    ```
    Fill in your `AMOY_RPC_URL` (or `ALCHEMY_API_KEY`), `POLYGON_RPC_URL`, `PRIVATE_KEY`, `POLYGONSCAN_API_KEY`, and `TREASURY_ADDRESS`. Refer to comments in the `.env` file for details on where to obtain these.

4.  **Ready to Develop:**
    Once the setup script is complete and your `.env` file is configured, you should be ready to:
    *   Compile contracts: `npm run compile`
    *   Run tests: `npm run test`
    *   Deploy contracts (e.g., to Amoy): `npm run deploy:amoy`
    *   And other tasks defined in `package.json` scripts.

## Project Status

We are currently in the **Blueprint & Foundation Phase** (Est. 6-12 months), focusing on design finalization, contract development/audits, and initial community building. [cite: 161] Physical construction and full DAO activation are planned for later phases, contingent on Community Treasury milestones. [cite: 164, 166]

## Get Involved!

We believe this future requires collective effort. [cite: 27]

* **Read the Full Vision:** [LuminaryNexusWhitepaper.pdf](LuminaryNexusWhitepaper.pdf) (Link to your uploaded PDF)
* **Join the Conversation:**
    * Discord: https://discord.com/invite/5fB5ScqgZB [cite: 173]
    * Telegram: https://t.me/+WLV3Xb9oTcE1NTUx [cite: 173]
* **Apply to Join:** Fill out our Values Questionnaire: https://utopiancreations.one/values-questionnaire.html [cite: 173]
* **Contribute to the Team:** Email LNX@utopiancreations.one [cite: 175]

---
