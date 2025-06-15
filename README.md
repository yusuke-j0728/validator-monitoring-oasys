# Oasys Validator Monitor

A Google Apps Script-based monitoring tool for Oasys blockchain validators with Slack notifications.

## Features

- 🔍 **Real-time Validator Monitoring**: Tracks validator status, activity, and block production
- 📊 **Block Production Tracking**: Monitors blocks validated in the last 24 hours
- 🚨 **Smart Alerting**: Sends notifications for critical issues, warnings, and errors
- 📱 **Slack Integration**: Receives alerts directly in your Slack channel
- ⏰ **Automated Scheduling**: Runs checks every 15 minutes automatically
- 📈 **Daily Summaries**: Get comprehensive daily reports of validator performance

## Quick Start

### 1. Prerequisites

- Node.js (v14 or higher)
- Google account
- Slack webhook URL

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

1. **Edit validator addresses** in `src/main.js`:
```javascript
const CONFIG = {
  VALIDATOR_ADDRESSES: [
    "0x1234567890abcdef1234567890abcdef12345678",
    "0xabcdef1234567890abcdef1234567890abcdef12"
  ],
  // ... other config
};
```

2. **Set up Slack webhook**:
   - Go to your GAS project: `npm run open`
   - Navigate to Project Settings → Script Properties
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
1. Run the `setup()` function once to create triggers
2. Run `testMonitoring()` to verify everything works

## Configuration Options

### Monitoring Thresholds

```javascript
const CONFIG = {
  // Minimum blocks to validate in 24 hours
  MIN_BLOCKS_PER_24H: 24,
  
  // Maximum minutes between blocks before alerting
  MAX_BLOCK_DELAY_MINUTES: 30,
  
  // How often to run monitoring (minutes)
  CHECK_INTERVAL_MINUTES: 15,
  
  // Notification settings
  SEND_SUCCESS_NOTIFICATIONS: false,
  SEND_DAILY_SUMMARY: true
};
```

### Validator Addresses

Add your validator addresses to the `VALIDATOR_ADDRESSES` array in `src/main.js`.

## Monitoring Logic

### Data Collection

The monitor collects the following information for each validator:

#### 1. **Validator Status Information**
- **Source**: Oasys Validator Contract (`0x0000000000000000000000000000000000001000`)
- **Method**: RPC call `eth_call` with `getValidatorInfo(address)` function
- **Data Retrieved**:
  - `isActive`: Whether the validator is currently active
  - `isJailed`: Whether the validator is in jailed state (penalized)

#### 2. **Block Production History**
- **Source**: Oasys blockchain blocks via RPC calls
- **Method**: Sampling every 10th block over the last 24 hours for performance
- **Data Retrieved**:
  - Number of blocks validated in the last 24 hours
  - Assumes average block time of 15 seconds

#### 3. **Latest Block Activity**
- **Source**: Recent blockchain blocks (last 1000 blocks)
- **Method**: Reverse chronological search for validator's latest block
- **Data Retrieved**:
  - Last block number mined by the validator
  - Timestamp of the last block
  - Block hash

### Alert Trigger Conditions

#### 🟢 **HEALTHY** - All systems normal
- ✅ Validator is active (`isActive = true`)
- ✅ Validator is not jailed (`isJailed = false`)
- ✅ Block production ≥ 24 blocks in 24 hours
- ✅ Last block produced within 30 minutes

#### ⚠️ **WARNING** - Minor issues detected
- ✅ Validator is active and not jailed
- ❌ **BUT** one or more of the following:
  - Block production < 24 blocks in 24 hours
  - No blocks produced in the last 30+ minutes
  - No recent blocks found in the last 1000 blocks

#### 🚨 **CRITICAL** - Major issues requiring immediate attention
- ❌ Validator is inactive (`isActive = false`)
- ❌ **OR** Validator is jailed (`isJailed = true`)

#### 🔥 **ERROR** - System/Network issues
- ❌ Unable to fetch validator data from RPC
- ❌ Network connectivity issues
- ❌ API call failures

### Configuration Thresholds

```javascript
// Configurable in src/main.js
MIN_BLOCKS_PER_24H: 24,          // Minimum blocks to validate in 24 hours
MAX_BLOCK_DELAY_MINUTES: 30,     // Maximum minutes between blocks
CHECK_INTERVAL_MINUTES: 15,      // Monitoring frequency
```

## Slack Notifications

The monitor sends different types of notifications with detailed information:

### 🚨 Critical Alert Example
```
🚨 CRITICAL ALERT - 1 validator(s) have critical issues!

**0xA716d824...51b84A862**
• Status: 🔴 Inactive 🔒 Jailed
• Blocks (24h): 0
• Issues: Validator is not active, Validator is jailed

⚡ Immediate action required!
```

### ⚠️ Warning Alert Example
```
⚠️ WARNING - 1 validator(s) need attention

**0xA716d824...51b84A862**
• Blocks (24h): 18
• Issues: Low block production: 18 blocks in 24h (min: 24), No blocks in 45 minutes (max: 30)
```

### 🔥 Error Alert Example
```
🔥 MONITOR ERROR - Unable to check 1 validator(s)

**0xA716d824...51b84A862**
• Error: Error fetching data: Network request failed

🔧 Please check the monitoring system
```

### ✅ Daily Summary Example
```
📊 Daily Validator Summary - 2024/12/15

📈 Status Overview
• ✅ Healthy: 3
• ⚠️ Warning: 1
• 🚨 Critical: 0
• 🔥 Error: 0

📋 Validator Details
✅ **0xA716d824...51b84A862**
   • Blocks (24h): 96
   • Last block: 12 minutes ago

⚠️ **0x1234567890...abcdef12**
   • Blocks (24h): 18
   • Last block: 35 minutes ago
   • Issues: Low block production: 18 blocks in 24h (min: 24)

⚡ Performance Metrics
• Total blocks (24h): 234
• Average per validator: 58
• Network health: 🟢 Good

Generated at 09:00:00 JST
```

### Success Notification Example (Optional)
```
✅ All Clear - 4 validator(s) operating normally

• 0xA716d824...51b84A862: 96 blocks/24h
• 0x1234567890...abcdef12: 84 blocks/24h
• 0xabcdef1234...90abcdef: 72 blocks/24h
• 0x9876543210...fedcba98: 91 blocks/24h
```

## Development Commands

```bash
# Push local changes to GAS
npm run push

# Pull changes from GAS to local
npm run pull

# View execution logs
npm run logs

# Open GAS editor
npm run open

# Deploy as web app
npm run deploy
```

## File Structure

```
oasys-validator-monitor/
├── src/
│   ├── main.js           # Main entry point and configuration
│   ├── validator.js      # Validator monitoring logic
│   └── notifications.js  # Slack notification functions
├── appsscript.json      # GAS project configuration
├── package.json         # Node.js dependencies
└── README.md           # This file
```

## Troubleshooting

### Common Issues

1. **Authentication Error**
   ```bash
   npm run login
   ```

2. **Push Fails**
   - Check if you have edit permissions
   - Verify `.clasp.json` file exists

3. **No Slack Notifications**
   - Verify webhook URL in Script Properties
   - Check GAS execution logs: `npm run logs`

4. **RPC Connection Issues**
   - Check if Oasys RPC endpoint is accessible
   - Verify network connectivity from GAS environment

### Debugging

1. **View Logs**:
   ```bash
   npm run logs
   ```

2. **Test Functions**:
   - Run `testMonitoring()` in GAS editor
   - Check individual validator with `checkValidatorStatus(address)`

3. **Monitor Triggers**:
   - Go to GAS editor → Triggers tab
   - Check execution history

## API Endpoints Used

- **Oasys RPC**: `https://rpc.mainnet.oasys.games`
- **Validator Contract**: `0x0000000000000000000000000000000000001000`

## License

MIT License

## Support

For issues and feature requests, please open an issue in the GitHub repository.