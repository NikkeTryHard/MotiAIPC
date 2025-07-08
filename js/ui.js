import { dom, icons } from './config.js';
import { state, calendarState, getActiveTab, activeInlineEdit } from './state.js';
import { formatDateKey } from './handlers.js';

// --- MAIN RENDER FUNCTION (for initial load) ---
export function renderAll() {
    renderTabs();
    renderActiveTabContent();
    renderCalendar();
    renderTimelineAndSummary();
}

// --- TASK LIST UI (Initial & Full Renders) ---
export function renderTabs() {
    console.log("MotiAI_TABS: Rendering all tabs.");
    const tabs = dom.taskTabsNav.querySelectorAll('.task-tab');
    tabs.forEach(tab => tab.remove());
    
    state.tabs.forEach(tab => {
        const tabEl = document.createElement('button');
        tabEl.className = 'task-tab draggable';
        tabEl.dataset.tabId = tab.id;
        tabEl.draggable = true;
        tabEl.innerHTML = `${icons.grip} <span class="tab-title">${tab.title}</span>`;
        if (tab.id === state.activeTabId) tabEl.classList.add('active');
        dom.taskTabsNav.insertBefore(tabEl, dom.addTabBtn);
    });
}

export function renderActiveTabContent(isPartialUpdate = false) {
    const activeTab = getActiveTab();
    
    // Full render
    if (!isPartialUpdate) {
        dom.sectionsContainer.innerHTML = '';
        if (!activeTab) {
            dom.mainTitleText.textContent = "MotiAI";
            updateProgress();
            return;
        }
        console.log(`MotiAI_TASKS: Rendering content for tab "${activeTab.title}"`);
        dom.mainTitleText.textContent = activeTab.mainTitle || "Today's Momentum";
        
        if (activeTab.sections.length > 0) {
            activeTab.sections.forEach(sectionData => dom.sectionsContainer.appendChild(createSectionEl(sectionData)));
        } else {
            renderEmptyState();
        }
    }
    
    // Always update progress
    updateProgress();
}

export function renderEmptyState() {
    const activeTab = getActiveTab();
    if (activeTab && activeTab.sections.length === 0) {
        dom.sectionsContainer.innerHTML = `<div class="empty-state-message"><h3>This list is empty.</h3><p>Right-click to add a new section.</p></div>`;
    } else if (dom.sectionsContainer.querySelector('.empty-state-message')) {
        dom.sectionsContainer.innerHTML = '';
    }
}

// --- ELEMENT CREATION ---
export function createSectionEl(sectionData) {
    const sectionEl = document.createElement('section');
    sectionEl.className = `section draggable ${sectionData.collapsed ? 'collapsed' : ''}`;
    sectionEl.dataset.id = sectionData.id;
    sectionEl.draggable = true;
    
    const checklistEl = document.createElement('ul');
    checklistEl.className = 'checklist';
    if (Array.isArray(sectionData.tasks)) {
        sectionData.tasks.forEach(taskData => checklistEl.appendChild(createTaskEl(taskData)));
    }
    sectionEl.innerHTML = `
        <div class="section-header">
            ${icons.grip}
            <h3 class="section-title">
                <span>${sectionData.title}</span>
            </h3>
            <div class="section-controls">
                <button class="section-control-btn add-task-btn" title="Add Task" aria-label="Add Task to this section">${icons.add}</button>
                <button class="section-control-btn toggle-section-btn" title="Toggle Collapse" aria-label="Toggle section collapse">${icons.toggle}</button>
            </div>
        </div>
        <div class="checklist-container"><div class="checklist-wrapper"></div></div>`;
    sectionEl.querySelector('.checklist-wrapper').appendChild(checklistEl);
    return sectionEl;
}

export function createTaskEl(taskData) {
    const li = document.createElement('li');
    li.dataset.id = taskData.id;
    li.className = `draggable ${taskData.completed ? 'completed' : ''}`;
    li.draggable = true;
    const uniqueId = `checkbox-${taskData.id}`;
    
    const deadlineDate = taskData.deadline ? new Date(taskData.deadline) : null;
    const deadlineHTML = deadlineDate ? `<div class="task-deadline">Due: ${deadlineDate.toLocaleDateString()} ${deadlineDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>` : '';
    const infoHTML = taskData.info ? `<div class="task-info">${taskData.info}</div>` : '';

    li.innerHTML = `
        <div class="task-main-content">
            ${icons.grip}
            <input type="checkbox" id="${uniqueId}" ${taskData.completed ? 'checked' : ''}>
            <label for="${uniqueId}">
                <span class="custom-checkbox"><span class="checkmark"></span></span>
                <div class="task-text-content">
                    <span class="task-text">${taskData.text}</span>
                </div>
            </label>
        </div>
        ${infoHTML}
        ${deadlineHTML}`;
    return li;
}

// --- SURGICAL DOM & UI UPDATES ---
export function updateTaskEl(taskId, taskData) {
    const li = document.querySelector(`li[data-id="${taskId}"]`);
    if (!li) return;
    const newLi = createTaskEl(taskData);
    li.replaceWith(newLi);
}

export function removeElementWithAnimation(element) {
    if (!element) return;
    element.classList.add('removing');
    element.addEventListener('animationend', () => {
        element.remove();
        renderEmptyState();
        updateProgress();
    }, { once: true });
}

export function addElement(type, data, parentId = null) {
    renderEmptyState(); // Remove empty message if it exists
    if (type === 'section') {
        const sectionEl = createSectionEl(data);
        dom.sectionsContainer.appendChild(sectionEl);
    } else if (type === 'task') {
        const taskEl = createTaskEl(data);
        const checklistEl = document.querySelector(`.section[data-id="${parentId}"] .checklist`);
        if (checklistEl) checklistEl.appendChild(taskEl);
    }
    updateProgress();
}

export function updateProgress() {
    const activeTab = getActiveTab();
    if (!activeTab || !activeTab.sections) {
        if (dom.progressBar) dom.progressBar.style.width = `0%`;
        if (dom.progressText) dom.progressText.textContent = `No tasks in this tab`;
        document.title = "MotiAI";
        return;
    }
    const allTasks = activeTab.sections.flatMap(s => s.tasks || []);
    const completedTasks = allTasks.filter(t => t.completed).length;
    const totalTasks = allTasks.length;
    const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    if (dom.progressBar) dom.progressBar.style.width = `${percentage}%`;
    if (dom.progressText) dom.progressText.textContent = `${completedTasks} of ${totalTasks} tasks completed`;
    document.title = "MotiAI";
}

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

function createDayElement(dayNumber, date, classes = []) {
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

export function highlightTask(taskId) {
    const taskEl = document.querySelector(`li[data-id="${taskId}"]`);
    if (taskEl) {
        taskEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        taskEl.classList.add('highlighted');
        setTimeout(() => taskEl.classList.remove('highlighted'), 1500);
    }
}

// --- ICONS, CONTEXT MENU, TIME PICKER, TOAST, INLINE EDIT ---
export function updateLogoIcon(theme) {
    const iconPath = theme === 'dark' ? 'white_icons/logo.png' : 'icons/logo.png';
    if (dom.logoIcon) {
        dom.logoIcon.src = iconPath;
    }
}

export function showContextMenu(event, menuItems) {
    dom.contextMenu.innerHTML = '';
    menuItems.forEach(item => {
        if (item.type === 'divider') {
            dom.contextMenu.appendChild(document.createElement('div')).className = 'context-menu-divider';
            return;
        }
        const menuItemEl = document.createElement('div');
        menuItemEl.className = `context-menu-item ${item.class || ''}`;
        menuItemEl.innerHTML = item.icon ? `${item.icon} <span>${item.label}</span>` : item.label;
        menuItemEl.addEventListener('click', (e) => {
            e.stopPropagation();
            item.action();
            hideContextMenu();
        });
        dom.contextMenu.appendChild(menuItemEl);
    });
    dom.contextMenu.style.top = `${event.clientY}px`;
    dom.contextMenu.style.left = `${event.clientX}px`;
    dom.contextMenu.classList.remove('hidden');
}

export function hideContextMenu() { dom.contextMenu.classList.add('hidden'); }

let activeTimePickerTarget = null;
export function initTimePicker() {
    const { container, hours, minutes, period } = dom.timePicker;
    for (let i = 1; i <= 12; i++) hours.innerHTML += `<div class="time-picker-option" data-value="${String(i).padStart(2, '0')}">${String(i).padStart(2, '0')}</div>`;
    for (let i = 0; i < 60; i += 5) minutes.innerHTML += `<div class="time-picker-option" data-value="${String(i).padStart(2, '0')}">${String(i).padStart(2, '0')}</div>`;
    period.innerHTML += `<div class="time-picker-option" data-value="AM">AM</div><div class="time-picker-option" data-value="PM">PM</div>`;
    container.addEventListener('click', e => { e.stopPropagation(); if (e.target.closest('.time-picker-option') && activeTimePickerTarget) { e.target.parentElement.querySelectorAll('.selected').forEach(el => el.classList.remove('selected')); e.target.classList.add('selected'); updateTimeFromPicker(); } });
}
export function openTimePicker(targetButton) {
    const { container, hours, minutes, period } = dom.timePicker;
    activeTimePickerTarget = targetButton;
    const hiddenInput = targetButton.id === 'start-time-display' ? dom.eventModal.startTimeInput : dom.eventModal.endTimeInput;
    const [currentHour24, currentMinute] = hiddenInput.value.split(':').map(Number);
    let currentHour12 = currentHour24 % 12 || 12;
    const currentPeriod = currentHour24 >= 12 ? 'PM' : 'AM';
    [hours, minutes, period].forEach(col => col.querySelectorAll('.selected').forEach(el => el.classList.remove('selected')));
    const hourEl = hours.querySelector(`[data-value="${String(currentHour12).padStart(2, '0')}"]`);
    const minuteEl = minutes.querySelector(`[data-value="${String(Math.round(currentMinute / 5) * 5).padStart(2, '0')}"]`);
    const periodEl = period.querySelector(`[data-value="${currentPeriod}"]`);
    if(hourEl) { hourEl.classList.add('selected'); hourEl.scrollIntoView({ block: 'center' }); }
    if(minuteEl) { minuteEl.classList.add('selected'); minuteEl.scrollIntoView({ block: 'center' }); }
    if(periodEl) periodEl.classList.add('selected');
    const rect = targetButton.getBoundingClientRect();
    container.style.top = `${rect.bottom + 5}px`;
    container.style.left = `${rect.left}px`;
    container.classList.remove('hidden');
    document.addEventListener('click', closeTimePickerOnClickOutside, { once: true });
}
function closeTimePickerOnClickOutside(e) { if (!dom.timePicker.container.contains(e.target)) closeTimePicker(); else document.addEventListener('click', closeTimePickerOnClickOutside, { once: true }); }
function closeTimePicker() { if (!dom.timePicker.container.classList.contains('hidden')) { dom.timePicker.container.classList.add('hidden'); activeTimePickerTarget = null; } }
function updateTimeFromPicker() {
    if (!activeTimePickerTarget) return;
    const { hours, minutes, period } = dom.timePicker;
    const hour12 = hours.querySelector('.selected')?.dataset.value || '12';
    const minute = minutes.querySelector('.selected')?.dataset.value || '00';
    const periodVal = period.querySelector('.selected')?.dataset.value || 'AM';
    let hour24 = parseInt(hour12, 10);
    if (periodVal === 'PM' && hour24 < 12) hour24 += 12;
    else if (periodVal === 'AM' && hour24 === 12) hour24 = 0;
    const time24h = `${String(hour24).padStart(2, '0')}:${minute}`;
    const hiddenInput = activeTimePickerTarget.id === 'start-time-display' ? dom.eventModal.startTimeInput : dom.eventModal.endTimeInput;
    hiddenInput.value = time24h;
    activeTimePickerTarget.textContent = formatTimeForDisplay(time24h);
}

export function formatTimeForDisplay(time24h) {
    if (!time24h) return '12:00 AM';
    const [h, m] = time24h.split(':');
    const date = new Date();
    date.setHours(parseInt(h, 10), parseInt(m, 10));
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('exiting');
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}

export function startInlineEdit(element, onSave) {
    if (activeInlineEdit.cleanup) activeInlineEdit.cleanup();
    element.style.display = 'none';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = element.textContent.trim();
    input.className = 'inline-edit-input';
    element.parentNode.insertBefore(input, element.nextSibling);
    input.focus();
    input.select();
    const cleanup = () => {
        input.removeEventListener('blur', saveChanges);
        input.removeEventListener('keydown', handleKey);
        if (document.body.contains(input)) input.remove();
        element.style.display = '';
        activeInlineEdit.cleanup = null;
    };
    activeInlineEdit.cleanup = cleanup;
    const saveChanges = () => {
        const newValue = input.value.trim();
        if (newValue) {
            onSave(newValue);
            element.textContent = newValue;
        }
        cleanup();
    };
    const handleKey = (e) => { if (e.key === 'Enter') saveChanges(); else if (e.key === 'Escape') cleanup(); };
    input.addEventListener('blur', saveChanges);
    input.addEventListener('keydown', handleKey);
}