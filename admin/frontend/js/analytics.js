(() => {
  const AI_ENGINE_BASE =
    typeof CONFIG !== "undefined" && CONFIG.AI_ENGINE_BASE
      ? CONFIG.AI_ENGINE_BASE
      : "http://localhost:8001";

  const analyticsUrl = `${AI_ENGINE_BASE}/analytics`;

  const loading = document.getElementById("analyticsLoading");
  const content = document.getElementById("analyticsContent");
  const errorBox = document.getElementById("analyticsError");

  const kpis = document.getElementById("analyticsKpis");
  const cities = document.getElementById("analyticsCities");
  const categories = document.getElementById("analyticsCategories");
  const cityCategories = document.getElementById(
    "analyticsCityCategories"
  );
  const allocation = document.getElementById("analyticsAllocation");

  if (!loading || !content || !errorBox) {
    console.error(
      "Demand Intelligence: required HTML elements were not found."
    );
    return;
  }

  const number = (value, decimals = 0) =>
    Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const renderRows = (items, formatter) => {
    if (!Array.isArray(items) || items.length === 0) {
      return '<p class="hint-text">No analytics data available.</p>';
    }

    return items.map(formatter).join("");
  };

  function showError(message) {
    console.error("Demand Intelligence:", message);

    loading.style.display = "none";
    content.style.display = "none";
    errorBox.style.display = "block";

    errorBox.textContent = message;
  }

  function renderAnalytics(data) {
    kpis.innerHTML = `
      <div class="card analytics-box">
        <div class="eyebrow">HISTORICAL JOBS</div>
        <h2>${number(data.total_jobs)}</h2>
        <p>Total jobs in the analyzed dataset</p>
      </div>

      <div class="card analytics-box">
        <div class="eyebrow">AVERAGE DAILY DEMAND</div>
        <h2>${number(data.avg_daily_jobs, 2)}</h2>
        <p>Average jobs per day</p>
      </div>

      <div class="card analytics-box">
        <div class="eyebrow">PEAK DAY</div>
        <h2>${data.peak_day?.day || "—"}</h2>
        <p>${number(data.peak_day?.avg_jobs, 2)} average jobs</p>
      </div>

      <div class="card analytics-box">
        <div class="eyebrow">PEAK MONTH</div>
        <h2>${data.peak_month?.month || "—"}</h2>
        <p>${number(data.peak_month?.avg_jobs, 2)} average jobs</p>
      </div>
    `;

    cities.innerHTML = renderRows(data.cities, (item) => `
      <div class="analytics-row">
        <div>
          <strong>${item.city}</strong>
          <div class="hint-text">
            ${number(item.records)} records
          </div>
        </div>

        <strong>${number(item.total_jobs)}</strong>
      </div>
    `);

    categories.innerHTML = renderRows(data.categories, (item) => `
      <div class="analytics-row">
        <div>
          <strong>${item.category}</strong>
          <div class="hint-text">
            ${number(item.avg_jobs, 2)} avg/day
          </div>
        </div>

        <strong>${number(item.total_jobs)}</strong>
      </div>
    `);

    cityCategories.innerHTML = renderRows(
      data.top_city_category,
      (item) => `
        <div class="analytics-row">
          <div>
            <strong>${item.category}</strong>
            <div class="hint-text">
              ${item.city}
            </div>
          </div>

          <strong>${number(item.total_jobs)}</strong>
        </div>
      `
    );

    allocation.textContent =
      data.allocation_insight ||
      "Use the demand distribution to prioritize cooperative worker availability.";

    loading.style.display = "none";
    errorBox.style.display = "none";
    content.style.display = "block";
  }

  async function loadAnalytics() {
    try {
      loading.style.display = "block";
      content.style.display = "none";
      errorBox.style.display = "none";

      console.log("Loading analytics from:", analyticsUrl);

      const response = await fetch(analyticsUrl, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          `Analytics API returned HTTP ${response.status}`
        );
      }

      const data = await response.json();

      console.log("Analytics data received:", data);

      renderAnalytics(data);
    } catch (error) {
      showError(
        `Unable to load demand intelligence. ${
          error?.message ||
          "Check that the AI engine is running on port 8001."
        }`
      );
    }
  }

  loadAnalytics();
})();