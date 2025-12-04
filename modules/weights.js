// ============================================================================
// Canvas Enable Totals - Custom Weights Module
// Handles custom weight configuration and UI
// ============================================================================

// ============================================================================
// Default Weights Extraction
// ============================================================================
function extractDefaultWeights() {
  const weight_map = new Map();
  const weight_table = document.querySelector(SELECTORS.weight_table);

  if (!weight_table) {
    return weight_map;
  }

  const rows = weight_table.querySelectorAll("tbody tr");

  for (const row of rows) {
    const category_element = row.querySelector("th .context");
    const weight_element = row.querySelector("td");

    if (category_element && weight_element) {
      const category = category_element.textContent.trim();
      const weight = parseFloat(weight_element.textContent.replace("%", ""));

      if (Number.isFinite(weight)) {
        weight_map.set(category, weight);
      }
    }
  }

  return weight_map;
}

// ============================================================================
// Custom Weights Storage Functions
// ============================================================================
function saveCustomWeights(weight_map) {
  const weights = Object.fromEntries(weight_map);
  updateCourseSetting("weights", weights);
}

function loadCustomWeights() {
  const weights = loadCourseSetting("weights", null);
  return weights ? new Map(Object.entries(weights)) : null;
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
  total_element.style.color =
    Math.abs(total - 100) < EPSILON ? "inherit" : "red";
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

  const { wrapper } = createFeatureCheckbox({
    id: SELECTORS.custom_weight_checkbox,
    label: "Enable custom assignment weights",
    setting_key: "weights_enabled",
    panel: panel,
    on_toggle: null,
  });

  container.insertBefore(wrapper, panel);
  updateWeightTotal();

  // Don't recalculate here - init() will do it after all UI is set up
}

function createWeightsTable(container, categories, saved_weights) {
  const footer_html = `
    <tr style="font-weight: bold;">
      <th scope="row">Total</th>
      <td id="${SELECTORS.custom_weight_total}">0%</td>
    </tr>
  `;

  const { element: table, tbody } = createFeatureTable({
    headers: ["Group", "Weight (%)"],
    tbody_id: SELECTORS.custom_weight_body,
    include_panel: false,
    footer_html: footer_html,
  });

  container.appendChild(table);
  populateWeightsTable(tbody, categories, saved_weights);

  return table;
}

function populateWeightsTable(tbody, categories, saved_weights) {
  for (const category of categories) {
    const saved_value = saved_weights?.get(category) || 0;
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
             class="weight-input">
    </td>
  `;

  const input = row.querySelector("input");

  // Use 'input' event for immediate visual feedback on total
  input.addEventListener("input", () => {
    updateWeightTotal();
    // Use debounced recalculation to avoid excessive computation
    debounced_recalculate();
  });

  // Also recalculate immediately on blur for instant feedback when done
  input.addEventListener("blur", () => {
    recalculateGrade();
  });

  return row;
}
