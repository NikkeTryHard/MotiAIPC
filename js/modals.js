import { dom } from './config.js';
import { formatDateKey } from './handlers.js';
import { formatTimeForDisplay } from './ui.js';

export function openEventModal(config) {
    return new Promise((resolve, reject) => {
        const { form, title, deleteBtn, cancelBtn, backdrop, allDayCheckbox, eventTitleInput, startTimeDisplay, endTimeDisplay, startTimeInput, endTimeInput, colorPicker } = dom.eventModal;
        
        // --- Reset and Configure Modal ---
        form.reset();
        title.textContent = config.title;
        
        eventTitleInput.value = config.eventTitle || '';
        eventTitleInput.readOnly = !!config.taskId;
        eventTitleInput.classList.toggle('readonly', !!config.taskId);

        const eventId = config.id || `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const date = config.date ? new Date(config.date) : new Date();
        const dateKey = formatDateKey(date);
        form.elements['event-date'].value = dateKey;

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

        // --- Event Handlers ---
        const handleSave = (e) => {
            e.preventDefault();
            
            // Validation
            if (!form.elements['all-day-checkbox'].checked && startTimeInput.value >= endTimeInput.value) {
                alert("End time must be after start time.");
                return;
            }

            const eventData = {
                id: eventId,
                taskId: config.taskId || null,
                title: form.elements['event-title'].value,
                allDay: form.elements['all-day-checkbox'].checked,
                startTime: form.elements['all-day-checkbox'].checked ? '00:00' : startTimeInput.value,
                endTime: form.elements['all-day-checkbox'].checked ? '23:59' : endTimeInput.value,
                color: form.elements['event-color'].value,
                dateKey: form.elements['event-date'].value,
                isAllDay: form.elements['all-day-checkbox'].checked,
            };
            
            cleanup();
            resolve({ action: 'save', data: eventData });
        };

        const handleDelete = () => {
            cleanup();
            resolve({ action: 'delete', data: { eventId, dateKey } });
        };

        const handleCancel = () => {
            cleanup();
            reject(new Error("Event modal cancelled by user."));
        };

        const handleBackdropClick = (e) => {
            if (e.target === backdrop) handleCancel();
        };

        const handleColorClick = (e) => {
            const target = e.target.closest('.color-option');
            if (target) {
                document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
                target.classList.add('selected');
                form.elements['event-color'].value = target.dataset.color;
            }
        };

        const handleAllDayToggle = (e) => {
            const isChecked = e.target.checked;
            form.classList.toggle('all-day-active', isChecked);
            startTimeInput.required = !isChecked;
            endTimeInput.required = !isChecked;
        };

        // --- Cleanup ---
        const cleanup = () => {
            form.removeEventListener('submit', handleSave);
            deleteBtn.removeEventListener('click', handleDelete);
            cancelBtn.removeEventListener('click', handleCancel);
            backdrop.removeEventListener('click', handleBackdropClick);
            colorPicker.removeEventListener('click', handleColorClick);
            allDayCheckbox.removeEventListener('change', handleAllDayToggle);
            backdrop.classList.add('hidden');
        };

        // --- Attach Listeners ---
        form.addEventListener('submit', handleSave);
        deleteBtn.addEventListener('click', handleDelete);
        cancelBtn.addEventListener('click', handleCancel);
        backdrop.addEventListener('click', handleBackdropClick);
        colorPicker.addEventListener('click', handleColorClick);
        allDayCheckbox.addEventListener('change', handleAllDayToggle);
    });
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