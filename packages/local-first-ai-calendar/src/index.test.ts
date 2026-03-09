import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LocalFirstAICalendar, createLocalFirstAICalendar } from "./index";

describe("LocalFirstAICalendar", () => {
  let calendar: LocalFirstAICalendar;

  beforeEach(async () => {
    calendar = createLocalFirstAICalendar({
      dbName: "test-calendar",
    });
    await calendar.initialize();
    await calendar.clearAll();
  });

  afterEach(async () => {
    await calendar.clearAll();
  });

  it("should create a calendar instance", () => {
    expect(calendar).toBeInstanceOf(LocalFirstAICalendar);
  });

  it("should add an event", async () => {
    const event = await calendar.addEvent({
      title: "Test Meeting",
      description: "A test meeting",
      startTime: new Date(Date.now() + 3600000),
      endTime: new Date(Date.now() + 7200000),
      location: "Conference Room",
      attendees: ["Alice", "Bob"],
      tags: ["work", "meeting"],
    });

    expect(event.id).toBeDefined();
    expect(event.title).toBe("Test Meeting");
    expect(event.createdAt).toBeInstanceOf(Date);
    expect(event.updatedAt).toBeInstanceOf(Date);
  });

  it("should get an event by id", async () => {
    const addedEvent = await calendar.addEvent({
      title: "Get Event Test",
      description: "Test getting an event",
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
    });

    const retrievedEvent = await calendar.getEvent(addedEvent.id);
    expect(retrievedEvent).not.toBeNull();
    expect(retrievedEvent?.title).toBe("Get Event Test");
  });

  it("should update an event", async () => {
    const addedEvent = await calendar.addEvent({
      title: "Original Title",
      description: "Original description",
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
    });

    const updatedEvent = await calendar.updateEvent(addedEvent.id, {
      title: "Updated Title",
    });

    expect(updatedEvent).not.toBeNull();
    expect(updatedEvent?.title).toBe("Updated Title");
    expect(updatedEvent?.updatedAt.getTime()).toBeGreaterThan(
      addedEvent.createdAt.getTime()
    );
  });

  it("should delete an event", async () => {
    const addedEvent = await calendar.addEvent({
      title: "Delete Test",
      description: "Test deleting an event",
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
    });

    const deleteResult = await calendar.deleteEvent(addedEvent.id);
    expect(deleteResult).toBe(true);

    const retrievedEvent = await calendar.getEvent(addedEvent.id);
    expect(retrievedEvent).toBeNull();
  });

  it("should get all events", async () => {
    await calendar.addEvent({
      title: "Event 1",
      description: "First event",
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
    });

    await calendar.addEvent({
      title: "Event 2",
      description: "Second event",
      startTime: new Date(Date.now() + 7200000),
      endTime: new Date(Date.now() + 10800000),
    });

    const events = await calendar.getAllEvents();
    expect(events.length).toBe(2);
  });

  it("should get events by time range", async () => {
    const now = Date.now();

    await calendar.addEvent({
      title: "In Range",
      description: "Should be found",
      startTime: new Date(now + 3600000),
      endTime: new Date(now + 7200000),
    });

    await calendar.addEvent({
      title: "Out of Range",
      description: "Should not be found",
      startTime: new Date(now + 86400000),
      endTime: new Date(now + 90000000),
    });

    const events = await calendar.getEventsByTimeRange(
      new Date(now),
      new Date(now + 86400000)
    );

    expect(events.length).toBe(1);
    expect(events[0]?.title).toBe("In Range");
  });
});
