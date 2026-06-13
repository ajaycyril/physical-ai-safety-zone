export type SafetyEvent = {
  id: string;
  timestamp: string;
  alert: boolean;
  zoneCount: number;
  maxDwellSeconds: number;
  source: string;
  fps?: number;
  trackedIds?: number[];
};

const globalStore = globalThis as typeof globalThis & {
  __physicalAiEvents?: SafetyEvent[];
};

export function getEvents() {
  if (!globalStore.__physicalAiEvents) {
    globalStore.__physicalAiEvents = [];
  }
  return globalStore.__physicalAiEvents;
}

export function addEvent(event: SafetyEvent) {
  const events = getEvents();
  events.unshift(event);
  if (events.length > 25) {
    events.length = 25;
  }
  return event;
}
