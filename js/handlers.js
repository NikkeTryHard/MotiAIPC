import { dom, icons } from './config.js';
import { state, calendarState, actions, getActiveTab, findTaskInfoById, findTabById } from './state.js';
import { renderAll, renderTabs, renderActiveTabContent, renderCalendar, renderTimelineAndSummary, highlightTask, showToast, startInlineEdit, removeElementWithAnimation, addElement, updateTaskEl, updateLogoIcon } from './ui.js';
import { openPromptModal, openConfirmModal, openEventModal } from './modals.js';

const COLOR_THEMES = ['default', 'velvet'];

// --- UTILITY ---
export const formatDateKey = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- APP HANDLERS ---
export function handleThemeToggle() {
    const newTheme = dom.themeToggle.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('motiAITheme', newTheme);
    updateLogoIcon(newTheme);
}

export function handleThemeColorChange() {
    const currentTheme = document.documentElement.getAttribute('data-color-theme') || 'default';
    const currentIndex = COLOR_THEMES.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % COLOR_THEMES.length;
    const newTheme = COLOR_THEMES[nextIndex];
    
    document.documentElement.setAttribute('data-color-theme', newTheme);
    localStorage.setItem('motiAIColorTheme', newTheme);
}

// --- TABS, SECTIONS, & TASKS HANDLERS ---
export async function handleAddTab() {
    try {
        const result = await openPromptModal({
            title: "New List",
            fields: [{ name: 'title', label: "Enter list name:", value: "New List", required: true }]
        });
        actions.addTab(result.title);
        renderAll(); // Full render is acceptable for major structural changes like adding a tab
        showToast(`List "${result.title}" created.`, 'success');
    } catch (error) { /* User cancelled */ }
}

export function handleRenameTab(tabId, newTitle) {
    actions.updateTab(tabId, { title: newTitle });
    // The UI is updated by startInlineEdit, no re-render needed
}

export async function handleDeleteTab(tabId) {
    if (state.tabs.length <= 1) {
        showToast("You cannot delete the last list.", "error");
        return;
    }
    const tab = findTabById(tabId);
    if (!tab) return;

    const confirmed = await openConfirmModal({
        title: "Delete List?",
        message: `Are you sure you want to delete "${tab.title}"? This cannot be undone.`,
    });

    if (confirmed) {
        const title = tab.title;
        actions.deleteTab(tabId);
        renderAll();
        showToast(`List "${title}" deleted.`, 'info');
    }
}

export function handleSwitchTab(tabId, callback) {
    dom.sectionsContainer.classList.add('fade-out');
    setTimeout(() => {
        actions.setActiveTab(tabId);
        renderTabs();
        renderActiveTabContent();
        dom.sectionsContainer.classList.remove('fade-out');
        if (callback) {
            setTimeout(callback, 50);
        }
    }, 250);
}

export async function handleAddSection() {
    try {
        const result = await openPromptModal({
            title: "New Section",
            fields: [{ name: 'title', label: "Section name:", value: "New Section", required: true }]
        });
        const newSection = actions.addSection(result.title);
        if (newSection) {
            addElement('section', newSection);
            showToast(`Section "${result.title}" added.`, 'success');
        }
    } catch (error) { /* User cancelled */ }
}

export function handleRenameSection(sectionId, newTitle) {
    actions.updateSection(sectionId, { title: newTitle });
}

export async function handleDeleteSection(sectionId, sectionEl) {
    const { section } = findSectionInfoById(sectionId) || {};
    if (!section) return;
    
    const confirmed = await openConfirmModal({
        title: "Delete Section?",
        message: `Delete "${section.title}" and all its tasks?`,
    });

    if (confirmed) {
        actions.deleteSection(sectionId);
        removeElementWithAnimation(sectionEl);
        showToast(`Section "${section.title}" deleted.`, 'info');
    }
}

export async function handleAddTask(sectionId) {
    try {
        const result = await openPromptModal({
            title: "New Task",
            fields: [
                { name: 'text', label: "Task:", value: "", required: true },
                { name: 'info', label: "Info (Optional):", value: "" }
            ]
        });
        const newTask = actions.addTask(sectionId, result);
        if (newTask) {
            addElement('task', newTask, sectionId);
        }
    } catch (error) { /* User cancelled */ }
}

export async function handleEditTask(taskId) {
    const { task } = findTaskInfoById(taskId) || {};
    if (!task) return;
    try {
        const result = await openPromptModal({
            title: "Edit Task",
            fields: [
                { name: 'text', label: "Task:", value: task.text, required: true },
                { name: 'info', label: "Info (Optional):", value: task.info || "" }
            ]
        });
        const updatedTask = actions.updateTask(taskId, result);
        updateTaskEl(taskId, updatedTask);
    } catch (error) { /* User cancelled */ }
}

export async function handleDeleteTask(taskId, taskEl) {
    const { task } = findTaskInfoById(taskId) || {};
    if (!task) return;

    const confirmed = await openConfirmModal({
        title: "Delete Task?",
        message: `Delete task: "${task.text}"?`,
    });

    if (confirmed) {
        if (task.deadlineEventId) {
            const dateKey = formatDateKey(new Date(task.deadline));
            actions.deleteEvent(task.deadlineEventId, dateKey);
            renderCalendar();
            renderTimelineAndSummary();
        }
        actions.deleteTask(taskId);
        removeElementWithAnimation(taskEl);
    }
}

export function handleToggleTask(checkbox, taskId) {
    const updatedTask = actions.updateTask(taskId, { completed: checkbox.checked });
    const li = checkbox.closest('li');
    li.classList.toggle('completed', updatedTask.completed);
    // No need for a full re-render, just update progress
    renderActiveTabContent(true); // partial render
}

export function handleToggleSection(sectionEl, sectionId) {
    const { section } = findSectionInfoById(sectionId) || {};
    if (section) {
        const newCollapsedState = !section.collapsed;
        actions.updateSection(sectionId, { collapsed: newCollapsedState });
        sectionEl.classList.toggle('collapsed', newCollapsedState);
    }
}

export function handleExportTab(tabId) {
    const tab = findTabById(tabId);
    if (!tab) return;
    const cleanData = JSON.parse(JSON.stringify(tab)); // Deep copy to remove observers/proxies
    const { id, ...dataToExport } = cleanData; // Exclude internal ID
    
    const jsonString = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tab.title.replace(/ /g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported "${tab.title}".`, 'success');
}

export function handleImportTab() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = readerEvent => {
            try {
                const data = JSON.parse(readerEvent.target.result);
                if (!data.title || !Array.isArray(data.sections)) {
                    throw new Error("Invalid MotiAI list format.");
                }
                const newTab = actions.importTab(data);
                renderAll();
                showToast(`Successfully imported "${newTab.title}".`, 'success');
            } catch (error) {
                console.error("MotiAI_IMPORT: Failed to import file.", error);
                showToast(`Error importing: ${error.message}`, "error");
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// --- CALENDAR & EVENT HANDLERS ---
export function handleMonthChange(monthOffset) {
    calendarState.currentDate.setMonth(calendarState.currentDate.getMonth() + monthOffset);
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
    const pixelsPerHour = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--timeline-hour-height'));
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
        endTime
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
                title: "Delete Event?",
                message: "Are you sure you want to delete this event?",
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

    } catch (error) { /* User cancelled */ }
}

export function navigateToTask(taskId) {
    const { parentTab } = findTaskInfoById(taskId) || {};
    if (!parentTab) {
        showToast("Could not find the requested task.", "error");
        return;
    }

    if (parentTab.id !== state.activeTabId) {
        handleSwitchTab(parentTab.id, () => highlightTask(taskId));
    } else {
        highlightTask(taskId);
    }
}

// --- DRAG & DROP HANDLERS ---
let draggedItem = null;
export function handleDragStart(e) {
    const target = e.target.closest('.draggable');
    if (!target) return;
    draggedItem = target;
    setTimeout(() => draggedItem.classList.add('dragging'), 0);
}

export function handleDragEnd() {
    if (draggedItem) draggedItem.classList.remove('dragging');
    document.querySelectorAll('.drag-over, .drag-over-end').forEach(el => el.classList.remove('drag-over', 'drag-over-end'));
    draggedItem = null;
}

export function handleDragOver(e) {
    e.preventDefault();
    if (!draggedItem) return;

    document.querySelectorAll('.drag-over, .drag-over-end').forEach(el => el.classList.remove('drag-over', 'drag-over-end'));

    const container = e.target.closest('.task-tabs-nav, .checklist, #sections-container');
    if (!container) return;

    if ((draggedItem.matches('li.draggable') && !container.matches('.checklist')) ||
        (draggedItem.matches('section.draggable') && !container.matches('#sections-container')) ||
        (draggedItem.matches('.task-tab') && !container.matches('.task-tabs-nav'))) {
        return;
    }

    const afterElement = getDragAfterElement(container, e.clientX, e.clientY);

    if (afterElement) {
        afterElement.classList.add('drag-over');
    } else {
        const lastDraggable = [...container.querySelectorAll('.draggable:not(.dragging)')].pop();
        if (lastDraggable) lastDraggable.classList.add('drag-over-end');
    }
}

function getDragAfterElement(container, x, y) {
    const draggableElements = [...container.querySelectorAll('.draggable:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const isHorizontal = container.classList.contains('task-tabs-nav');
        const offset = isHorizontal ? (x - box.left - box.width / 2) : (y - box.top - box.height / 2);
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

export function handleDrop(e) {
    e.preventDefault();
    if (!draggedItem) return;
    const container = e.target.closest('.task-tabs-nav, .checklist, #sections-container');
    if (!container) return;
    const afterElement = getDragAfterElement(container, e.clientX, e.clientY);
    const draggedId = draggedItem.dataset.id || draggedItem.dataset.tabId;
    
    // Abstract reordering logic to be cleaner
    const findIndex = (arr, id) => arr.findIndex(item => item.id === (id || afterElement?.dataset.id || afterElement?.dataset.tabId));
    
    if (draggedItem.matches('.task-tab')) {
        const fromIndex = findIndex(state.tabs, draggedId);
        const toIndex = afterElement ? findIndex(state.tabs) : state.tabs.length;
        actions.reorderTabs(fromIndex, toIndex > fromIndex ? toIndex - 1 : toIndex);
        renderTabs();
    } else if (draggedItem.matches('.section')) {
        const activeTab = getActiveTab();
        if (!activeTab) return;
        const fromIndex = findIndex(activeTab.sections, draggedId);
        const toIndex = afterElement ? findIndex(activeTab.sections) : activeTab.sections.length;
        actions.reorderSections(activeTab.id, fromIndex, toIndex > fromIndex ? toIndex -1 : toIndex);
        renderActiveTabContent();
    } else if (draggedItem.matches('li.draggable')) {
        const startSectionId = draggedItem.closest('.section').dataset.id;
        const endSectionId = e.target.closest('.section').dataset.id;
        const { parentSection: startSection } = findTaskInfoById(draggedId) || {};
        const { section: endSection } = findSectionInfoById(endSectionId) || {};
        if (!startSection || !endSection) return;

        const fromIndex = findIndex(startSection.tasks, draggedId);
        const toIndex = afterElement ? findIndex(endSection.tasks, afterElement.dataset.id) : endSection.tasks.length;
        
        const adjustedToIndex = (startSectionId === endSectionId && toIndex > fromIndex) ? toIndex - 1 : toIndex;

        actions.reorderTask(startSectionId, endSectionId, fromIndex, adjustedToIndex, draggedId);
        renderActiveTabContent();
    }
}