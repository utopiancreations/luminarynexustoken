# 🧪 Luminary Nexus Community Testing Guide
*Version 1.0 - August 6, 2025*

Welcome to the Luminary Nexus Token community testing program! This guide will walk you through setting up your environment and participating in our comprehensive testing scenarios to validate our advanced governance system.

---

## 🎯 **Testing Overview**

We're testing a **production-ready governance system** with:
- ✅ **Quadratic Voting**: More democratic participation
- ✅ **Reputation System**: Merit-based voting power enhancement  
- ✅ **2-Day Timelock**: Security delays for proposal execution
- ✅ **100% Test Coverage**: Thoroughly validated smart contracts
- ✅ **OpenZeppelin v5**: Latest security standards

---

## 🚀 **Phase 1: Environment Setup**

### **Step 1: Add Amoy Testnet to MetaMask**

1. **Open MetaMask** and click the network dropdown
2. **Click "Add Network"** 
3. **Enter these details:**
   ```
   Network Name: Polygon Amoy Testnet
   New RPC URL: https://rpc-amoy.polygon.technology
   Chain ID: 80002
   Currency Symbol: MATIC
   Block Explorer URL: https://amoy.polygonscan.com
   ```
4. **Click "Save"** and switch to Amoy network

### **Step 2: Get Test MATIC Tokens**

You'll need MATIC for transaction fees. Use these faucets:

1. **Primary Faucet**: https://faucet.polygon.technology
   - Connect your wallet
   - Select "Polygon Amoy" 
   - Request 0.1 MATIC (sufficient for testing)

2. **Backup Faucet**: https://faucet.quicknode.com/polygon/amoy
   - Alternative if primary is busy

3. **Community Faucet**: https://www.alchemy.com/faucets/polygon-amoy
   - Additional option for test tokens

**⏳ Wait Time**: Faucets typically take 1-5 minutes to deliver tokens.

---

## 📋 **Contract Addresses**

Once deployed, our contracts will be available at these addresses:

### **🏛️ Core DAO Contracts**
```
LuminaryNexusToken (LNX):     [TO_BE_UPDATED]
LuminaryNexusDistribution:    [TO_BE_UPDATED] 
LuminaryNexusTimelock:        [TO_BE_UPDATED]
LuminaryNexusGovernorV2:      [TO_BE_UPDATED]
Reputation System:            [TO_BE_UPDATED]
```

### **🔗 Official DAO Wallets**
```
Admin Account:                0x77bc51eb24056dcf949c36c09025fdfbaf69e53b
Treasury Account:             0xf4f245afa81bcc72c986346ce8d949ea1eb4f0ae
Airdrop & Liquidity Account:  0x860c1b6a8bedc2d3b766d5da7830fbab815c4911
Test Account 4:               0x9dc599dcb37af9b96d96b87c97ee89f98c890185
Test Account 5:               0x9dc599dcb37af9b96d96b87c97ee89f98c890185
```

### **📱 Add LNX Token to MetaMask**
1. **Copy the LNX Token address** from above
2. **In MetaMask**, click "Import tokens"
3. **Paste the address** - details should auto-populate:
   - **Token Symbol**: LNX
   - **Decimals**: 18

---

## 🎮 **Phase 2: Testing Scenarios**

### **Mission 1: Token Functionality Testing** ⭐
**Objective**: Validate basic ERC20 functionality

**Steps:**
1. **Check your LNX balance** in MetaMask
2. **Send 100 LNX** to another test address
3. **Verify transaction** on Amoy PolygonScan
4. **Report** any issues with transfers

**Expected Results:**
- ✅ Transfer completes successfully
- ✅ Balances update correctly
- ✅ Transaction shows on block explorer

---

### **Mission 2: Voting Power Setup** ⭐⭐
**Objective**: Prepare your tokens for governance participation

**Steps:**
1. **Connect to Governance dApp** (link will be provided)
2. **Delegate your voting power** to yourself
   - Click "Delegate Votes"
   - Confirm transaction
3. **Check your voting power** display
4. **Test delegation to another address** (optional)

**Expected Results:**
- ✅ Delegation transaction succeeds
- ✅ Voting power equals √(token_balance) 
- ✅ Quadratic calculation displays correctly

**🧮 Quadratic Voting Math:**
- 10,000 LNX = ~100 voting power
- 40,000 LNX = ~200 voting power  
- 90,000 LNX = ~300 voting power

---

### **Mission 3: Proposal Creation** ⭐⭐⭐
**Objective**: Create and submit a governance proposal

**Steps:**
1. **Navigate to "Create Proposal"** section
2. **Fill out proposal details:**
   ```
   Title: "Test Proposal - [Your Name]"
   Description: "Testing proposal creation functionality"
   Actions: Simple parameter change (will be specified)
   ```
3. **Submit proposal** and note the Proposal ID
4. **Verify proposal appears** in proposal list

**Expected Results:**
- ✅ Proposal submission succeeds
- ✅ Proposal ID is generated
- ✅ Proposal appears in governance interface
- ✅ Proposal state is "Pending"

---

### **Mission 4: Voting Participation** ⭐⭐⭐
**Objective**: Vote on active proposals

**Steps:**
1. **Wait for voting delay** (proposals need time before voting opens)
2. **Find an active proposal** (status: "Active")
3. **Cast your vote:**
   - Vote "For" ✅
   - Vote "Against" ❌  
   - Vote "Abstain" ⭐
4. **Verify your vote** was recorded
5. **Check updated vote tallies**

**Expected Results:**
- ✅ Vote transaction succeeds
- ✅ Vote is recorded correctly
- ✅ Voting power applies correctly (quadratic)
- ✅ Vote tallies update immediately

---

### **Mission 5: Reputation System Testing** ⭐⭐⭐⭐
**Objective**: Test merit-based voting power enhancement

**Steps:**
1. **Check your current reputation score**
2. **Perform reputation-earning actions:**
   - Vote on multiple proposals
   - Create thoughtful proposals
   - Engage in community discussions
3. **Monitor reputation changes**
4. **Observe voting power enhancement:**
   - Base Power: √(tokens)
   - Enhanced Power: √(tokens) × (100 + reputation) / 100

**Expected Results:**
- ✅ Reputation score updates correctly
- ✅ Voting power increases with reputation
- ✅ Enhancement calculation is accurate

**🏆 Reputation Bonus Examples:**
- 25 reputation = 125% voting power
- 50 reputation = 150% voting power
- 100 reputation = 200% voting power

---

### **Mission 6: Proposal Lifecycle** ⭐⭐⭐⭐⭐
**Objective**: Follow a complete proposal from creation to execution

**Steps:**
1. **Track proposal states:**
   - Pending → Active → Succeeded → Queued → Executed
2. **Participate in each phase:**
   - Create or vote during "Active" phase
   - Monitor "Succeeded" proposals
   - Wait for "Queued" period (2 days)
   - Observe "Executed" proposals
3. **Verify timelock security:**
   - Proposals cannot execute immediately
   - 2-day delay is enforced
   - Only approved proposals can be queued

**Expected Results:**
- ✅ All state transitions work correctly
- ✅ Timelock delay is enforced (2 days)
- ✅ Only successful proposals can be queued
- ✅ Execution happens after timelock delay

---

### **Mission 7: Edge Case Testing** ⭐⭐⭐⭐⭐
**Objective**: Test system behavior under unusual conditions

**Steps:**
1. **Zero Balance Testing:**
   - Send all your LNX away
   - Try to vote (should fail gracefully)
   - Try to create proposal (should fail gracefully)

2. **Minimum Threshold Testing:**
   - Test with very small token amounts
   - Test fractional voting power calculations

3. **Maximum Load Testing:**
   - Vote on multiple proposals quickly
   - Create proposals with complex actions
   - Test gas limit boundaries

4. **Network Interruption Testing:**
   - Start a transaction
   - Switch networks mid-transaction
   - Test transaction recovery

**Expected Results:**
- ✅ System handles edge cases gracefully
- ✅ Clear error messages for invalid actions
- ✅ No system crashes or unexpected behavior
- ✅ Network interruptions handled properly

---

## 📊 **Phase 3: Reporting & Feedback**

### **🐛 Bug Reporting Template**

When you find an issue, please report it with this format:

```markdown
## Bug Report

**Environment:**
- Network: Polygon Amoy
- Browser: [Chrome/Firefox/Safari]
- MetaMask Version: [version]
- LNX Balance: [your balance]

**Issue Description:**
[Clear description of what went wrong]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior:**
[What should have happened]

**Actual Behavior:**
[What actually happened]

**Screenshots/Videos:**
[If applicable, attach media]

**Transaction Hash:**
[If applicable, paste the failed transaction hash]
```

### **📝 Success Reporting Template**

For successful tests, please report:

```markdown
## Success Report

**Mission Completed:** [Mission number and name]
**Wallet Address:** [Your test wallet address]
**Completion Time:** [How long it took]
**Notes:** [Any observations or feedback]
**Suggestions:** [Ideas for improvement]
```

### **🏆 Testing Rewards**

**All successful testers will receive:**
- 🎖️ **Community Tester NFT** (limited edition)
- 🪙 **Bonus LNX tokens** for participation
- 👑 **Early reputation points** in the reputation system
- 📜 **Recognition** in project documentation

**Additional rewards for exceptional testing:**
- 🏅 **Top Bug Hunter Badge** (most valuable bugs found)
- 💎 **Quality Feedback Award** (most helpful suggestions)
- 🚀 **Early Adopter Status** (special privileges in mainnet launch)

---

## 🔧 **Troubleshooting**

### **Common Issues & Solutions**

**❌ "Insufficient MATIC for gas"**
- **Solution**: Request more test MATIC from faucets
- **Prevention**: Keep at least 0.01 MATIC for transactions

**❌ "Transaction failed" / "Revert"**  
- **Solution**: Check contract addresses are correct
- **Prevention**: Copy addresses carefully from this guide

**❌ "MetaMask connection issues"**
- **Solution**: Refresh page, reconnect wallet
- **Prevention**: Use latest MetaMask version

**❌ "Voting power shows as 0"**
- **Solution**: Delegate your tokens to yourself first
- **Prevention**: Always delegate before participating in governance

**❌ "Proposal not visible"**
- **Solution**: Wait for transaction confirmation, refresh page
- **Prevention**: Wait for full confirmation before refreshing

### **Advanced Troubleshooting**

**🔍 Transaction Debugging:**
1. **Copy transaction hash** from MetaMask
2. **Visit**: https://amoy.polygonscan.com
3. **Paste hash** in search box
4. **Check transaction status** and error messages

**📞 Community Support:**
- **Discord**: [Link to be provided]
- **Telegram**: [Link to be provided]
- **GitHub Issues**: [Repository link]

---

## 📅 **Testing Timeline**

### **Week 1: Basic Functionality** (Aug 6-12)
- ✅ Environment setup
- ✅ Token functionality
- ✅ Voting power delegation

### **Week 2: Governance Testing** (Aug 13-19)
- ✅ Proposal creation
- ✅ Voting participation
- ✅ Reputation system

### **Week 3: Advanced Scenarios** (Aug 20-26)
- ✅ Complete proposal lifecycle
- ✅ Edge case testing
- ✅ System stress testing

### **Week 4: Final Validation** (Aug 27-Sep 2)
- ✅ Bug fixes validation
- ✅ Performance optimization
- ✅ Mainnet preparation

---

## 🎯 **Success Criteria**

**For the testing program to be considered successful:**

### **Functional Requirements:**
- [ ] 100% of basic token operations work correctly
- [ ] 95%+ of governance proposals complete successfully  
- [ ] 100% of voting transactions execute properly
- [ ] Quadratic voting calculations are accurate within 1%
- [ ] Reputation system functions as designed
- [ ] Timelock security is properly enforced

### **Performance Requirements:**
- [ ] Average transaction confirmation < 30 seconds
- [ ] Gas costs remain under 500,000 gas per operation
- [ ] No memory leaks or UI freezing
- [ ] System handles 50+ concurrent users

### **Security Requirements:**
- [ ] No unauthorized actions possible
- [ ] All access controls function correctly
- [ ] Timelock cannot be bypassed
- [ ] No funds can be lost or stolen

### **User Experience Requirements:**
- [ ] Clear error messages for all failure cases
- [ ] Intuitive workflow for governance participation
- [ ] Mobile-friendly interface
- [ ] Accessibility compliance

---

## 🌟 **Community Guidelines**

### **🤝 Testing Etiquette**
- ✅ **Be respectful** in all communications
- ✅ **Test responsibly** - don't spam the network
- ✅ **Share findings** with the community
- ✅ **Help other testers** when you can
- ✅ **Follow testing timeline** and priorities

### **🚫 Testing Restrictions**
- ❌ **No malicious testing** - don't try to break security
- ❌ **No spamming** - limit proposal creation to reasonable amounts
- ❌ **No market manipulation** - this is testnet only
- ❌ **No sharing private keys** - keep your test wallets secure

### **🏆 Best Practices**
- 📝 **Document everything** - screenshots help us improve
- 🔄 **Test multiple scenarios** - try different approaches
- 💬 **Communicate clearly** - use the bug report template
- 🕐 **Be patient** - some operations take time (especially timelock)
- 🎯 **Focus on user experience** - report UX issues too

---

## 🚀 **Ready to Begin?**

**Pre-flight Checklist:**
- [ ] MetaMask installed and Amoy network added
- [ ] Test MATIC received from faucets  
- [ ] LNX token added to MetaMask
- [ ] This testing guide bookmarked
- [ ] Reporting templates saved
- [ ] Community channels joined

**🎮 Start with Mission 1** and work your way through the scenarios. Remember, this testing is crucial for validating our governance system before mainnet launch.

**Your participation helps ensure** that Luminary Nexus launches with a robust, secure, and user-friendly DAO governance system.

---

## 📞 **Support & Community**

**Need Help?**
- 💬 **Discord**: [Coming Soon]
- 📱 **Telegram**: [Coming Soon]  
- 🐙 **GitHub**: https://github.com/utopiancreations/luminarynexustoken
- 📧 **Email**: support@luminarynexus.io

**Stay Updated:**
- 🐦 **Twitter**: @LuminaryNexus
- 📰 **Blog**: [Coming Soon]
- 📊 **Dashboard**: [Coming Soon]

---

*Thank you for being part of the Luminary Nexus community and helping us build the future of decentralized governance! 🌟*

**Happy Testing! 🧪✨**
