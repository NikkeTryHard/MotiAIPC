import { dom } from '../config.js';
import {
  state,
  actions,
  findTaskInfoById,
  findTabById,
  findSectionInfoById,
} from '../state.js';
import {
  renderTabs,
  renderActiveTabContent,
  showToast,
  removeElementWithAnimation,
  addElement,
  updateTaskEl,
  addTabEl,
  removeTabEl,
} from '../ui/index.js';
import { openPromptModal, openConfirmModal } from '../modals.js';
import { formatDateKey } from './scheduleHandlers.js';

// --- TABS, SECTIONS, & TASKS HANDLERS ---
export async function handleAddTab() {
  try {
    const result = await openPromptModal({
      title: 'New List',
      fields: [
        {
          name: 'title',
          label: 'Enter list name:',
          value: 'New List',
          required: true,
        },
      ],
    });
    const newTab = actions.addTab(result.title);
    addTabEl(newTab); // Surgical DOM update
    handleSwitchTab(newTab.id); // Switch to the new tab
    showToast(`List "${result.title}" created.`, 'success');
  } catch {
    /* User cancelled */
  }
}

export function handleRenameTab(tabId, newTitle) {
  actions.updateTab(tabId, { title: newTitle });
  // The UI is updated by startInlineEdit, no re-render needed
}

export async function handleDeleteTab(tabId) {
  if (state.tabs.length <= 1) {
    showToast('You cannot delete the last list.', 'error');
    return;
  }
  const tab = findTabById(tabId);
  if (!tab) return;

  const confirmed = await openConfirmModal({
    title: 'Delete List?',
    message: `Are you sure you want to delete "${tab.title}"? This cannot be undone.`,
  });

  if (confirmed) {
    const deletedTab = actions.deleteTab(tabId);
    if (deletedTab) {
      removeTabEl(tabId); // Surgical DOM update
      // If the active tab was deleted, switch to the new active one
      if (tabId === state.activeTabId) {
        handleSwitchTab(state.activeTabId);
      }
      showToast(`List "${deletedTab.title}" deleted.`, 'info');
    }
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
      title: 'New Section',
      fields: [
        {
          name: 'title',
          label: 'Section name:',
          value: 'New Section',
          required: true,
        },
      ],
    });
    const newSection = actions.addSection(result.title);
    if (newSection) {
      addElement('section', newSection);
      showToast(`Section "${result.title}" added.`, 'success');
    }
  } catch {
    /* User cancelled */
  }
}

export function handleRenameSection(sectionId, newTitle) {
  actions.updateSection(sectionId, { title: newTitle });
}

export async function handleDeleteSection(sectionId, sectionEl) {
  const { section } = findSectionInfoById(sectionId) || {};
  if (!section) return;

  const confirmed = await openConfirmModal({
    title: 'Delete Section?',
    message: `Delete "${section.title}" and all its tasks?`,
  });

  if (confirmed) {
    const deletedSection = actions.deleteSection(sectionId);
    if (deletedSection) {
      removeElementWithAnimation(sectionEl);
      showToast(`Section "${deletedSection.title}" deleted.`, 'info');
    }
  }
}

export async function handleAddTask(sectionId) {
  try {
    const result = await openPromptModal({
      title: 'New Task',
      fields: [
        { name: 'text', label: 'Task:', value: '', required: true },
        { name: 'info', label: 'Info (Optional):', value: '' },
      ],
    });
    const newTask = actions.addTask(sectionId, result);
    if (newTask) {
      addElement('task', newTask, sectionId);
    }
  } catch {
    /* User cancelled */
  }
}

export async function handleEditTask(taskId) {
  const { task } = findTaskInfoById(taskId) || {};
  if (!task) return;
  try {
    const result = await openPromptModal({
      title: 'Edit Task',
      fields: [
        { name: 'text', label: 'Task:', value: task.text, required: true },
        { name: 'info', label: 'Info (Optional):', value: task.info || '' },
      ],
    });
    const updatedTask = actions.updateTask(taskId, result);
    updateTaskEl(taskId, updatedTask);
  } catch {
    /* User cancelled */
  }
}

export async function handleDeleteTask(taskId, taskEl) {
  const { task } = findTaskInfoById(taskId) || {};
  if (!task) return;

  const confirmed = await openConfirmModal({
    title: 'Delete Task?',
    message: `Delete task: "${task.text}"?`,
  });

  if (confirmed) {
    if (task.deadlineEventId) {
      const dateKey = formatDateKey(new Date(task.deadline));
      actions.deleteEvent(task.deadlineEventId, dateKey);
      // Re-rendering calendar/timeline is handled by processEventModal or needs to be called
    }
    const deletedTask = actions.deleteTask(taskId);
    if (deletedTask) {
      removeElementWithAnimation(taskEl);
    }
  }
}

export function handleToggleTask(checkbox, taskId) {
  const updatedTask = actions.updateTask(taskId, {
    completed: checkbox.checked,
  });
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
  // eslint-disable-next-line no-unused-vars
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
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      try {
        const data = JSON.parse(readerEvent.target.result);
        if (!data.title || !Array.isArray(data.sections)) {
          throw new Error('Invalid MotiAI list format.');
        }
        const newTab = actions.importTab(data);
        // A full render is appropriate here as a new tab is added and activated
        renderTabs();
        handleSwitchTab(newTab.id);
        showToast(`Successfully imported "${newTab.title}".`, 'success');
      } catch (error) {
        console.error('MotiAI_IMPORT: Failed to import file.', error);
        showToast(`Error importing: ${error.message}`, 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
