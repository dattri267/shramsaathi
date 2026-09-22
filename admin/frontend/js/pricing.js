// ---------------------------------------------------------
// Demand forecast + fair-price tab with Calendar & Subcategory & Auto-Weather support.
// ---------------------------------------------------------

const citySelect = document.getElementById('citySelect');
const categorySelect = document.getElementById('categorySelect');
const subCategorySelect = document.getElementById('subCategorySelect');
const weatherSelect = document.getElementById('weatherSelect');
const eventsSelect = document.getElementById('eventsSelect');
const dateInput = document.getElementById('forecastDate');
const timeInput = document.getElementById('forecastTime');
const pickupInput = document.getElementById('pickupLocation');
const destinationInput = document.getElementById('destinationLocation');
const priceInput = document.getElementById('currentPrice');
const runBtn = document.getElementById('runModelBtn');

const outputEmpty = document.getElementById('outputEmpty');
const outputResults = document.getElementById('outputResults');

let categorySubcategoryTree = {
  "Electrician": ["Residential electrician", "Industrial electrician", "Solar electrical service"],
  "Plumber": ["Pipe & leakage", "Bathroom plumbing", "Water tank service"],
  "Carpenter": ["Furniture repairs", "Polishing & woodwork", "Custom furniture"],
  "Painter": ["House painting", "Texture painting", "Waterproofing"],
  "Domestic Helper": ["House maid", "Cooking helper", "Laundry helper"],
  "Caregiver": ["Elderly care", "Patient care", "Baby care"],
  "Drivers": ["Personal driver", "Delivery driver", "Family driver"],
  "Gardener": ["Garden & lawn maintenance", "Garden cleaning", "Terrace garden maintenance"],
  "Cleaner": ["Home cleaning", "Bathroom cleaning", "Sofa and carpet cleaning"],
  "Technician": ["RO/water purifier", "CCTV technician", "Appliances technician", "Mobile technician"]
};

const DEFAULT_INDIAN_CITIES = [
  'Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad', 'Kolkata', 'Chennai', 'Pune', 'Jaipur', 'Ahmedabad', 'Noida', 'Gurgaon'
];

function fillSelect(select, options) {
  if (!select) return;
  select.innerHTML = options
    .map((opt) => `<option value="${opt}">${opt}</option>`)
    .join('');
}

function updateSubcategories() {
  if (!categorySelect || !subCategorySelect) return;
  const selectedCategory = categorySelect.value;
  const subs = categorySubcategoryTree[selectedCategory] || [selectedCategory];
  fillSelect(subCategorySelect, subs);
}

async function loadOptions() {
  try {
    const res = await fetch(`${CONFIG.AI_ENGINE_BASE}/options`);
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const options = await res.json();

    if (options.categorySubcategoryMap) {
      categorySubcategoryTree = options.categorySubcategoryMap;
    }

    fillSelect(citySelect, options.cities || DEFAULT_INDIAN_CITIES);
    fillSelect(categorySelect, options.categories || Object.keys(categorySubcategoryTree));
    fillSelect(eventsSelect, options.events || ['Normal day', 'Holiday', 'Major event']);

    const weatherOptions = ['Auto (Open-Meteo)', ...(options.weather || ['Clear', 'Rain', 'Extreme heat'])];
    fillSelect(weatherSelect, weatherOptions);

    updateSubcategories();
  } catch (err) {
    fillSelect(citySelect, DEFAULT_INDIAN_CITIES);
    fillSelect(categorySelect, Object.keys(categorySubcategoryTree));
    fillSelect(weatherSelect, ['Auto (Open-Meteo)', 'Clear', 'Rain', 'Extreme heat']);
    fillSelect(eventsSelect, ['Normal day', 'Holiday', 'Major event']);
    updateSubcategories();
    console.warn('Could not reach AI engine /options — using fallback lists.', err.message);
  }

  const today = new Date().toISOString().slice(0, 10);
  dateInput.value = today;
}

if (categorySelect) {
  categorySelect.addEventListener('change', updateSubcategories);
}

function pct(value) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${Math.round(value * 100)}%`;
}

function renderResults(data, currentPrice) {
  outputEmpty.style.display = 'none';
  outputResults.style.display = 'block';

  const vsBaseline = data.ratio - 1;
  const priceDelta = (data.suggestedPrice - currentPrice) / currentPrice;
  const maxJobs = Math.max(data.baseline, data.forecast);

  const ctx = data.calendarContext || data.contextSummary || {};
  const reasons = data.reasons || [];
  const wResolved = data.weatherResolved || data.weather || 'Clear';
  const wSource = data.weatherSource || 'Auto';

  const contextBadges = [];
  if (wSource && (wSource.includes('Open-Meteo') || wSource.includes('Live'))) {
    contextBadges.push(`<span class="pill" style="background:#e0e7ff; color:#3730a3;">Weather: ${wResolved} (${wSource})</span>`);
  }
  if (ctx.isWeekend) contextBadges.push(`<span class="pill" style="background:#dbeafe; color:#1e40af;">System Analysis: Weekend (${ctx.dayOfWeek || 'Weekend'})</span>`);
  if (ctx.isHoliday) contextBadges.push(`<span class="pill" style="background:#fef3c7; color:#92400e;">System Analysis: Holiday (${ctx.holidayName || 'Festival'})</span>`);
  if (ctx.eventPresent || (ctx.activeEvents && ctx.activeEvents.length > 0)) {
    const evName = ctx.activeEvents ? ctx.activeEvents.map(e => e.name).join(', ') : 'Major Event';
    contextBadges.push(`<span class="pill" style="background:#fee2e2; color:#991b1b;">System Analysis (Event): ${evName}</span>`);
  }

  outputResults.innerHTML = `
    ${contextBadges.length > 0 ? `
      <div class="card" style="margin-bottom:16px; padding:16px; background:#fafafa; border-left:4px solid #2563eb;">
        <div class="eyebrow" style="margin-bottom:6px;">01 / SYSTEM ANALYSIS &amp; LIVE CONTEXT</div>
        <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
          ${contextBadges.join('')}
        </div>
        <div style="font-size:12px; color:#4b5563; display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px; margin-top:8px; background:#f3f4f6; padding:8px; border-radius:6px;">
          <div>Demand Impact (Est): <strong>${ctx.demandImpact || 1.0}x</strong></div>
          <div>Avail Impact (Est): <strong>${ctx.availabilityImpact || 1.0}x</strong></div>
          <div>Traffic Impact (Est): <strong>${ctx.trafficImpact || 1.0}x</strong></div>
        </div>
      </div>
    ` : ''}

    <div class="card output-card">
      <div class="output-head">
        <div>
          <div class="eyebrow">02 / AI MODEL OUTPUT (RANDOM FOREST)</div>
          <h2 style="margin:6px 0 0;">Demand forecast</h2>
        </div>
        <span class="pill">${data.confidence}% confidence</span>
      </div>

      <div class="headline">
        <span class="big-number">${data.forecast}</span>
        <span class="big-label">expected jobs</span>
      </div>
      <div class="delta-line">
        <span></span>
        <span class="${vsBaseline >= 0 ? 'delta-positive' : 'delta-negative'}">${pct(vsBaseline)} vs baseline</span>
      </div>

      <div class="compare-bars">
        <div class="compare-bar">
          <div class="bar-value">${data.baseline}</div>
          <div class="bar baseline" style="height:${(data.baseline / maxJobs) * 100}%;"></div>
          <div class="bar-label">Baseline</div>
        </div>
        <div class="compare-bar">
          <div class="bar-value">${data.forecast}</div>
          <div class="bar forecast" style="height:${(data.forecast / maxJobs) * 100}%;"></div>
          <div class="bar-label">Forecast</div>
        </div>
      </div>
      <div class="legend">
        <span><span class="dot baseline"></span> Structural Baseline (no weather/event uplift)</span>
        <span><span class="dot forecast"></span> AI Model Forecast</span>
      </div>
    </div>

    <div class="card">
      <div class="output-head">
        <div>
          <div class="eyebrow">03 / FAIR PRICING &amp; SYSTEM REASONS</div>
          <h2 style="margin:6px 0 0;">Suggested price</h2>
        </div>
        <span class="pill">Guardrails active (0.82–1.18x)</span>
      </div>

      <div class="delta-line" style="margin-top:14px;">
        <span><span class="price-amount">₹${data.suggestedPrice}</span> <span class="price-unit">per service</span></span>
        <span class="${priceDelta >= 0 ? 'delta-positive' : 'delta-negative'}">${pct(priceDelta)}</span>
      </div>

      ${reasons.length > 0 ? `
        <div style="margin-top:14px; padding:12px; background:#f9fafb; border-radius:8px; border:1px solid #e5e7eb;">
          <strong style="font-size:12px; text-transform:uppercase; color:#6b7280; display:block; margin-bottom:6px;">Context &amp; Estimation Factors:</strong>
          <ul style="margin:0; padding-left:18px; font-size:13px; color:#374151;">
            ${reasons.map(r => `<li style="margin-bottom:4px;">${r}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <h4 style="margin:16px 0 8px; font-size:13px; color:#6b7280;">Counterfactual AI Model Analysis:</h4>
      <ol class="explanation-list">
        ${(data.explanation || []).map((line, i) => `
          <li>
            <span class="num-circle">${i + 1}</span>
            <span>${line}</span>
          </li>
        `).join('')}
      </ol>

      <p class="hint-text">
        Prices are bounded between 82% and 118% of the standard price to protect worker access and customer trust. Model ${data.modelVersion}.
      </p>
    </div>
  `;
}

async function runPricingModel() {
  const currentPrice = Number(priceInput.value);

  if (!currentPrice || currentPrice <= 0) {
    alert('Enter a current price greater than 0.');
    return;
  }

  runBtn.disabled = true;
  runBtn.textContent = 'Running…';

  try {
    let res = null;
    let data = null;

    const subCategory = subCategorySelect ? subCategorySelect.value : '';

    try {
      res = await fetch(`${CONFIG.BACKEND_API_BASE || CONFIG.API_BASE || 'http://localhost:8000/api'}/pricing/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: citySelect.value,
          category: categorySelect.value,
          subCategory,
          date: dateInput.value,
          time: timeInput ? timeInput.value : '12:00',
          pickupLocation: pickupInput ? pickupInput.value : '',
          destinationLocation: destinationInput ? destinationInput.value : '',
          currentPrice,
          weather: weatherSelect.value,
          events: eventsSelect.value
        })
      });

      if (res.ok) {
        data = await res.json();
      }
    } catch (e) {
      console.warn('Node backend endpoint unreached, calling AI engine directly:', e.message);
    }

    if (!data) {
      res = await fetch(`${CONFIG.AI_ENGINE_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: citySelect.value,
          category: categorySelect.value,
          subCategory,
          date: dateInput.value,
          time: timeInput ? timeInput.value : '12:00',
          pickupLocation: pickupInput ? pickupInput.value : '',
          destinationLocation: destinationInput ? destinationInput.value : '',
          currentPrice,
          weather: weatherSelect.value === 'Auto (Open-Meteo)' ? 'Clear' : weatherSelect.value,
          events: eventsSelect.value
        })
      });

      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      data = await res.json();
    }

    renderResults(data, currentPrice);
  } catch (err) {
    outputEmpty.style.display = 'block';
    outputResults.style.display = 'none';
    outputEmpty.innerHTML = `Could not reach AI model or backend.<br>${err.message}`;
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = 'Run pricing model →';
  }
}

runBtn.addEventListener('click', runPricingModel);
loadOptions();