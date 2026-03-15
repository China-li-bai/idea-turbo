import { dataStoreAdapter } from './dataStoreAdapter';
import type { CalendarEvent } from '@/types';

export class EventService {
  async create(event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<CalendarEvent> {
    const id = crypto.randomUUID();
    const now = new Date();
    const newEvent: CalendarEvent = {
      ...event,
      id,
      createdAt: now,
      updatedAt: now,
      eventType: event.eventType || 'regular',
    };
    return dataStoreAdapter.addEvent(newEvent);
  }

  async get(id: string): Promise<CalendarEvent | null> {
    return dataStoreAdapter.getEventById(id);
  }

  async getAll(options?: {
    dateRange?: { start: Date; end: Date };
    viewMode?: string;
  }): Promise<CalendarEvent[]> {
    return dataStoreAdapter.getAllEvents(options);
  }

  async update(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const result = await dataStoreAdapter.updateEvent(id, updates);
    if (!result) {
      throw new Error(`Event not found: ${id}`);
    }
    return result;
  }

  async delete(id: string): Promise<void> {
    await dataStoreAdapter.deleteEvent(id);
  }

  async checkConflict(startTime: Date, endTime: Date, excludeEventId?: string): Promise<CalendarEvent[]> {
    const allEvents = await dataStoreAdapter.getAllEvents();
    
    return allEvents.filter((event) => {
      if (excludeEventId && event.id === excludeEventId) {
        return false;
      }
      
      return event.startTime < endTime && event.endTime > startTime;
    });
  }
}

export const eventService = new EventService();
