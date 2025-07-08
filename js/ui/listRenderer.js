import { dom, icons } from '../config.js';
import { state, getActiveTab } from '../state.js';

// --- TASK LIST UI (Initial & Full Renders) ---
export function renderTabs() {
    console.log("MotiAI_TABS: Rendering all tabs.");
    const tabs = dom.taskTabsNav.querySelectorAll('.task-tab');
    tabs.forEach(tab => tab.remove());
    
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

export function renderActiveTabContent(isPartialUpdate = false) {
    const activeTab = getActiveTab();
    
    // Full render
    if (!isPartialUpdate) {
        dom.sectionsContainer.innerHTML = '';
        if (!activeTab) {
            dom.mainTitleText.textContent = "MotiAI";
            updateProgress();
            return;
        }
        console.log(`MotiAI_TASKS: Rendering content for tab "${activeTab.title}"`);
        dom.mainTitleText.textContent = activeTab.mainTitle || "Today's Momentum";
        
        if (activeTab.sections.length > 0) {
            activeTab.sections.forEach(sectionData => dom.sectionsContainer.appendChild(createSectionEl(sectionData)));
        } else {
            renderEmptyState();
        }
    }
    
    // Always update progress
    updateProgress();
}

export function renderEmptyState() {
    const activeTab = getActiveTab();
    if (activeTab && activeTab.sections.length === 0) {
        dom.sectionsContainer.innerHTML = `<div class="empty-state-message"><h3>This list is empty.</h3><p>Right-click to add a new section.</p></div>`;
    } else if (dom.sectionsContainer.querySelector('.empty-state-message')) {
        dom.sectionsContainer.innerHTML = '';
    }
}

// --- ELEMENT CREATION ---
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
                <span>${sectionData.title}</span>
            </h3>
            <div class="section-controls">
                <button class="section-control-btn add-task-btn" title="Add Task" aria-label="Add Task to this section">${icons.add}</button>
                <button class="section-control-btn toggle-section-btn" title="Toggle Collapse" aria-label="Toggle section collapse">${icons.toggle}</button>
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
    const infoHTML = taskData.info ? `<div class="task-info">${taskData.info}</div>` : '';

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
        ${infoHTML}
        ${deadlineHTML}`;
    return li;
}

export function updateProgress() {
    const activeTab = getActiveTab();
    if (!activeTab || !activeTab.sections) {
        if (dom.progressBar) dom.progressBar.style.width = `0%`;
        if (dom.progressText) dom.progressText.textContent = `No tasks in this tab`;
        document.title = "MotiAI";
        return;
    }
    const allTasks = activeTab.sections.flatMap(s => s.tasks || []);
    const completedTasks = allTasks.filter(t => t.completed).length;
    const totalTasks = allTasks.length;
    const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    if (dom.progressBar) dom.progressBar.style.width = `${percentage}%`;
    if (dom.progressText) dom.progressText.textContent = `${completedTasks} of ${totalTasks} tasks completed`;
    document.title = "MotiAI";
}