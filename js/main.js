import { dom, icons } from './config.js';
import { state, calendarState, loadState, getActiveTab, findTaskAndSectionById } from './state.js';
import { renderAll, updateTimeIndicator, scrollToCurrentTime, showContextMenu, hideContextMenu, initTimePicker, openTimePicker } from './ui.js';
import * as handlers from './handlers.js';
import { closeEventModal } from './modals.js';

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
        // All inline editing is now handled via context menus for consistency.
    });

    // --- Task List & Header Listeners ---
    dom.addTabBtn.addEventListener('click', handlers.handleAddTab);
    dom.addSectionBtn.addEventListener('click', handlers.handleAddSection);
    
    // Context menu for the main title
    document.querySelector('.main-header-content').addEventListener('contextmenu', e => {
        e.preventDefault();
        const activeTab = getActiveTab();
        if (!activeTab) return;
        showContextMenu(e, [
            {
                label: 'Rename',
                icon: icons.rename,
                action: () => {
                    handlers.startInlineEdit(dom.mainTitleText, (newTitle) => {
                        activeTab.mainTitle = newTitle;
                        handlers.saveState();
                    });
                }
            }
        ]);
    });


    dom.taskTabsNav.addEventListener('click', e => {
        const tabEl = e.target.closest('.task-tab');
        if (tabEl && !e.target.closest('.inline-edit-input') && tabEl.dataset.tabId !== state.activeTabId) {
            handlers.handleSwitchTab(tabEl.dataset.tabId);
        }
    });

    dom.taskTabsNav.addEventListener('contextmenu', e => {
        e.preventDefault();
        const tabEl = e.target.closest('.task-tab');
        if (tabEl) {
            const tabId = tabEl.dataset.tabId;
            showContextMenu(e, [
                { 
                    label: 'Rename List', 
                    icon: icons.rename, 
                    action: () => {
                        const titleEl = tabEl.querySelector('.tab-title');
                        if (titleEl) {
                            handlers.startInlineEdit(titleEl, (newTitle) => handlers.handleRenameTab(tabId, newTitle));
                        }
                    } 
                },
                { label: 'Export to JSON', icon: icons.export, action: () => handlers.handleExportTab(tabId) },
                { type: 'divider' },
                { label: 'Delete List', class: 'danger', icon: icons.delete, action: () => handlers.handleDeleteTab(tabId) }
            ]);
        } else {
            showContextMenu(e, [
                { label: 'Import List from JSON', icon: icons.import, action: handlers.handleImportTab }
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
        else if (target.closest('.toggle-section-btn')) handlers.handleToggleSection(sectionEl);
    });

    dom.sectionsContainer.addEventListener('contextmenu', e => {
        e.preventDefault();
        const taskEl = e.target.closest('li.draggable');
        const sectionHeader = e.target.closest('.section-header');

        if (taskEl) {
            const taskId = taskEl.dataset.id;
            const { task } = findTaskAndSectionById(taskId);
            if (!task) return;
            
            const menuItems = [
                { 
                    label: 'Edit Task', 
                    icon: icons.rename, 
                    action: () => {
                        const textEl = taskEl.querySelector('.task-text');
                        if (textEl) {
                            handlers.startInlineEdit(textEl, (newText) => handlers.handleEditTask(taskId, newText));
                        }
                    }
                }
            ];

            if (task.deadlineEventId) {
                const dateKey = handlers.formatDateKey(new Date(task.deadline));
                const eventData = state.events[dateKey]?.find(evt => evt.id === task.deadlineEventId);
                if (eventData) {
                    menuItems.push({ label: 'Edit Deadline', icon: icons.deadline, action: () => handlers.processEventModal({ title: 'Edit Task Deadline', ...eventData, date: new Date(task.deadline) }) });
                }
            } else {
                menuItems.push({ label: 'Set Deadline', icon: icons.deadline, action: () => handlers.processEventModal({ title: 'Set Task Deadline', taskId: task.id, eventTitle: task.text, date: calendarState.selectedDate }) });
            }
            menuItems.push({ type: 'divider' });
            menuItems.push({ label: 'Delete Task', class: 'danger', icon: icons.delete, action: () => handlers.handleDeleteTask(taskId, taskEl) });
            
            showContextMenu(e, menuItems);

        } else if (sectionHeader) {
            const sectionEl = sectionHeader.closest('.section');
            const sectionId = sectionEl.dataset.id;
            showContextMenu(e, [
                {
                    label: 'Rename Section',
                    icon: icons.rename,
                    action: () => {
                        const titleEl = sectionHeader.querySelector('.section-title span');
                        if (titleEl) {
                            handlers.startInlineEdit(titleEl, (newTitle) => handlers.handleRenameSection(sectionId, newTitle));
                        }
                    }
                },
                { label: 'Add Task to Section', icon: icons.add, action: () => handlers.handleAddTask(sectionId) },
                { type: 'divider' },
                { label: 'Delete Section', class: 'danger', icon: icons.delete, action: () => handlers.handleDeleteSection(sectionId, sectionEl) }
            ]);
        }
    });

    // --- Calendar & Timeline Listeners ---
    dom.prevMonthBtn.addEventListener('click', () => handlers.handleMonthChange(-1));
    dom.nextMonthBtn.addEventListener('click', () => handlers.handleMonthChange(1));
    dom.calendarGrid.addEventListener('click', handlers.handleDateSelect);
    dom.addEventButton.addEventListener('click', () => handlers.processEventModal({ title: 'Create Event', date: calendarState.selectedDate }));
    dom.timelineGrid.addEventListener('click', e => {
        if (!e.target.closest('.timeline-event')) {
            handlers.handleTimelineClick(e);
        }
    });
    
    const openTimelineEventModal = (eventEl) => {
        const eventId = eventEl.dataset.eventId;
        const dateKey = handlers.formatDateKey(calendarState.selectedDate);
        const eventData = state.events[dateKey]?.find(evt => evt.id === eventId);
        if (eventData) handlers.processEventModal({ title: 'Edit Event', ...eventData, date: calendarState.selectedDate });
    };
    dom.timelineGrid.addEventListener('dblclick', e => {
        const eventEl = e.target.closest('.timeline-event');
        if (eventEl) openTimelineEventModal(eventEl);
    });
    dom.allDayEventsContainer.addEventListener('dblclick', e => {
        const eventEl = e.target.closest('.all-day-event');
        if (eventEl) openTimelineEventModal(eventEl);
    });

    // --- Modal Listeners (Now handled within the promise-based modal functions) ---
    // Note: The direct listeners for the event modal are removed as they are now encapsulated.

    // --- Custom Time Picker Listeners ---
    dom.eventModal.startTimeDisplay.addEventListener('click', (e) => {
        e.stopPropagation();
        openTimePicker(e.target);
    });
    dom.eventModal.endTimeDisplay.addEventListener('click', (e) => {
        e.stopPropagation();
        openTimePicker(e.target);
    });


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
    initTimePicker();
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