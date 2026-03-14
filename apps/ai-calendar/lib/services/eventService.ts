import { v4 as uuidv4 } from 'uuid';
import { db, getAllFromStore } from '@/lib/storage';
import { eventBus } from '@/lib/utils/eventBus';
import { vectorService } from './vectorService';
import type { CalendarEvent } from '@/types';

export class EventService {
  async create(event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<CalendarEvent> {
    const now = new Date();
    const newEvent: CalendarEvent = {
      eventType: 'regular',
      ...event,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    await db.events.setItem(newEvent.id, newEvent);
    this.updateVectorIndex(newEvent).catch(console.error);

    eventBus.publish({
      type: 'created',
      entityType: 'event',
      entityId: newEvent.id,
    });

    return newEvent;
  }

  async get(id: string): Promise<CalendarEvent | null> {
    const event = await db.events.getItem<CalendarEvent>(id);
    return event || null;
  }

  async getAll(options?: {
    dateRange?: { start: Date; end: Date };
    viewMode?: string;
  }): Promise<CalendarEvent[]> {
    const allEvents = await getAllFromStore<CalendarEvent>(db.events);
    
    return allEvents.filter((event) => {
      let matches = true;
      
      if (options?.dateRange) {
        const { start, end } = options.dateRange;
        matches = matches && event.startTime < end && event.endTime > start;
      }
      
      if (options?.viewMode) {
        matches = matches && event.viewMode === options.viewMode;
      }
      
      return matches;
    }).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  async update(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const existingEvent = await this.get(id);
    if (!existingEvent) {
      throw new Error(`Event not found: ${id}`);
    }

    const now = new Date();
    const updatedEvent: CalendarEvent = {
      ...existingEvent,
      ...updates,
      id,
      updatedAt: now,
    };

    await db.events.setItem(id, updatedEvent);
    this.updateVectorIndex(updatedEvent).catch(console.error);

    eventBus.publish({
      type: 'updated',
      entityType: 'event',
      entityId: id,
    });

    return updatedEvent;
  }

  async delete(id: string): Promise<void> {
    await db.events.removeItem(id);
    vectorService.deleteFromIndex(id).catch(console.error);

    eventBus.publish({
      type: 'deleted',
      entityType: 'event',
      entityId: id,
    });
  }

  async checkConflict(startTime: Date, endTime: Date, excludeEventId?: string): Promise<CalendarEvent[]> {
    const allEvents = await getAllFromStore<CalendarEvent>(db.events);
    
    return allEvents.filter((event) => {
      if (excludeEventId && event.id === excludeEventId) {
        return false;
      }
      
      return event.startTime < endTime && event.endTime > startTime;
    });
  }

  private async updateVectorIndex(event: CalendarEvent): Promise<void> {
    const text = `${event.title} ${event.description || ''} ${event.location || ''}`;
    await vectorService.indexDocument('event', event.id, text, {
      date: event.startTime,
      viewMode: event.viewMode,
      isAllDay: event.isAllDay,
    });
  }
}

export const eventService = new EventService();
