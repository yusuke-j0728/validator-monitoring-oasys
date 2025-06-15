/**
 * Notification functions for Slack integration
 */

/**
 * Send notification to Slack
 * @param {string} message - Message to send
 * @param {string} color - Color for the attachment (good, warning, danger)
 */
function sendSlackNotification(message, color = 'good') {
  try {
    const webhookUrl = PropertiesService.getScriptProperties().getProperty(CONFIG.SLACK_WEBHOOK_URL_PROPERTY);
    
    if (!webhookUrl) {
      console.warn('Slack webhook URL not configured in Script Properties');
      return;
    }

    const payload = {
      attachments: [
        {
          color: color,
          title: '🔗 Oasys Validator Monitor',
          text: message,
          timestamp: Math.floor(Date.now() / 1000),
          footer: 'Oasys Validator Monitor',
          footer_icon: 'https://www.oasys.games/favicon.ico'
        }
      ]
    };

    const response = UrlFetchApp.fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    });

    if (response.getResponseCode() === 200) {
      console.log('Slack notification sent successfully');
    } else {
      console.error('Failed to send Slack notification:', response.getResponseCode(), response.getContentText());
    }

  } catch (error) {
    console.error('Error sending Slack notification:', error);
  }
}

/**
 * Process monitoring results and send appropriate notifications
 * @param {Array} results - Array of validator status objects
 */
function processMonitoringResults(results) {
  const healthy = results.filter(r => r.status === 'HEALTHY');
  const warnings = results.filter(r => r.status === 'WARNING');
  const critical = results.filter(r => r.status === 'CRITICAL');
  const errors = results.filter(r => r.status === 'ERROR');

  console.log(`Status summary - Healthy: ${healthy.length}, Warning: ${warnings.length}, Critical: ${critical.length}, Error: ${errors.length}`);

  // Send critical alerts immediately
  if (critical.length > 0) {
    const message = formatCriticalAlert(critical);
    sendSlackNotification(message, 'danger');
  }

  // Send warning alerts
  if (warnings.length > 0) {
    const message = formatWarningAlert(warnings);
    sendSlackNotification(message, 'warning');
  }

  // Send error alerts
  if (errors.length > 0) {
    const message = formatErrorAlert(errors);
    sendSlackNotification(message, 'danger');
  }

  // Send success notification if configured and all validators are healthy
  if (CONFIG.SEND_SUCCESS_NOTIFICATIONS && critical.length === 0 && warnings.length === 0 && errors.length === 0) {
    const message = formatSuccessMessage(healthy);
    sendSlackNotification(message, 'good');
  }
}

/**
 * Format critical alert message
 * @param {Array} criticalValidators - Array of validators with critical issues
 * @returns {string} Formatted message
 */
function formatCriticalAlert(criticalValidators) {
  let message = `🚨 **CRITICAL ALERT** - ${criticalValidators.length} validator(s) have critical issues!\n\n`;
  
  criticalValidators.forEach(validator => {
    message += `**${validator.shortAddress}**\n`;
    message += `• Status: ${validator.isActive ? '🟢 Active' : '🔴 Inactive'} ${validator.isJailed ? '🔒 Jailed' : ''}\n`;
    message += `• Blocks (24h): ${validator.blocksValidated24h}\n`;
    message += `• Issues: ${validator.issues.join(', ')}\n\n`;
  });

  message += '⚡ **Immediate action required!**';
  return message;
}

/**
 * Format warning alert message
 * @param {Array} warningValidators - Array of validators with warnings
 * @returns {string} Formatted message
 */
function formatWarningAlert(warningValidators) {
  let message = `⚠️ **WARNING** - ${warningValidators.length} validator(s) need attention\n\n`;
  
  warningValidators.forEach(validator => {
    message += `**${validator.shortAddress}**\n`;
    message += `• Blocks (24h): ${validator.blocksValidated24h}\n`;
    message += `• Issues: ${validator.issues.join(', ')}\n\n`;
  });

  return message;
}

/**
 * Format error alert message
 * @param {Array} errorValidators - Array of validators with errors
 * @returns {string} Formatted message
 */
function formatErrorAlert(errorValidators) {
  let message = `🔥 **MONITOR ERROR** - Unable to check ${errorValidators.length} validator(s)\n\n`;
  
  errorValidators.forEach(validator => {
    message += `**${validator.shortAddress}**\n`;
    message += `• Error: ${validator.issues.join(', ')}\n\n`;
  });

  message += '🔧 Please check the monitoring system';
  return message;
}

/**
 * Format success message
 * @param {Array} healthyValidators - Array of healthy validators
 * @returns {string} Formatted message
 */
function formatSuccessMessage(healthyValidators) {
  return `✅ **All Clear** - ${healthyValidators.length} validator(s) operating normally\n\n` +
         `${healthyValidators.map(v => `• ${v.shortAddress}: ${v.blocksValidated24h} blocks/24h`).join('\n')}`;
}

/**
 * Generate daily summary report
 * @param {Array} results - Array of validator status objects
 * @returns {string} Formatted daily summary
 */
function generateDailySummary(results) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('ja-JP');
  
  let message = `📊 **Daily Validator Summary** - ${dateStr}\n\n`;

  // Overall statistics
  const healthy = results.filter(r => r.status === 'HEALTHY');
  const warnings = results.filter(r => r.status === 'WARNING');
  const critical = results.filter(r => r.status === 'CRITICAL');
  const errors = results.filter(r => r.status === 'ERROR');

  message += `**📈 Status Overview**\n`;
  message += `• ✅ Healthy: ${healthy.length}\n`;
  message += `• ⚠️ Warning: ${warnings.length}\n`;
  message += `• 🚨 Critical: ${critical.length}\n`;
  message += `• 🔥 Error: ${errors.length}\n\n`;

  // Individual validator details
  message += `**📋 Validator Details**\n`;
  results.forEach(validator => {
    const statusIcon = getStatusIcon(validator.status);
    message += `${statusIcon} **${validator.shortAddress}**\n`;
    message += `   • Blocks (24h): ${validator.blocksValidated24h}\n`;
    
    if (validator.lastBlockTime) {
      const lastBlockAge = Math.round((Date.now() - validator.lastBlockTime.getTime()) / (1000 * 60));
      message += `   • Last block: ${lastBlockAge} minutes ago\n`;
    }
    
    if (validator.issues.length > 0) {
      message += `   • Issues: ${validator.issues.join(', ')}\n`;
    }
    
    message += '\n';
  });

  // Performance metrics
  const totalBlocks = results.reduce((sum, v) => sum + v.blocksValidated24h, 0);
  const avgBlocks = results.length > 0 ? Math.round(totalBlocks / results.length) : 0;
  
  message += `**⚡ Performance Metrics**\n`;
  message += `• Total blocks (24h): ${totalBlocks}\n`;
  message += `• Average per validator: ${avgBlocks}\n`;
  message += `• Network health: ${critical.length === 0 && errors.length === 0 ? '🟢 Good' : '🔴 Issues detected'}\n\n`;

  message += `Generated at ${now.toLocaleTimeString('ja-JP')} JST`;

  return message;
}

/**
 * Get status icon for validator status
 * @param {string} status - Validator status
 * @returns {string} Status icon
 */
function getStatusIcon(status) {
  switch (status) {
    case 'HEALTHY': return '✅';
    case 'WARNING': return '⚠️';
    case 'CRITICAL': return '🚨';
    case 'ERROR': return '🔥';
    default: return '❓';
  }
}