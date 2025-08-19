class Block {
  constructor(index, transactions, previousHash = '') {
    this.index = index;
    this.timestamp = Date.now() * 1000000;
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.merkleRoot = this.calculateMerkleRoot();
    this.hash = this.calculateHash();
    this.validators = [];
    this.byzantineAgreement = false;
  }

  calculateHash() {
    const data = this.index + this.timestamp + this.merkleRoot + 
                 JSON.stringify(this.transactions) + this.previousHash + this.nonce;
    
    return this.sha3_512(this.sha256(data));
  }

  sha256(data) {
    const msgBuffer = new TextEncoder().encode(data);
    let hash = 0;
    
    for (let i = 0; i < msgBuffer.length; i++) {
      const char = msgBuffer[i];
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return Math.abs(hash).toString(16).padStart(64, '0');
  }

  sha3_512(data) {
    let hash = 0x811C9DC5;
    
    for (let i = 0; i < data.length; i++) {
      hash ^= data.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    
    return hash.toString(16).padStart(128, '0');
  }

  calculateMerkleRoot() {
    if (this.transactions.length === 0) return this.sha256('');
    
    let leaves = this.transactions.map(tx => this.sha256(JSON.stringify(tx)));
    
    while (leaves.length > 1) {
      const newLeaves = [];
      
      for (let i = 0; i < leaves.length; i += 2) {
        const left = leaves[i];
        const right = leaves[i + 1] || leaves[i];
        newLeaves.push(this.sha256(left + right));
      }
      
      leaves = newLeaves;
    }
    
    return leaves[0];
  }

  mineBlock(difficulty) {
    const target = '0'.repeat(difficulty);
    const startTime = Date.now();
    let iterations = 0;
    
    console.log('⛏️ Mining block...');
    
    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      iterations++;
      this.hash = this.calculateHash();
      
      if (iterations % 10000 === 0) {
        console.log(`Mining... Nonce: ${this.nonce}, Hash: ${this.hash.substring(0, 10)}...`);
      }
      
      if (Date.now() - startTime > 5000) {
        console.log('🚀 Applying quantum mining boost...');
        this.applyQuantumMiningBoost();
      }
    }
    
    console.log(`✅ Block mined in ${iterations} iterations!`);
    console.log(`Hash: ${this.hash}`);
    
    return {
      miningTime: Date.now() - startTime,
      iterations: iterations
    };
  }

  applyQuantumMiningBoost() {
    this.nonce = this.nonce * 1000 + Math.floor(Math.random() * 1000000);
  }

  addValidatorSignature(validatorId, signature) {
    this.validators.push({
      id: validatorId,
      signature: signature,
      timestamp: Date.now()
    });
    
    if (this.validators.length >= this.calculateByzantineThreshold()) {
      this.byzantineAgreement = true;
    }
  }

  calculateByzantineThreshold() {
    const totalValidators = 100;
    return Math.floor((2 * totalValidators) / 3) + 1;
  }
}

class SmartContract {
  constructor(code) {
    this.code = code;
    this.state = {};
    this.address = this.generateContractAddress();
    this.gasLimit = 1000000;
    this.gasUsed = 0;
    this.storage = {};
    this.events = [];
  }

  generateContractAddress() {
    const random = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now().toString(36);
    return `0x${random}${timestamp}`.padEnd(42, '0');
  }

  execute(method, params, sender) {
    this.gasUsed = 0;
    
    try {
      this.consumeGas(100);
      
      switch (method) {
        case 'transferToyOwnership':
          return this.transferToyOwnership(params.toyId, params.from, params.to);
        case 'mintToyNFT':
          return this.mintToyNFT(params.toyData, params.owner);
        case 'createToyAuction':
          return this.createToyAuction(params.toyId, params.startingPrice, params.duration);
        case 'verifyToyAuthenticity':
          return this.verifyToyAuthenticity(params.toyId, params.signature);
        case 'stakeToys':
          return this.stakeToys(params.toyIds, params.period);
        default:
          throw new Error(`Unknown method: ${method}`);
      }
    } catch (error) {
      this.revertState();
      return { success: false, error: error.message, gasUsed: this.gasUsed };
    }
  }

  consumeGas(amount) {
    this.gasUsed += amount;
    if (this.gasUsed > this.gasLimit) {
      throw new Error('Out of gas');
    }
  }

  transferToyOwnership(toyId, from, to) {
    this.consumeGas(500);
    
    this.storage[`toy_${toyId}_owner`] = to;
    this.storage[`toy_${toyId}_previous_owners`] = 
      this.storage[`toy_${toyId}_previous_owners`] || [];
    this.storage[`toy_${toyId}_previous_owners`].push(from);
    
    this.emitEvent('ToyOwnershipTransferred', {
      toyId: toyId,
      from: from,
      to: to,
      timestamp: Date.now()
    });
    
    return { success: true, gasUsed: this.gasUsed };
  }

  mintToyNFT(toyData, owner) {
    this.consumeGas(1000);
    
    const nftId = this.generateNFTId(toyData);
    
    this.storage[`nft_${nftId}`] = {
      data: toyData,
      owner: owner,
      createdAt: Date.now(),
      metadataUri: this.generateIPFSUri(toyData)
    };
    
    this.emitEvent('ToyNFTMinted', {
      nftId: nftId,
      owner: owner,
      toyData: toyData
    });
    
    return { success: true, nftId: nftId, gasUsed: this.gasUsed };
  }

  createToyAuction(toyId, startingPrice, duration) {
    this.consumeGas(800);
    
    const auctionId = this.generateAuctionId(toyId);
    
    this.storage[`auction_${auctionId}`] = {
      toyId: toyId,
      startingPrice: startingPrice,
      currentBid: startingPrice,
      highestBidder: null,
      endTime: Date.now() + duration,
      bids: []
    };
    
    this.emitEvent('AuctionCreated', {
      auctionId: auctionId,
      toyId: toyId,
      startingPrice: startingPrice
    });
    
    return { success: true, auctionId: auctionId, gasUsed: this.gasUsed };
  }

  verifyToyAuthenticity(toyId, signature) {
    this.consumeGas(300);
    
    const isAuthentic = this.verifySignature(toyId, signature);
    
    this.storage[`toy_${toyId}_verified`] = isAuthentic;
    this.storage[`toy_${toyId}_verification_timestamp`] = Date.now();
    
    return { success: true, authentic: isAuthentic, gasUsed: this.gasUsed };
  }

  stakeToys(toyIds, period) {
    this.consumeGas(toyIds.length * 200);
    
    const stakeId = this.generateStakeId();
    
    this.storage[`stake_${stakeId}`] = {
      toyIds: toyIds,
      period: period,
      startTime: Date.now(),
      endTime: Date.now() + period,
      rewards: this.calculateStakingRewards(toyIds.length, period)
    };
    
    this.emitEvent('ToysStaked', {
      stakeId: stakeId,
      toyIds: toyIds,
      period: period
    });
    
    return { 
      success: true, 
      stakeId: stakeId, 
      estimatedRewards: this.storage[`stake_${stakeId}`].rewards,
      gasUsed: this.gasUsed 
    };
  }

  generateNFTId(data) {
    return `NFT_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  generateIPFSUri(data) {
    const hash = btoa(JSON.stringify(data)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 46);
    return `ipfs://Qm${hash}`;
  }

  generateAuctionId(toyId) {
    return `AUCTION_${toyId}_${Date.now()}`;
  }

  generateStakeId() {
    return `STAKE_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  calculateStakingRewards(numToys, period) {
    const baseReward = 10;
    const timeMultiplier = period / (24 * 60 * 60 * 1000);
    const quantityBonus = Math.log2(numToys + 1);
    
    return Math.floor(baseReward * timeMultiplier * quantityBonus);
  }

  verifySignature(data, signature) {
    return signature.length > 20 && signature.includes(data);
  }

  emitEvent(eventName, data) {
    this.events.push({
      name: eventName,
      data: data,
      blockHeight: Math.floor(Math.random() * 1000000),
      transactionHash: this.generateTransactionHash(data)
    });
  }

  generateTransactionHash(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return '0x' + Math.abs(hash).toString(16).padStart(64, '0');
  }

  revertState() {
    this.state = {};
    this.gasUsed = 0;
  }
}

class ToyStoreBlockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 2;
    this.pendingTransactions = [];
    this.miningReward = 100;
    this.smartContracts = {};
    this.validators = this.initializeValidators();
    this.consensusAlgorithm = 'PBFT_WITH_SHARDING';
  }

  createGenesisBlock() {
    const genesisData = [{
      type: 'genesis',
      message: 'ToyStore Blockchain Genesis Block',
      timestamp: 1234567890,
      initialToySupply: 1000000,
      quantumSeed: Math.random()
    }];
    
    return new Block(0, genesisData, '0');
  }

  initializeValidators() {
    const validators = [];
    
    for (let i = 1; i <= 21; i++) {
      validators.push({
        id: `validator_${i}`,
        stake: Math.floor(Math.random() * 90000) + 10000,
        reputation: Math.random() * 0.5 + 0.5,
        online: true,
        shard: i % 7
      });
    }
    
    return validators;
  }

  addTransaction(transaction) {
    transaction.timestamp = Date.now();
    transaction.hash = this.generateTransactionHash(transaction);
    transaction.signature = this.signTransaction(transaction);
    
    this.pendingTransactions.push(transaction);
    
    console.log('📝 Transaction added to pending pool');
    
    this.broadcastTransaction(transaction);
  }

  generateTransactionHash(transaction) {
    const data = JSON.stringify(transaction);
    let hash = 5381;
    
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) + hash) + data.charCodeAt(i);
    }
    
    return '0x' + Math.abs(hash).toString(16).padStart(64, '0');
  }

  signTransaction(transaction) {
    return `SIG_${transaction.hash.substring(2, 10)}_${Date.now().toString(36)}`;
  }

  broadcastTransaction(transaction) {
    console.log('📡 Broadcasting transaction to network...');
    
    setTimeout(() => {
      console.log('✅ Transaction broadcast complete');
    }, Math.random() * 1000);
  }

  minePendingTransactions(miningRewardAddress) {
    if (this.pendingTransactions.length === 0) {
      console.log('No transactions to mine');
      return null;
    }
    
    const rewardTransaction = {
      from: null,
      to: miningRewardAddress,
      amount: this.miningReward,
      type: 'mining_reward'
    };
    
    this.pendingTransactions.push(rewardTransaction);
    
    const block = new Block(
      this.chain.length,
      this.pendingTransactions,
      this.getLatestBlock().hash
    );
    
    const miningResult = block.mineBlock(this.difficulty);
    
    const consensusResult = this.achieveConsensus(block);
    
    if (consensusResult.achieved) {
      this.chain.push(block);
      this.pendingTransactions = [];
      
      console.log('🎉 Block added to chain!');
      console.log(`⏱️ Mining time: ${miningResult.miningTime}ms`);
      console.log(`🔄 Iterations: ${miningResult.iterations}`);
      console.log(`👥 Consensus validators: ${consensusResult.validators}`);
      
      this.adjustDifficulty();
      
      return block;
    } else {
      console.log('❌ Consensus not achieved');
      return null;
    }
  }

  achieveConsensus(block) {
    const requiredValidators = Math.floor((2 * this.validators.length) / 3) + 1;
    const selectedValidators = this.selectValidatorsByStake(requiredValidators);
    
    let votes = 0;
    const votingValidators = [];
    
    for (const validator of selectedValidators) {
      if (this.validateBlock(block, validator)) {
        votes++;
        votingValidators.push(validator.id);
        block.addValidatorSignature(
          validator.id,
          this.generateValidatorSignature(validator, block)
        );
      }
    }
    
    return {
      achieved: votes >= requiredValidators,
      validators: votingValidators.length,
      totalValidators: this.validators.length
    };
  }

  selectValidatorsByStake(count) {
    const totalStake = this.validators.reduce((sum, v) => sum + v.stake, 0);
    const selected = [];
    
    for (const validator of this.validators) {
      const selectionProbability = validator.stake / totalStake;
      if (Math.random() < selectionProbability * 10 && selected.length < count) {
        selected.push(validator);
      }
    }
    
    while (selected.length < count && selected.length < this.validators.length) {
      const randomValidator = this.validators[Math.floor(Math.random() * this.validators.length)];
      if (!selected.includes(randomValidator)) {
        selected.push(randomValidator);
      }
    }
    
    return selected;
  }

  validateBlock(block, validator) {
    if (!validator.online) return false;
    
    if (block.previousHash !== this.getLatestBlock().hash) return false;
    
    if (block.hash !== block.calculateHash()) return false;
    
    if (Math.random() < validator.reputation) {
      return true;
    }
    
    return false;
  }

  generateValidatorSignature(validator, block) {
    return `${validator.id}_${block.hash.substring(0, 8)}_${Date.now().toString(36)}`;
  }

  adjustDifficulty() {
    if (this.chain.length % 10 === 0) {
      const averageMiningTime = this.calculateAverageMiningTime();
      
      if (averageMiningTime < 1000) {
        this.difficulty++;
        console.log(`📈 Difficulty increased to ${this.difficulty}`);
      } else if (averageMiningTime > 5000 && this.difficulty > 1) {
        this.difficulty--;
        console.log(`📉 Difficulty decreased to ${this.difficulty}`);
      }
    }
  }

  calculateAverageMiningTime() {
    if (this.chain.length < 10) return 3000;
    
    const recentBlocks = this.chain.slice(-10);
    const times = [];
    
    for (let i = 1; i < recentBlocks.length; i++) {
      times.push((recentBlocks[i].timestamp - recentBlocks[i - 1].timestamp) / 1000000);
    }
    
    return times.reduce((a, b) => a + b, 0) / times.length;
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  deploySmartContract(code) {
    const contract = new SmartContract(code);
    this.smartContracts[contract.address] = contract;
    
    this.addTransaction({
      type: 'contract_deployment',
      contractAddress: contract.address,
      deployer: 'system',
      gasUsed: 100000
    });
    
    console.log(`📜 Smart contract deployed at ${contract.address}`);
    
    return contract.address;
  }

  executeSmartContract(address, method, params, sender) {
    const contract = this.smartContracts[address];
    
    if (!contract) {
      return { error: 'Contract not found' };
    }
    
    const result = contract.execute(method, params, sender);
    
    this.addTransaction({
      type: 'contract_execution',
      contractAddress: address,
      method: method,
      params: params,
      sender: sender,
      result: result
    });
    
    return result;
  }

  validateChain() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];
      
      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }
      
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
      
      if (!currentBlock.byzantineAgreement) {
        return false;
      }
    }
    
    return true;
  }

  getToyHistory(toyId) {
    const history = [];
    
    for (const block of this.chain) {
      for (const transaction of block.transactions) {
        if (transaction.toyId === toyId || 
            (transaction.params && transaction.params.toyId === toyId)) {
          history.push({
            blockIndex: block.index,
            timestamp: block.timestamp,
            transaction: transaction
          });
        }
      }
    }
    
    return history;
  }

  getBalance(address) {
    let balance = 0;
    
    for (const block of this.chain) {
      for (const transaction of block.transactions) {
        if (transaction.from === address) {
          balance -= transaction.amount || 0;
        }
        if (transaction.to === address) {
          balance += transaction.amount || 0;
        }
      }
    }
    
    return balance;
  }
}

window.BlockchainLogger = {
  blockchain: null,
  contractAddress: null,
  
  initialize() {
    this.blockchain = new ToyStoreBlockchain();
    console.log('⛓️ Blockchain initialized');
    console.log(`📊 Chain length: ${this.blockchain.chain.length}`);
    console.log(`⚙️ Difficulty: ${this.blockchain.difficulty}`);
    console.log(`👥 Validators: ${this.blockchain.validators.length}`);
    
    const contractCode = `
      function processToyTransaction(toy) {
        return { processed: true, toy: toy };
      }
    `;
    
    this.contractAddress = this.blockchain.deploySmartContract(contractCode);
  },
  
  logTransaction(transaction) {
    if (!this.blockchain) {
      this.initialize();
    }
    
    this.blockchain.addTransaction(transaction);
  },
  
  logCartTransaction(item, action) {
    const transaction = {
      type: 'cart_' + action,
      toyId: item.id,
      toyName: item.name,
      price: item.price,
      timestamp: Date.now(),
      user: 'anonymous_' + Math.random().toString(36).substring(2, 9)
    };
    
    this.logTransaction(transaction);
    
    if (action === 'checkout') {
      this.executeSmartContract('transferToyOwnership', {
        toyId: item.id,
        from: 'store',
        to: transaction.user
      });
    }
  },
  
  executeSmartContract(method, params) {
    if (!this.blockchain || !this.contractAddress) {
      this.initialize();
    }
    
    const result = this.blockchain.executeSmartContract(
      this.contractAddress,
      method,
      params,
      'user_' + Math.random().toString(36).substring(2, 9)
    );
    
    console.log(`📄 Smart contract execution result:`, result);
    
    return result;
  },
  
  mineBlock() {
    if (!this.blockchain) {
      this.initialize();
    }
    
    const minerAddress = 'miner_' + Math.random().toString(36).substring(2, 9);
    const block = this.blockchain.minePendingTransactions(minerAddress);
    
    if (block) {
      console.log(`💰 Miner reward sent to ${minerAddress}`);
      console.log(`💳 Miner balance: ${this.blockchain.getBalance(minerAddress)}`);
    }
    
    return block;
  },
  
  validateChain() {
    if (!this.blockchain) {
      this.initialize();
    }
    
    const isValid = this.blockchain.validateChain();
    console.log(`🔍 Blockchain validation: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    
    return isValid;
  },
  
  getToyHistory(toyId) {
    if (!this.blockchain) {
      this.initialize();
    }
    
    return this.blockchain.getToyHistory(toyId);
  }
};