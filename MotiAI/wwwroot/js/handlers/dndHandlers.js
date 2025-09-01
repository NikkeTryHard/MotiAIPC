import {
  state,
  getActiveTab,
  findTaskInfoById,
  findSectionInfoById,
  actions,
} from '../state.js';
import { renderTabs, renderActiveTabContent } from '../ui/index.js';

let draggedItem = null;
export function handleDragStart(e) {
  const target = e.target.closest('.draggable');
  if (!target) return;
  draggedItem = target;
  setTimeout(() => draggedItem.classList.add('dragging'), 0);
}

export function handleDragEnd() {
  if (draggedItem) draggedItem.classList.remove('dragging');
  document
    .querySelectorAll('.drag-over, .drag-over-end')
    .forEach((el) => el.classList.remove('drag-over', 'drag-over-end'));
  draggedItem = null;
}

export function handleDragOver(e) {
  e.preventDefault();
  if (!draggedItem) return;

  document
    .querySelectorAll('.drag-over, .drag-over-end')
    .forEach((el) => el.classList.remove('drag-over', 'drag-over-end'));

  const container = e.target.closest(
    '.task-tabs-nav, .checklist, #sections-container'
  );
  if (!container) return;

  if (
    (draggedItem.matches('li.draggable') && !container.matches('.checklist')) ||
    (draggedItem.matches('section.draggable') &&
      !container.matches('#sections-container')) ||
    (draggedItem.matches('.task-tab') && !container.matches('.task-tabs-nav'))
  ) {
    return;
  }

  const afterElement = getDragAfterElement(container, e.clientX, e.clientY);

  if (afterElement) {
    afterElement.classList.add('drag-over');
  } else {
    const lastDraggable = [
      ...container.querySelectorAll('.draggable:not(.dragging)'),
    ].pop();
    if (lastDraggable) lastDraggable.classList.add('drag-over-end');
  }
}

function getDragAfterElement(container, x, y) {
  const draggableElements = [
    ...container.querySelectorAll('.draggable:not(.dragging)'),
  ];
  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const isHorizontal = container.classList.contains('task-tabs-nav');
      const offset = isHorizontal
        ? x - box.left - box.width / 2
        : y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

export function handleDrop(e) {
  e.preventDefault();
  if (!draggedItem) return;
  const container = e.target.closest(
    '.task-tabs-nav, .checklist, #sections-container'
  );
  if (!container) return;
  const afterElement = getDragAfterElement(container, e.clientX, e.clientY);
  const draggedId = draggedItem.dataset.id || draggedItem.dataset.tabId;

  // Abstract reordering logic to be cleaner
  const findIndex = (arr, id) =>
    arr.findIndex(
      (item) =>
        item.id ===
        (id || afterElement?.dataset.id || afterElement?.dataset.tabId)
    );

  if (draggedItem.matches('.task-tab')) {
    const fromIndex = findIndex(state.tabs, draggedId);
    const toIndex = afterElement ? findIndex(state.tabs) : state.tabs.length;
    actions.reorderTabs(fromIndex, toIndex > fromIndex ? toIndex - 1 : toIndex);
    renderTabs();
  } else if (draggedItem.matches('.section')) {
    const activeTab = getActiveTab();
    if (!activeTab) return;
    const fromIndex = findIndex(activeTab.sections, draggedId);
    const toIndex = afterElement
      ? findIndex(activeTab.sections)
      : activeTab.sections.length;
    actions.reorderSections(
      activeTab.id,
      fromIndex,
      toIndex > fromIndex ? toIndex - 1 : toIndex
    );
    renderActiveTabContent();
  } else if (draggedItem.matches('li.draggable')) {
    const startSectionId = draggedItem.closest('.section').dataset.id;
    const endSectionId = e.target.closest('.section').dataset.id;
    const { parentSection: startSection } = findTaskInfoById(draggedId) || {};
    const { section: endSection } = findSectionInfoById(endSectionId) || {};
    if (!startSection || !endSection) return;

    const fromIndex = findIndex(startSection.tasks, draggedId);
    const toIndex = afterElement
      ? findIndex(endSection.tasks, afterElement.dataset.id)
      : endSection.tasks.length;

    const adjustedToIndex =
      startSectionId === endSectionId && toIndex > fromIndex
        ? toIndex - 1
        : toIndex;

    actions.reorderTask(
      startSectionId,
      endSectionId,
      fromIndex,
      adjustedToIndex
    );
    renderActiveTabContent();
  }
}
