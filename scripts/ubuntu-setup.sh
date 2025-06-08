#!/bin/bash

# Luminary Nexus Token - Ubuntu Setup Script
# Run this script from the root of the cloned repository to set up the development environment.

set -e  # Exit on any error

echo "🚀 Setting up Luminary Nexus Token development environment on Ubuntu..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}$1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

print_header "📋 System Requirements Check"

# Update package list
print_status "Updating package list..."
sudo apt update

# Check for required packages and install if missing
REQUIRED_PACKAGES="curl git build-essential jq" # Added jq
for package in $REQUIRED_PACKAGES; do
    if ! dpkg -l | grep -q "^ii  $package "; then
        print_status "Installing $package..."
        sudo apt install -y $package
    else
        print_status "$package is already installed ✓"
    fi
done

print_header "📦 Node.js Installation"

# Check if Node.js is installed and version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "Node.js version: $NODE_VERSION"

    NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | cut -d'v' -f2)
    if [ "$NODE_MAJOR_VERSION" -lt 18 ]; then
        print_warning "Node.js version is below 18. Installing latest LTS..."
        INSTALL_NODE=true
    else
        print_status "Node.js version is sufficient ✓"
        INSTALL_NODE=false
    fi
else
    print_warning "Node.js not found. Installing..."
    INSTALL_NODE=true
fi

if [ "$INSTALL_NODE" = true ]; then
    print_status "Installing Node.js LTS..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs

    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    print_status "Installed Node.js: $NODE_VERSION"
    print_status "Installed npm: $NPM_VERSION"
fi

print_header "🔧 Project File Setup (package.json)"

PACKAGE_JSON_CONTENT='{
  "name": "luminarynexustoken",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "test": "npx hardhat test",
    "compile": "npx hardhat compile",
    "deploy:amoy": "npx hardhat run scripts/deploy.js --network amoy",
    "deploy:polygon": "npx hardhat run scripts/deploy.js --network polygon",
    "verify:amoy": "npx hardhat run scripts/verify.js --network amoy",
    "verify:polygon": "npx hardhat run scripts/verify.js --network polygon"
  },
  "keywords": ["ethereum", "polygon", "defi", "dao", "token"],
  "author": "Luminary Nexus",
  "license": "MIT",
  "description": "Luminary Nexus Token (LNX) - ERC20 token with DAO governance",
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^5.0.0",
    "@nomicfoundation/hardhat-chai-matchers": "^2.0.0",
    "@nomicfoundation/hardhat-ethers": "^3.0.0",
    "@nomicfoundation/hardhat-verify": "^2.0.0",
    "@openzeppelin/contracts": "^5.3.0",
    "dotenv": "^16.5.0",
    "hardhat": "^2.23.0",
    "chai": "^4.3.7",
    "ethers": "^6.4.0"
  }
}'

if [ ! -f "package.json" ]; then
    print_status "package.json not found. Creating new one..."
    echo "$PACKAGE_JSON_CONTENT" > package.json
    print_status "package.json created successfully."
else
    print_status "package.json found. Attempting to update scripts and devDependencies..."
    # Update scripts
    jq '.scripts = (.scripts + {
        "test": "npx hardhat test",
        "compile": "npx hardhat compile",
        "deploy:amoy": "npx hardhat run scripts/deploy.js --network amoy",
        "deploy:polygon": "npx hardhat run scripts/deploy.js --network polygon",
        "verify:amoy": "npx hardhat run scripts/verify.js --network amoy",
        "verify:polygon": "npx hardhat run scripts/verify.js --network polygon"
    })' package.json > package.json.tmp && mv package.json.tmp package.json

    # Update devDependencies (add if not present, update if present - jq merge does this)
    # Note: This will overwrite existing versions if they differ. For more granular control, more complex jq would be needed.
    jq --argjson newDevDeps "$(echo "$PACKAGE_JSON_CONTENT" | jq .devDependencies)" '.devDependencies = (.devDependencies + $newDevDeps)' package.json > package.json.tmp && mv package.json.tmp package.json

    # Update other metadata
    jq '.name = "luminarynexustoken" |
        .version = "1.0.0" |
        .main = "index.js" |
        .keywords = ["ethereum", "polygon", "defi", "dao", "token"] |
        .author = "Luminary Nexus" |
        .license = "MIT" |
        .description = "Luminary Nexus Token (LNX) - ERC20 token with DAO governance"' package.json > package.json.tmp && mv package.json.tmp package.json

    print_status "package.json updated with latest scripts and devDependencies."
fi

print_status "Installing npm dependencies (this may take a few minutes)..."
npm install --loglevel error # Suppress verbose output but show errors

print_header "⚙️ Environment Configuration (.env)"

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        print_status "Creating .env file from .env.example..."
        cp .env.example .env
        print_warning "Please edit .env file with your actual values (API keys, private key, etc.)."
    else
        print_warning ".env.example not found. Cannot create .env. Please create .env manually."
    fi
else
    print_status ".env file already exists. Skipping creation."
    print_warning "Ensure your .env file is configured correctly with API keys and private key."
fi

print_header "Hardhat Configuration (hardhat.config.js)"

HARDHAT_CONFIG_CONTENT='
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

/** @type import('"'"'hardhat/config'"'"').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    tests: "./test" // Ensure your tests are in this directory or update path
  },
  networks: {
    hardhat: {
      // For local testing
    },
    amoy: {
      url: process.env.AMOY_RPC_URL || `https://polygon-amoy.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80002,
      gasPrice: 20000000000, // 20 gwei
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 137,
      gasPrice: 20000000000, // 20 gwei
    }
  },
  etherscan: {
    apiKey: {
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || "" // Corrected key for Amoy
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com"
        }
      }
    ]
  }
};'

if [ ! -f "hardhat.config.js" ]; then
    print_status "Creating Hardhat configuration (hardhat.config.js)..."
    echo "$HARDHAT_CONFIG_CONTENT" > hardhat.config.js
    print_status "hardhat.config.js created successfully."
    print_warning "The test path is set to './test'. If your tests are elsewhere (e.g. './test-js'), please update hardhat.config.js."
else
    print_status "hardhat.config.js already exists."
    print_warning "Please ensure your hardhat.config.js is up-to-date with the following recommendations:"
    echo "<RECOMMENDED_HARDHAT_CONFIG_SETTINGS>
    - Solidity version: 0.8.28 with optimizer enabled.
    - Test path: Consider './test' (currently your config might point to another directory like './test-js').
    - Amoy Network:
      url: process.env.AMOY_RPC_URL or 'https://polygon-amoy.g.alchemy.com/v2/\${process.env.ALCHEMY_API_KEY}'
      chainId: 80002
      gasPrice: 20000000000 (20 gwei)
    - Polygon Network:
      url: process.env.POLYGON_RPC_URL or 'https://polygon-rpc.com'
      chainId: 137
      gasPrice: 20000000000 (20 gwei)
    - Etherscan API Key for 'polygonAmoy': process.env.POLYGONSCAN_API_KEY
    - Etherscan customChain for 'polygonAmoy'.
    </RECOMMENDED_HARDHAT_CONFIG_SETTINGS>"
    print_warning "You can compare with the template that would be generated:"
    echo "$HARDHAT_CONFIG_CONTENT"
fi

print_header "📁 Directory Structure"
print_status "Creating standard project directories if they don't exist..."
mkdir -p contracts scripts test deployments docs

print_header "🧪 Compilation & Testing Setup"

print_status "Attempting to compile contracts..."
if npx hardhat compile; then
    print_status "Contract compilation successful ✓"
else
    print_warning "Contract compilation failed. Please check your contracts and configuration."
fi

if [ -d "test" ] && [ "$(ls -A test)" ]; then
    print_status "Running tests from './test' directory..."
    if npm test; then # Assumes 'npm test' uses 'npx hardhat test' which respects hardhat.config.js test path
        print_status "Tests passed ✓"
    else
        print_warning "Some tests failed or could not be run. Check implementation and test setup."
    fi
elif [ -d "test-js" ] && [ "$(ls -A test-js)" ]; then
    print_warning "Tests found in './test-js'. The default test path in the generated/recommended hardhat.config.js is './test'."
    print_warning "If you want to run these tests, ensure your hardhat.config.js 'paths.tests' points to './test-js'."
    print_warning "You can run them manually via 'npx hardhat test --config your_config_pointing_to_test_js.js' or update the main config."
else
    print_status "No tests found in './test' or './test-js' directory, or directories are empty. Skipping test run."
fi

print_header "🔍 System Verification"
print_status "Verifying installation..."
echo "Node.js: $(node --version || echo 'Not installed')"
echo "npm: $(npm --version || echo 'Not installed')"
echo "Hardhat: $(npx hardhat --version 2>/dev/null || echo 'Not installed')"
echo "Git: $(git --version || echo 'Not installed')"
echo "jq: $(jq --version 2>/dev/null || echo 'Not installed')"

if command -v code &> /dev/null; then
    print_status "VS Code detected ✓"
    print_status "Recommended VS Code extensions: Solidity (Juan Blanco), Hardhat Solidity (Nomic Foundation), Prettier."
else
    print_warning "VS Code not detected. Install with: sudo snap install code --classic"
fi

print_header "📚 Quick Start Commands"
cat << 'EOF'

🎉 Setup complete! Here are your next steps:

1. Configure your environment:
   nano .env
   # Add your Alchemy API key, private key, PolygonScan API key, and Treasury address.

2. Review Hardhat configuration (if you had an existing hardhat.config.js):
   nano hardhat.config.js
   # Ensure network settings, paths, and Etherscan config are correct.
   # The script defaults the test path to './test'.

3. Compile contracts:
   npm run compile

4. Run tests:
   npm run test
   # (Ensure hardhat.config.js points to your test directory, default is './test')

5. Deploy to Amoy testnet:
   npm run deploy:amoy

6. Deploy to Polygon mainnet:
   npm run deploy:polygon

7. Verify contracts on Amoy:
   npm run verify:amoy

8. Verify contracts on Polygon:
   npm run verify:polygon

📁 Project structure (ensure these are populated):
├── contracts/          # Solidity contracts
├── scripts/           # Deployment and utility scripts (like this setup script)
├── test/              # Test files (default path)
├── deployments/       # Deployment records (usually managed by hardhat-deploy or manually)
└── docs/              # Documentation

🔧 Useful commands:
- npm run compile      # Compile contracts
- npm test            # Run tests
- npx hardhat console # Interactive Hardhat console
- npx hardhat node    # Start a local Hardhat blockchain node

📖 Documentation:
- Hardhat: https://hardhat.org/
- OpenZeppelin: https://docs.openzeppelin.com/
- Polygon: https://docs.polygon.technology/

EOF

print_status "Environment setup script finished! 🎉"
print_warning "Don't forget to configure your .env file and review hardhat.config.js if you had an existing one!"

echo -e "\n${BLUE}To get started, ensure you are in the project root directory.${NC}"
