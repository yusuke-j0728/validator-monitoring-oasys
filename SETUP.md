# Setup Guide - Oasys Validator Monitor

## Step-by-Step Setup

### 1. Initial Setup

```bash
# Navigate to project directory
cd oasys-validator-monitor

# Install dependencies
npm install

# Login to Google Apps Script
npm run login
```

When you run `npm run login`, a browser window will open. Sign in with your Google account and authorize the application.

### 2. Create Google Apps Script Project

```bash
# Create new GAS project
npm run create
```

This will create a new Google Apps Script project and generate a `.clasp.json` file with your project ID.

### 3. Configure Your Validators

Edit `src/main.js` and add your validator addresses:

```javascript
const CONFIG = {
  VALIDATOR_ADDRESSES: [
    "0x1234567890abcdef1234567890abcdef12345678",  // Replace with your validator address
    "0xabcdef1234567890abcdef1234567890abcdef12"   // Add more validators as needed
  ],
  // ... rest of config
};
```

### 4. Setup Slack Integration

1. **Create Slack Webhook**:
   - Go to https://api.slack.com/apps
   - Create new app or use existing one
   - Go to "Incoming Webhooks" and create a webhook
   - Copy the webhook URL

2. **Configure in Google Apps Script**:
   ```bash
   # Open GAS editor
   npm run open
   ```
   - Go to Project Settings → Script Properties
   - Add new property:
     - Property: `SLACK_WEBHOOK_URL`
     - Value: Your webhook URL

### 5. Deploy the Code

```bash
# Push code to Google Apps Script
npm run push
```

### 6. Initialize and Test

In the Google Apps Script editor:

1. **Run Setup Function**:
   - Select `setup` function from dropdown
   - Click Run button
   - This creates the monitoring triggers

2. **Test Monitoring**:
   - Select `testMonitoring` function
   - Click Run button
   - Check execution logs and Slack for test message

### 7. Verify Triggers

In GAS editor, go to Triggers tab and verify:
- `monitorValidators` trigger runs every 15 minutes
- `sendDailySummary` trigger runs daily at 9 AM

## GitHub Integration (Optional)

### Setup CI/CD

1. **GitHub Repository**:
   Repository: https://github.com/yusuke-j0728/validator-monitoring-oasys
   
   ```bash
   # Clone the repository
   git clone https://github.com/yusuke-j0728/validator-monitoring-oasys.git
   cd validator-monitoring-oasys
   ```

2. **Configure GitHub Secrets**:
   
   Go to your GitHub repository → Settings → Secrets and variables → Actions
   
   Add these secrets:
   
   - `CLASP_ACCESS_TOKEN`: From `~/.clasprc.json`
   - `CLASP_REFRESH_TOKEN`: From `~/.clasprc.json`
   - `CLASP_CLIENT_ID`: From `~/.clasprc.json`
   - `CLASP_CLIENT_SECRET`: From `~/.clasprc.json`
   - `CLASP_EXPIRY_DATE`: From `~/.clasprc.json`
   - `GAS_SCRIPT_ID`: From `.clasp.json`

### Getting Clasp Credentials

After running `npm run login`, your credentials are stored in `~/.clasprc.json`:

```bash
# View your credentials (macOS/Linux)
cat ~/.clasprc.json

# View your project ID
cat .clasp.json
```

Copy the values for GitHub secrets setup.

## Configuration Options

### Monitoring Settings

```javascript
// In src/main.js
const CONFIG = {
  // How often to check (minutes)
  CHECK_INTERVAL_MINUTES: 15,
  
  // Minimum blocks in 24 hours
  MIN_BLOCKS_PER_24H: 24,
  
  // Max minutes between blocks
  MAX_BLOCK_DELAY_MINUTES: 30,
  
  // Notification preferences
  SEND_SUCCESS_NOTIFICATIONS: false,
  SEND_DAILY_SUMMARY: true
};
```

### RPC Endpoint

Default RPC endpoint is `https://rpc.mainnet.oasys.games`. You can change this in the CONFIG object if needed.

## Testing

### Manual Testing

```bash
# View logs
npm run logs

# Open GAS editor for manual testing
npm run open
```

### Test Functions

In GAS editor, you can run these functions individually:

- `testMonitoring()`: Run one monitoring cycle
- `checkValidatorStatus("0x...")`: Check specific validator
- `sendDailySummary()`: Generate daily report

## Troubleshooting

### Common Issues

1. **Login Fails**:
   ```bash
   clasp logout
   npm run login
   ```

2. **Push Fails**:
   - Check if you have write permissions
   - Verify `.clasp.json` exists and has correct scriptId

3. **No Slack Notifications**:
   - Verify webhook URL in Script Properties
   - Check GAS execution logs
   - Test webhook URL with curl

4. **RPC Errors**:
   - Check network connectivity
   - Verify RPC endpoint is responding
   - Try different RPC endpoint if needed

### Debug Commands

```bash
# Pull latest from GAS
npm run pull

# View execution logs
npm run logs

# Check project versions
npm run versions
```

## Security Notes

- Never commit `.clasprc.json` or `.clasp.json` to version control
- Store sensitive data in GAS Script Properties
- Use GitHub Secrets for CI/CD credentials
- Regularly rotate Slack webhook URLs

## Next Steps

1. Monitor the system for a few days
2. Adjust thresholds based on your network performance
3. Add more validators as needed
4. Set up additional notification channels if required