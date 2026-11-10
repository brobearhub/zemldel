export const REMINDERS_CHANGED_EVENT = "zemldel:reminders-changed";
export const REMINDER_COUNT_REQUESTED_EVENT =
  "zemldel:reminder-count-requested";

export function notifyRemindersChanged() {
  window.dispatchEvent(new Event(REMINDERS_CHANGED_EVENT));
}

export function requestReminderCount() {
  window.dispatchEvent(new Event(REMINDER_COUNT_REQUESTED_EVENT));
}
