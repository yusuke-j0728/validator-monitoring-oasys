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
# Clone or create the project
git clone <repository-url>
cd oasys-validator-monitor

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

The monitor checks each validator for:

1. **Validator Status**: Active/Inactive and Jailed status
2. **Block Production**: Number of blocks validated in the last 24 hours
3. **Recent Activity**: Time since last block production
4. **Network Connectivity**: Ability to fetch data from RPC endpoints

## Alert Levels

- 🟢 **HEALTHY**: All checks pass
- ⚠️ **WARNING**: Minor issues (low block production, delays)
- 🚨 **CRITICAL**: Major issues (inactive, jailed validator)
- 🔥 **ERROR**: Unable to fetch validator data

## Slack Notifications

The monitor sends different types of notifications:

### Critical Alerts
- Validator becomes inactive or jailed
- Complete loss of block production

### Warning Alerts  
- Low block production
- Delays in block production

### Daily Summaries
- Overall performance metrics
- Individual validator statistics
- 24-hour block production summary

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