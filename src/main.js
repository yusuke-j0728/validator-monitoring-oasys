/**
 * Oasys Validator Monitor - Main Entry Point
 * Google Apps Script for monitoring Oasys blockchain validators
 */

/**
 * Configuration object for the monitor
 * Edit these values according to your setup
 */
const CONFIG = {
  // Validator addresses to monitor
  VALIDATOR_ADDRESSES: [
    // Add your validator addresses here
    // "0x1234567890abcdef1234567890abcdef12345678",
    // "0xabcdef1234567890abcdef1234567890abcdef12"
  ],
  
  // Oasys RPC endpoint
  RPC_ENDPOINT: "https://rpc.mainnet.oasys.games",
  
  // Explorer API base URL
  EXPLORER_API_BASE: "https://explorer.oasys.games/api",
  
  // Slack webhook URL - set this in Script Properties
  SLACK_WEBHOOK_URL_PROPERTY: "SLACK_WEBHOOK_URL",
  
  // Monitoring thresholds
  MIN_BLOCKS_PER_24H: 24,  // Minimum blocks to validate in 24 hours
  MAX_BLOCK_DELAY_MINUTES: 30,  // Maximum minutes between blocks
  
  // Check intervals
  CHECK_INTERVAL_MINUTES: 15,  // How often to run the monitor
  
  // Notification settings
  SEND_SUCCESS_NOTIFICATIONS: false,  // Send notifications when all is well
  SEND_DAILY_SUMMARY: true  // Send daily summary
};

/**
 * Main monitoring function - called by triggers
 */
function monitorValidators() {
  try {
    console.log('Starting validator monitoring cycle...');
    
    const results = [];
    
    for (const validatorAddress of CONFIG.VALIDATOR_ADDRESSES) {
      console.log(`Checking validator: ${validatorAddress}`);
      const status = checkValidatorStatus(validatorAddress);
      results.push(status);
    }
    
    // Process results and send notifications
    processMonitoringResults(results);
    
    console.log('Monitoring cycle completed successfully');
    
  } catch (error) {
    console.error('Error in monitoring cycle:', error);
    sendSlackNotification(`🚨 **Monitor Error**: ${error.message}`, 'danger');
  }
}

/**
 * Setup function to initialize triggers and properties
 * Run this once to set up the monitoring system
 */
function setup() {
  try {
    console.log('Setting up Oasys Validator Monitor...');
    
    // Delete existing triggers
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'monitorValidators') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // Create new time-based trigger
    ScriptApp.newTrigger('monitorValidators')
      .timeBased()
      .everyMinutes(CONFIG.CHECK_INTERVAL_MINUTES)
      .create();
    
    console.log(`✅ Monitoring trigger created (every ${CONFIG.CHECK_INTERVAL_MINUTES} minutes)`);
    
    // Setup daily summary trigger
    if (CONFIG.SEND_DAILY_SUMMARY) {
      ScriptApp.newTrigger('sendDailySummary')
        .timeBased()
        .everyDays(1)
        .atHour(9)  // 9 AM
        .create();
      
      console.log('✅ Daily summary trigger created (9 AM daily)');
    }
    
    // Check if Slack webhook is configured
    const slackWebhook = PropertiesService.getScriptProperties().getProperty(CONFIG.SLACK_WEBHOOK_URL_PROPERTY);
    if (!slackWebhook) {
      console.warn('⚠️ Slack webhook URL not configured. Set SLACK_WEBHOOK_URL in Script Properties.');
    } else {
      console.log('✅ Slack webhook configured');
    }
    
    // Send setup confirmation
    sendSlackNotification(
      `✅ **Oasys Validator Monitor Setup Complete**\n\n` +
      `• Monitoring ${CONFIG.VALIDATOR_ADDRESSES.length} validator(s)\n` +
      `• Check interval: ${CONFIG.CHECK_INTERVAL_MINUTES} minutes\n` +
      `• Daily summary: ${CONFIG.SEND_DAILY_SUMMARY ? 'Enabled' : 'Disabled'}\n\n` +
      `Monitor is now active! 🚀`,
      'good'
    );
    
  } catch (error) {
    console.error('Setup failed:', error);
    throw error;
  }
}

/**
 * Test function to run a single monitoring cycle manually
 */
function testMonitoring() {
  console.log('Running test monitoring cycle...');
  monitorValidators();
}

/**
 * Function to send daily summary
 */
function sendDailySummary() {
  try {
    console.log('Generating daily summary...');
    
    const results = [];
    
    for (const validatorAddress of CONFIG.VALIDATOR_ADDRESSES) {
      const status = checkValidatorStatus(validatorAddress);
      results.push(status);
    }
    
    const summary = generateDailySummary(results);
    sendSlackNotification(summary, 'good');
    
  } catch (error) {
    console.error('Error generating daily summary:', error);
    sendSlackNotification(`🚨 **Daily Summary Error**: ${error.message}`, 'danger');
  }
}