/* eslint-disable no-console */
import { dom, icons } from './config.js';
import {
  state,
  calendarState,
  loadState,
  getActiveTab,
  findTaskInfoById,
  actions,
  activeInlineEdit,
} from './state.js';
import {
  renderAll,
  updateTimeIndicator,
  scrollToCurrentTime,
  showContextMenu,
  hideContextMenu,
  initTimePicker,
  openTimePicker,
  startInlineEdit,
} from './ui/index.js';
import * as handlers from './handlers/index.js';

// =================================================================================
// --- EVENT HANDLERS & INITIALIZATION ---
// =================================================================================

function setupEventListeners() {
  console.log('MotiAI_EVENTS: Setting up all event listeners.');

  // --- Global & App Listeners ---
  dom.themeToggle.addEventListener('change', handlers.handleThemeToggle);
  dom.themeColorBtn.addEventListener('click', handlers.handleThemeColorChange);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-context-menu')) hideContextMenu();
    if (activeInlineEdit.cleanup && !e.target.closest('.inline-edit-input'))
      activeInlineEdit.cleanup();
  });

  // --- Task List & Header Listeners ---
  dom.addTabBtn.addEventListener('click', handlers.handleAddTab);

  dom.mainTitleText.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const tab = getActiveTab();
    if (!tab) return;
    showContextMenu(e, [
      {
        label: 'Rename',
        icon: icons.rename,
        action: () =>
          startInlineEdit(dom.mainTitleText, (newTitle) =>
            actions.updateTab(tab.id, { mainTitle: newTitle })
          ),
      },
    ]);
  });

  dom.taskTabsNav.addEventListener('click', (e) => {
    const tabEl = e.target.closest('.task-tab');
    if (
      tabEl &&
      !e.target.closest('.inline-edit-input') &&
      tabEl.dataset.tabId !== state.activeTabId
    ) {
      handlers.handleSwitchTab(tabEl.dataset.tabId);
    }
  });

  dom.taskTabsNav.addEventListener('contextmenu', (e) => {
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
            if (titleEl)
              startInlineEdit(titleEl, (newTitle) =>
                handlers.handleRenameTab(tabId, newTitle)
              );
          },
        },
        {
          label: 'Export to JSON',
          icon: icons.export,
          action: () => handlers.handleExportTab(tabId),
        },
        { type: 'divider' },
        {
          label: 'Delete List',
          class: 'danger',
          icon: icons.delete,
          action: () => handlers.handleDeleteTab(tabId),
        },
      ]);
    } else {
      showContextMenu(e, [
        {
          label: 'Import List from JSON',
          icon: icons.import,
          action: handlers.handleImportTab,
        },
      ]);
    }
  });

  dom.sectionsContainer.addEventListener('change', (e) => {
    if (e.target.matches('input[type="checkbox"]')) {
      const taskId = e.target.closest('li')?.dataset.id;
      if (taskId) handlers.handleToggleTask(e.target, taskId);
    }
  });

  dom.sectionsContainer.addEventListener('click', (e) => {
    const target = e.target;
    const sectionEl = target.closest('.section');
    if (target.closest('.add-task-btn')) {
      if (sectionEl) handlers.handleAddTask(sectionEl.dataset.id);
    } else if (target.closest('.toggle-section-btn')) {
      if (sectionEl)
        handlers.handleToggleSection(sectionEl, sectionEl.dataset.id);
    }
  });

  dom.sectionsContainer.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const taskEl = e.target.closest('li.draggable');
    const sectionHeader = e.target.closest('.section-header');

    if (taskEl) {
      const taskId = taskEl.dataset.id;
      const { task } = findTaskInfoById(taskId) || {};
      if (!task) return;

      const menuItems = [
        {
          label: 'Edit Task',
          icon: icons.rename,
          action: () => handlers.handleEditTask(taskId),
        },
      ];
      if (task.deadlineEventId) {
        const dateKey = handlers.formatDateKey(new Date(task.deadline));
        const eventData = state.events[dateKey]?.find(
          (evt) => evt.id === task.deadlineEventId
        );
        if (eventData)
          menuItems.push({
            label: 'Edit Deadline',
            icon: icons.deadline,
            action: () =>
              handlers.processEventModal({
                ...eventData,
                title: 'Edit Task Deadline',
                eventTitle: eventData.title,
                date: new Date(task.deadline),
                taskId,
              }),
          });
      } else {
        menuItems.push({
          label: 'Set Deadline',
          icon: icons.deadline,
          action: () =>
            handlers.processEventModal({
              title: 'Set Task Deadline',
              taskId: task.id,
              eventTitle: task.text,
              date: calendarState.selectedDate,
            }),
        });
      }
      menuItems.push({ type: 'divider' });
      menuItems.push({
        label: 'Delete Task',
        class: 'danger',
        icon: icons.delete,
        action: () => handlers.handleDeleteTask(taskId, taskEl),
      });

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
            if (titleEl)
              startInlineEdit(titleEl, (newTitle) =>
                handlers.handleRenameSection(sectionId, newTitle)
              );
          },
        },
        {
          label: 'Add Task to Section',
          icon: icons.add,
          action: () => handlers.handleAddTask(sectionId),
        },
        { type: 'divider' },
        {
          label: 'Delete Section',
          class: 'danger',
          icon: icons.delete,
          action: () => handlers.handleDeleteSection(sectionId, sectionEl),
        },
      ]);
    } else {
      showContextMenu(e, [
        {
          label: 'Add New Section',
          icon: icons.add,
          action: handlers.handleAddSection,
        },
      ]);
    }
  });

  // --- Calendar & Timeline Listeners ---
  dom.prevMonthBtn.addEventListener('click', () =>
    handlers.handleMonthChange(-1)
  );
  dom.nextMonthBtn.addEventListener('click', () =>
    handlers.handleMonthChange(1)
  );
  dom.calendarGrid.addEventListener('click', handlers.handleDateSelect);
  dom.addEventButton.addEventListener('click', () =>
    handlers.processEventModal({
      title: 'Create Event',
      date: calendarState.selectedDate,
    })
  );

  dom.timelineGrid.addEventListener('click', (e) => {
    const eventEl = e.target.closest('.timeline-event');
    if (eventEl?.dataset.taskId) {
      handlers.navigateToTask(eventEl.dataset.taskId);
    } else if (!eventEl) {
      handlers.handleTimelineClick(e);
    }
  });

  const openTimelineEventModal = (eventEl) => {
    const eventId = eventEl.dataset.eventId;
    const dateKey = handlers.formatDateKey(calendarState.selectedDate);
    const eventData = state.events[dateKey]?.find((evt) => evt.id === eventId);
    if (eventData)
      handlers.processEventModal({
        ...eventData,
        title: 'Edit Event',
        eventTitle: eventData.title,
        date: calendarState.selectedDate,
      });
  };

  dom.timelineGrid.addEventListener('dblclick', (e) => {
    const eventEl = e.target.closest('.timeline-event');
    if (eventEl) openTimelineEventModal(eventEl);
  });
  dom.allDayEventsContainer.addEventListener('dblclick', (e) => {
    const eventEl = e.target.closest('.all-day-event');
    if (eventEl) openTimelineEventModal(eventEl);
  });

  dom.summaryContent.addEventListener('click', (e) => {
    const summaryItem = e.target.closest('.summary-item[data-task-id]');
    if (summaryItem) handlers.navigateToTask(summaryItem.dataset.taskId);
  });

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
  console.log('========================================');
  console.log(' MotiAI System Initialization Sequence ');
  console.log('========================================');

  let savedTheme = localStorage.getItem('motiAITheme');
  if (!savedTheme) {
    savedTheme =
      localStorage.getItem('motiOSTheme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light');
    if (localStorage.getItem('motiOSTheme'))
      localStorage.removeItem('motiOSTheme');
  }

  let savedColorTheme = localStorage.getItem('motiAIColorTheme');
  if (!savedColorTheme) {
    savedColorTheme = localStorage.getItem('motiOSColorTheme') || 'default';
    if (localStorage.getItem('motiOSColorTheme'))
      localStorage.removeItem('motiOSColorTheme');
  }

  document.documentElement.setAttribute('data-theme', savedTheme);
  document.documentElement.setAttribute('data-color-theme', savedColorTheme);
  dom.themeToggle.checked = savedTheme === 'dark';
  dom.themeColorBtn.innerHTML = icons.palette;

  await loadState();
  initTimePicker();
  setupEventListeners();
  renderAll();

  if (state.timeIndicatorInterval) clearInterval(state.timeIndicatorInterval);
  state.timeIndicatorInterval = setInterval(updateTimeIndicator, 1000);
  setTimeout(scrollToCurrentTime, 500);

  console.log('========================================');
  console.log(' MotiAI System Initialized. Welcome. ');
  console.log('========================================');
}

init();
