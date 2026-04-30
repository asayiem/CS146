// alerts page behavior
document.addEventListener('DOMContentLoaded', () => {
    const alertForm = document.querySelector('#alertForm');
    const alertFeed = document.querySelector('#alertFeed');
    const formStatus = document.querySelector('#formStatus');
    const visibleCount = document.querySelector('#visibleCount');
    const feedTitle = document.querySelector('#feedTitle');
    const filterButtons = document.querySelectorAll('[data-filter]');
    const spotInput = document.querySelector('#spotId');

    function safeInt(selector, fallback = 0){
        const el = document.querySelector(selector);
        const n = parseInt(el?.textContent ?? '', 10);
        return Number.isFinite(n) ? n : fallback;
    }

    const totals = {
        available: safeInt('#availableTotal'),
        occupied:  safeInt('#occupiedTotal'),
        leaving:   safeInt('#leavingTotal'),
        total:     safeInt('#spotTotal', 100)
    };

    const levelPrefix = {
        'Level 1': 'A',
        'Level 2': 'B',
        'Level 3': 'C',
        'Level 4': 'D',
        'Level 5': 'E'
    };

    const statusDetails = {
        vacated: {
            label: 'Vacated',
            badgeClass: 'badge-green',
            defaultDescription: 'Spot vacated - vehicle departed'
        },
        occupied:{
            label: 'Occupied',
            badgeClass: 'badge-red',
            defaultDescription: 'Spot occupied - vehicle entered'
        },
        leaving: {
            label: 'Leaving Soon',
            badgeClass: 'badge-yellow',
            defaultDescription: 'Vehicle engine active - spot may vacate soon'
        }
    };

    let currentFilter = 'all';

    function setStatus(message, isError = false){
        formStatus.textContent = message;
        formStatus.classList.toggle('is-error', isError);
    }

    function getCurrentTimeLabel(){
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        }).format(new Date());
    }

    function updateVisibleCount(){
        const visibleEntries = Array.from(alertFeed.querySelectorAll('.alert-entry'))
            .filter((entry) => !entry.hidden).length;
        const eventWord = visibleEntries === 1 ? 'event' : 'events';
        visibleCount.textContent = `${visibleEntries} ${eventWord} shown`;
    }

    function applyFilter(filter){
        currentFilter = filter;
        const readable = filter === 'all' ? 'All Recent Events' : `${statusDetails[filter].label} Events Only`;
        feedTitle.textContent = `${readable} - Most Recent First`;

        alertFeed.querySelectorAll('.alert-entry').forEach((entry) => {
            const shouldShow = filter === 'all' || entry.dataset.status === filter;
            entry.hidden = !shouldShow;        
        });

        filterButtons.forEach((button) => {
            const isActive = button.dataset.filter === filter;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive)); 
        });
        updateVisibleCount();
    }

    function updateGarageTotals(status){
        if(status === 'vacated'){
            totals.available = Math.min(totals.total, totals.available + 1);
            totals.occupied = Math.max(0, totals.occupied - 1);
        }

        if(status === 'occupied'){
            totals.available = Math.max(0, totals.available - 1);
            totals.occupied = Math.min(totals.total, totals.occupied + 1);
        }

        if(status === 'leaving'){
            totals.leaving = Math.min(totals.total, totals.leaving + 1);
        }

        document.querySelector('#availableTotal').textContent = totals.available;
        document.querySelector('#occupiedTotal').textContent = totals.occupied;
        document.querySelector('#leavingTotal').textContent = totals.leaving;
    }

    function createSpan(className, value){
        const span = document.createElement('span');
        span.className = className;
        span.textContent = value;
        return span;
    }

    function createBadge(status){
        const wrapper = document.createElement('span');
        wrapper.className = 'alert-entry_badge';

        const badge = document.createElement('span');
        badge.className = `badge ${statusDetails[status].badgeClass}`;
        badge.textContent = statusDetails[status].label;

        wrapper.appendChild(badge);
        return wrapper;
    }

    function createAlertEntry({spotId, garageLevel, eventType, alertNotes, urgentFlag}){
        const allowedTypes = ['vacated', 'occupied', 'leaving'];
        if(!allowedTypes.includes(eventType)){
            console.error('createAlertEntry: unknown eventType', eventType);
            return document.createDocumentFragment();
        }

        const entry = document.createElement('li');
        entry.className = 'alert-entry alert-entry--new';
        entry.dataset.status = eventType;

        if(urgentFlag){
            entry.classList.add('alert-entry--urgent');
        }

        const note = alertNotes.trim();
        const description = note || statusDetails[eventType].defaultDescription;
        const urgentPrefix = urgentFlag ? 'URGENT - ' : '';

        entry.append(
            createSpan('alert-entry_time', getCurrentTimeLabel()),
            createSpan('alert-entry_spot', spotId),
            createSpan('alert-entry_level', garageLevel),
            createSpan('alert-entry_desc', `${urgentPrefix}${description}`),
            createBadge(eventType)
        );
        return entry;
    }

    function validateFormData(formData){
        const spotId = formData.get('spotId').trim().toUpperCase();
        const garageLevel = formData.get('garageLevel');
        const eventType = formData.get('eventType');
        const alertNotes = formData.get('alertNotes').trim();

        if(!/^[A-E][0-9]{2}$/.test(spotId)){
            return 'Spot ID must use one letter A-E followed by two digits, such as A03';
        }

        if(!garageLevel){
            return 'Choose the garage level for this alert.';
        }    

        if(spotId.charAt(0) !== levelPrefix[garageLevel]){
            return `${garageLevel} uses ${levelPrefix[garageLevel]} spots. Change the spot ID or level.`;
        }

        const allowedTypes = ['vacated', 'occupied', 'leaving'];
        if(!eventType || !allowedTypes.includes(eventType)){
            return 'Choose a valid alert type before submitting.';
        }

        if(alertNotes.length > 120){
            return 'Notes must be 120 characters or fewer.';
        }

        return '';
    }

    const filterLabels = {
        all: 'all events',
        vacated: 'vacated events',
        occupied: 'occupied events',
        leaving: 'leaving soon events'
    };

    filterButtons.forEach((button) => {
        button.addEventListener('click', () => {
            applyFilter(button.dataset.filter);
            const label = filterLabels[button.dataset.filter] ?? 'events';
            setStatus(`Showing ${label}.`);
        });
    });

    spotInput.addEventListener('input', () => {
        spotInput.value = spotInput.value.toUpperCase();
    });

    alertForm.addEventListener('reset', () => {
        setStatus('Form cleared.');
    });

    alertForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const formData = new FormData(alertForm);
        const validationError = validateFormData(formData);

        if (validationError) {
            setStatus(validationError, true);
            return;
        }

        const newAlert = {
            spotId: formData.get('spotId').trim().toUpperCase(),
            garageLevel: formData.get('garageLevel'),
            eventType: formData.get('eventType'),
            alertNotes: formData.get('alertNotes'),
            urgentFlag: formData.has('urgentFlag')
        };

        const MAX_ALERTS = 100;
        alertFeed.prepend(createAlertEntry(newAlert));
        if(alertFeed.children.length > MAX_ALERTS){
            alertFeed.removeChild(alertFeed.lastElementChild);
        }
        updateGarageTotals(newAlert.eventType);
        applyFilter(currentFilter);
        alertForm.reset();
        setStatus(`New ${statusDetails[newAlert.eventType].label.toLowerCase()} alert added for ${newAlert.spotId}.`);
    });

    applyFilter('all');
});