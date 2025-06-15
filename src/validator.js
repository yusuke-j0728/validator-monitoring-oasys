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

    // Get validator info from StakeManager (includes block production data)
    const validatorInfo = getValidatorInfo(validatorAddress);
    if (validatorInfo) {
      status.isActive = validatorInfo.isActive;
      status.isJailed = validatorInfo.isJailed;
      
      // Use the blocks count already retrieved by getValidatorInfo
      if (validatorInfo.recentBlocks !== undefined) {
        status.blocksValidated24h = validatorInfo.recentBlocks;
        console.log(`Using already retrieved block count: ${status.blocksValidated24h}`);
        
        // Set latest block information from Explorer API data
        if (validatorInfo.newestBlockTime) {
          status.lastBlockTime = validatorInfo.newestBlockTime;
          status.lastBlockNumber = validatorInfo.newestBlockNumber;
          console.log(`Using Explorer API block time: ${status.lastBlockTime}`);
        }
      } else {
        // Fallback: get blocks if not already retrieved
        console.log(`Block count not available from validatorInfo, fetching separately`);
        status.blocksValidated24h = getBlocksValidated(validatorAddress, 24);
      }
    } else {
      // Fallback: try to get blocks independently
      console.log(`ValidatorInfo not available, fetching blocks independently`);
      status.blocksValidated24h = getBlocksValidated(validatorAddress, 24);
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
 * Get validator information from Oasys RPC (equivalent to oaspos validator:info-all)
 * @param {string} validatorAddress - The validator's address
 * @returns {Object|null} Validator information
 */
function getValidatorInfo(validatorAddress) {
  try {
    console.log(`Getting validator info for: ${validatorAddress}`);
    console.log(`Note: Using Owner address for StakeManager lookup`);
    
    // Get validator info from StakeManager contract using Owner address
    const stakeManagerInfo = getStakeManagerValidatorInfo(validatorAddress);
    
    if (stakeManagerInfo) {
      console.log(`StakeManager info:`, stakeManagerInfo);
      
      // Use the operator address for block production check
      const operatorAddress = stakeManagerInfo.operator || validatorAddress;
      const blockProductionInfo = checkRecentBlockProduction(operatorAddress);
      
      let recentBlocks, newestBlockTime, newestBlockNumber;
      if (typeof blockProductionInfo === 'object' && blockProductionInfo.count !== undefined) {
        recentBlocks = blockProductionInfo.count;
        newestBlockTime = blockProductionInfo.newestBlockTime;
        newestBlockNumber = blockProductionInfo.newestBlockNumber;
        console.log(`Recent blocks produced by operator ${operatorAddress}: ${recentBlocks}`);
      } else {
        // Fallback for backward compatibility
        recentBlocks = blockProductionInfo || 0;
        console.log(`Recent blocks produced by operator ${operatorAddress}: ${recentBlocks} (fallback)`);
      }
      
      return {
        isActive: stakeManagerInfo.isActive,
        isJailed: stakeManagerInfo.isJailed,
        stake: stakeManagerInfo.stake,
        owner: stakeManagerInfo.owner,
        operator: stakeManagerInfo.operator,
        recentBlocks: recentBlocks,
        newestBlockTime: newestBlockTime,
        newestBlockNumber: newestBlockNumber
      };
    } else {
      // Fallback: assume the provided address is the operator and check block production
      console.log(`StakeManager lookup failed, trying as operator address`);
      const recentBlocksProduced = checkRecentBlockProduction(validatorAddress);
      console.log(`Recent blocks produced by ${validatorAddress}: ${recentBlocksProduced}`);
      
      const isActive = recentBlocksProduced > 0;
      console.log(`Fallback: Using block production check, isActive: ${isActive}`);
      
      return {
        isActive: isActive,
        isJailed: false,
        stake: null,
        owner: null,
        operator: validatorAddress,
        recentBlocks: recentBlocksProduced
      };
    }

  } catch (error) {
    console.error(`Error getting validator info for ${validatorAddress}:`, error);
    return null;
  }
}

/**
 * Get validator information from Oasys StakeManager contract
 * This replicates what oaspos validator:info-all does
 * @param {string} validatorAddress - The validator's address
 * @returns {Object|null} Validator information from StakeManager
 */
function getStakeManagerValidatorInfo(validatorAddress) {
  try {
    const STAKE_MANAGER_ADDRESS = "0x0000000000000000000000000000000000001001";
    
    // Try multiple function selectors to find the correct one
    const functionSelectors = [
      { name: "validators(address)", selector: "fa52c7d8" },
      { name: "validators(address)", selector: "c47e300d" },
      { name: "getValidator(address)", selector: "b8c4b5b6" },
      { name: "validatorInfo(address)", selector: "58c6b4b6" }
    ];
    
    for (const func of functionSelectors) {
      try {
        console.log(`Trying ${func.name} with selector ${func.selector}`);
        
        const payload = {
          jsonrpc: "2.0",
          method: "eth_call",
          params: [
            {
              to: STAKE_MANAGER_ADDRESS,
              data: "0x" + func.selector + validatorAddress.substring(2).padStart(64, '0')
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
        console.log(`${func.name} response:`, JSON.stringify(data, null, 2));
        
        if (data.result && data.result !== '0x' && data.result.length > 2) {
          const result = data.result.substring(2);
          console.log(`Raw response for ${func.name}: ${result}`);
          
          // Check if result contains meaningful data (not all zeros)
          if (result.replace(/0/g, '').length > 0) {
            console.log(`Found non-zero data with ${func.name}`);
            
            if (result.length >= 256) { // Struct with multiple fields
              try {
                // Parse the struct returned by validators(address)
                // Based on actual response, the structure appears to be:
                // [32 bytes stake][32 bytes owner][32 bytes operator][32 bytes other data]
                
                const stake = "0x" + result.substring(0, 64);
                // Parse addresses correctly from 32-byte slots:
                // Slot 1 (0-64): 000000000000000000000000a716d824eabf5667a31e724cfc849f051b84a862
                // Slot 2 (64-128): 000000000000000000000000325671ee92c9a75b2196adf81954c6bb5dc1806e
                const owner = "0x" + result.substring(24, 64); // Extract a716d824... from slot 1
                const operator = "0x" + result.substring(88, 128); // Extract 325671ee... from slot 2
                
                // Look for jailed flag in various positions
                let jailed = false;
                // Check last few bytes for boolean flags
                if (result.length >= 256) {
                  jailed = parseInt(result.substring(248, 250), 16) === 1 || 
                           parseInt(result.substring(254, 256), 16) === 1;
                }
                
                // Convert stake from hex to decimal (handle large numbers)
                let stakeAmount;
                try {
                  stakeAmount = parseInt(stake, 16);
                  // If the number is too large, it might be in Wei, convert to OAS
                  if (stakeAmount > 1e18) {
                    stakeAmount = Math.floor(stakeAmount / 1e18); // Convert Wei to OAS
                  }
                } catch (e) {
                  stakeAmount = 0;
                }
                
                // A validator is active if it has stake and is not jailed
                const isActive = stakeAmount > 0 && !jailed;
                
                console.log(`Parsed validator info from ${func.name}:`, {
                  rawStake: stake,
                  stake: stakeAmount,
                  owner: owner,
                  operator: operator,
                  jailed: jailed,
                  isActive: isActive
                });
                
                if (stakeAmount > 0 || owner !== "0x0000000000000000000000000000000000000000") {
                  return {
                    isActive: isActive,
                    isJailed: jailed,
                    stake: stakeAmount,
                    owner: owner,
                    operator: operator
                  };
                }
                
              } catch (parseError) {
                console.error(`Error parsing ${func.name} response:`, parseError);
                continue;
              }
            } else if (result.length >= 64) {
              // Try simpler parsing for different struct formats
              const value = parseInt("0x" + result.substring(0, 64), 16);
              if (value > 0) {
                console.log(`Found simple value: ${value}`);
                return {
                  isActive: true,
                  isJailed: false,
                  stake: value,
                  owner: null,
                  operator: validatorAddress
                };
              }
            }
          }
        } else if (data.error) {
          console.log(`${func.name} returned error:`, data.error);
        }
      } catch (error) {
        console.log(`Error with ${func.name}:`, error.message);
        continue;
      }
    }
    
    // Try alternative method: isValidator(address)
    console.log(`All validators() methods failed, trying isValidator`);
    return getIsValidatorInfo(validatorAddress);

  } catch (error) {
    console.error(`Error getting StakeManager validator info:`, error);
    return null;
  }
}

/**
 * Check if address is a validator using isValidator function
 * @param {string} validatorAddress - The validator's address
 * @returns {Object|null} Basic validator information
 */
function getIsValidatorInfo(validatorAddress) {
  try {
    const STAKE_MANAGER_ADDRESS = "0x0000000000000000000000000000000000001001";
    
    // Try multiple isValidator function selectors
    const isValidatorSelectors = [
      { name: "isValidator(address)", selector: "1b78de43" },
      { name: "isValidator(address)", selector: "c2715679" },
      { name: "validatorExists(address)", selector: "c2f1e37b" }
    ];
    
    for (const func of isValidatorSelectors) {
      try {
        console.log(`Trying ${func.name} with selector ${func.selector}`);
        
        const payload = {
          jsonrpc: "2.0",
          method: "eth_call",
          params: [
            {
              to: STAKE_MANAGER_ADDRESS,
              data: "0x" + func.selector + validatorAddress.substring(2).padStart(64, '0')
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
        console.log(`${func.name} response:`, JSON.stringify(data, null, 2));
        
        if (data.result && data.result !== '0x') {
          const result = data.result.substring(2);
          
          // Try different parsing strategies
          let isValidator = false;
          
          if (result.length >= 64) {
            // Standard boolean at end
            isValidator = parseInt(result.substring(62, 64), 16) === 1;
          }
          
          if (!isValidator && result.length >= 2) {
            // Boolean at start
            isValidator = parseInt(result.substring(0, 2), 16) === 1;
          }
          
          console.log(`${func.name} result: ${isValidator}`);
          
          if (isValidator) {
            return {
              isActive: true,
              isJailed: false,
              stake: null,
              owner: null,
              operator: validatorAddress
            };
          }
        } else if (data.error) {
          console.log(`${func.name} returned error:`, data.error);
        }
      } catch (error) {
        console.log(`Error with ${func.name}:`, error.message);
        continue;
      }
    }
    
    // If all contract methods fail, try getting the validator list
    console.log(`All contract methods failed, trying to get validator list`);
    return getValidatorFromList(validatorAddress);

  } catch (error) {
    console.error(`Error checking isValidator:`, error);
    return null;
  }
}

/**
 * Try to find validator in the active validator list
 * @param {string} validatorAddress - The validator's address
 * @returns {Object|null} Validator information if found
 */
function getValidatorFromList(validatorAddress) {
  try {
    const STAKE_MANAGER_ADDRESS = "0x0000000000000000000000000000000000001001";
    
    // Try to get the validator count first
    const getValidatorCountSelectors = [
      { name: "validatorCount()", selector: "47b4ca24" },
      { name: "getValidatorCount()", selector: "8da5cb5b" },
      { name: "totalValidators()", selector: "9a8a0592" }
    ];
    
    for (const func of getValidatorCountSelectors) {
      try {
        console.log(`Trying ${func.name} with selector ${func.selector}`);
        
        const payload = {
          jsonrpc: "2.0",
          method: "eth_call",
          params: [
            {
              to: STAKE_MANAGER_ADDRESS,
              data: "0x" + func.selector
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
        console.log(`${func.name} response:`, JSON.stringify(data, null, 2));
        
        if (data.result && data.result !== '0x') {
          const count = parseInt(data.result, 16);
          console.log(`Found ${count} validators total`);
          
          if (count > 0) {
            // Success! Now we know there are validators
            return {
              isActive: true, // Assume active if we can't get detailed info
              isJailed: false,
              stake: null,
              owner: null,
              operator: validatorAddress,
              note: `Found ${count} total validators in system`
            };
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    return null;

  } catch (error) {
    console.error(`Error getting validator from list:`, error);
    return null;
  }
}

/**
 * Check if validator has produced blocks recently (last 100 blocks)
 * @param {string} validatorAddress - The validator's address
 * @returns {number} Number of recent blocks produced
 */
function checkRecentBlockProduction(validatorAddress) {
  try {
    console.log(`Checking block production for validator: ${validatorAddress} using Explorer API`);
    
    // Use Oasys Explorer API to get blocks validated by this address
    const apiUrl = `${CONFIG.EXPLORER_API_BASE}/v2/addresses/${validatorAddress}/blocks-validated`;
    
    console.log(`Fetching from: ${apiUrl}`);
    
    const response = UrlFetchApp.fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.getResponseCode() !== 200) {
      console.error(`Explorer API returned status: ${response.getResponseCode()}`);
      return 0;
    }
    
    const data = JSON.parse(response.getContentText());
    console.log(`Explorer API response received with ${data.items ? data.items.length : 0} blocks`);
    
    if (!data.items || !Array.isArray(data.items)) {
      console.log(`No blocks found in API response`);
      return 0;
    }
    
    // Count blocks from the last 24 hours
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    let recentBlocks = 0;
    let oldestBlockTime = null;
    let newestBlockTime = null;
    let newestBlockNumber = null;
    
    for (const block of data.items) {
      const blockTime = new Date(block.timestamp);
      
      if (!oldestBlockTime || blockTime < oldestBlockTime) {
        oldestBlockTime = blockTime;
      }
      if (!newestBlockTime || blockTime > newestBlockTime) {
        newestBlockTime = blockTime;
        newestBlockNumber = block.height;
      }
      
      if (blockTime >= yesterday) {
        recentBlocks++;
      }
    }
    
    console.log(`Block production summary:`);
    console.log(`- Total blocks found: ${data.items.length}`);
    console.log(`- Blocks in last 24h: ${recentBlocks}`);
    console.log(`- Newest block: ${newestBlockTime ? newestBlockTime.toISOString() : 'N/A'}`);
    console.log(`- Oldest block: ${oldestBlockTime ? oldestBlockTime.toISOString() : 'N/A'}`);
    
    // Return an object with both block count and timing information
    return {
      count: recentBlocks,
      newestBlockTime: newestBlockTime,
      newestBlockNumber: newestBlockNumber,
      oldestBlockTime: oldestBlockTime
    };
    
  } catch (error) {
    console.error(`Error checking block production via Explorer API:`, error);
    console.log(`Falling back to RPC method for ${validatorAddress}`);
    
    // Fallback to simple recent block check
    return checkRecentBlockProductionFallback(validatorAddress);
  }
}

/**
 * Fallback method for block production checking using RPC
 * @param {string} validatorAddress - The validator's address
 * @returns {number} Number of recent blocks produced (simplified check)
 */
function checkRecentBlockProductionFallback(validatorAddress) {
  try {
    console.log(`Using RPC fallback for ${validatorAddress}`);
    
    const currentBlock = getCurrentBlockNumber();
    if (!currentBlock) return 0;
    
    // Only check the last 10 blocks as a quick verification
    let blocksProduced = 0;
    for (let i = 0; i < 10; i++) {
      const blockNum = currentBlock - i;
      if (blockNum < 0) break;
      
      try {
        const block = getBlockByNumber(blockNum);
        if (block && block.miner && block.miner.toLowerCase() === validatorAddress.toLowerCase()) {
          blocksProduced++;
        }
      } catch (error) {
        continue;
      }
    }
    
    console.log(`RPC fallback found ${blocksProduced} blocks in last 10 blocks`);
    // Estimate 24h production based on last 10 blocks
    const estimatedBlocks = Math.round(blocksProduced * 24 * 6);
    
    // Return in the same format as the main function
    return {
      count: estimatedBlocks,
      newestBlockTime: new Date(), // Approximate current time
      newestBlockNumber: null,
      oldestBlockTime: null
    };
    
  } catch (error) {
    console.error(`Error in RPC fallback:`, error);
    return 0;
  }
}

/**
 * Try to get validator info from contract (fallback method)
 * @param {string} validatorAddress - The validator's address
 * @returns {Object|null} Contract information
 */
function getValidatorContractInfo(validatorAddress) {
  try {
    // Try different contract addresses and methods
    const contractAddresses = [
      "0x0000000000000000000000000000000000001000", // Standard Oasys validator contract
      "0x0000000000000000000000000000000000001001", // Alternative contract
    ];
    
    const functionSelectors = [
      "b8c4b5b6", // getValidator(address)
      "c47e300d", // validators(address)
      "1b78de43", // isValidator(address)
    ];
    
    for (const contractAddress of contractAddresses) {
      for (const selector of functionSelectors) {
        try {
          const payload = {
            jsonrpc: "2.0",
            method: "eth_call",
            params: [
              {
                to: contractAddress,
                data: "0x" + selector + validatorAddress.substring(2).padStart(64, '0')
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
          
          if (data.result && data.result !== '0x' && data.result.length > 2) {
            console.log(`Contract call successful with ${contractAddress}:${selector}`);
            
            // Try to parse the result
            const result = data.result.substring(2);
            if (result.length >= 64) {
              // Simple parsing - look for boolean values
              const isJailed = result.includes('0000000000000000000000000000000000000000000000000000000000000001');
              
              return {
                isJailed: isJailed,
                contractAddress: contractAddress,
                selector: selector
              };
            }
          }
        } catch (error) {
          // Try next combination
          continue;
        }
      }
    }
    
    return null;
    
  } catch (error) {
    console.error(`Error getting contract info:`, error);
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
    console.log(`getBlocksValidated called for ${validatorAddress}, ${hours}h - using Explorer API`);
    
    // Use the more efficient Explorer API method
    return checkRecentBlockProduction(validatorAddress);
    
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