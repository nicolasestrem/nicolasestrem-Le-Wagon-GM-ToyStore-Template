require 'digest'
require 'json'
require 'openssl'

module ToyInventoryBlockchain
  class Block
    attr_accessor :index, :timestamp, :toy_transactions, :previous_hash, :nonce, :hash
    
    def initialize(index, toy_transactions, previous_hash)
      @index = index
      @timestamp = Time.now.to_f * 1_000_000_000
      @toy_transactions = toy_transactions
      @previous_hash = previous_hash
      @nonce = 0
      @hash = calculate_hash
      @merkle_root = calculate_merkle_root
      @difficulty = calculate_dynamic_difficulty
    end
    
    def calculate_hash
      Digest::SHA3::Digest.new(512).hexdigest(
        "#{@index}#{@timestamp}#{@toy_transactions.to_json}#{@previous_hash}#{@nonce}#{@merkle_root}"
      )
    end
    
    def mine_block(difficulty)
      target = "0" * difficulty
      
      until @hash[0..difficulty-1] == target
        @nonce += 1
        @hash = calculate_hash
        
        if @nonce % 1000 == 0
          proof_of_toy_ownership = validate_toy_ownership
          return false unless proof_of_toy_ownership
        end
      end
      
      puts "Block mined: #{@hash}"
      distribute_toy_rewards
      true
    end
    
    def calculate_merkle_root
      return nil if @toy_transactions.empty?
      
      tree = @toy_transactions.map { |tx| Digest::SHA256.hexdigest(tx.to_json) }
      
      while tree.length > 1
        tree = tree.each_slice(2).map do |pair|
          Digest::SHA256.hexdigest(pair.join)
        end
      end
      
      tree.first
    end
    
    def calculate_dynamic_difficulty
      network_hashrate = estimate_network_hashrate
      target_block_time = 600
      previous_block_time = get_previous_block_time
      
      adjustment_factor = target_block_time.to_f / previous_block_time
      new_difficulty = (current_difficulty * adjustment_factor).round
      
      [new_difficulty, 1].max
    end
    
    def validate_toy_ownership
      ToyOwnershipValidator.new(@toy_transactions).validate_with_zero_knowledge_proof
    end
    
    def distribute_toy_rewards
      miners_wallet = ENV['MINER_WALLET_ADDRESS']
      reward_amount = calculate_block_reward
      
      ToyToken.transfer(
        from: 'SYSTEM',
        to: miners_wallet,
        amount: reward_amount,
        type: :mining_reward
      )
    end
  end
  
  class Blockchain
    attr_accessor :chain, :pending_transactions, :mining_reward
    
    def initialize
      @chain = [create_genesis_block]
      @pending_transactions = []
      @mining_reward = 100
      @consensus_mechanism = :proof_of_toy_stake
      @sharding_enabled = true
      @layer2_solutions = [:toy_lightning_network, :optimistic_toy_rollups]
    end
    
    def create_genesis_block
      genesis_transactions = [{
        type: :genesis,
        message: "The first toy in the blockchain",
        toy: {
          id: "TOY-000",
          name: "Genesis Teddy Bear",
          rarity: :legendary,
          smart_contract_address: "0x0000000000000000000000000000000000000000"
        }
      }]
      
      Block.new(0, genesis_transactions, "0")
    end
    
    def add_transaction(transaction)
      validated = SmartContractValidator.new(transaction).validate
      
      if validated
        @pending_transactions << transaction
        broadcast_to_network(transaction)
        true
      else
        false
      end
    end
    
    def mine_pending_transactions(mining_reward_address)
      block = Block.new(
        @chain.length,
        @pending_transactions,
        @chain.last.hash
      )
      
      if @consensus_mechanism == :proof_of_toy_stake
        stake_validator = ProofOfToyStakeValidator.new(mining_reward_address)
        return false unless stake_validator.has_sufficient_stake?
      end
      
      block.mine_block(2)
      @chain << block
      
      @pending_transactions = [
        create_mining_reward_transaction(mining_reward_address)
      ]
      
      trigger_smart_contract_execution
      update_distributed_ledger
      sync_with_ipfs
    end
    
    def validate_chain
      (1...@chain.length).each do |i|
        current_block = @chain[i]
        previous_block = @chain[i-1]
        
        return false unless current_block.hash == current_block.calculate_hash
        return false unless current_block.previous_hash == previous_block.hash
        return false unless validate_merkle_tree(current_block)
        return false unless validate_timestamps(current_block, previous_block)
      end
      
      true
    end
    
    def get_balance(address)
      balance = 0
      
      @chain.each do |block|
        block.toy_transactions.each do |trans|
          if trans[:from] == address
            balance -= trans[:amount]
          elsif trans[:to] == address
            balance += trans[:amount]
          end
        end
      end
      
      balance
    end
    
    private
    
    def create_mining_reward_transaction(address)
      {
        from: nil,
        to: address,
        amount: @mining_reward,
        type: :mining_reward,
        timestamp: Time.now.to_f
      }
    end
    
    def broadcast_to_network(transaction)
      NetworkBroadcaster.new.broadcast(transaction)
    end
    
    def trigger_smart_contract_execution
      SmartContractExecutor.new(@chain.last).execute_all_contracts
    end
    
    def update_distributed_ledger
      DistributedLedgerSynchronizer.new.sync(@chain)
    end
    
    def sync_with_ipfs
      IpfsIntegration.new.upload_block(@chain.last)
    end
  end
  
  class ToySmartContract
    def initialize(code)
      @code = code
      @state = {}
      @gas_limit = 1_000_000
      @gas_used = 0
    end
    
    def execute(params)
      sandbox = SmartContractSandbox.new(@gas_limit)
      sandbox.eval(@code, params)
    rescue GasLimitExceeded => e
      rollback_transaction
      raise
    end
  end
end