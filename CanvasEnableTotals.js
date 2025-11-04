// ==UserScript==
// @name         Canvas Enable Totals
// @namespace    humbao.dev
// @version      1.1
// @description  Return calculation of totals on Canvas
// @author       HumBao
// @include      http*://canvas.*.edu/courses/*/grades
// @include      http*://*.instructure.com/courses/*/grades
// @run-at document-end
// ==/UserScript==

// ============================================================================
// Constants & Selectors
// ============================================================================
const SELECTORS = {
  grade_display: "student-grades-final",
  grade_table: "grades_summary",
  weight_table: "table.summary",
  max_points: "td:nth-of-type(4) > div > span:nth-child(3) > span:nth-child(2)",
  category: "th .context",
  points_received: "td:nth-of-type(4) > div > span:nth-child(3) > span.grade",
  custom_weight_body: "custom-weight-body",
  custom_weight_total: "custom-weight-total",
  custom_weight_checkbox: "enable_custom_weights",
};

const STORAGE_KEYS = {
  weights: (course_id) => `canvas_custom_weights_${course_id}`,
  enabled: (course_id) => `canvas_custom_weights_enabled_${course_id}`,
};

// ============================================================================
// Utility Functions
// ============================================================================
const formatPercent = (n) => (Number.isFinite(n) ? n.toFixed(2) : "0.00");

const getCourseId = () =>
  window.location.pathname.match(/\/courses\/(\d+)/)?.[1] || null;

const parseFloatOrZero = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// ============================================================================
// Grade Calculation Functions
// ============================================================================
function calculateFinalGrade(weight_map, grade_map, display_element) {
  let final_grade = 0;
  let total_weight = 0;

  if (weight_map.size === 0) {
    // Unweighted calculation
    let received = 0;
    let possible = 0;

    for (const totals of grade_map.values()) {
      if (totals?.possible > 0) {
        received += totals.received;
        possible += totals.possible;
      }
    }

    final_grade = possible > 0 ? (received / possible) * 100 : 0;
  } else {
    // Weighted calculation
    for (const [category, totals] of grade_map.entries()) {
      if (!totals || totals.possible <= 0) {
        continue;
      }

      const weight = weight_map.get(category);
      if (weight == null || weight === 0) {
        continue;
      }

      total_weight += weight;
      final_grade += (totals.received / totals.possible) * weight;
    }

    final_grade = total_weight > 0 ? (final_grade * 100) / total_weight : 0;
  }

  display_element.style.fontSize = "16px";
  display_element.textContent = `Total: ${formatPercent(final_grade)}%`;
}

const dom_cache = {
  gradeTable: null,
  displayElement: null,
};

function getGradeTable() {
  if (!dom_cache.gradeTable) {
    dom_cache.gradeTable = document.getElementById(SELECTORS.grade_table);
  }
  return dom_cache.gradeTable;
}

function extractGrades(weight_map) {
  const grade_map = new Map();

  const grade_table = getGradeTable();

  if (!grade_table) {
    console.warn("Grades summary table not found.");
    return grade_map;
  }

  // No need to convert to array first
  for (const row of grade_table.querySelectorAll("tbody tr")) {
    const grade = extractGradeFromRow(row, weight_map);
    if (!grade) {
      continue;
    }

    const { category, points_received, max_points } = grade;
    const totals = grade_map.get(category) ?? { received: 0, possible: 0 };

    totals.received += points_received;
    totals.possible += max_points;

    if (!grade_map.has(category)) {
      grade_map.set(category, totals);
    }
  }

  return grade_map;
}

function extractGradeFromRow(row, weight_map) {
  // Extract max points
  const max_points_element = row.querySelector(SELECTORS.max_points);
  if (!max_points_element) {
    return null;
  }

  const max_points = parseFloat(
    max_points_element.textContent.replace(/^\/\s*/, "").trim()
  );
  if (max_points === 0 || !Number.isFinite(max_points)) {
    return null;
  }

  // Extract category
  const category_element = row.querySelector(SELECTORS.category);
  if (!category_element) {
    return null;
  }

  const category = category_element.textContent.trim();

  // Skip zero-weight categories
  if (weight_map?.get(category) === 0) {
    return null;
  }

  // Extract points received
  const points_received_element = row.querySelector(SELECTORS.points_received);
  if (!points_received_element) {
    return null;
  }

  const points_received_text =
    points_received_element.lastChild.textContent.trim();
  if (points_received_text.includes("-")) {
    return null;
  } // Ungraded

  const points_received = parseFloat(points_received_text);
  if (!Number.isFinite(points_received)) {
    return null;
  }

  return {
    category,
    points_received,
    max_points,
  };
}

function extractDefaultWeights() {
  const weight_map = new Map();
  const weight_table = document.querySelector(SELECTORS.weight_table);

  if (!weight_table) {
    console.warn("No default weights found. Using unweighted calculation.");
    return weight_map;
  }

  const rows = weight_table.querySelectorAll("tbody tr");

  for (const row of rows) {
    const category_element = row.querySelector("th[scope='row']");
    const weight_element = row.querySelector("td");

    if (category_element && weight_element) {
      const category = category_element.textContent.trim();
      const weight_match = weight_element.textContent
        .trim()
        .match(/(\d+(?:\.\d+)?)%/);

      if (weight_match) {
        weight_map.set(category, parseFloat(weight_match[1]));
      }
    }
  }

  return weight_map;
}

// ============================================================================
// Custom Weights Functions
// ============================================================================
function saveCustomWeights(weightMap) {
  const course_id = getCourseId();
  if (!course_id) {
    return;
  }

  const weights = Object.fromEntries(weightMap);
  localStorage.setItem(
    STORAGE_KEYS.weights(course_id),
    JSON.stringify(weights)
  );
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

function saveCheckboxState(checked) {
  const course_id = getCourseId();
  if (!course_id) {
    return;
  }

  localStorage.setItem(STORAGE_KEYS.enabled(course_id), String(checked));
}

function loadCheckboxState() {
  const course_id = getCourseId();
  if (!course_id) {
    return false;
  }

  return localStorage.getItem(STORAGE_KEYS.enabled(course_id)) === "true";
}

function getCustomWeights() {
  const custom_weight_map = new Map();
  const tbody = document.getElementById(SELECTORS.custom_weight_body);

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
  const tbody = document.getElementById(SELECTORS.custom_weight_body);
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

function recalculateGrade() {
  const checkbox = document.getElementById(SELECTORS.custom_weight_checkbox);
  const display_element = document.getElementById(SELECTORS.grade_display);

  if (!display_element) {
    return;
  }

  const weight_map = checkbox?.checked
    ? getCustomWeights()
    : extractDefaultWeights();
  const grade_map = extractGrades(weight_map);

  calculateFinalGrade(weight_map, grade_map, display_element);
}

// ============================================================================
// UI Creation Functions
// ============================================================================
function createCustomWeightsUI(categories) {
  const display_element = document.getElementById(SELECTORS.grade_display);
  if (!display_element) {
    return;
  }

  const saved_weights = loadCustomWeights();
  const container = createWeightsContainer(display_element);
  const checkbox = createCheckbox(container);
  const table = createWeightsTable(container, categories, saved_weights);

  setupCheckboxBehavior(checkbox, table);
  updateWeightTotal();
}

function createWeightsContainer(displayElement) {
  let container = document.querySelector(".weights-section");

  if (!container) {
    container = document.createElement("div");
    container.className = "weights-section";
    displayElement.parentElement.appendChild(container);
  }

  return container;
}

function createCheckbox(container) {
  const wrapper = document.createElement("div");
  wrapper.className = "ic-Form-control ic-Form-control--checkbox";
  wrapper.style.marginBottom = "15px";
  wrapper.innerHTML = `
    <input type="checkbox" id="${SELECTORS.custom_weight_checkbox}">
    <label class="ic-Label" for="${SELECTORS.custom_weight_checkbox}">
      Enable custom assignment weights
    </label>
  `;

  container.appendChild(wrapper);
  return wrapper.querySelector("input");
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

function setupCheckboxBehavior(checkbox, table) {
  const saved_state_bool = loadCheckboxState();
  checkbox.checked = saved_state_bool;
  table.style.display = saved_state_bool ? "" : "none";

  checkbox.addEventListener("change", (e) => {
    const is_checked_bool = e.target.checked;
    table.style.display = is_checked_bool ? "" : "none";
    saveCheckboxState(is_checked_bool);
    recalculateGrade();
  });

  // Recalculate on load if checkbox was previously checked
  if (saved_state_bool) {
    recalculateGrade();
  }
}

// ============================================================================
// Main Initialization
// ============================================================================
(function init() {
  "use strict";

  const display_element = document.getElementById(SELECTORS.grade_display);

  if (!display_element) {
    console.warn("Grade display element not found.");
    return;
  }

  if (!display_element.textContent.includes("disabled")) {
    console.log("Totals already enabled. Extension inactive.");
    return;
  }

  const weight_map = extractDefaultWeights();
  const grade_map = extractGrades(weight_map);
  const categories = Array.from(grade_map.keys());

  calculateFinalGrade(weight_map, grade_map, display_element);
  createCustomWeightsUI(categories);
})();
