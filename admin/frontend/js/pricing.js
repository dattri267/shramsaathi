// ---------------------------------------------------------
// Demand forecast + fair-price tab.
// Talks directly to the Python AI engine (admin/ai-engine),
// NOT the Node backend — this model is fully self-contained.
// ---------------------------------------------------------

const citySelect = document.getElementById('citySelect');
const categorySelect = document.getElementById('categorySelect');
const weatherSelect = document.getElementById('weatherSelect');
const eventsSelect = document.getElementById('eventsSelect');
const dateInput = document.getElementById('forecastDate');
const priceInput = document.getElementById('currentPrice');
const runBtn = document.getElementById('runModelBtn');

const outputEmpty = document.getElementById('outputEmpty');
const outputResults = document.getElementById('outputResults');

function fillSelect(select, options) {
  select.innerHTML = options
    .map((opt) => `<option value="${opt}">${opt}</option>`)
    .join('');
}

async function loadOptions() {
  try {
    const res = await fetch(`${CONFIG.AI_ENGINE_BASE}/options`);
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const options = await res.json();

    fillSelect(citySelect, options.cities);
    fillSelect(categorySelect, options.categories);
    fillSelect(weatherSelect, options.weather);
    fillSelect(eventsSelect, options.events);
  } catch (err) {
    // Fall back to the model's known defaults so the form still works
    // even if the AI engine isn't reachable yet.
    fillSelect(citySelect, ['Bengaluru', 'Mumbai', 'Delhi', 'Hyderabad']);
    fillSelect(categorySelect, ['Home services', 'Grocery delivery', 'Medicine delivery']);
    fillSelect(weatherSelect, ['Clear', 'Rain', 'Extreme heat']);
    fillSelect(eventsSelect, ['Normal day', 'Holiday', 'Major event']);
    console.warn('Could not reach AI engine /options — using fallback lists.', err.message);
  }

  const today = new Date().toISOString().slice(0, 10);
  dateInput.value = today;
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

  outputResults.innerHTML = `
    <div class="card output-card">
      <div class="output-head">
        <div>
          <div class="eyebrow">02 / MODEL OUTPUT</div>
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
        <span><span class="dot baseline"></span> Baseline (no weather/event uplift)</span>
        <span><span class="dot forecast"></span> Model forecast</span>
      </div>
    </div>

    <div class="card">
      <div class="output-head">
        <div>
          <div class="eyebrow">03 / FAIR PRICE</div>
          <h2 style="margin:6px 0 0;">Suggested price</h2>
        </div>
        <span class="pill">Guardrails active</span>
      </div>

      <div class="delta-line" style="margin-top:14px;">
        <span><span class="price-amount">₹${data.suggestedPrice}</span> <span class="price-unit">per service</span></span>
        <span class="${priceDelta >= 0 ? 'delta-positive' : 'delta-negative'}">${pct(priceDelta)}</span>
      </div>

      <ol class="explanation-list">
        ${data.explanation.map((line, i) => `
          <li>
            <span class="num-circle">${i + 1}</span>
            <span>${line}</span>
          </li>
        `).join('')}
      </ol>

      <p class="hint-text">
        Prices are bounded between 82% and 118% of the current price to protect
        worker access and customer trust. Model ${data.modelVersion}.
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
    const res = await fetch(`${CONFIG.AI_ENGINE_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city: citySelect.value,
        category: categorySelect.value,
        date: dateInput.value,
        currentPrice,
        weather: weatherSelect.value,
        events: eventsSelect.value
      })
    });

    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const data = await res.json();
    renderResults(data, currentPrice);
  } catch (err) {
    outputEmpty.style.display = 'block';
    outputResults.style.display = 'none';
    outputEmpty.innerHTML = `Could not reach the AI engine.<br>${err.message}<br>Is it running on ${CONFIG.AI_ENGINE_BASE}?`;
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = 'Run pricing model →';
  }
}

runBtn.addEventListener('click', runPricingModel);
loadOptions();