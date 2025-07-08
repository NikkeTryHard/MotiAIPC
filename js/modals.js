import { dom } from './config.js';
import { formatDateKey } from './handlers.js';
import { formatTimeForDisplay } from './ui.js';

export function openEventModal(config) {
    const { form, title, deleteBtn, backdrop, allDayCheckbox, eventTitleInput, startTimeDisplay, endTimeDisplay, startTimeInput, endTimeInput } = dom.eventModal;
    form.reset();
    title.textContent = config.title;
    
    // Handle event title and readonly state
    eventTitleInput.value = config.eventTitle || '';
    if (config.taskId) {
        eventTitleInput.readOnly = true;
        eventTitleInput.classList.add('readonly');
    } else {
        eventTitleInput.readOnly = false;
        eventTitleInput.classList.remove('readonly');
    }

    form.elements['event-id'].value = config.id || '';
    form.elements['task-id'].value = config.taskId || '';
    form.elements['event-date'].value = config.date ? formatDateKey(config.date) : '';
    
    const startTime = config.startTime || '09:00';
    const endTime = config.endTime || '10:00';
    startTimeInput.value = startTime;
    endTimeInput.value = endTime;
    startTimeDisplay.textContent = formatTimeForDisplay(startTime);
    endTimeDisplay.textContent = formatTimeForDisplay(endTime);
    
    const isAllDay = config.allDay || false;
    allDayCheckbox.checked = isAllDay;
    form.classList.toggle('all-day-active', isAllDay);
    startTimeInput.required = !isAllDay;
    endTimeInput.required = !isAllDay;

    document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
    const color = config.color || 'blue';
    const colorEl = document.querySelector(`.color-option[data-color="${color}"]`);
    if (colorEl) colorEl.classList.add('selected');
    form.elements['event-color'].value = color;
    
    deleteBtn.classList.toggle('hidden', !config.id);
    backdrop.classList.remove('hidden');
}

export function closeEventModal() {
    console.log("MotiOS_MODAL: Closing event modal.");
    dom.eventModal.backdrop.classList.add('hidden');
}

export function openPromptModal(config) {
    return new Promise((resolve, reject) => {
        const { backdrop, form, title, label, input, cancelBtn } = dom.promptModal;
        
        title.textContent = config.title || "Input Required";
        label.textContent = config.label || "Enter value:";
        input.value = config.value || "";
        
        backdrop.classList.remove('hidden');
        input.focus();
        input.select();

        const handleSubmit = (e) => {
            e.preventDefault();
            const value = input.value.trim();
            if (value) {
                cleanup();
                resolve(value);
            }
        };

        const handleCancel = () => {
            cleanup();
            reject(new Error("Prompt cancelled by user."));
        };

        const cleanup = () => {
            form.removeEventListener('submit', handleSubmit);
            cancelBtn.removeEventListener('click', handleCancel);
            backdrop.removeEventListener('click', handleBackdropClick);
            backdrop.classList.add('hidden');
        };
        
        const handleBackdropClick = (e) => {
            if (e.target === backdrop) handleCancel();
        };

        form.addEventListener('submit', handleSubmit);
        cancelBtn.addEventListener('click', handleCancel);
        backdrop.addEventListener('click', handleBackdropClick);
    });
}

export function openConfirmModal({ title, message, okLabel = 'Delete', okClass = 'btn-danger' }) {
    return new Promise((resolve) => {
        const { backdrop, title: titleEl, message: messageEl, okBtn, cancelBtn } = dom.confirmModal;
        
        titleEl.textContent = title;
        messageEl.textContent = message;
        okBtn.textContent = okLabel;
        okBtn.className = `btn ${okClass}`;
        
        backdrop.classList.remove('hidden');

        const handleOk = () => { cleanup(); resolve(true); };
        const handleCancel = () => { cleanup(); resolve(false); };
        const handleBackdropClick = (e) => { if (e.target === backdrop) handleCancel(); };

        const cleanup = () => {
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
            backdrop.removeEventListener('click', handleBackdropClick);
            backdrop.classList.add('hidden');
        };

        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
        backdrop.addEventListener('click', handleBackdropClick);
    });
}