import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import { EventType, EventPayloadMap } from './eventTypes';

class TypedEventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  /**
   * Publish an event to the EventBus.
   * @param event - EventType from catalog
   * @param payload - Typed payload corresponding to the event
   */
  public publish<K extends EventType>(
    event: K,
    payload: EventPayloadMap[K]
  ): void {
    logger.debug(`[EventBus] Publishing event: ${event}`, { payload });
    this.emitter.emit(event, payload);
  }

  /**
   * Subscribe a handler function to an event.
   * Runs async handlers safely within a try/catch.
   * @param event - EventType from catalog
   * @param handler - Async or sync callback function receiving typed payload
   */
  public subscribe<K extends EventType>(
    event: K,
    handler: (payload: EventPayloadMap[K]) => void | Promise<void>
  ): void {
    logger.debug(`[EventBus] Subscribing to event: ${event}`);
    this.emitter.on(event, async (payload: EventPayloadMap[K]) => {
      try {
        await handler(payload);
      } catch (err) {
        logger.error(`[EventBus] Error in handler for event "${event}":`, err);
      }
    });
  }

  /**
   * Unsubscribe a handler from an event.
   */
  public unsubscribe<K extends EventType>(
    event: K,
    handler: (payload: EventPayloadMap[K]) => void
  ): void {
    this.emitter.off(event, handler);
  }

  /**
   * Remove all registered listeners (primarily for testing cleanup).
   */
  public clearAllListeners(): void {
    this.emitter.removeAllListeners();
  }
}

export const eventBus = new TypedEventBus();
