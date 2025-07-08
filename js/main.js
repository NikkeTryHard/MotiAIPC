import { dom, icons } from './config.js';
import { state, calendarState, loadState, getActiveTab } from './state.js';
import { renderAll, updateTimeIndicator, scrollToCurrentTime, showContextMenu, hideContextMenu } from './ui.js';
import * as handlers from './handlers.js';
import { openEventModal } from './modals.js';

// =================================================================================
// --- EVENT HANDLERS & INITIALIZATION ---
// =================================================================================

function setupEventListeners() {
    console.log("MotiOS_EVENTS: Setting up all event listeners.");
    
    // --- Global & App Listeners ---
    dom.themeToggle.addEventListener('change', handlers.handleThemeToggle);
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-context-menu')) {
            hideContextMenu();
        }
    });

    // --- Task List Listeners ---
    dom.addTabBtn.addEventListener('click', handlers.handleAddTab);
    dom.addSectionBtn.addEventListener('click', handlers.handleAddSection);
    dom.mainTitleText.addEventListener('click', handlers.handleRenameMainTitle);

    dom.taskTabsNav.addEventListener('click', e => {
        const tabEl = e.target.closest('.task-tab');
        if (tabEl && tabEl.dataset.tabId !== state.activeTabId) {
            handlers.handleSwitchTab(tabEl.dataset.tabId);
        }
    });

    dom.taskTabsNav.addEventListener('contextmenu', e => {
        e.preventDefault();
        const tabEl = e.target.closest('.task-tab');
        if (tabEl) {
            const tabId = tabEl.dataset.tabId;
            showContextMenu(e, [
                { label: 'Rename List', icon: icons.rename, action: () => handlers.handleRenameTab(tabId) },
                { type: 'divider' },
                { label: 'Export to JSON', icon: icons.export, action: () => handlers.handleExportTab(tabId) },
                { label: 'Delete List', class: 'danger', icon: icons.delete, action: () => handlers.handleDeleteTab(tabId) }
            ]);
        }
    });

    dom.sectionsContainer.addEventListener('change', e => {
        if (e.target.matches('input[type="checkbox"]')) {
            handlers.handleToggleTask(e.target);
        }
    });

    dom.sectionsContainer.addEventListener('click', e => {
        const target = e.target;
        const sectionEl = target.closest('.section');
        if (!sectionEl) return;
        const sectionId = sectionEl.dataset.id;

        if (target.closest('.add-task-btn')) handlers.handleAddTask(sectionId);
        else if (target.closest('.rename-section-btn')) handlers.handleRenameSection(sectionId);
        else if (target.closest('.delete-section-btn')) handlers.handleDeleteSection(sectionId);
        else if (target.closest('.toggle-section-btn') || target.closest('.section-title')) handlers.handleToggleSection(sectionEl);
    });

    dom.sectionsContainer.addEventListener('contextmenu', e => {
        e.preventDefault();
        const taskEl = e.target.closest('li.draggable');
        if (taskEl) {
            const taskId = taskEl.dataset.id;
            const { task } = getActiveTab().sections.flatMap(s => s.tasks).find(t => t.id === taskId) ? { task: getActiveTab().sections.flatMap(s => s.tasks).find(t => t.id === taskId) } : { task: null };
            if (!task) return;
            showContextMenu(e, [
                { label: 'Edit Task', icon: icons.rename, action: () => handlers.handleEditTask(taskId) },
                { label: 'Set Deadline', icon: icons.deadline, action: () => openEventModal({ title: 'Set Task Deadline', taskId: task.id, eventTitle: task.text, date: calendarState.selectedDate }) },
                { type: 'divider' },
                { label: 'Delete Task', class: 'danger', icon: icons.delete, action: () => handlers.handleDeleteTask(taskId) }
            ]);
        }
    });

    // --- Calendar & Timeline Listeners ---
    dom.prevMonthBtn.addEventListener('click', () => handlers.handleMonthChange(-1));
    dom.nextMonthBtn.addEventListener('click', () => handlers.handleMonthChange(1));
    dom.calendarGrid.addEventListener('click', handlers.handleDateSelect);
    dom.addEventButton.addEventListener('click', () => openEventModal({ title: 'Create Event', date: calendarState.selectedDate }));
    
    const openTimelineEventModal = (eventEl) => {
        const eventId = eventEl.dataset.eventId;
        const dateKey = handlers.formatDateKey(calendarState.selectedDate);
        const eventData = state.events[dateKey]?.find(evt => evt.id === eventId);
        if (eventData) openEventModal({ title: 'Edit Event', ...eventData, date: calendarState.selectedDate });
    };
    dom.timelineGrid.addEventListener('click', e => {
        const eventEl = e.target.closest('.timeline-event');
        if (eventEl) openTimelineEventModal(eventEl);
    });
    dom.allDayEventsContainer.addEventListener('click', e => {
        const eventEl = e.target.closest('.all-day-event');
        if (eventEl) openTimelineEventModal(eventEl);
    });

    // --- Modal Listeners ---
    dom.eventModal.form.addEventListener('submit', handlers.handleEventFormSubmit);
    dom.eventModal.deleteBtn.addEventListener('click', handlers.handleDeleteEvent);
    dom.eventModal.cancelBtn.addEventListener('click', handlers.closeEventModal);
    dom.eventModal.backdrop.addEventListener('click', (e) => { if (e.target === dom.eventModal.backdrop) handlers.closeEventModal(); });
    dom.eventModal.allDayCheckbox.addEventListener('change', handlers.handleAllDayToggle);
    dom.eventModal.colorPicker.addEventListener('click', handlers.handleColorPick);

    // --- Drag & Drop Listeners ---
    document.addEventListener('dragstart', handlers.handleDragStart);
    document.addEventListener('dragend', handlers.handleDragEnd);
    document.addEventListener('dragover', handlers.handleDragOver);
    document.addEventListener('drop', handlers.handleDrop);
}

async function init() {
    console.log("========================================");
    console.log(" MotiOS System Initialization Sequence ");
    console.log("========================================");
    
    const savedTheme = localStorage.getItem('motiOSTheme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
    dom.themeToggle.checked = savedTheme === 'dark';

    await loadState();
    setupEventListeners();
    renderAll();
    
    if (state.timeIndicatorInterval) clearInterval(state.timeIndicatorInterval);
    state.timeIndicatorInterval = setInterval(updateTimeIndicator, 1000);
    setTimeout(scrollToCurrentTime, 500);

    console.log("========================================");
    console.log(" MotiOS System Initialized. Welcome. ");
    console.log("========================================");
}

init();