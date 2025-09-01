import { dom, icons } from '../config.js';
import { createSectionEl, createTaskEl, renderEmptyState, updateProgress } from './listRenderer.js';

// --- SURGICAL DOM & UI UPDATES ---
export function updateTaskEl(taskId, taskData) {
    const li = document.querySelector(`li[data-id="${taskId}"]`);
    if (!li) return;
    const newLi = createTaskEl(taskData);
    li.replaceWith(newLi);
}

export function removeElementWithAnimation(element) {
    if (!element) return;
    element.classList.add('removing');
    element.addEventListener('animationend', () => {
        element.remove();
        renderEmptyState();
        updateProgress();
    }, { once: true });
}

export function addElement(type, data, parentId = null) {
    renderEmptyState(); // Remove empty message if it exists
    if (type === 'section') {
        const sectionEl = createSectionEl(data);
        dom.sectionsContainer.appendChild(sectionEl);
    } else if (type === 'task') {
        const taskEl = createTaskEl(data);
        const checklistEl = document.querySelector(`.section[data-id="${parentId}"] .checklist`);
        if (checklistEl) checklistEl.appendChild(taskEl);
    }
    updateProgress();
}

export function addTabEl(tabData) {
    const tabEl = document.createElement('button');
    tabEl.className = 'task-tab draggable';
    tabEl.dataset.tabId = tabData.id;
    tabEl.draggable = true;
    tabEl.innerHTML = `${icons.grip} <span class="tab-title">${tabData.title}</span>`;
    dom.taskTabsNav.insertBefore(tabEl, dom.addTabBtn);
    return tabEl;
}

export function removeTabEl(tabId) {
    const tabEl = dom.taskTabsNav.querySelector(`.task-tab[data-tab-id="${tabId}"]`);
    if (tabEl) {
        tabEl.remove();
    }
}