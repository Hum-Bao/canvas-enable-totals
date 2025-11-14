// ============================================================================
// Canvas Enable Totals - Custom Weights Module
// Handles custom weight configuration and UI
// ============================================================================

// ============================================================================
// Custom Weights Storage Functions
// ============================================================================
function saveCustomWeights(weightMap) {
  const course_id = getCourseId();
  if (!course_id) {
    return;
  }

  try {
    const weights = Object.fromEntries(weightMap);
    localStorage.setItem(
      STORAGE_KEYS.weights(course_id),
      JSON.stringify(weights)
    );
  } catch (err) {
    if (err.name === "QuotaExceededError") {
      console.error("LocalStorage quota exceeded. Cannot save custom weights.");
      alert("Unable to save custom weights. Storage quota exceeded.");
    } else {
      console.error("Failed to save custom weights:", err);
    }
  }
}

function loadCustomWeights() {
  const course_id = getCourseId();
  if (!course_id) {
    return null;
  }

  const saved = localStorage.getItem(STORAGE_KEYS.weights(course_id));
  if (!saved) {
    return null;
  }

  try {
    const weights = JSON.parse(saved);
    return new Map(Object.entries(weights));
  } catch (e) {
    console.warn("Failed to load saved weights:", e);
    return null;
  }
}

function getCustomWeights() {
  const custom_weight_map = new Map();
  const tbody = getCustomWeightBody();

  if (!tbody) {
    return custom_weight_map;
  }

  const rows = tbody.querySelectorAll("tr");

  for (const row of rows) {
    const category = row.querySelector("th")?.textContent.trim();
    const input = row.querySelector("input[type='number']");

    if (category && input) {
      custom_weight_map.set(category, parseFloatOrZero(input.value));
    }
  }

  saveCustomWeights(custom_weight_map);
  return custom_weight_map;
}

function updateWeightTotal() {
  const tbody = getCustomWeightBody();
  const total_element = document.getElementById(SELECTORS.custom_weight_total);

  if (!tbody || !total_element) {
    return;
  }

  let total = 0;
  const inputs = tbody.querySelectorAll("input[type='number']");

  for (const input of inputs) {
    total += parseFloatOrZero(input.value);
  }

  total_element.textContent = `${total.toFixed(2)}%`;
  total_element.style.color = Math.abs(total - 100) < 0.01 ? "inherit" : "red";
}

// ============================================================================
// Custom Weights UI Functions
// ============================================================================
function createCustomWeightsUI(categories) {
  const display_element = getDisplayElement();
  if (!display_element) {
    return;
  }

  const saved_weights = loadCustomWeights();
  const container = createWeightsContainer(display_element);
  const panel = createWeightsTable(container, categories, saved_weights);

  const course_id = getCourseId();
  const { wrapper } = createFeatureCheckbox({
    id: SELECTORS.custom_weight_checkbox,
    label: "Enable custom assignment weights",
    storageKey: STORAGE_KEYS.enabled(course_id),
    panel: panel,
    onToggle: null,
  });

  container.insertBefore(wrapper, panel);
  updateWeightTotal();
}

function createWeightsTable(container, categories, savedWeights) {
  const table = document.createElement("table");
  table.className = "summary";
  table.style.display = "none";

  table.innerHTML = `
    <thead>
      <tr>
        <th scope="col">Group</th>
        <th scope="col">Weight (%)</th>
      </tr>
    </thead>
    <tbody id="${SELECTORS.custom_weight_body}"></tbody>
    <tfoot>
      <tr style="font-weight: bold;">
        <th scope="row">Total</th>
        <td id="${SELECTORS.custom_weight_total}">0%</td>
      </tr>
    </tfoot>
  `;

  container.appendChild(table);

  const tbody = table.querySelector("tbody");
  populateWeightsTable(tbody, categories, savedWeights);

  return table;
}

function populateWeightsTable(tbody, categories, savedWeights) {
  for (const category of categories) {
    const saved_value = savedWeights?.get(category) || 0;
    const row = createWeightRow(category, saved_value);
    tbody.appendChild(row);
  }
}

function createWeightRow(category, value) {
  const row = document.createElement("tr");
  row.innerHTML = `
    <th scope="row">${category}</th>
    <td>
      <input type="number" 
             min="0" 
             max="100" 
             step="0.01" 
             value="${value}" 
             data-category="${category}"
             style="width: 80px;">
    </td>
  `;

  const input = row.querySelector("input");
  input.addEventListener("input", () => {
    updateWeightTotal();
    recalculateGrade();
  });

  return row;
}
