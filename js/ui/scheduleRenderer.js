import { dom, icons } from '../config.js';
import { state, calendarState } from '../state.js';
import { formatDateKey } from '../handlers/index.js';
import { formatTimeForDisplay } from './interactions.js';

// --- CALENDAR, TIMELINE, & SUMMARY UI ---
export function renderTimelineAndSummary() {
    renderTimeline();
    renderDailySummary();
}

export function renderCalendar() {
    dom.calendarGrid.innerHTML = '';
    dom.monthYearHeader.textContent = calendarState.currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const year = calendarState.currentDate.getFullYear();
    const month = calendarState.currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const lastDayOfPrevMonth = new Date(year, month, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const totalDays = lastDayOfMonth.getDate();
    for (let i = firstDayOfWeek; i > 0; i--) {
        const day = lastDayOfPrevMonth.getDate() - i + 1;
        dom.calendarGrid.appendChild(createDayElement(day, new Date(year, month - 1, day), ['prev-month']));
    }
    for (let i = 1; i <= totalDays; i++) {
        const dayDate = new Date(year, month, i);
        const classes = [];
        if (dayDate.toDateString() === new Date().toDateString()) classes.push('current-day');
        if (dayDate.toDateString() === calendarState.selectedDate.toDateString()) classes.push('selected-day');
        dom.calendarGrid.appendChild(createDayElement(i, dayDate, classes));
    }
    const lastDayOfWeek = lastDayOfMonth.getDay();
    for (let i = 1; i < 7 - lastDayOfWeek; i++) {
        dom.calendarGrid.appendChild(createDayElement(i, new Date(year, month + 1, i), ['next-month']));
    }
}

export function createDayElement(dayNumber, date, classes = []) {
    const dayEl = document.createElement('div');
    dayEl.className = `calendar-day ${classes.join(' ')}`;
    dayEl.dataset.date = formatDateKey(date);
    dayEl.innerHTML = `<span class="day-number">${dayNumber}</span>`;
    if (state.events[dayEl.dataset.date]?.length > 0) {
        dayEl.innerHTML += '<div class="event-dot"></div>';
    }
    return dayEl;
}

function renderTimeline() {
    const date = calendarState.selectedDate;
    dom.timelineDateHeader.textContent = `Schedule for ${date.toLocaleDateString('default', { month: 'long', day: 'numeric' })}`;
    dom.timelineGrid.innerHTML = '';
    dom.timelineGrid.appendChild(dom.currentTimeLine);
    dom.timeLabelsContainer.innerHTML = '';
    const pixelsPerHour = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--timeline-hour-height'));

    for (let i = 0; i < 24; i++) {
        const labelEl = document.createElement('div');
        labelEl.className = 'time-label-item';
        labelEl.textContent = new Date(0, 0, 0, i).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        dom.timeLabelsContainer.appendChild(labelEl);
    }
    
    const dateKey = formatDateKey(date);
    const dayEvents = state.events[dateKey] || [];
    
    dom.allDayEventsContainer.innerHTML = '';
    dayEvents.filter(e => e.allDay).forEach(event => {
        const eventEl = document.createElement('div');
        eventEl.className = `all-day-event event-color-${event.color}`;
        eventEl.textContent = event.title;
        eventEl.dataset.eventId = event.id;
        if (event.taskId) eventEl.dataset.taskId = event.taskId;
        dom.allDayEventsContainer.appendChild(eventEl);
    });

    dayEvents.filter(e => !e.allDay).forEach(event => {
        const eventEl = document.createElement('div');
        eventEl.className = `timeline-event event-color-${event.color}`;
        eventEl.textContent = event.title;
        eventEl.dataset.eventId = event.id;
        if (event.taskId) eventEl.dataset.taskId = event.taskId;
        const [startHour, startMinute] = event.startTime.split(':').map(Number);
        const [endHour, endMinute] = event.endTime.split(':').map(Number);
        const top = (startHour + startMinute / 60) * pixelsPerHour;
        const end = (endHour + endMinute / 60) * pixelsPerHour;
        const height = Math.max(10, end - top);
        eventEl.style.top = `${top}px`;
        eventEl.style.height = `${height}px`;
        dom.timelineGrid.appendChild(eventEl);
    });
    updateTimeIndicator();
}

function renderDailySummary() {
    const date = calendarState.selectedDate;
    dom.summaryDate.textContent = date.toLocaleDateString('default', { month: 'short', day: 'numeric' });
    const dateKey = formatDateKey(date);
    const dayEvents = state.events[dateKey] || [];
    const tasksDue = state.tabs.flatMap(tab => tab.sections.flatMap(section => section.tasks.filter(task => task.deadline && formatDateKey(new Date(task.deadline)) === dateKey)));
    const taskEventIds = new Set(tasksDue.map(task => task.deadlineEventId));
    const standaloneEvents = dayEvents.filter(event => !taskEventIds.has(event.id));

    dom.summaryContent.innerHTML = '';
    if (standaloneEvents.length === 0 && tasksDue.length === 0) {
        dom.summaryContent.innerHTML = '<p class="summary-no-items">No events or deadlines.</p>';
        return;
    }

    const allItems = [
        ...standaloneEvents.map(event => ({ type: 'event', data: event, sortKey: event.allDay ? '0' : event.startTime })),
        ...tasksDue.map(task => ({ type: 'task', data: task, sortKey: new Date(task.deadline).toTimeString().substring(0, 5) }))
    ];

    allItems.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    allItems.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'summary-item';
        if (item.type === 'event') {
            const time = item.data.allDay ? 'All-day' : `${formatTimeForDisplay(item.data.startTime)} - ${formatTimeForDisplay(item.data.endTime)}`;
            itemEl.innerHTML = `<div class="summary-item-icon" style="color: var(--event-color-${item.data.color})">${icons.event}</div><div class="summary-item-text"><div>${item.data.title}</div><div class="summary-item-time">${time}</div></div>`;
        } else {
            const time = new Date(item.data.deadline).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            itemEl.dataset.taskId = item.data.id;
            itemEl.innerHTML = `<div class="summary-item-icon" style="color: var(--accent-color-secondary)">${icons.task}</div><div class="summary-item-text"><div>${item.data.text}</div><div class="summary-item-time">Due at ${time}</div></div>`;
        }
        dom.summaryContent.appendChild(itemEl);
    });
}

export function updateTimeIndicator() {
    if (formatDateKey(new Date()) === formatDateKey(calendarState.selectedDate)) {
        dom.currentTimeLine.style.display = 'flex';
        const now = new Date();
        const pixelsPerHour = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--timeline-hour-height'));
        const topPosition = (now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600) * pixelsPerHour;
        dom.currentTimeLine.style.top = `${topPosition}px`;
        dom.currentTimeLabel.textContent = now.toLocaleTimeString('en-GB');
    } else {
        dom.currentTimeLine.style.display = 'none';
    }
}

export function scrollToCurrentTime() {
    if (formatDateKey(new Date()) === formatDateKey(calendarState.selectedDate) && dom.timelineBody) {
        const lineTop = parseFloat(dom.currentTimeLine.style.top || '0');
        dom.timelineBody.scrollTo({ top: lineTop - dom.timelineBody.clientHeight / 2, behavior: 'smooth' });
    }
}