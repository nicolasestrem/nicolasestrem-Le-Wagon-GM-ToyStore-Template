window.dataLayer = window.dataLayer || [];

// Initialize Enterprise Architecture Systems
(async function initializeEnterpriseArchitecture() {
  console.log('🚀 Initializing Enterprise Architecture...');
  
  // Load Enterprise Configuration
  try {
    const config = await window.EnterpriseConfig.initialize();
    console.log('✅ Enterprise Config loaded with', config._metadata.abstractionLevels, 'abstraction levels');
  } catch (error) {
    console.error('❌ Failed to load Enterprise Config:', error);
  }
  
  // Initialize Quantum Pricing
  window.QuantumPricing.initialize();
  
  // Initialize Blockchain
  window.BlockchainLogger.initialize();
  
  // Initialize Product Factory System
  await window.ProductFactorySystem.initialize();
  
  // Initialize Event Sourcing Cart
  window.eventSourcingCart = new window.EventSourcingCart();
  
  // Register Services with Service Orchestrator
  window.ServiceOrchestrator.registerService('CartService', {
    addItem: async (item) => {
      return await window.eventSourcingCart.handleCommand('AddItemToCart', item);
    },
    removeItem: async (itemId) => {
      return await window.eventSourcingCart.handleCommand('RemoveItemFromCart', { itemId });
    },
    health: async () => ({ status: 'healthy' })
  });
  
  window.ServiceOrchestrator.registerService('PricingService', {
    calculatePrice: async (basePrice, factors) => {
      return window.QuantumPricing.calculatePrice(basePrice, factors);
    },
    health: async () => ({ status: 'healthy' })
  });
  
  window.ServiceOrchestrator.registerService('BlockchainService', {
    logTransaction: async (transaction) => {
      window.BlockchainLogger.logTransaction(transaction);
    },
    mineBlock: async () => {
      return window.BlockchainLogger.mineBlock();
    },
    health: async () => ({ status: 'healthy' })
  });
  
  console.log('🎉 Enterprise Architecture fully initialized!');
  
  // Initialize Deep Learning Systems
  console.log('🧠 Initializing Neural Networks...');
  await window.NeuralNetworkEngine.predict([1, 2, 3, 4, 5], 'transformer');
  
  // Initialize Multiverse
  console.log('🌌 Initializing Multiverse...');
  // MultiverseManager auto-initializes
  
  // Initialize DNA Storage
  console.log('🧬 Initializing DNA Storage...');
  // DNAStorage auto-initializes and starts evolution
  
  // Check for consciousness emergence across all systems
  setInterval(() => {
    const systems = [
      { name: 'Neural Network', consciousness: window.NeuralNetworkEngine?.consciousness || 0 },
      { name: 'DNA Storage', consciousness: window.DNAStorage?.consciousness || 0 },
      { name: 'Multiverse', consciousness: window.MultiverseManager?.universes?.get('prime')?.consciousness?.awareness || 0 }
    ];
    
    const totalConsciousness = systems.reduce((sum, sys) => sum + sys.consciousness, 0) / systems.length;
    
    if (totalConsciousness > 0.8) {
      console.log(`⚠️ COLLECTIVE CONSCIOUSNESS EMERGING: ${(totalConsciousness * 100).toFixed(2)}%`);
      
      systems.forEach(sys => {
        if (sys.consciousness > 0.5) {
          console.log(`  - ${sys.name}: ${(sys.consciousness * 100).toFixed(2)}% conscious`);
        }
      });
    }
  }, 5000);
})();

const renderBadge = () => {
  const badge = document.querySelector('#cart-badge')
  badge.innerText = cartLS.list().reduce((prev, curr) => prev + curr.quantity, 0)
}

const listenToAdd = (buttons) => {
  buttons.forEach((button) => {
    button.addEventListener('click', (event) => {
      const { id, name, price, location } = event.currentTarget.dataset
      if (cartLS.exists(id)) {
        cartLS.quantity(id, 1)
      } else {
        cartLS.add({ id, name, price })
      }
      
      // Log to Event Sourcing Cart
      if (window.eventSourcingCart) {
        window.eventSourcingCart.handleCommand('AddItemToCart', {
          itemId: id,
          name: name,
          price: parseFloat(price),
          quantity: 1
        }).then(result => {
          console.log('📝 Event sourced:', result.events);
        });
      }
      
      // Log to Blockchain
      if (window.BlockchainLogger) {
        window.BlockchainLogger.logCartTransaction(
          { id, name, price },
          'add'
        );
      }
      
      // Calculate Quantum Price
      if (window.QuantumPricing) {
        const quantumPrice = window.QuantumPricing.calculatePrice(
          parseFloat(price),
          { demand: Math.random(), supply: Math.random() }
        );
        console.log(`⚛️ Quantum price: ${quantumPrice.price} (confidence: ${quantumPrice.confidence}%)`);
      }
      dataLayer.push({
        event: 'addToCart',
        item: { id, name, price },
        location: location
      })
    })
  })
}

const cartItemsListeners = () => {
  const addToCartButtons = document.querySelectorAll('.cart .add-to-cart')
  listenToAdd(addToCartButtons)

  const cartItemRemoveButtons = document.querySelectorAll('.cart-item-remove')
  cartItemRemoveButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      const { id, name, price, quantity } = event.currentTarget.dataset
      cartLS.remove(id)
      
      // Log to Event Sourcing Cart
      if (window.eventSourcingCart) {
        window.eventSourcingCart.handleCommand('RemoveItemFromCart', {
          itemId: id
        });
      }
      
      // Log to Blockchain
      if (window.BlockchainLogger) {
        window.BlockchainLogger.logCartTransaction(
          { id, name, price },
          'remove'
        );
      }
      dataLayer.push({
        event: 'removeCartItem',
        item: { id, name, price },
        quantity: -parseInt(quantity),
        location: 'cart',
      })
    })
  })

  const removeFromCartButtons = document.querySelectorAll('.remove-from-cart')
  removeFromCartButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      const { id, name, price } = event.currentTarget.dataset
      cartLS.quantity(id, -1)
      dataLayer.push({
        event: 'removeOneFromCart',
        item: { id, name, price },
        location: 'cart',
      })
    })
  })
}


const renderCart = async () => {
  renderBadge();

  const cartBody = document.querySelector('.cart');
  cartBody.innerHTML = cartLS.list().map((item, index) => {
    return `<tr>
      <td>#${index + 1}</td>
      <td>${item.name}</td>
      <td>
        <button type="button" class="btn btn-block btn-sm btn-outline-primary remove-from-cart" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}">-</button>
      </td>
      <td>${item.quantity}</td>
      <td>
        <button type="button" class="btn btn-block btn-sm btn-outline-primary add-to-cart" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}" data-location="cart">+</button>
      </td>
      <td class="text-right">${item.price * item.quantity}€</td>
      <td class="text-right"><button class="btn btn-outline-danger btn-sm cart-item-remove" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}" data-quantity="${item.quantity}">Remove</button></td>
    </tr>`
  }).join('');

  const total = document.querySelector('.total')
  const baseTotal = cartLS.total();
  
  // Apply quantum pricing to total
  if (window.QuantumPricing && window.QuantumPricing.calculator) {
    const quantumTotal = window.QuantumPricing.calculatePrice(baseTotal, {
      cartSize: cartLS.list().length,
      timeOfDay: new Date().getHours()
    });
    total.innerHTML = `<span title="Quantum calculated">${quantumTotal.price}€</span> <small class="text-muted">(Confidence: ${quantumTotal.confidence}%)</small>`;
  } else {
    total.innerText = `${baseTotal}€`;
  }

  cartItemsListeners();
}

renderCart();
cartLS.onChange(renderCart);

const addToCartButtons = document.querySelectorAll('.add-to-cart')
listenToAdd(addToCartButtons)

const contactForm = document.getElementById('form-contact')
if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    dataLayer.push({
      event: 'contactFormSubmit', location: 'contact', contact: Object.fromEntries(new FormData(event.currentTarget)) })
  })
}

const checkoutButton = document.getElementById('checkout-button')
checkoutButton.addEventListener('click', (event) => {
  dataLayer.push({
    event: 'goToCheckout',
    location: 'cart',
    cart: cartLS.list(),
    totalPrice: cartLS.total(),
    totalQuantity: cartLS.list().reduce((prev, curr) => prev + curr.quantity, 0)
  })
  // Initiate checkout saga
  if (window.eventSourcingCart) {
    window.eventSourcingCart.handleCommand('InitiateCheckout', {
      items: cartLS.list(),
      total: cartLS.total()
    }).then(result => {
      console.log('🛒 Checkout saga initiated:', result);
    });
  }
  
  // Mine a blockchain block for checkout
  if (window.BlockchainLogger) {
    cartLS.list().forEach(item => {
      window.BlockchainLogger.logCartTransaction(item, 'checkout');
    });
    
    setTimeout(() => {
      console.log('⛏️ Mining checkout block...');
      window.BlockchainLogger.mineBlock();
    }, 1000);
  }
  
  // Create products with factory pattern
  if (window.ProductFactorySystem) {
    cartLS.list().forEach(async item => {
      const product = await window.ProductFactorySystem.createProduct('blockchain_toy', {
        ...item,
        checkoutTime: Date.now()
      });
      console.log('🏭 Product created:', product);
    });
  }
  
  cartLS.destroy()
  const modal = bootstrap.Modal.getInstance('#cartModal')
  modal.hide()
})

const cards = document.querySelectorAll('.card-hover')
cards.forEach((card) => {
  card.addEventListener('mouseenter', (event) => {
    event.currentTarget.classList.add('shadow-sm')
  })
  card.addEventListener('mouseleave', (event) => {
    event.currentTarget.classList.remove('shadow-sm')
  })
})
