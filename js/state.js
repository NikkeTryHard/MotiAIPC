import { showToast } from './ui/index.js';

// --- UTILITY ---
const generateId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

// --- STATE INITIALIZATION ---
export let state = {};
export let calendarState = {
  currentDate: new Date(),
  selectedDate: new Date(),
};
export let activeInlineEdit = { cleanup: null };

// Performance-enhancing lookup maps
let lookups = {
  taskMap: new Map(),
  sectionMap: new Map(),
  tabMap: new Map(),
};

const buildLookups = () => {
  lookups.taskMap.clear();
  lookups.sectionMap.clear();
  lookups.tabMap.clear();
  if (!state.tabs) return;

  state.tabs.forEach((tab) => {
    lookups.tabMap.set(tab.id, tab);
    tab.sections.forEach((section) => {
      lookups.sectionMap.set(section.id, { section, parentTab: tab });
      section.tasks.forEach((task) => {
        lookups.taskMap.set(task.id, {
          task,
          parentSection: section,
          parentTab: tab,
        });
      });
    });
  });
};

// --- STATE PERSISTENCE ---
const _saveState = () => {
  console.log('MotiAI_STATE: Saving state to localStorage...');
  try {
    const stateToSave = { ...state };
    delete stateToSave.timeIndicatorInterval; // Don't save interval ID
    localStorage.setItem('motiAIState', JSON.stringify(stateToSave));
  } catch (error) {
    console.error('MotiAI_STATE: CRITICAL - Failed to save state.', error);
    showToast('Error saving data. Changes may be lost.', 'error');
  }
};

// Debounced save for better performance
export const saveState = debounce(_saveState, 500);

export const loadState = async () => {
  console.log('MotiAI_STATE: Loading state...');
  let savedState = localStorage.getItem('motiAIState');
  if (!savedState) {
    savedState = localStorage.getItem('motiOSState');
    if (savedState) {
      localStorage.removeItem('motiOSState'); // remove old key
    }
  }

  if (savedState) {
    try {
      state = JSON.parse(savedState);
      // Migration for old data structures
      if (state.sections && !state.tabs) {
        console.log(
          'MotiAI_STATE: Old state format detected. Migrating to new tabbed structure.'
        );
        state = {
          activeTabId: 'tab-migrated-1',
          tabs: [
            {
              id: 'tab-migrated-1',
              title: 'Main',
              mainTitle: "Today's Momentum",
              sections: state.sections,
            },
          ],
          events: state.events || {},
        };
      }
      if (!state.events) state.events = {};
      if (!state.tabs || state.tabs.length === 0)
        throw new Error('No tabs found, forcing reload from file.');
      state.tabs.forEach((tab) => {
        if (!tab.mainTitle) tab.mainTitle = "Today's Momentum";
      });
      console.log('MotiAI_STATE: SUCCESS - Loaded state from localStorage.');
    } catch (error) {
      console.error(
        'MotiAI_STATE: CRITICAL - Failed to parse state. Will attempt to load from file.',
        error
      );
      showToast('Could not load saved data. Loading defaults.', 'error');
      state = {}; // Reset state before loading from file
    }
  }

  if (!state.tabs) {
    try {
      const response = await fetch('./tasks.json');
      if (!response.ok) throw new Error(`Network response was not ok.`);
      const loadedData = await response.json();
      state = {
        activeTabId: 'tab-initial-1',
        tabs: [
          {
            id: 'tab-initial-1',
            title: 'Work',
            mainTitle: "Today's Momentum",
            sections: loadedData.sections || [],
          },
        ],
        events: loadedData.events || {},
      };
      console.log("MotiAI_STATE: SUCCESS - Loaded state from 'tasks.json'.");
    } catch (error) {
      console.warn(
        `MotiAI_STATE: INFO - Could not fetch 'tasks.json'. Using fallback.`,
        error
      );
      showToast('Welcome! Creating a new workspace for you.', 'info');
      state = {
        activeTabId: 'tab-fb-1',
        tabs: [
          {
            id: 'tab-fb-1',
            title: 'Work',
            mainTitle: "Today's Momentum",
            sections: [],
          },
        ],
        events: {},
      };
    }
  }

  buildLookups();
  saveState();
};

// --- STATE GETTERS (using performant lookups) ---
export const getActiveTab = () => lookups.tabMap.get(state.activeTabId);
export const findTaskInfoById = (taskId) => lookups.taskMap.get(taskId);
export const findSectionInfoById = (sectionId) =>
  lookups.sectionMap.get(sectionId);
export const findTabById = (tabId) => lookups.tabMap.get(tabId);

// --- STATE ACTIONS (Controlled Mutations) ---
export const actions = {
  // --- TABS ---
  addTab: (title) => {
    const newTab = {
      id: generateId('tab'),
      title,
      mainTitle: "Today's Momentum",
      sections: [],
    };
    state.tabs.push(newTab);
    actions.setActiveTab(newTab.id);
    buildLookups();
    saveState();
    return newTab;
  },
  updateTab: (tabId, newProps) => {
    const tab = findTabById(tabId);
    if (tab) {
      Object.assign(tab, newProps);
      saveState();
    }
    return tab;
  },
  deleteTab: (tabId) => {
    const tabIndex = state.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return null;

    const [deletedTab] = state.tabs.splice(tabIndex, 1);
    if (state.activeTabId === tabId) {
      state.activeTabId = state.tabs[0]?.id || null;
    }
    buildLookups();
    saveState();
    return deletedTab;
  },
  reorderTabs: (fromIndex, toIndex) => {
    const [item] = state.tabs.splice(fromIndex, 1);
    state.tabs.splice(toIndex, 0, item);
    saveState();
  },
  setActiveTab: (tabId) => {
    if (state.activeTabId !== tabId) {
      state.activeTabId = tabId;
      saveState();
    }
  },
  importTab: (data) => {
    const newTab = {
      id: generateId('tab'),
      title: data.title || 'Imported List',
      mainTitle: data.mainTitle || "Today's Momentum",
      sections: (data.sections || []).map((section) => ({
        id: generateId('sec'),
        title: section.title || 'Imported Section',
        collapsed: section.collapsed || false,
        tasks: (section.tasks || []).map((task) => ({
          id: generateId('task'),
          text: task.text || 'Imported Task',
          completed: task.completed || false,
          deadline: task.deadline,
          info: task.info,
        })),
      })),
    };
    state.tabs.push(newTab);
    actions.setActiveTab(newTab.id);
    buildLookups();
    saveState();
    return newTab;
  },

  // --- SECTIONS ---
  addSection: (title) => {
    const activeTab = getActiveTab();
    if (!activeTab) return null;
    const newSection = {
      id: generateId('sec'),
      title,
      collapsed: false,
      tasks: [],
    };
    activeTab.sections.push(newSection);
    buildLookups();
    saveState();
    return newSection;
  },
  updateSection: (sectionId, newProps) => {
    const { section } = findSectionInfoById(sectionId) || {};
    if (section) {
      Object.assign(section, newProps);
      saveState();
    }
    return section;
  },
  deleteSection: (sectionId) => {
    const { section, parentTab } = findSectionInfoById(sectionId) || {};
    if (!section || !parentTab) return null;

    const sectionIndex = parentTab.sections.findIndex(
      (s) => s.id === sectionId
    );
    if (sectionIndex === -1) return null;

    const [deletedSection] = parentTab.sections.splice(sectionIndex, 1);
    buildLookups();
    saveState();
    return deletedSection;
  },
  reorderSections: (tabId, fromIndex, toIndex) => {
    const tab = findTabById(tabId);
    if (tab) {
      const [item] = tab.sections.splice(fromIndex, 1);
      tab.sections.splice(toIndex, 0, item);
      saveState();
    }
  },

  // --- TASKS ---
  addTask: (sectionId, { text, info }) => {
    const { section } = findSectionInfoById(sectionId) || {};
    if (!section) return null;
    const newTask = { id: generateId('task'), text, info, completed: false };
    section.tasks.push(newTask);
    buildLookups();
    saveState();
    return newTask;
  },
  updateTask: (taskId, newProps) => {
    const { task } = findTaskInfoById(taskId) || {};
    if (task) {
      Object.assign(task, newProps);
      saveState();
    }
    return task;
  },
  deleteTask: (taskId) => {
    const { task, parentSection } = findTaskInfoById(taskId) || {};
    if (!task || !parentSection) return null;

    const taskIndex = parentSection.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return null;

    const [deletedTask] = parentSection.tasks.splice(taskIndex, 1);
    buildLookups();
    saveState();
    return deletedTask;
  },
  reorderTask: (startSectionId, endSectionId, fromIndex, toIndex) => {
    const { section: startSection } = findSectionInfoById(startSectionId) || {};
    const { section: endSection } = findSectionInfoById(endSectionId) || {};
    if (!startSection || !endSection) return;

    const [item] = startSection.tasks.splice(fromIndex, 1);
    endSection.tasks.splice(toIndex, 0, item);

    buildLookups();
    saveState();
  },

  // --- EVENTS ---
  saveEvent: (eventData) => {
    const { id, dateKey, taskId, isAllDay } = eventData;
    if (!state.events[dateKey]) state.events[dateKey] = [];

    const eventIndex = state.events[dateKey].findIndex((evt) => evt.id === id);
    const eventToSave = { ...eventData };
    delete eventToSave.dateKey;
    delete eventToSave.isAllDay;

    if (eventIndex > -1) {
      // Merge new data into existing event to prevent data loss
      Object.assign(state.events[dateKey][eventIndex], eventToSave);
    } else {
      state.events[dateKey].push(eventToSave);
    }

    if (taskId) {
      const { task } = findTaskInfoById(taskId) || {};
      if (task) {
        task.deadline = isAllDay
          ? `${dateKey}T00:00`
          : `${dateKey}T${eventToSave.startTime}`;
        task.deadlineEventId = id;
      }
    }
    saveState();
  },
  deleteEvent: (eventId, dateKey) => {
    if (!state.events[dateKey]) return;
    const eventIndex = state.events[dateKey].findIndex(
      (evt) => evt.id === eventId
    );
    if (eventIndex > -1) {
      const [deletedEvent] = state.events[dateKey].splice(eventIndex, 1);
      if (state.events[dateKey].length === 0) delete state.events[dateKey];

      if (deletedEvent.taskId) {
        const { task } = findTaskInfoById(deletedEvent.taskId) || {};
        if (task) {
          delete task.deadline;
          delete task.deadlineEventId;
        }
      }
    }
    saveState();
  },
};
