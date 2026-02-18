import { useEffect, useMemo, useState } from "react";
import {
  type EngagementEvent,
  getActionStreak,
  getEngagementEvents,
} from "@crm/lib/engagement";

const ENGAGEMENT_UPDATED_EVENT = "starterhub.engagement.updated";

export function useEngagement() {
  const [events, setEvents] = useState<EngagementEvent[]>(() => getEngagementEvents());

  useEffect(() => {
    const refresh = () => setEvents(getEngagementEvents());

    window.addEventListener(ENGAGEMENT_UPDATED_EVENT, refresh as EventListener);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(ENGAGEMENT_UPDATED_EVENT, refresh as EventListener);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const streak = useMemo(() => getActionStreak(), [events]);

  return { events, streak };
}
