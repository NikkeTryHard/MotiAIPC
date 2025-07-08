import { dom } from './config.js';
import { state, calendarState, saveState, getActiveTab, findTaskAndSectionById } from './state.js';
import { renderAll, renderTabs, renderActiveTabContent, renderCalendar, renderTimelineAndSummary, createSectionEl, createTaskEl, updateProgress, renderEmptyState } from './ui.js';
import { openPromptModal, openConfirmModal, openEventModal, closeEventModal } from './modals.js';

// --- UTILITY ---
export const formatDateKey = (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// --- APP HANDLERS ---
export function handleThemeToggle() {
    const newTheme = dom.themeToggle.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('motiOSTheme', newTheme);
}

// --- INLINE EDITING HANDLER ---
export function startInlineEdit(element, onSave) {
    element.style.display = 'none';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = element.textContent.trim();
    input.className = 'inline-edit-input';
    element.parentNode.insertBefore(input, element.nextSibling);
    input.focus();
    input.select();

    const saveChanges = () => {
        const newValue = input.value.trim();
        if (newValue) {
            onSave(newValue);
            element.textContent = newValue;
        }
        cleanup();
    };

    const cleanup = () => {
        input.remove();
        element.style.display = '';
    };

    input.addEventListener('blur', saveChanges);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveChanges();
        } else if (e.key === 'Escape') {
            cleanup();
        }
    });
}

// --- TABS, SECTIONS, & TASKS HANDLERS ---
export async function handleAddTab() {
    try {
        const title = await openPromptModal({ title: "New List", label: "Enter list name:", value: "New List" });
        const newTab = { id: generateId('tab'), title, mainTitle: "Today's Momentum", sections: [] };
        state.tabs.push(newTab);
        state.activeTabId = newTab.id;
        saveState();
        renderAll();
    } catch (error) {
        console.log("MotiOS_TABS: Add tab action cancelled by user.");
    }
}

export function handleRenameTab(tabId, newTitle) {
    const tab = state.tabs.find(t => t.id === tabId);
    if (!tab) return;
    tab.title = newTitle;
    saveState();
    renderTabs(); // Just re-render tabs, not everything
}

export async function handleDeleteTab(tabId) {
    if (state.tabs.length <= 1) {
        alert("You cannot delete the last list.");
        return;
    }
    const tab = state.tabs.find(t => t.id === tabId);
    if (!tab) return;

    const confirmed = await openConfirmModal({
        title: "Delete List?",
        message: `Are you sure you want to delete the list "${tab.title}" and all its contents? This action cannot be undone.`,
    });

    if (confirmed) {
        state.tabs = state.tabs.filter(t => t.id !== tabId);
        if (state.activeTabId === tabId) {
            state.activeTabId = state.tabs[0].id;
        }
        saveState();
        renderAll();
    }
}

export function handleSwitchTab(tabId) {
    state.activeTabId = tabId;
    saveState();
    renderTabs();
    renderActiveTabContent();
}

export async function handleAddSection() {
    const activeTab = getActiveTab();
    if (!activeTab) return;
    try {
        const title = await openPromptModal({ title: "New Section", label: "Enter section name:", value: "New Section" });
        const newSection = { id: generateId('sec'), title, collapsed: false, tasks: [] };
        activeTab.sections.push(newSection);
        saveState();

        renderEmptyState(); // Remove empty state message if it exists
        const sectionEl = createSectionEl(newSection);
        dom.sectionsContainer.appendChild(sectionEl);
        updateProgress();
    } catch (error) {
        console.log("MotiOS_TASKS: Add section action cancelled.");
    }
}

export function handleRenameSection(sectionId, newTitle) {
    const section = getActiveTab()?.sections.find(s => s.id === sectionId);
    if (!section) return;
    section.title = newTitle;
    saveState();
}

export async function handleDeleteSection(sectionId, sectionEl) {
    const section = getActiveTab()?.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    const confirmed = await openConfirmModal({
        title: "Delete Section?",
        message: `Are you sure you want to delete the section "${section.title}" and all its tasks?`,
    });

    if (confirmed) {
        sectionEl.classList.add('removing');
        sectionEl.addEventListener('animationend', () => {
            getActiveTab().sections = getActiveTab().sections.filter(s => s.id !== sectionId);
            saveState();
            sectionEl.remove();
            updateProgress();
            renderEmptyState();
        }, { once: true });
    }
}

export async function handleAddTask(sectionId) {
    const section = getActiveTab()?.sections.find(s => s.id === sectionId);
    if (!section) return;
    try {
        const text = await openPromptModal({ title: "New Task", label: "Enter task description:", value: "" });
        const newTask = { id: generateId('task'), text, completed: false };
        section.tasks.push(newTask);
        saveState();

        const taskEl = createTaskEl(newTask);
        const checklistEl = document.querySelector(`.section[data-id="${sectionId}"] .checklist`);
        if (checklistEl) {
            checklistEl.appendChild(taskEl);
        }
        updateProgress();
    } catch (error) {
        console.log("MotiOS_TASKS: Add task action cancelled.");
    }
}

export function handleEditTask(taskId, newText) {
    const { task } = findTaskAndSectionById(taskId);
    if (!task) return;
    task.text = newText;
    saveState();
}

export async function handleDeleteTask(taskId, taskEl) {
    const { task, section } = findTaskAndSectionById(taskId);
    if (!task || !section) return;

    const confirmed = await openConfirmModal({
        title: "Delete Task?",
        message: `Are you sure you want to delete the task: "${task.text}"?`,
    });

    if (confirmed) {
        // If task has a deadline, remove the associated event
        if (task.deadlineEventId) {
            const dateKey = formatDateKey(new Date(task.deadline));
            if (state.events[dateKey]) {
                state.events[dateKey] = state.events[dateKey].filter(evt => evt.id !== task.deadlineEventId);
                if (state.events[dateKey].length === 0) {
                    delete state.events[dateKey];
                }
                renderCalendar();
                renderTimelineAndSummary();
            }
        }

        taskEl.classList.add('removing');
        taskEl.addEventListener('animationend', () => {
            section.tasks = section.tasks.filter(t => t.id !== taskId);
            saveState();
            taskEl.remove();
            updateProgress();
        }, { once: true });
    }
}

export function handleToggleTask(checkbox) {
    const li = checkbox.closest('li');
    if (!li) return;
    const { task } = findTaskAndSectionById(li.dataset.id);
    if (task) {
        task.completed = checkbox.checked;
        li.classList.toggle('completed', task.completed);
        saveState();
        updateProgress();
    }
}

export function handleToggleSection(sectionEl) {
    if (!sectionEl) return;
    const sectionId = sectionEl.dataset.id;
    const sectionData = getActiveTab()?.sections.find(s => s.id === sectionId);
    if (sectionData) {
        sectionData.collapsed = !sectionData.collapsed;
        sectionEl.classList.toggle('collapsed', sectionData.collapsed);
        saveState();
    }
}

export function handleExportTab(tabId) {
    const tab = state.tabs.find(t => t.id === tabId);
    if (!tab) return;
    const cleanData = {
        title: tab.title,
        mainTitle: tab.mainTitle,
        sections: tab.sections.map(section => ({
            title: section.title,
            collapsed: section.collapsed,
            tasks: section.tasks.map(task => ({
                text: task.text,
                completed: task.completed,
                deadline: task.deadline || undefined
            }))
        }))
    };
    const jsonString = JSON.stringify(cleanData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tab.title.replace(/ /g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`MotiOS_EXPORT: Exported tab "${tab.title}"`);
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
    const pixelsPerHour = 60;
    const hourDecimal = y / pixelsPerHour;
    const hour = Math.floor(hourDecimal);
    const minute = Math.floor((hourDecimal - hour) * 60);
    
    // Snap to nearest 15 minutes
    const snappedMinute = Math.round(minute / 15) * 15;
    const date = new Date(calendarState.selectedDate);
    date.setHours(hour, snappedMinute, 0, 0);

    const startTime = date.toTimeString().substring(0, 5);
    date.setHours(date.getHours() + 1);
    const endTime = date.toTimeString().substring(0, 5);

    openEventModal({
        title: 'Create Event',
        date: calendarState.selectedDate,
        startTime,
        endTime
    });
}

export function handleEventFormSubmit(e) {
    e.preventDefault();
    const form = dom.eventModal.form;
    const id = form.elements['event-id'].value || generateId('evt');
    const taskId = form.elements['task-id'].value;
    const dateKey = form.elements['event-date'].value;
    const isAllDay = form.elements['all-day-checkbox'].checked;

    const newEvent = {
        id,
        taskId: taskId || null,
        title: form.elements['event-title'].value,
        allDay: isAllDay,
        startTime: isAllDay ? '00:00' : dom.eventModal.startTimeInput.value,
        endTime: isAllDay ? '23:59' : dom.eventModal.endTimeInput.value,
        color: form.elements['event-color'].value,
    };

    if (!state.events[dateKey]) state.events[dateKey] = [];
    const eventIndex = state.events[dateKey].findIndex(evt => evt.id === id);
    if (eventIndex > -1) {
        state.events[dateKey][eventIndex] = newEvent;
    } else {
        state.events[dateKey].push(newEvent);
    }

    if (taskId) {
        const { task } = findTaskAndSectionById(taskId);
        if (task) {
            task.deadline = isAllDay ? `${dateKey}T00:00` : `${dateKey}T${newEvent.startTime}`;
            task.deadlineEventId = id;
        }
    }
    saveState();
    renderAll();
    closeEventModal();
}

export async function handleDeleteEvent() {
    const form = dom.eventModal.form;
    const eventId = form.elements['event-id'].value;
    const dateKey = form.elements['event-date'].value;
    if (!eventId || !dateKey) return;

    const confirmed = await openConfirmModal({
        title: "Delete Event?",
        message: "Are you sure you want to delete this event? This action cannot be undone.",
    });

    if (confirmed) {
        if (!state.events[dateKey]) return;
        const eventIndex = state.events[dateKey].findIndex(evt => evt.id === eventId);
        if (eventIndex > -1) {
            const [deletedEvent] = state.events[dateKey].splice(eventIndex, 1);
            if (state.events[dateKey].length === 0) delete state.events[dateKey];
            if (deletedEvent.taskId) {
                const { task } = findTaskAndSectionById(deletedEvent.taskId);
                if (task) {
                    delete task.deadline;
                    delete task.deadlineEventId;
                }
            }
            saveState();
            renderAll();
            closeEventModal();
        }
    }
}

export function handleAllDayToggle(e) {
    const isChecked = e.target.checked;
    dom.eventModal.form.classList.toggle('all-day-active', isChecked);
    dom.eventModal.startTimeInput.required = !isChecked;
    dom.eventModal.endTimeInput.required = !isChecked;
}

export function handleColorPick(e) {
    const target = e.target.closest('.color-option');
    if (target) {
        document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
        target.classList.add('selected');
        dom.eventModal.form.elements['event-color'].value = target.dataset.color;
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
    if (draggedItem) {
        draggedItem.classList.remove('dragging');
    }
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
        if (lastDraggable) {
            lastDraggable.classList.add('drag-over-end');
        }
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
    
    if (draggedItem.matches('.task-tab')) {
        const fromIndex = state.tabs.findIndex(t => t.id === draggedId);
        const toIndex = afterElement ? state.tabs.findIndex(t => t.id === afterElement.dataset.tabId) : state.tabs.length;
        const [item] = state.tabs.splice(fromIndex, 1);
        state.tabs.splice(toIndex > fromIndex ? toIndex -1 : toIndex, 0, item);
        renderTabs();
    } else if (draggedItem.matches('.section')) {
        const activeTab = getActiveTab();
        if (!activeTab) return;
        const fromIndex = activeTab.sections.findIndex(s => s.id === draggedId);
        const toIndex = afterElement ? activeTab.sections.findIndex(s => s.id === afterElement.dataset.id) : activeTab.sections.length;
        const [item] = activeTab.sections.splice(fromIndex, 1);
        activeTab.sections.splice(toIndex > fromIndex ? toIndex -1 : toIndex, 0, item);
        renderActiveTabContent();
    } else if (draggedItem.matches('li.draggable')) {
        const activeTab = getActiveTab();
        if (!activeTab) return;
        const startSectionEl = draggedItem.closest('.section');
        const endSectionEl = e.target.closest('.section');
        if (!startSectionEl || !endSectionEl) return;
        const startSection = activeTab.sections.find(s => s.id === startSectionEl.dataset.id);
        const endSection = activeTab.sections.find(s => s.id === endSectionEl.dataset.id);
        if (!startSection || !endSection) return;
        const fromIndex = startSection.tasks.findIndex(t => t.id === draggedId);
        const [item] = startSection.tasks.splice(fromIndex, 1);
        const toIndex = afterElement ? endSection.tasks.findIndex(t => t.id === afterElement.dataset.id) : endSection.tasks.length;
        
        if (startSection === endSection) {
             endSection.tasks.splice(toIndex > fromIndex ? toIndex -1 : toIndex, 0, item);
        } else {
             endSection.tasks.splice(toIndex, 0, item);
        }
        renderActiveTabContent();
    }
    saveState();
}