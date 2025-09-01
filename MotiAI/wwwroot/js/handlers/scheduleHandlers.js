import { dom } from '../config.js';
import { state, calendarState, actions, findTaskInfoById } from '../state.js';
import {
  renderCalendar,
  renderTimelineAndSummary,
  highlightTask,
  updateTaskEl,
  showToast,
} from '../ui/index.js';
import { openConfirmModal, openEventModal } from '../modals.js';
import { handleSwitchTab } from './listHandlers.js';

// --- UTILITY ---
export const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- CALENDAR & EVENT HANDLERS ---
export function handleMonthChange(monthOffset) {
  calendarState.currentDate.setMonth(
    calendarState.currentDate.getMonth() + monthOffset
  );
  renderCalendar();
}

export function handleDateSelect(e) {
  const dayEl = e.target.closest('.calendar-day');
  if (dayEl && dayEl.dataset.date) {
    const [year, month, day] = dayEl.dataset.date.split('-').map(Number);
    calendarState.selectedDate = new Date(year, month - 1, day);
    renderCalendar();
    renderTimelineAndSummary();
  }
}

export function handleTimelineClick(e) {
  const rect = dom.timelineGrid.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const pixelsPerHour = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue(
      '--timeline-hour-height'
    )
  );
  const hourDecimal = y / pixelsPerHour;
  const hour = Math.floor(hourDecimal);
  const minute = Math.floor((hourDecimal - hour) * 60);

  const snappedMinute = Math.round(minute / 15) * 15;
  const date = new Date(calendarState.selectedDate);
  date.setHours(hour, snappedMinute, 0, 0);

  const startTime = date.toTimeString().substring(0, 5);
  date.setHours(date.getHours() + 1);
  const endTime = date.toTimeString().substring(0, 5);

  processEventModal({
    title: 'Create Event',
    date: calendarState.selectedDate,
    startTime,
    endTime,
  });
}

export async function processEventModal(config) {
  try {
    const result = await openEventModal(config);

    if (result.action === 'save') {
      actions.saveEvent(result.data);
      const { task } = findTaskInfoById(result.data.taskId) || {};
      if (task) updateTaskEl(task.id, task);
    } else if (result.action === 'delete') {
      const { eventId, dateKey, taskId } = result.data;
      const confirmed = await openConfirmModal({
        title: 'Delete Event?',
        message: 'Are you sure you want to delete this event?',
      });
      if (confirmed) {
        actions.deleteEvent(eventId, dateKey);
        const { task } = findTaskInfoById(taskId) || {};
        if (task) {
          // The task object in state is already updated by actions.deleteEvent
          // We just need to re-render its element to reflect the change
          updateTaskEl(task.id, task);
        }
      }
    }
    renderCalendar();
    renderTimelineAndSummary();
  } catch {
    /* User cancelled */
  }
}

export function navigateToTask(taskId) {
  const { parentTab } = findTaskInfoById(taskId) || {};
  if (!parentTab) {
    showToast('Could not find the requested task.', 'error');
    return;
  }

  if (parentTab.id !== state.activeTabId) {
    handleSwitchTab(parentTab.id, () => highlightTask(taskId));
  } else {
    highlightTask(taskId);
  }
}
