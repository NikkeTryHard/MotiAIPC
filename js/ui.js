import { dom, icons } from './config.js';
import { state, calendarState, getActiveTab } from './state.js';
import { formatDateKey } from './handlers.js';

// --- MAIN RENDER FUNCTION ---
export function renderAll() {
    renderTabs();
    renderActiveTabContent();
    renderCalendar();
    renderTimelineAndSummary();
}

// --- TASK LIST UI ---
export function renderTabs() {
    console.log("MotiOS_TABS: Rendering all tabs.");
    while (dom.taskTabsNav.firstChild && dom.taskTabsNav.firstChild !== dom.addTabBtn) {
        dom.taskTabsNav.removeChild(dom.taskTabsNav.firstChild);
    }
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

export function renderActiveTabContent() {
    const activeTab = getActiveTab();
    dom.sectionsContainer.innerHTML = '';
    if (!activeTab) {
        console.error("MotiOS_TASKS: No active tab found to render.");
        dom.sectionsContainer.innerHTML = '<p>Select or create a tab to begin.</p>';
        dom.mainTitleText.textContent = "MotiOS";
        updateProgress();
        return;
    }
    console.log(`MotiOS_TASKS: Rendering content for tab "${activeTab.title}" (ID: ${activeTab.id})`);
    dom.mainTitleText.textContent = activeTab.mainTitle || "Today's Momentum";
    
    if (activeTab.sections.length > 0) {
        activeTab.sections.forEach(sectionData => dom.sectionsContainer.appendChild(createSectionEl(sectionData)));
    } else {
        renderEmptyState();
    }
    
    updateProgress();
}

export function renderEmptyState() {
    const activeTab = getActiveTab();
    if (activeTab && activeTab.sections.length === 0) {
        dom.sectionsContainer.innerHTML = `<div class="empty-state-message"><h3>This list is empty.</h3><p>Add a new section to get started.</p></div>`;
    } else if (dom.sectionsContainer.querySelector('.empty-state-message')) {
        dom.sectionsContainer.innerHTML = '';
    }
}

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
                <span class="editable-text">${sectionData.title}</span>
            </h3>
            <div class="section-controls">
                <button class="section-control-btn add-task-btn" title="Add Task">${icons.add}</button>
                <button class="section-control-btn toggle-section-btn" title="Toggle Collapse">${icons.toggle}</button>
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
        ${deadlineHTML}`;
    return li;
}

export function updateProgress() {
    const activeTab = getActiveTab();
    if (!activeTab || !activeTab.sections) {
        if (dom.progressBar) dom.progressBar.style.width = `0%`;
        if (dom.progressText) dom.progressText.textContent = `No tasks in this tab`;
        return;
    }
    const allTasks = activeTab.sections.flatMap(s => s.tasks || []);
    const completedTasks = allTasks.filter(t => t.completed).length;
    const totalTasks = allTasks.length;
    const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    if (dom.progressBar) dom.progressBar.style.width = `${percentage}%`;
    if (dom.progressText) dom.progressText.textContent = `${completedTasks} of ${totalTasks} tasks completed`;
    document.title = `(${(percentage || 0).toFixed(0)}%) MotiOS`;
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
    if (state.events[dayEl.dataset.date] && state.events[dayEl.dataset.date].length > 0) {
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
    for (let i = 0; i < 24; i++) {
        const labelEl = document.createElement('div');
        labelEl.className = 'time-label-item';
        labelEl.textContent = new Date(0, 0, 0, i).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        dom.timeLabelsContainer.appendChild(labelEl);
    }
    
    const dateKey = formatDateKey(date);
    const dayEvents = state.events[dateKey] || [];
    const allDayEvents = dayEvents.filter(e => e.allDay);
    const timedEvents = dayEvents.filter(e => !e.allDay);

    dom.allDayEventsContainer.innerHTML = '';
    allDayEvents.forEach(event => {
        const eventEl = document.createElement('div');
        eventEl.className = `all-day-event event-color-${event.color}`;
        eventEl.textContent = event.title;
        eventEl.dataset.eventId = event.id;
        dom.allDayEventsContainer.appendChild(eventEl);
    });

    timedEvents.forEach(event => {
        const eventEl = document.createElement('div');
        eventEl.className = `timeline-event event-color-${event.color}`;
        eventEl.textContent = event.title;
        eventEl.dataset.eventId = event.id;
        const [startHour, startMinute] = event.startTime.split(':').map(Number);
        const [endHour, endMinute] = event.endTime.split(':').map(Number);
        const pixelsPerHour = 60;
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
    
    const tasksDue = state.tabs.flatMap(tab => 
        tab.sections.flatMap(section => 
            section.tasks.filter(task => task.deadline && formatDateKey(new Date(task.deadline)) === dateKey)
        )
    );

    dom.summaryContent.innerHTML = '';

    if (dayEvents.length === 0 && tasksDue.length === 0) {
        dom.summaryContent.innerHTML = '<p class="summary-no-items">No events or deadlines today.</p>';
        return;
    }

    dayEvents.sort((a, b) => a.allDay ? -1 : b.allDay ? 1 : a.startTime.localeCompare(b.startTime)).forEach(event => {
        const time = event.allDay ? 'All-day' : `${event.startTime} - ${event.endTime}`;
        const itemEl = document.createElement('div');
        itemEl.className = 'summary-item';
        itemEl.innerHTML = `
            <div class="summary-item-icon" style="color: var(--event-color-${event.color})">${icons.event}</div>
            <div class="summary-item-text">
                <div>${event.title}</div>
                <div class="summary-item-time">${time}</div>
            </div>
        `;
        dom.summaryContent.appendChild(itemEl);
    });

    tasksDue.forEach(task => {
        const time = new Date(task.deadline).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const itemEl = document.createElement('div');
        itemEl.className = 'summary-item';
        itemEl.innerHTML = `
            <div class="summary-item-icon" style="color: var(--accent-color-secondary)">${icons.task}</div>
            <div class="summary-item-text">
                <div>${task.text}</div>
                <div class="summary-item-time">Due at ${time}</div>
            </div>
        `;
        dom.summaryContent.appendChild(itemEl);
    });
}

export function updateTimeIndicator() {
    if (formatDateKey(new Date()) === formatDateKey(calendarState.selectedDate)) {
        dom.currentTimeLine.style.display = 'flex';
        const now = new Date();
        const topPosition = (now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600) * 60;
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

// --- CONTEXT MENU UI ---
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

export function hideContextMenu() {
    dom.contextMenu.classList.add('hidden');
}

// --- CUSTOM TIME PICKER UI ---
let activeTimePickerTarget = null;

export function initTimePicker() {
    console.log("MotiOS_TIMEPICKER: Initializing custom time picker.");
    const { container, hours, minutes, period } = dom.timePicker;

    // Populate columns
    for (let i = 1; i <= 12; i++) hours.innerHTML += `<div class="time-picker-option" data-value="${String(i).padStart(2, '0')}">${String(i).padStart(2, '0')}</div>`;
    for (let i = 0; i < 60; i += 5) minutes.innerHTML += `<div class="time-picker-option" data-value="${String(i).padStart(2, '0')}">${String(i).padStart(2, '0')}</div>`;
    period.innerHTML += `<div class="time-picker-option" data-value="AM">AM</div>`;
    period.innerHTML += `<div class="time-picker-option" data-value="PM">PM</div>`;

    container.addEventListener('click', e => {
        e.stopPropagation();
        const option = e.target.closest('.time-picker-option');
        if (option && activeTimePickerTarget) {
            updateTimeFromPicker();
        }
    });
}

export function openTimePicker(targetButton) {
    console.log(`MotiOS_TIMEPICKER: Opening for target ${targetButton.id}`);
    const { container, hours, minutes, period } = dom.timePicker;
    activeTimePickerTarget = targetButton;

    const hiddenInput = targetButton.id === 'start-time-display' ? dom.eventModal.startTimeInput : dom.eventModal.endTimeInput;
    const currentTime = hiddenInput.value; // "HH:mm"
    const [currentHour24, currentMinute] = currentTime.split(':').map(Number);

    let currentHour12 = currentHour24 % 12;
    if (currentHour12 === 0) currentHour12 = 12;
    const currentPeriod = currentHour24 >= 12 ? 'PM' : 'AM';

    // Set selected states
    [hours, minutes, period].forEach(col => col.querySelectorAll('.selected').forEach(el => el.classList.remove('selected')));
    
    const hourEl = hours.querySelector(`[data-value="${String(currentHour12).padStart(2, '0')}"]`);
    const minuteEl = minutes.querySelector(`[data-value="${String(Math.round(currentMinute / 5) * 5).padStart(2, '0')}"]`);
    const periodEl = period.querySelector(`[data-value="${currentPeriod}"]`);

    if(hourEl) hourEl.classList.add('selected');
    if(minuteEl) minuteEl.classList.add('selected');
    if(periodEl) periodEl.classList.add('selected');

    // Scroll into view
    if(hourEl) hourEl.scrollIntoView({ block: 'center' });
    if(minuteEl) minuteEl.scrollIntoView({ block: 'center' });

    // Position and show
    const rect = targetButton.getBoundingClientRect();
    container.style.top = `${rect.bottom + 5}px`;
    container.style.left = `${rect.left}px`;
    container.classList.remove('hidden');

    document.addEventListener('click', closeTimePickerOnClickOutside, { once: true });
}

function closeTimePickerOnClickOutside(e) {
    if (!dom.timePicker.container.contains(e.target)) {
        closeTimePicker();
    } else {
        // Re-add listener if click was inside picker
        document.addEventListener('click', closeTimePickerOnClickOutside, { once: true });
    }
}

export function closeTimePicker() {
    console.log("MotiOS_TIMEPICKER: Closing time picker.");
    dom.timePicker.container.classList.add('hidden');
    activeTimePickerTarget = null;
}

function updateTimeFromPicker() {
    if (!activeTimePickerTarget) return;

    const { hours, minutes, period } = dom.timePicker;
    const hour12 = hours.querySelector('.selected')?.dataset.value || '12';
    const minute = minutes.querySelector('.selected')?.dataset.value || '00';
    const periodVal = period.querySelector('.selected')?.dataset.value || 'AM';

    // Convert to 24h format
    let hour24 = parseInt(hour12, 10);
    if (periodVal === 'PM' && hour24 < 12) {
        hour24 += 12;
    } else if (periodVal === 'AM' && hour24 === 12) {
        hour24 = 0;
    }
    const time24h = `${String(hour24).padStart(2, '0')}:${minute}`;

    // Update DOM
    const hiddenInput = activeTimePickerTarget.id === 'start-time-display' ? dom.eventModal.startTimeInput : dom.eventModal.endTimeInput;
    hiddenInput.value = time24h;
    activeTimePickerTarget.textContent = formatTimeForDisplay(time24h);
}

export function formatTimeForDisplay(time24h) {
    if (!time24h) return '00:00 AM';
    const [h, m] = time24h.split(':');
    const hour = parseInt(h, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    let hour12 = hour % 12;
    if (hour12 === 0) hour12 = 12;
    return `${String(hour12).padStart(2, '0')}:${m} ${period}`;
}