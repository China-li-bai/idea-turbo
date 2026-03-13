"use client";

import { useState, useCallback, useMemo } from "react";
import { Calendar, dateFnsLocalizer, Views, SlotInfo } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addHours, isSameDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useCalendarStore } from "@/lib/stores/calendarStore";
import { v4 as uuidv4 } from "uuid";

const locales = {
  "zh-CN": zhCN,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  resource?: {
    description?: string;
    location?: string;
    isAllDay: boolean;
  };
}

export function CalendarView() {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<typeof Views[keyof typeof Views]>(Views.MONTH);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const { events, addEvent, updateEvent, deleteEvent } = useCalendarStore();
  
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return events.map((e) => ({
      id: e.id,
      title: e.title,
      start: new Date(e.startTime),
      end: new Date(e.endTime),
      allDay: e.isAllDay,
      resource: {
        description: e.description,
        location: e.location,
        isAllDay: e.isAllDay,
      },
    }));
  }, [events]);

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setSelectedEvent({
      id: "",
      title: "",
      start: slotInfo.start,
      end: slotInfo.end,
      allDay: false,
    });
    setIsEditing(false);
    setShowEventModal(true);
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEditing(true);
    setShowEventModal(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!selectedEvent || !selectedEvent.title.trim()) return;
    
    if (isEditing && selectedEvent.id) {
      const existingEvent = events.find((e) => e.id === selectedEvent.id);
      if (existingEvent) {
        updateEvent(selectedEvent.id, {
          title: selectedEvent.title,
          startTime: selectedEvent.start,
          endTime: selectedEvent.end,
          isAllDay: selectedEvent.allDay || false,
          description: selectedEvent.resource?.description,
          location: selectedEvent.resource?.location,
        });
      }
    } else {
      addEvent({
        id: uuidv4(),
        title: selectedEvent.title,
        startTime: selectedEvent.start,
        endTime: selectedEvent.end,
        isAllDay: selectedEvent.allDay || false,
        description: selectedEvent.resource?.description,
        location: selectedEvent.resource?.location,
        reminders: [],
        viewMode: "personal",
      });
    }
    
    setShowEventModal(false);
    setSelectedEvent(null);
  }, [selectedEvent, isEditing, events, addEvent, updateEvent]);

  const handleDelete = useCallback(() => {
    if (selectedEvent?.id) {
      deleteEvent(selectedEvent.id);
      setShowEventModal(false);
      setSelectedEvent(null);
    }
  }, [selectedEvent, deleteEvent]);

  const handleClose = useCallback(() => {
    setShowEventModal(false);
    setSelectedEvent(null);
  }, []);

  return (
    <div className="relative">
      <div className="bg-white rounded-lg shadow p-4" style={{ height: "600px" }}>
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          culture="zh-CN"
          popup
        />
      </div>

      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">
              {isEditing ? "编辑日程" : "新建日程"}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  标题 *
                </label>
                <input
                  type="text"
                  value={selectedEvent.title}
                  onChange={(e) =>
                    setSelectedEvent({ ...selectedEvent, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入日程标题"
                  autoFocus
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allDay"
                  checked={selectedEvent.allDay || false}
                  onChange={(e) =>
                    setSelectedEvent({
                      ...selectedEvent,
                      allDay: e.target.checked,
                      end: e.target.checked
                        ? selectedEvent.start
                        : addHours(selectedEvent.start, 1),
                    })
                  }
                  className="mr-2"
                />
                <label htmlFor="allDay" className="text-sm text-gray-700">
                  全天事件
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    开始时间
                  </label>
                  <input
                    type="datetime-local"
                    value={format(
                      selectedEvent.start,
                      "yyyy-MM-dd'T'HH:mm"
                    )}
                    onChange={(e) =>
                      setSelectedEvent({
                        ...selectedEvent,
                        start: new Date(e.target.value),
                        end: new Date(e.target.value) > selectedEvent.end
                          ? new Date(e.target.value)
                          : selectedEvent.end,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    结束时间
                  </label>
                  <input
                    type="datetime-local"
                    value={format(selectedEvent.end, "yyyy-MM-dd'T'HH:mm")}
                    onChange={(e) =>
                      setSelectedEvent({
                        ...selectedEvent,
                        end: new Date(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  地点
                </label>
                <input
                  type="text"
                  value={selectedEvent.resource?.location || ""}
                  onChange={(e) =>
                    setSelectedEvent({
                      ...selectedEvent,
                      resource: {
                        ...selectedEvent.resource,
                        location: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="输入地点"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  备注
                </label>
                <textarea
                  value={selectedEvent.resource?.description || ""}
                  onChange={(e) =>
                    setSelectedEvent({
                      ...selectedEvent,
                      resource: {
                        ...selectedEvent.resource,
                        description: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="输入备注"
                />
              </div>
            </div>

            <div className="flex justify-between mt-6">
              <div>
                {isEditing && (
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md"
                  >
                    删除
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={!selectedEvent.title.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
