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
    activeTab.sections.forEach(sectionData => dom.sectionsContainer.appendChild(createSectionEl(sectionData)));
    updateProgress();
}

function createSectionEl(sectionData) {
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
            <h3 class="section-title" title="Click to toggle collapse">${sectionData.title}</h3>
            <div class="section-controls">
                <button class="section-control-btn add-task-btn" title="Add Task">${icons.add}</button>
                <button class="section-control-btn rename-section-btn" title="Rename Section">${icons.rename}</button>
                <button class="section-control-btn delete-section-btn" title="Delete Section">${icons.delete}</button>
                <button class="section-control-btn toggle-section-btn" title="Toggle Collapse">${icons.toggle}</button>
            </div>
        </div>
        <div class="checklist-container"><div class="checklist-wrapper"></div></div>`;
    sectionEl.querySelector('.checklist-wrapper').appendChild(checklistEl);
    return sectionEl;
}

function createTaskEl(taskData) {
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