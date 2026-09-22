// ---------------------------------------------------------
// Calendar & Event Context Manager frontend JS
// ---------------------------------------------------------

const eventTableBody = document.getElementById('eventTableBody');
const calendarLoading = document.getElementById('calendarLoading');
const calendarTableWrapper = document.getElementById('calendarTableWrapper');

const addEventBtn = document.getElementById('addEventBtn');
const eventModal = document.getElementById('eventModal');
const closeEventModalBtn = document.getElementById('closeEventModalBtn');
const eventForm = document.getElementById('eventForm');
const eventModalTitle = document.getElementById('eventModalTitle');

// Form inputs (Facts only)
const eventIdInput = document.getElementById('eventId');
const eventNameInput = document.getElementById('eventName');
const eventCityInput = document.getElementById('eventCity');
const eventStateInput = document.getElementById('eventState');
const eventAffectedAreaInput = document.getElementById('eventAffectedArea');
const eventStartDateInput = document.getElementById('eventStartDate');
const eventEndDateInput = document.getElementById('eventEndDate');
const eventStartTimeInput = document.getElementById('eventStartTime');
const eventEndTimeInput = document.getElementById('eventEndTime');
const eventDescriptionInput = document.getElementById('eventDescription');

let cachedEvents = [];

async function loadCalendarEvents() {
  calendarLoading.style.display = 'block';
  calendarTableWrapper.style.display = 'none';

  try {
    const res = await fetch(`${CONFIG.BACKEND_API_BASE || CONFIG.API_BASE || 'http://localhost:8000/api'}/events`);
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    cachedEvents = await res.json();
    renderEventTable(cachedEvents);
  } catch (err) {
    calendarLoading.textContent = `Error loading events: ${err.message}`;
  }
}

function renderEventTable(events) {
  calendarLoading.style.display = 'none';
  calendarTableWrapper.style.display = 'block';

  if (!events || events.length === 0) {
    eventTableBody.innerHTML = `<tr><td colspan="6" style="padding:16px; text-align:center; color:#6b7280;">No calendar events recorded yet. Click "+ Add Event" to create one.</td></tr>`;
    return;
  }

  eventTableBody.innerHTML = events.map(ev => {
    const sDate = ev.start_date || ev.startDate || '';
    const eDate = ev.end_date || ev.endDate || '';
    const sTime = ev.start_time || ev.startTime || '00:00';
    const eTime = ev.end_time || ev.endTime || '23:59';
    const city = ev.city || 'Delhi';
    const state = ev.state ? `, ${ev.state}` : '';
    const area = ev.affected_area || ev.affectedArea || 'Entire City';
    const impLvl = ev.impact_level || ev.impactLevel || 'MEDIUM';
    const type = ev.type || 'LOCAL_EVENT';
    const source = ev.source || 'ADMIN';
    const dImp = ev.demand_impact || ev.demandImpact || 1.0;
    const aImp = ev.availability_impact || ev.availabilityImpact || 1.0;
    const tImp = ev.traffic_impact || ev.trafficImpact || 1.0;
    const reasons = ev.analysis_reasons || ev.analysisReasons || [];

    const reasonListHtml = Array.isArray(reasons) && reasons.length > 0
      ? `<div style="font-size:11px; color:#6b7280; margin-top:4px;">${reasons.slice(0, 2).map(r => `• ${r}`).join('<br>')}</div>`
      : '';

    return `
      <tr style="border-bottom:1px solid #f3f4f6; font-size:14px;">
        <td style="padding:12px; font-weight:600; color:#111827;">${ev.name}</td>
        <td style="padding:12px; color:#4b5563;">
          ${sDate} ${sDate !== eDate ? 'to ' + eDate : ''}<br>
          <small style="color:#9ca3af;">${sTime} - ${eTime}</small>
        </td>
        <td style="padding:12px; color:#4b5563;">
          <strong>${city}${state}</strong><br>
          <small style="color:#6b7280;">${area}</small>
        </td>
        <td style="padding:12px; font-size:12px; color:#374151;">
          <span class="pill" style="font-size:11px; background:#e0e7ff; color:#3730a3; margin-bottom:4px; display:inline-block;">${type} (${impLvl})</span><br>
          Demand: <strong>${dImp}x</strong> | Avail: <strong>${aImp}x</strong> | Traffic: <strong>${tImp}x</strong>
          ${reasonListHtml}
        </td>
        <td style="padding:12px;">
          <span style="display:inline-block; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600; background:${source === 'ADMIN' ? '#fef3c7' : '#dbeafe'}; color:${source === 'ADMIN' ? '#92400e' : '#1e40af'};">
            ${source}
          </span>
        </td>
        <td style="padding:12px; text-align:right;">
          <button onclick="editEvent('${ev.id}')" style="background:none; border:none; color:#2563eb; cursor:pointer; font-weight:600; margin-right:8px;">Edit</button>
          <button onclick="deleteEvent('${ev.id}')" style="background:none; border:none; color:#dc2626; cursor:pointer;">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

function openAddEventModal() {
  eventModalTitle.textContent = 'Add Calendar Event';
  eventIdInput.value = '';
  eventForm.reset();
  const today = new Date().toISOString().slice(0, 10);
  eventStartDateInput.value = today;
  eventEndDateInput.value = today;
  eventModal.classList.add('active');
}

function editEvent(id) {
  const ev = cachedEvents.find(e => e.id === id);
  if (!ev) return;

  eventModalTitle.textContent = 'Edit Calendar Event';
  eventIdInput.value = ev.id;
  eventNameInput.value = ev.name;
  eventCityInput.value = ev.city || 'Delhi';
  if (eventStateInput) eventStateInput.value = ev.state || '';
  eventAffectedAreaInput.value = ev.affected_area || ev.affectedArea || '';
  eventStartDateInput.value = ev.start_date || ev.startDate || '';
  eventEndDateInput.value = ev.end_date || ev.endDate || '';
  eventStartTimeInput.value = ev.start_time || ev.startTime || '08:00';
  eventEndTimeInput.value = ev.end_time || ev.endTime || '20:00';
  eventDescriptionInput.value = ev.description || '';

  eventModal.classList.add('active');
}

async function deleteEvent(id) {
  if (!confirm('Are you sure you want to delete this event?')) return;
  try {
    const res = await fetch(`${CONFIG.BACKEND_API_BASE || CONFIG.API_BASE || 'http://localhost:8000/api'}/events/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`Delete failed (${res.status})`);
    loadCalendarEvents();
  } catch (err) {
    alert(`Could not delete event: ${err.message}`);
  }
}

eventForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = eventIdInput.value;
  // Admin sends facts only
  const payload = {
    name: eventNameInput.value,
    city: eventCityInput.value,
    state: eventStateInput ? eventStateInput.value : '',
    affectedArea: eventAffectedAreaInput.value,
    startDate: eventStartDateInput.value,
    endDate: eventEndDateInput.value,
    startTime: eventStartTimeInput.value,
    endTime: eventEndTimeInput.value,
    description: eventDescriptionInput.value
  };

  try {
    const url = id
      ? `${CONFIG.BACKEND_API_BASE || CONFIG.API_BASE || 'http://localhost:8000/api'}/events/${id}`
      : `${CONFIG.BACKEND_API_BASE || CONFIG.API_BASE || 'http://localhost:8000/api'}/events`;
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`Save failed (${res.status})`);
    eventModal.classList.remove('active');
    loadCalendarEvents();
  } catch (err) {
    alert(`Could not save event: ${err.message}`);
  }
});

addEventBtn.addEventListener('click', openAddEventModal);
closeEventModalBtn.addEventListener('click', () => eventModal.classList.remove('active'));

window.loadCalendarEvents = loadCalendarEvents;
window.editEvent = editEvent;
window.deleteEvent = deleteEvent;
