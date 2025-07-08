import { renderTabs, renderActiveTabContent } from './listRenderer.js';
import { renderCalendar, renderTimelineAndSummary } from './scheduleRenderer.js';

export * from './domUtils.js';
export * from './interactions.js';
export * from './listRenderer.js';
export * from './scheduleRenderer.js';

// --- MAIN RENDER FUNCTION (for initial load) ---
export function renderAll() {
    renderTabs();
    renderActiveTabContent();
    renderCalendar();
    renderTimelineAndSummary();
}