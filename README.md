# Oasys Validator Monitor

A high-performance Google Apps Script-based monitoring tool for Oasys blockchain validators with comprehensive Slack notifications and Explorer API integration.

## Features

- 🔍 **Real-time Validator Monitoring**: Tracks validator status, activity, and block production using both StakeManager contract and Explorer API
- 📊 **Accurate Block Production Tracking**: Uses Oasys Explorer API for precise 24-hour block production monitoring
- 🚨 **Smart Multi-level Alerting**: HEALTHY, WARNING, CRITICAL, and ERROR status notifications
- 📱 **Rich Slack Integration**: Detailed notifications with validator performance metrics
- ⏰ **Automated Scheduling**: Configurable monitoring intervals (default: 15 minutes)
- 📈 **Daily Performance Summaries**: Comprehensive reports with network health metrics
- ⚡ **Optimized Performance**: Fast execution using Explorer API instead of heavy RPC calls

## Quick Start

### 1. Prerequisites

- Node.js (v14 or higher)
- Google account with Google Apps Script access
- Slack workspace with webhook integration

### 2. Local Development Setup

```bash
# Clone the project
git clone https://github.com/yusuke-j0728/validator-monitoring-oasys.git
cd validator-monitoring-oasys

# Install dependencies
npm install

# Login to Google Apps Script
npm run login

# Create new GAS project
npm run create
```

### 3. Configuration

#### 3.1 Validator Configuration

Edit the validator Owner addresses in `src/main.js`:

```javascript
const CONFIG = {
  // IMPORTANT: Use Owner addresses, NOT Operator addresses
  VALIDATOR_ADDRESSES: [
    "0xA716d824eabF5667A31E724cfC849f051b84A862"  // Owner address
  ],
  
  // Monitoring thresholds
  MIN_BLOCKS_PER_24H: 24,          // Minimum blocks in 24 hours
  MAX_BLOCK_DELAY_MINUTES: 120,    // Max time between blocks (2 hours)
  CHECK_INTERVAL_MINUTES: 15,      // Monitoring frequency
  
  // Notification settings
  SEND_SUCCESS_NOTIFICATIONS: true, // Send notifications for healthy status
  SEND_DAILY_SUMMARY: true         // Send daily reports
};
```

#### 3.2 Address Type Configuration

**Critical**: This monitor requires **Owner addresses**, not Operator addresses:

- ✅ **Owner Address**: Used for StakeManager contract queries
- ❌ **Operator Address**: Used for block signing (retrieved automatically)

To find the correct Owner address:
```bash
# Use oaspos CLI to get validator info
oaspos validator:info-all --network mainnet

# Look for the "Owner" column, not "Operator"
```

#### 3.3 Slack Webhook Setup

1. Create a Slack webhook URL in your workspace
2. In Google Apps Script editor:
   - Go to Project Settings → Script Properties
   - Add property: `SLACK_WEBHOOK_URL` with your webhook URL

### 4. Deploy

```bash
# Push code to Google Apps Script
npm run push

# Open the GAS editor
npm run open
```

### 5. Initialize

In the GAS editor:
1. Run the `setup()` function once to create automatic triggers
2. Run `testMonitoring()` to verify functionality
3. Check execution logs for any issues

## Advanced Configuration

### Monitoring Thresholds

```javascript
const CONFIG = {
  // Validator addresses (Owner addresses only)
  VALIDATOR_ADDRESSES: [
    "0xA716d824eabF5667A31E724cfC849f051b84A862"
  ],
  
  // API endpoints
  RPC_ENDPOINT: "https://rpc.mainnet.oasys.games",
  EXPLORER_API_BASE: "https://explorer.oasys.games/api",
  
  // Performance thresholds
  MIN_BLOCKS_PER_24H: 24,          // Minimum blocks per day
  MAX_BLOCK_DELAY_MINUTES: 120,    // 2 hours max delay (realistic for validator rotation)
  
  // Monitoring frequency
  CHECK_INTERVAL_MINUTES: 15,      // Check every 15 minutes
  
  // Notification preferences
  SEND_SUCCESS_NOTIFICATIONS: true, // Notify on healthy status
  SEND_DAILY_SUMMARY: true         // Daily performance report
};
```

### Threshold Recommendations

Based on Oasys network characteristics:

- **MIN_BLOCKS_PER_24H**: `24` (minimum 1 block per hour average)
- **MAX_BLOCK_DELAY_MINUTES**: `120` (2 hours - accounts for validator rotation)
- **CHECK_INTERVAL_MINUTES**: `15` (good balance between monitoring and resource usage)

## Monitoring Logic & Architecture

### Data Collection Strategy

The monitor uses a hybrid approach combining contract calls and Explorer API for optimal performance and accuracy:

#### 1. **StakeManager Contract Validation**
- **Purpose**: Authoritative source for validator registration and status
- **Contract Address**: `0x0000000000000000000000000000000000001001`
- **Method**: `validators(address)` function call via RPC
- **Data Retrieved**:
  - `stake`: Validator's staked amount (in Wei)
  - `owner`: Owner address (for staking/unstaking)
  - `operator`: Operator address (for block signing)
  - `jailed`: Penalty status

#### 2. **Explorer API Block Production Analysis**
- **Purpose**: Fast and accurate block production monitoring
- **Endpoint**: `https://explorer.oasys.games/api/v2/addresses/{operator}/blocks-validated`
- **Advantages**:
  - ⚡ **Fast**: Single API call vs. hundreds of RPC calls
  - 🎯 **Accurate**: Precise 24-hour timestamp-based filtering
  - 📊 **Rich Data**: Block timestamps, numbers, and transaction details
  - 🔄 **Real-time**: Up-to-date with latest blocks

#### 3. **Fallback RPC Monitoring**
- **Purpose**: Backup when Explorer API is unavailable
- **Method**: Sample recent blocks (10-50 blocks) for quick verification
- **Performance**: Optimized sampling instead of full block scanning

### Status Determination Logic

#### 🟢 **HEALTHY** - Optimal Performance
**All conditions must be met:**
- ✅ `isActive = true` (from StakeManager)
- ✅ `isJailed = false` (not penalized)
- ✅ `blocksValidated24h >= MIN_BLOCKS_PER_24H`
- ✅ `timeSinceLastBlock <= MAX_BLOCK_DELAY_MINUTES`

#### ⚠️ **WARNING** - Performance Issues
**Validator is active but has performance problems:**
- ✅ `isActive = true` AND `isJailed = false`
- ❌ **BUT** one or more issues:
  - Low block production: `blocksValidated24h < MIN_BLOCKS_PER_24H`
  - Delayed blocks: `timeSinceLastBlock > MAX_BLOCK_DELAY_MINUTES`
  - No recent blocks found in monitoring period

#### 🚨 **CRITICAL** - Validator Offline/Penalized
**Immediate attention required:**
- ❌ `isActive = false` (validator deactivated)
- ❌ **OR** `isJailed = true` (validator penalized)

#### 🔥 **ERROR** - System/Network Issues
**Monitoring system problems:**
- ❌ RPC connection failures
- ❌ Explorer API unavailable
- ❌ Invalid validator address
- ❌ Network connectivity issues

### Performance Optimizations

#### 1. **Explorer API First Strategy**
```javascript
// Fast path: Use Explorer API for block production
const blockData = await checkRecentBlockProduction(operatorAddress);
// Returns: { count: 47, newestBlockTime: Date, newestBlockNumber: 8100192 }
```

#### 2. **Data Reuse**
```javascript
// Avoid duplicate API calls
if (validatorInfo.recentBlocks !== undefined) {
  status.blocksValidated24h = validatorInfo.recentBlocks; // Reuse data
} else {
  status.blocksValidated24h = getBlocksValidated(validatorAddress, 24); // Fallback
}
```

#### 3. **Efficient Block Time Analysis**
```javascript
// Precise 24-hour filtering using timestamps
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
const recentBlocks = blocks.filter(block => 
  new Date(block.timestamp) >= yesterday
).length;
```

## Slack Notification System

### Notification Types & Triggers

#### 1. **Success Notifications** (if `SEND_SUCCESS_NOTIFICATIONS: true`)
```
✅ All Clear - 1 validator(s) operating normally

• 0xA716d824...1b84A862: 47 blocks/24h
```
**Triggered when**: All validators are HEALTHY

#### 2. **Warning Alerts**
```
⚠️ WARNING - 1 validator(s) need attention

**0xA716d824...1b84A862**
• Blocks (24h): 18
• Issues: Low block production: 18 blocks in 24h (min: 24)
```
**Triggered when**: Any validator has WARNING status

#### 3. **Critical Alerts**
```
🚨 CRITICAL ALERT - 1 validator(s) have critical issues!

**0xA716d824...1b84A862**
• Status: 🔴 Inactive 🔒 Jailed
• Blocks (24h): 0
• Issues: Validator is not active, Validator is jailed

⚡ Immediate action required!
```
**Triggered when**: Any validator has CRITICAL status

#### 4. **Error Alerts**
```
🔥 MONITOR ERROR - Unable to check 1 validator(s)

**0xA716d824...1b84A862**
• Error: Error fetching data: Network request failed

🔧 Please check the monitoring system
```
**Triggered when**: System cannot monitor validators

#### 5. **Daily Summary Report**
```
📊 Daily Validator Summary - 2025/06/15

📈 Status Overview
• ✅ Healthy: 1
• ⚠️ Warning: 0
• 🚨 Critical: 0
• 🔥 Error: 0

📋 Validator Details
✅ **0xA716d824...1b84A862**
   • Blocks (24h): 47
   • Last block: 66 minutes ago

⚡ Performance Metrics
• Total blocks (24h): 47
• Average per validator: 47
• Network health: 🟢 Good

Generated at 18:37:42 JST
```
**Triggered**: Daily at 9:00 AM JST (if `SEND_DAILY_SUMMARY: true`)

## Development & Maintenance

### Development Commands

```bash
# Development workflow
npm run push          # Deploy local changes to GAS
npm run pull          # Sync GAS changes to local
npm run logs          # View execution logs
npm run open          # Open GAS editor
npm run deploy        # Deploy as web app

# Testing
# In GAS editor, run these functions:
testMonitoring()                           # Test full monitoring cycle
checkValidatorStatus("0x...")              # Test specific validator
setup()                                    # Initialize triggers (run once)
```

### File Structure

```
oasys-validator-monitor/
├── src/
│   ├── main.js           # Configuration and main execution logic
│   ├── validator.js      # Validator monitoring and StakeManager integration
│   └── notifications.js  # Slack notification formatting and sending
├── appsscript.json      # Google Apps Script project configuration
├── package.json         # Node.js dependencies and scripts
├── .clasp.json          # Google Apps Script CLI configuration (auto-generated)
└── README.md           # This documentation
```

### Key Functions

#### `main.js`
- `monitorValidators()`: Main monitoring loop (triggered every 15 minutes)
- `setup()`: Initialize triggers and configuration
- `testMonitoring()`: Manual testing function

#### `validator.js`
- `checkValidatorStatus()`: Complete validator health check
- `getValidatorInfo()`: StakeManager contract integration
- `checkRecentBlockProduction()`: Explorer API block analysis
- `analyzeValidatorStatus()`: Status determination logic

#### `notifications.js`
- `processMonitoringResults()`: Notification decision logic
- `sendSlackNotification()`: Slack webhook integration
- `formatXXXAlert()`: Message formatting functions

## Troubleshooting

### Common Issues & Solutions

#### 1. **"No recent blocks found" Warning**
**Cause**: `MAX_BLOCK_DELAY_MINUTES` threshold too strict
**Solution**: Increase the threshold in `main.js`:
```javascript
MAX_BLOCK_DELAY_MINUTES: 120,  // 2 hours instead of 30 minutes
```

#### 2. **Validator Shows as Inactive Despite Being Active**
**Cause**: Using Operator address instead of Owner address
**Solution**: Get the correct Owner address:
```bash
oaspos validator:info-all --network mainnet
# Use the "Owner" column address, not "Operator"
```

#### 3. **No Slack Notifications**
**Possible causes and solutions**:
- **Missing webhook**: Add `SLACK_WEBHOOK_URL` in Script Properties
- **Notifications disabled**: Set `SEND_SUCCESS_NOTIFICATIONS: true` for healthy status
- **Webhook invalid**: Test webhook URL manually

#### 4. **"Execution reverted" Errors**
**Cause**: Incorrect contract function selector or address
**Solution**: Check recent GAS logs - the system will try multiple fallback methods

#### 5. **Poor Performance/Timeouts**
**Cause**: RPC overload (should not happen with current implementation)
**Solution**: The system now uses Explorer API by default, which is much faster

### Debugging Steps

#### 1. **Check Execution Logs**
```bash
npm run logs
# Or in GAS editor: View → Logs
```

#### 2. **Test Individual Components**
In GAS editor, test each function:
```javascript
// Test validator status check
checkValidatorStatus("0xA716d824eabF5667A31E724cfC849f051b84A862");

// Test block production check
checkRecentBlockProduction("0x325671ee92c9a75b2196adf81954c6bb5dc1806e");

// Test notification sending
sendSlackNotification("Test message", "good");
```

#### 3. **Verify Configuration**
```javascript
// Check current configuration
console.log(CONFIG);

// Verify webhook URL
const webhookUrl = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_URL');
console.log('Webhook configured:', !!webhookUrl);
```

#### 4. **Monitor Trigger Execution**
- Go to GAS editor → Triggers tab
- Check execution history and error logs
- Verify trigger frequency matches `CHECK_INTERVAL_MINUTES`

### Performance Monitoring

#### Expected Execution Times
- **Full monitoring cycle**: 2-5 seconds (with Explorer API)
- **Single validator check**: 1-2 seconds
- **Block production analysis**: <1 second (Explorer API)

#### Resource Usage
- **API calls per check**: 2-3 calls (StakeManager + Explorer API)
- **Memory usage**: Minimal (JSON processing only)
- **Execution quota**: Well within GAS limits

## API Integration Details

### Primary APIs Used

#### 1. **Oasys RPC Endpoint**
- **URL**: `https://rpc.mainnet.oasys.games`
- **Purpose**: StakeManager contract interaction
- **Methods**: `eth_call` for contract state queries

#### 2. **Oasys Explorer API**
- **URL**: `https://explorer.oasys.games/api`
- **Purpose**: Block production monitoring
- **Endpoint**: `/v2/addresses/{address}/blocks-validated`
- **Rate limits**: None specified (reasonable usage recommended)

#### 3. **Slack Webhook API**
- **Purpose**: Notification delivery
- **Format**: JSON payload with rich formatting
- **Authentication**: Webhook URL contains authentication token

### Contract Addresses

- **StakeManager**: `0x0000000000000000000000000000000000001001`
- **Validator Registry**: `0x0000000000000000000000000000000000001000`

## Security Considerations

### Best Practices Implemented

1. **Secure Configuration**: Webhook URLs stored in Script Properties (encrypted)
2. **Error Handling**: Comprehensive try-catch blocks prevent crashes
3. **Rate Limiting**: Minimal API calls to prevent service overload
4. **Input Validation**: Address format verification
5. **Logging**: Detailed logs for debugging without exposing sensitive data

### Recommended Security Measures

1. **Restrict GAS Project Access**: Share only with necessary team members
2. **Webhook Security**: Use unique webhook URLs, rotate if compromised
3. **Monitor Execution**: Regularly check trigger execution logs
4. **Backup Configuration**: Document all Script Properties

## License

MIT License - feel free to fork, modify, and distribute.

## Support & Contributing

- **Issues**: Report bugs and feature requests on GitHub
- **Contributions**: Pull requests welcome
- **Documentation**: Help improve this README

For technical support, include:
1. GAS execution logs
2. Configuration (without sensitive data)
3. Expected vs actual behavior
4. Error messages

---

**Built for the Oasys ecosystem** 🎮⛓️