class EventSourcingCart {
  constructor() {
    this.events = [];
    this.snapshots = [];
    this.currentState = this.getInitialState();
    this.eventStore = new EventStore();
    this.projections = new Map();
    this.readModels = new Map();
    this.commandHandlers = new Map();
    this.eventHandlers = new Map();
    this.sagaManager = new CartSagaManager();
    this.aggregateVersion = 0;
    this.streamPosition = 0;
    
    this.initializeCommandHandlers();
    this.initializeEventHandlers();
    this.initializeProjections();
  }

  getInitialState() {
    return {
      items: [],
      total: 0,
      discounts: [],
      taxes: [],
      shipping: null,
      metadata: {
        createdAt: Date.now(),
        lastModified: Date.now(),
        version: 0
      }
    };
  }

  initializeCommandHandlers() {
    this.registerCommandHandler('AddItemToCart', async (command) => {
      const validation = await this.validateAddItemCommand(command);
      if (!validation.valid) {
        throw new CommandValidationError(validation.errors);
      }
      
      const events = [];
      
      events.push(new ItemAddedToCartEvent({
        itemId: command.itemId,
        name: command.name,
        price: command.price,
        quantity: command.quantity || 1,
        timestamp: Date.now(),
        correlationId: command.correlationId,
        causationId: command.commandId
      }));
      
      if (await this.shouldApplyDiscount(command)) {
        events.push(new DiscountAppliedEvent({
          discountType: 'automatic',
          amount: command.price * 0.1,
          reason: 'New item discount'
        }));
      }
      
      if (await this.shouldRecalculateTaxes()) {
        events.push(new TaxesRecalculatedEvent({
          taxRate: 0.08,
          taxAmount: command.price * 0.08
        }));
      }
      
      return events;
    });

    this.registerCommandHandler('RemoveItemFromCart', async (command) => {
      const item = this.currentState.items.find(i => i.id === command.itemId);
      if (!item) {
        throw new ItemNotFoundError(command.itemId);
      }
      
      return [
        new ItemRemovedFromCartEvent({
          itemId: command.itemId,
          timestamp: Date.now(),
          correlationId: command.correlationId
        })
      ];
    });

    this.registerCommandHandler('UpdateItemQuantity', async (command) => {
      return [
        new ItemQuantityUpdatedEvent({
          itemId: command.itemId,
          oldQuantity: command.oldQuantity,
          newQuantity: command.newQuantity,
          timestamp: Date.now()
        })
      ];
    });

    this.registerCommandHandler('ApplyDiscountCode', async (command) => {
      const discount = await this.validateDiscountCode(command.code);
      
      return [
        new DiscountCodeAppliedEvent({
          code: command.code,
          discount: discount,
          timestamp: Date.now()
        })
      ];
    });

    this.registerCommandHandler('InitiateCheckout', async (command) => {
      const saga = this.sagaManager.startCheckoutSaga({
        cartId: this.getAggregateId(),
        items: this.currentState.items,
        total: this.currentState.total
      });
      
      return [
        new CheckoutInitiatedEvent({
          sagaId: saga.id,
          cartSnapshot: this.currentState,
          timestamp: Date.now()
        })
      ];
    });
  }

  initializeEventHandlers() {
    this.registerEventHandler('ItemAddedToCart', (event) => {
      this.currentState.items.push({
        id: event.itemId,
        name: event.name,
        price: event.price,
        quantity: event.quantity,
        addedAt: event.timestamp
      });
      
      this.recalculateTotal();
      this.updateProjections('ItemAdded', event);
    });

    this.registerEventHandler('ItemRemovedFromCart', (event) => {
      this.currentState.items = this.currentState.items.filter(
        item => item.id !== event.itemId
      );
      
      this.recalculateTotal();
      this.updateProjections('ItemRemoved', event);
    });

    this.registerEventHandler('ItemQuantityUpdated', (event) => {
      const item = this.currentState.items.find(i => i.id === event.itemId);
      if (item) {
        item.quantity = event.newQuantity;
        this.recalculateTotal();
      }
    });

    this.registerEventHandler('DiscountApplied', (event) => {
      this.currentState.discounts.push({
        type: event.discountType,
        amount: event.amount,
        reason: event.reason,
        appliedAt: event.timestamp
      });
      
      this.recalculateTotal();
    });

    this.registerEventHandler('TaxesRecalculated', (event) => {
      this.currentState.taxes = [{
        rate: event.taxRate,
        amount: event.taxAmount,
        calculatedAt: event.timestamp
      }];
      
      this.recalculateTotal();
    });
  }

  initializeProjections() {
    this.projections.set('CartItemsProjection', new CartItemsProjection());
    this.projections.set('CartTotalsProjection', new CartTotalsProjection());
    this.projections.set('DiscountHistoryProjection', new DiscountHistoryProjection());
    this.projections.set('CartAnalyticsProjection', new CartAnalyticsProjection());
    this.projections.set('AbandonedCartProjection', new AbandonedCartProjection());
  }

  async handleCommand(commandName, commandData) {
    const command = new Command(commandName, commandData);
    
    console.log(`📥 Handling command: ${commandName}`);
    
    const handler = this.commandHandlers.get(commandName);
    if (!handler) {
      throw new Error(`No handler for command: ${commandName}`);
    }
    
    const events = await handler(command);
    
    for (const event of events) {
      await this.applyEvent(event);
      await this.persistEvent(event);
    }
    
    if (this.shouldTakeSnapshot()) {
      await this.takeSnapshot();
    }
    
    return {
      success: true,
      events: events,
      newState: this.currentState,
      version: this.aggregateVersion
    };
  }

  async applyEvent(event) {
    const handler = this.eventHandlers.get(event.type);
    if (!handler) {
      console.warn(`No handler for event: ${event.type}`);
      return;
    }
    
    handler(event);
    
    this.events.push(event);
    this.aggregateVersion++;
    this.streamPosition++;
    
    console.log(`✅ Event applied: ${event.type} (v${this.aggregateVersion})`);
  }

  async persistEvent(event) {
    await this.eventStore.append({
      streamId: this.getAggregateId(),
      eventType: event.type,
      eventData: event.data,
      metadata: {
        aggregateVersion: this.aggregateVersion,
        timestamp: Date.now(),
        correlationId: event.correlationId,
        causationId: event.causationId
      }
    });
  }

  shouldTakeSnapshot() {
    return this.events.length % 10 === 0;
  }

  async takeSnapshot() {
    const snapshot = {
      aggregateId: this.getAggregateId(),
      aggregateVersion: this.aggregateVersion,
      state: JSON.parse(JSON.stringify(this.currentState)),
      timestamp: Date.now()
    };
    
    this.snapshots.push(snapshot);
    await this.eventStore.saveSnapshot(snapshot);
    
    console.log(`📸 Snapshot taken at version ${this.aggregateVersion}`);
  }

  async rehydrateFromEventStore(aggregateId) {
    const snapshot = await this.eventStore.getLatestSnapshot(aggregateId);
    
    if (snapshot) {
      this.currentState = snapshot.state;
      this.aggregateVersion = snapshot.aggregateVersion;
      console.log(`🔄 Rehydrated from snapshot v${this.aggregateVersion}`);
    }
    
    const events = await this.eventStore.getEvents(
      aggregateId,
      this.aggregateVersion
    );
    
    for (const event of events) {
      await this.applyEvent(event);
    }
    
    console.log(`✅ Rehydration complete. Current version: ${this.aggregateVersion}`);
  }

  recalculateTotal() {
    const subtotal = this.currentState.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );
    
    const discountTotal = this.currentState.discounts.reduce(
      (sum, discount) => sum + discount.amount,
      0
    );
    
    const taxTotal = this.currentState.taxes.reduce(
      (sum, tax) => sum + tax.amount,
      0
    );
    
    this.currentState.total = subtotal - discountTotal + taxTotal;
    this.currentState.metadata.lastModified = Date.now();
    this.currentState.metadata.version++;
  }

  updateProjections(projectionType, event) {
    for (const [name, projection] of this.projections) {
      projection.handle(event);
    }
  }

  registerCommandHandler(commandName, handler) {
    this.commandHandlers.set(commandName, handler);
  }

  registerEventHandler(eventType, handler) {
    this.eventHandlers.set(eventType, handler);
  }

  async validateAddItemCommand(command) {
    const errors = [];
    
    if (!command.itemId) {
      errors.push('Item ID is required');
    }
    
    if (!command.price || command.price <= 0) {
      errors.push('Valid price is required');
    }
    
    if (command.quantity && command.quantity <= 0) {
      errors.push('Quantity must be positive');
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  async shouldApplyDiscount(command) {
    return Math.random() < 0.3;
  }

  async shouldRecalculateTaxes() {
    return true;
  }

  async validateDiscountCode(code) {
    return {
      valid: true,
      type: 'percentage',
      value: 10,
      maxDiscount: 50
    };
  }

  getAggregateId() {
    return `cart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  getEventHistory() {
    return this.events;
  }

  getProjection(name) {
    return this.projections.get(name);
  }
}

class EventStore {
  constructor() {
    this.streams = new Map();
    this.snapshots = new Map();
    this.globalStream = [];
  }

  async append(event) {
    const stream = this.streams.get(event.streamId) || [];
    stream.push(event);
    this.streams.set(event.streamId, stream);
    
    this.globalStream.push({
      ...event,
      globalPosition: this.globalStream.length
    });
  }

  async getEvents(streamId, fromVersion = 0) {
    const stream = this.streams.get(streamId) || [];
    return stream.filter(event => event.metadata.aggregateVersion > fromVersion);
  }

  async saveSnapshot(snapshot) {
    const snapshots = this.snapshots.get(snapshot.aggregateId) || [];
    snapshots.push(snapshot);
    this.snapshots.set(snapshot.aggregateId, snapshots);
  }

  async getLatestSnapshot(aggregateId) {
    const snapshots = this.snapshots.get(aggregateId) || [];
    return snapshots[snapshots.length - 1] || null;
  }
}

class Command {
  constructor(name, data) {
    this.commandId = this.generateId();
    this.commandName = name;
    this.timestamp = Date.now();
    this.correlationId = this.generateId();
    Object.assign(this, data);
  }

  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

class Event {
  constructor(type, data) {
    this.eventId = this.generateId();
    this.type = type;
    this.data = data;
    this.timestamp = Date.now();
    this.version = 1;
  }

  generateId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

class ItemAddedToCartEvent extends Event {
  constructor(data) {
    super('ItemAddedToCart', data);
    Object.assign(this, data);
  }
}

class ItemRemovedFromCartEvent extends Event {
  constructor(data) {
    super('ItemRemovedFromCart', data);
    Object.assign(this, data);
  }
}

class ItemQuantityUpdatedEvent extends Event {
  constructor(data) {
    super('ItemQuantityUpdated', data);
    Object.assign(this, data);
  }
}

class DiscountAppliedEvent extends Event {
  constructor(data) {
    super('DiscountApplied', data);
    Object.assign(this, data);
  }
}

class DiscountCodeAppliedEvent extends Event {
  constructor(data) {
    super('DiscountCodeApplied', data);
    Object.assign(this, data);
  }
}

class TaxesRecalculatedEvent extends Event {
  constructor(data) {
    super('TaxesRecalculated', data);
    Object.assign(this, data);
  }
}

class CheckoutInitiatedEvent extends Event {
  constructor(data) {
    super('CheckoutInitiated', data);
    Object.assign(this, data);
  }
}

class CartItemsProjection {
  constructor() {
    this.items = new Map();
  }

  handle(event) {
    switch (event.type) {
      case 'ItemAddedToCart':
        this.items.set(event.itemId, {
          id: event.itemId,
          name: event.name,
          price: event.price,
          quantity: event.quantity,
          addedAt: event.timestamp
        });
        break;
      case 'ItemRemovedFromCart':
        this.items.delete(event.itemId);
        break;
      case 'ItemQuantityUpdated':
        const item = this.items.get(event.itemId);
        if (item) {
          item.quantity = event.newQuantity;
        }
        break;
    }
  }

  getItems() {
    return Array.from(this.items.values());
  }
}

class CartTotalsProjection {
  constructor() {
    this.totals = {
      subtotal: 0,
      discounts: 0,
      taxes: 0,
      total: 0
    };
  }

  handle(event) {
    this.recalculate();
  }

  recalculate() {
    // Implementation would recalculate based on events
  }
}

class DiscountHistoryProjection {
  constructor() {
    this.history = [];
  }

  handle(event) {
    if (event.type === 'DiscountApplied' || event.type === 'DiscountCodeApplied') {
      this.history.push({
        type: event.discountType,
        amount: event.amount,
        appliedAt: event.timestamp
      });
    }
  }
}

class CartAnalyticsProjection {
  constructor() {
    this.analytics = {
      totalEvents: 0,
      itemsAdded: 0,
      itemsRemoved: 0,
      averageCartValue: 0,
      conversionEvents: 0
    };
  }

  handle(event) {
    this.analytics.totalEvents++;
    
    switch (event.type) {
      case 'ItemAddedToCart':
        this.analytics.itemsAdded++;
        break;
      case 'ItemRemovedFromCart':
        this.analytics.itemsRemoved++;
        break;
      case 'CheckoutInitiated':
        this.analytics.conversionEvents++;
        break;
    }
  }
}

class AbandonedCartProjection {
  constructor() {
    this.abandonedCarts = [];
    this.threshold = 3600000; // 1 hour
  }

  handle(event) {
    // Track cart activity and identify abandoned carts
  }
}

class CartSagaManager {
  constructor() {
    this.sagas = new Map();
  }

  startCheckoutSaga(context) {
    const saga = new CheckoutSaga(context);
    this.sagas.set(saga.id, saga);
    saga.start();
    return saga;
  }
}

class CheckoutSaga {
  constructor(context) {
    this.id = `saga_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.context = context;
    this.state = 'started';
    this.compensations = [];
  }

  async start() {
    try {
      await this.reserveInventory();
      await this.calculateShipping();
      await this.processPayment();
      await this.createOrder();
      await this.sendConfirmation();
      
      this.state = 'completed';
    } catch (error) {
      await this.compensate();
      this.state = 'failed';
      throw error;
    }
  }

  async compensate() {
    for (const compensation of this.compensations.reverse()) {
      await compensation();
    }
  }

  async reserveInventory() {
    console.log('📦 Reserving inventory...');
    this.compensations.push(async () => {
      console.log('🔄 Releasing inventory reservation...');
    });
  }

  async calculateShipping() {
    console.log('🚚 Calculating shipping...');
  }

  async processPayment() {
    console.log('💳 Processing payment...');
    this.compensations.push(async () => {
      console.log('💰 Refunding payment...');
    });
  }

  async createOrder() {
    console.log('📝 Creating order...');
    this.compensations.push(async () => {
      console.log('❌ Cancelling order...');
    });
  }

  async sendConfirmation() {
    console.log('📧 Sending confirmation...');
  }
}

class CommandValidationError extends Error {
  constructor(errors) {
    super(`Command validation failed: ${errors.join(', ')}`);
    this.errors = errors;
  }
}

class ItemNotFoundError extends Error {
  constructor(itemId) {
    super(`Item not found: ${itemId}`);
    this.itemId = itemId;
  }
}

window.EventSourcingCart = EventSourcingCart;