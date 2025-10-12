document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const connectButton = document.getElementById('connectWalletBtn');
    const walletInfo = document.getElementById('walletInfo');
    const userAddress = document.getElementById('userAddress');
    const networkStatus = document.getElementById('networkStatus');
    const dataDisplay = document.getElementById('dataDisplay');
    const lnxBalance = document.getElementById('lnxBalance');
    const votingPower = document.getElementById('votingPower');

    // --- Contract Configuration (Hardcoded for Phase 1) ---
    const AMOY_CHAIN_ID = '0x13882'; // 80002
    const LNX_TOKEN_ADDRESS = '0xeb00351221478b1A25117bcDa9F0E19BA507cAcC';
    const GOVERNOR_ADDRESS = '0xdC0baD1E4A86ef824Ea08F94839437545FE56dfD';

    const LNX_TOKEN_ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)"
    ];

    const GOVERNOR_ABI = [
        "function getVotes(address account, uint256 blockNumber) view returns (uint256)"
    ];

    let provider;
    let signer;
    let userSignerAddress;

    // --- Core Functions ---

    /**
     * Connects to the user's MetaMask wallet and validates the network.
     */
    async function connectWallet() {
        if (typeof window.ethereum === 'undefined') {
            alert('MetaMask is not installed. Please install it to use this dApp.');
            return;
        }

        try {
            provider = new ethers.BrowserProvider(window.ethereum);

            // Check network
            const { chainId } = await provider.getNetwork();
            if (chainId.toString() !== parseInt(AMOY_CHAIN_ID).toString()) {
                networkStatus.textContent = `Please switch to Polygon Amoy Testnet (Chain ID: 80002)`;
                networkStatus.classList.remove('text-green-400');
                networkStatus.classList.add('text-red-400');
                alert('Wrong Network: Please switch your MetaMask to the Polygon Amoy Testnet.');
                return;
            }

            // Request account access
            signer = await provider.getSigner();
            userSignerAddress = await signer.getAddress();

            // Update UI
            connectButton.classList.add('hidden');
            walletInfo.classList.remove('hidden');
            userAddress.textContent = `${userSignerAddress.substring(0, 6)}...${userSignerAddress.substring(userSignerAddress.length - 4)}`;
            networkStatus.textContent = 'Connected to Amoy Testnet';
            networkStatus.classList.add('text-green-400');
            networkStatus.classList.remove('text-red-400');

            // --- UNCOMMENT THIS LINE ---
            await fetchData();

        } catch (error) {
            console.error("Error connecting wallet:", error);
            alert(`Error connecting wallet: ${error.message}`);
        }
    }

    /**
     * Fetches on-chain data (LNX Balance, Voting Power) and updates the UI.
     */
    async function fetchData() {
        if (!provider || !userSignerAddress) {
            console.error("Provider or user address not available.");
            return;
        }

        try {
            // --- Instantiate Contracts ---
            const lnxTokenContract = new ethers.Contract(LNX_TOKEN_ADDRESS, LNX_TOKEN_ABI, provider);
            const governorContract = new ethers.Contract(GOVERNOR_ADDRESS, GOVERNOR_ABI, provider);

            // --- Fetch LNX Balance ---
            const rawBalance = await lnxTokenContract.balanceOf(userSignerAddress);
            const decimals = await lnxTokenContract.decimals();
            const formattedBalance = ethers.formatUnits(rawBalance, decimals);

            // --- Fetch Voting Power ---
            // We need the latest block number to get the most recent voting power
            const latestBlockNumber = await provider.getBlockNumber();
            const rawVotingPower = await governorContract.getVotes(userSignerAddress, latestBlockNumber);
            // Note: Your governor's getVotes returns a value that's not in wei, so we don't need to format it with decimals.
            // If it were a standard ERC20Votes balance, you would use formatUnits here as well.
            const formattedVotingPower = rawVotingPower.toString();


            // --- Update UI ---
            lnxBalance.textContent = `${parseFloat(formattedBalance).toLocaleString()} LNX`;
            votingPower.textContent = `${parseInt(formattedVotingPower).toLocaleString()} VP`;

            // Unhide the data display
            dataDisplay.classList.remove('hidden');

        } catch (error) {
            console.error("Error fetching data:", error);
            alert(`Could not fetch your on-chain data. See console for details.`);
        }
    }


    // --- Event Listeners ---
    connectButton.addEventListener('click', connectWallet);
});