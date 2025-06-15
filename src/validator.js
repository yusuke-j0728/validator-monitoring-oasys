/**
 * Validator monitoring functions for Oasys blockchain
 */

/**
 * Check the status of a specific validator
 * @param {string} validatorAddress - The validator's address
 * @returns {Object} Validator status information
 */
function checkValidatorStatus(validatorAddress) {
  try {
    const status = {
      address: validatorAddress,
      shortAddress: `${validatorAddress.substring(0, 10)}...${validatorAddress.substring(validatorAddress.length - 8)}`,
      timestamp: new Date(),
      isActive: false,
      isJailed: false,
      blocksValidated24h: 0,
      lastBlockNumber: null,
      lastBlockTime: null,
      issues: [],
      status: 'UNKNOWN'
    };

    // Get validator info from RPC
    const validatorInfo = getValidatorInfo(validatorAddress);
    if (validatorInfo) {
      status.isActive = validatorInfo.isActive;
      status.isJailed = validatorInfo.isJailed;
    }

    // Get blocks validated in last 24 hours
    status.blocksValidated24h = getBlocksValidated(validatorAddress, 24);

    // Get latest block mined by validator
    const latestBlock = getLatestValidatorBlock(validatorAddress);
    if (latestBlock) {
      status.lastBlockNumber = latestBlock.number;
      status.lastBlockTime = new Date(latestBlock.timestamp * 1000);
    }

    // Analyze status and identify issues
    analyzeValidatorStatus(status);

    console.log(`Validator ${status.shortAddress}: ${status.status} (${status.blocksValidated24h} blocks/24h)`);
    
    return status;

  } catch (error) {
    console.error(`Error checking validator ${validatorAddress}:`, error);
    return {
      address: validatorAddress,
      shortAddress: `${validatorAddress.substring(0, 10)}...${validatorAddress.substring(validatorAddress.length - 8)}`,
      timestamp: new Date(),
      isActive: false,
      isJailed: false,
      blocksValidated24h: 0,
      lastBlockNumber: null,
      lastBlockTime: null,
      issues: [`Error fetching data: ${error.message}`],
      status: 'ERROR'
    };
  }
}

/**
 * Get validator information from Oasys RPC
 * @param {string} validatorAddress - The validator's address
 * @returns {Object|null} Validator information
 */
function getValidatorInfo(validatorAddress) {
  try {
    // Call the Oasys validator contract to get validator info
    const payload = {
      jsonrpc: "2.0",
      method: "eth_call",
      params: [
        {
          to: "0x0000000000000000000000000000000000001000", // Oasys validator contract
          data: "0x5c622a0e" + validatorAddress.substring(2).padStart(64, '0') // getValidatorInfo(address)
        },
        "latest"
      ],
      id: 1
    };

    const response = UrlFetchApp.fetch(CONFIG.RPC_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    });

    const data = JSON.parse(response.getContentText());
    
    if (data.result && data.result !== '0x') {
      // Parse the result (simplified parsing)
      const result = data.result.substring(2); // Remove '0x'
      
      // Extract boolean flags (this is a simplified parsing)
      const isActive = parseInt(result.substring(62, 64), 16) === 1;
      const isJailed = parseInt(result.substring(126, 128), 16) === 1;
      
      return {
        isActive: isActive,
        isJailed: isJailed
      };
    }

    return null;

  } catch (error) {
    console.error(`Error getting validator info for ${validatorAddress}:`, error);
    return null;
  }
}

/**
 * Get number of blocks validated by a validator in the last N hours
 * @param {string} validatorAddress - The validator's address
 * @param {number} hours - Number of hours to look back
 * @returns {number} Number of blocks validated
 */
function getBlocksValidated(validatorAddress, hours = 24) {
  try {
    // Get current block number
    const currentBlock = getCurrentBlockNumber();
    if (!currentBlock) return 0;

    // Estimate blocks to check (assuming ~15 second block time)
    const avgBlockTime = 15; // seconds
    const blocksToCheck = Math.floor((hours * 3600) / avgBlockTime);
    const startBlock = Math.max(0, currentBlock - blocksToCheck);

    let blocksValidated = 0;
    const sampleRate = 10; // Check every 10th block for performance

    // Sample blocks to find ones mined by our validator
    for (let blockNum = currentBlock; blockNum >= startBlock; blockNum -= sampleRate) {
      try {
        const block = getBlockByNumber(blockNum);
        if (block && block.miner && block.miner.toLowerCase() === validatorAddress.toLowerCase()) {
          // Estimate based on sampling
          blocksValidated += sampleRate;
        }
      } catch (error) {
        // Continue on individual block errors
        continue;
      }
    }

    return Math.floor(blocksValidated / sampleRate); // Adjust for sampling

  } catch (error) {
    console.error(`Error getting blocks validated for ${validatorAddress}:`, error);
    return 0;
  }
}

/**
 * Get the latest block mined by a specific validator
 * @param {string} validatorAddress - The validator's address
 * @returns {Object|null} Latest block information
 */
function getLatestValidatorBlock(validatorAddress) {
  try {
    const currentBlock = getCurrentBlockNumber();
    if (!currentBlock) return null;

    // Check recent blocks for one mined by our validator
    for (let i = 0; i < 1000; i++) { // Check last 1000 blocks
      const blockNum = currentBlock - i;
      if (blockNum < 0) break;

      try {
        const block = getBlockByNumber(blockNum);
        if (block && block.miner && block.miner.toLowerCase() === validatorAddress.toLowerCase()) {
          return {
            number: blockNum,
            timestamp: parseInt(block.timestamp, 16) || block.timestamp,
            hash: block.hash
          };
        }
      } catch (error) {
        continue;
      }
    }

    return null;

  } catch (error) {
    console.error(`Error getting latest validator block for ${validatorAddress}:`, error);
    return null;
  }
}

/**
 * Get current block number from RPC
 * @returns {number|null} Current block number
 */
function getCurrentBlockNumber() {
  try {
    const payload = {
      jsonrpc: "2.0",
      method: "eth_blockNumber",
      params: [],
      id: 1
    };

    const response = UrlFetchApp.fetch(CONFIG.RPC_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    });

    const data = JSON.parse(response.getContentText());
    return data.result ? parseInt(data.result, 16) : null;

  } catch (error) {
    console.error('Error getting current block number:', error);
    return null;
  }
}

/**
 * Get block information by number
 * @param {number} blockNumber - Block number to fetch
 * @returns {Object|null} Block information
 */
function getBlockByNumber(blockNumber) {
  try {
    const payload = {
      jsonrpc: "2.0",
      method: "eth_getBlockByNumber",
      params: [`0x${blockNumber.toString(16)}`, false],
      id: 1
    };

    const response = UrlFetchApp.fetch(CONFIG.RPC_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    });

    const data = JSON.parse(response.getContentText());
    return data.result;

  } catch (error) {
    console.error(`Error getting block ${blockNumber}:`, error);
    return null;
  }
}

/**
 * Analyze validator status and identify issues
 * @param {Object} status - Validator status object to analyze
 */
function analyzeValidatorStatus(status) {
  status.issues = [];

  // Check if validator is active
  if (!status.isActive) {
    status.issues.push('Validator is not active');
  }

  // Check if validator is jailed
  if (status.isJailed) {
    status.issues.push('Validator is jailed');
  }

  // Check block production
  if (status.blocksValidated24h < CONFIG.MIN_BLOCKS_PER_24H) {
    status.issues.push(`Low block production: ${status.blocksValidated24h} blocks in 24h (min: ${CONFIG.MIN_BLOCKS_PER_24H})`);
  }

  // Check last block time
  if (status.lastBlockTime) {
    const timeSinceLastBlock = (Date.now() - status.lastBlockTime.getTime()) / (1000 * 60); // minutes
    if (timeSinceLastBlock > CONFIG.MAX_BLOCK_DELAY_MINUTES) {
      status.issues.push(`No blocks in ${Math.round(timeSinceLastBlock)} minutes (max: ${CONFIG.MAX_BLOCK_DELAY_MINUTES})`);
    }
  } else {
    status.issues.push('No recent blocks found');
  }

  // Determine overall status
  if (status.issues.length === 0) {
    status.status = 'HEALTHY';
  } else if (status.isActive && !status.isJailed) {
    status.status = 'WARNING';
  } else {
    status.status = 'CRITICAL';
  }
}