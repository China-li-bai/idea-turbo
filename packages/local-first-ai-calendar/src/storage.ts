import localforage from "localforage";
import { CalendarEvent, VectorEntry } from "./types.js";

export class Storage {
  private eventStore: LocalForage;
  private vectorStore: LocalForage;

  constructor(dbName: string = "local-first-ai-calendar") {
    this.eventStore = localforage.createInstance({
      name: dbName,
      storeName: "events",
    });

    this.vectorStore = localforage.createInstance({
      name: dbName,
      storeName: "vectors",
    });
  }

  async saveEvent(event: CalendarEvent): Promise<void> {
    await this.eventStore.setItem(event.id, event);
  }

  async getEvent(id: string): Promise<CalendarEvent | null> {
    const event = await this.eventStore.getItem<CalendarEvent>(id);
    return event;
  }

  async deleteEvent(id: string): Promise<void> {
    await this.eventStore.removeItem(id);
  }

  async getAllEvents(): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];
    await this.eventStore.iterate<CalendarEvent, void>((value) => {
      events.push(value);
    });
    return events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  async getEventsByTimeRange(start: Date, end: Date): Promise<CalendarEvent[]> {
    const allEvents = await this.getAllEvents();
    return allEvents.filter(
      (event) =>
        event.startTime < end && event.endTime > start
    );
  }

  async saveVectorEntry(entry: VectorEntry): Promise<void> {
    await this.vectorStore.setItem(entry.id, entry);
  }

  async getVectorEntry(id: string): Promise<VectorEntry | null> {
    return await this.vectorStore.getItem<VectorEntry>(id);
  }

  async deleteVectorEntry(id: string): Promise<void> {
    await this.vectorStore.removeItem(id);
  }

  async getAllVectorEntries(): Promise<VectorEntry[]> {
    const entries: VectorEntry[] = [];
    await this.vectorStore.iterate<VectorEntry, void>((value) => {
      entries.push(value);
    });
    return entries;
  }

  async clearAll(): Promise<void> {
    await this.eventStore.clear();
    await this.vectorStore.clear();
  }
}
