import { formatDateKey } from './handlers.js';

export let state = {};
export let calendarState = { currentDate: new Date(), selectedDate: new Date() };
export let activeInlineEdit = { cleanup: null };

export const getActiveTab = () => (state.tabs && state.activeTabId) ? state.tabs.find(t => t.id === state.activeTabId) : null;

export const findTaskAndSectionById = (taskId) => {
    const activeTab = getActiveTab();
    if (!activeTab) return { task: null, section: null };
    for (const section of activeTab.sections) {
        const task = section.tasks.find(t => t.id === taskId);
        if (task) return { task, section };
    }
    return { task: null, section: null };
};

export const findTaskAndSectionAndTabById = (taskId) => {
    if (!state.tabs) return { task: null, section: null, tab: null };
    for (const tab of state.tabs) {
        for (const section of tab.sections) {
            const task = section.tasks.find(t => t.id === taskId);
            if (task) return { task, section, tab };
        }
    }
    return { task: null, section: null, tab: null };
};

export const saveState = () => {
    console.log("MotiOS_STATE: Saving state to localStorage...");
    try {
        // Clean up any potential circular references or non-serializable data before saving
        const stateToSave = { ...state };
        delete stateToSave.timeIndicatorInterval;
        localStorage.setItem('motiOSState', JSON.stringify(stateToSave));
        console.log("MotiOS_STATE: SUCCESS - State saved.");
    } catch (error) {
        console.error("MotiOS_STATE: CRITICAL - Failed to save state.", error);
    }
};

export const loadState = async () => {
    console.log("MotiOS_STATE: Loading state...");
    const savedState = localStorage.getItem('motiOSState');
    if (savedState) {
        try {
            state = JSON.parse(savedState);
            // Migration for old data structures
            if (state.sections && !state.tabs) {
                console.log("MotiOS_STATE: Old state format detected. Migrating to new tabbed structure.");
                state = {
                    activeTabId: 'tab-migrated-1',
                    tabs: [{ id: 'tab-migrated-1', title: 'Main', mainTitle: "Today's Momentum", sections: state.sections }],
                    events: state.events || {}
                };
                saveState();
            }
            if (!state.events) state.events = {};
            if (!state.tabs || state.tabs.length === 0) throw new Error("No tabs found, forcing reload from file.");
            
            // Ensure all tabs have a mainTitle
            state.tabs.forEach(tab => {
                if (!tab.mainTitle) {
                    tab.mainTitle = "Today's Momentum";
                }
            });

            console.log("MotiOS_STATE: SUCCESS - Loaded state from localStorage.");
            return;
        } catch (error) {
            console.error("MotiOS_STATE: CRITICAL - Failed to parse state from localStorage. Will attempt to load from file.", error);
        }
    }
    try {
        const response = await fetch('./tasks.json');
        if (!response.ok) throw new Error(`Network response was not ok.`);
        const loadedData = await response.json();
        state = {
            activeTabId: "tab-initial-1",
            tabs: [{ id: "tab-initial-1", title: "Work", mainTitle: "Today's Momentum", sections: loadedData.sections || [] }],
            events: loadedData.events || {}
        };
        console.log("MotiOS_STATE: SUCCESS - Loaded and formatted state from 'tasks.json'.");
    } catch (error) {
        console.warn(`MotiOS_STATE: INFO - Could not fetch 'tasks.json'. Using fallback.`, error);
        state = {
            activeTabId: "tab-fb-1",
            tabs: [{ id: "tab-fb-1", title: "Work", mainTitle: "Today's Momentum", sections: [] }],
            events: {}
        };
    }
    saveState();
};