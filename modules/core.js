// ============================================================================
// Canvas Enable Totals - Core Module
// Contains constants, utilities, and core grade calculation functions
// ============================================================================

// ============================================================================
// Constants & Selectors
// ============================================================================
const SELECTORS = {
  grade_display: "student-grades-final",
  grade_table: "grades_summary",
  weight_table: "table.summary",
  max_points: "td:nth-of-type(4) > div > span:nth-child(3) > span:nth-child(2)",
  category: "th .context",
  assignment_name: "th a.assignment_title",
  points_received: "td:nth-of-type(4) > div > span:nth-child(3) > span.grade",
  custom_weight_body: "custom-weight-body",
  custom_weight_total: "custom-weight-total",
  custom_weight_checkbox: "enable_custom_weights",
  grade_policies_checkbox: "enable_grade_policies",
  grade_policies_body: "grade-policies-body",
  gpa_scale_checkbox: "enable_gpa_scale",
  gpa_scale_body: "gpa-scale-body",
};

const STORAGE_KEYS = {
  weights: (course_id) => `canvas_custom_weights_${course_id}`,
  enabled: (course_id) => `canvas_custom_weights_enabled_${course_id}`,
  policies: (course_id) => `canvas_grade_policies_${course_id}`,
  policiesEnabled: (course_id) => `canvas_grade_policies_enabled_${course_id}`,
  gpaScale: (course_id) => `canvas_gpa_scale_${course_id}`,
  gpaScaleEnabled: (course_id) => `canvas_gpa_scale_enabled_${course_id}`,
};

// ============================================================================
// Constants
// ============================================================================
const EPSILON = 0.01; // For floating point comparison

// ============================================================================
// Utility Functions
// ============================================================================
const formatPercent = (n) => (Number.isFinite(n) ? n.toFixed(2) : "0.00");

const parseFloatOrZero = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// ============================================================================
// LocalStorage Helpers
// ============================================================================
function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    if (err.name === "QuotaExceededError") {
      console.error("LocalStorage quota exceeded. Cannot save data.");
      alert("Unable to save settings. Storage quota exceeded.");
    } else {
      console.error("Failed to save to localStorage:", err);
    }
  }
}

function loadFromStorage(key) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch (err) {
    console.error("Failed to load from localStorage:", err);
    return null;
  }
}

// ============================================================================
// DOM Cache
// ============================================================================
const dom_cache = {
  grade_table: null,
  display_element: null,
  custom_weight_body: null,
  grade_policies_body: null,
  gpa_scale_body: null,
  gpa_scale_checkbox: null,
  course_id: null,
};

function getCourseId() {
  if (!dom_cache.course_id) {
    dom_cache.course_id =
      window.location.pathname.match(/\/courses\/(\d+)/)?.[1] || null;
  }
  return dom_cache.course_id;
}

function getDisplayElement() {
  if (!dom_cache.display_element) {
    dom_cache.display_element = document.getElementById(
      SELECTORS.grade_display
    );
  }
  return dom_cache.display_element;
}

function getGradeTable() {
  if (!dom_cache.grade_table) {
    dom_cache.grade_table = document.getElementById(SELECTORS.grade_table);
  }
  return dom_cache.grade_table;
}

function getCustomWeightBody() {
  if (!dom_cache.custom_weight_body) {
    dom_cache.custom_weight_body = document.getElementById(
      SELECTORS.custom_weight_body
    );
  }
  return dom_cache.custom_weight_body;
}

function getGradePoliciesBody() {
  if (!dom_cache.grade_policies_body) {
    dom_cache.grade_policies_body = document.getElementById(
      SELECTORS.grade_policies_body
    );
  }
  return dom_cache.grade_policies_body;
}

function getGPAScaleBody() {
  if (!dom_cache.gpa_scale_body) {
    dom_cache.gpa_scale_body = document.getElementById(
      SELECTORS.gpa_scale_body
    );
  }
  return dom_cache.gpa_scale_body;
}

function getGPAScaleCheckbox() {
  if (!dom_cache.gpa_scale_checkbox) {
    dom_cache.gpa_scale_checkbox = document.getElementById(
      SELECTORS.gpa_scale_checkbox
    );
  }
  return dom_cache.gpa_scale_checkbox;
}

// ============================================================================
// Assignment Cache
// ============================================================================
let assignment_cache = null;

function invalidateAssignmentCache() {
  assignment_cache = null;
}
// ============================================================================
// Grade Calculation Functions
// ============================================================================
function calculateFinalGrade(weight_map, grade_map, display_element) {
  let final_grade = 0;

  if (weight_map.size === 0) {
    // Unweighted: total points earned / total possible points
    let total_received = 0;
    let total_possible = 0;
    for (const [, category_grades] of grade_map.entries()) {
      total_received += category_grades.received;
      total_possible += category_grades.possible;
    }
    if (total_possible > 0) {
      final_grade = (total_received / total_possible) * 100;
    }
  } else {
    // Weighted: multiply each category percentage by its weight
    for (const [category, category_grades] of grade_map.entries()) {
      const weight = weight_map.get(category) || 0;

      if (category_grades.possible > 0 && weight > 0) {
        final_grade +=
          (category_grades.received / category_grades.possible) * weight;
      }
    }
  }

  // Calculate GPA if enabled (uses function from gpa.js)
  const gpa_checkbox = getGPAScaleCheckbox();
  let gpa_text = "";

  if (gpa_checkbox?.checked) {
    const gpa_scale = getGPAScale();
    const gpa_value = calculateGPA(final_grade, gpa_scale);

    if (gpa_value !== null) {
      gpa_text = ` (${gpa_value.toFixed(2)})`;
    }
  }

  display_element.style.fontSize = "16px";
  display_element.textContent = `Total: ${formatPercent(final_grade)}%${gpa_text}`;
}

function extractAllAssignments(weight_map) {
  if (assignment_cache) {
    return assignment_cache;
  }

  const assignments_by_category = new Map();
  const grade_table = getGradeTable();

  if (!grade_table) {
    return assignments_by_category;
  }

  for (const row of grade_table.querySelectorAll("tbody tr")) {
    const grade = extractGradeFromRow(row, weight_map);
    if (!grade) {
      continue;
    }

    const { category, points_received, max_points } = grade;

    if (!assignments_by_category.has(category)) {
      assignments_by_category.set(category, []);
    }
    assignments_by_category.get(category).push({
      points_received,
      max_points,
    });
  }

  assignment_cache = assignments_by_category;
  return assignments_by_category;
}

function extractGrades(weight_map, grade_policies = null) {
  const grade_map = new Map();
  const individual_grades = extractAllAssignments(weight_map);

  // Apply grade policies and calculate totals
  for (const [category, grades] of individual_grades.entries()) {
    const policy = grade_policies?.get(category);
    const processed_grades = applyGradePolicy(grades, policy);

    let received = 0;
    let possible = 0;

    for (const grade of processed_grades) {
      received += grade.points_received;
      possible += grade.max_points;
    }

    grade_map.set(category, { received, possible });
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

function recalculateGrade() {
  // Invalidate cache since we're recalculating
  invalidateAssignmentCache();

  const weight_checkbox = document.getElementById(
    SELECTORS.custom_weight_checkbox
  );
  const policies_checkbox = document.getElementById(
    SELECTORS.grade_policies_checkbox
  );
  const display_element = getDisplayElement();

  if (!display_element) {
    return;
  }

  const weight_map = weight_checkbox?.checked
    ? getCustomWeights()
    : extractDefaultWeights();

  const grade_policies = policies_checkbox?.checked ? getGradePolicies() : null;

  const grade_map = extractGrades(weight_map, grade_policies);

  calculateFinalGrade(weight_map, grade_map, display_element);
}

// ============================================================================
// CSS Injection
// ============================================================================
function injectStyles() {
  if (document.getElementById("canvas-totals-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "canvas-totals-styles";
  style.textContent = `
    .weights-section { margin-top: 20px; }
    .weights-section .ic-Form-control--checkbox { 
      margin-bottom: 15px; 
      margin-top: 20px; 
    }
    .weights-section table.summary { font-size: 0.9em; }
    .weights-section input[type="number"] { width: 70px; }
    .weights-section .gpa-input { width: 60px; }
    .weights-section .weight-input { width: 80px; }
    .weights-section .policy-drop-input { width: 60px; }
    .weights-section .policy-threshold-input { width: 80px; }
    .delete-row { 
      color: red; 
      font-weight: bold; 
    }
  `;
  document.head.appendChild(style);
}

// ============================================================================
// Generic Checkbox Factory
// ============================================================================
function createFeatureCheckbox(config) {
  const { id, label, storage_key, panel, on_toggle } = config;

  const wrapper = document.createElement("div");
  wrapper.className = "ic-Form-control ic-Form-control--checkbox";
  wrapper.innerHTML = `
    <input type="checkbox" id="${id}">
    <label class="ic-Label" for="${id}">${label}</label>
  `;

  const checkbox = wrapper.querySelector("input");

  try {
    const saved_state = localStorage.getItem(storage_key) === "true";
    checkbox.checked = saved_state;
    panel.style.display = saved_state ? "" : "none";

    checkbox.addEventListener("change", (e) => {
      const is_checked = e.target.checked;
      panel.style.display = is_checked ? "" : "none";

      try {
        localStorage.setItem(storage_key, is_checked);
      } catch (err) {
        console.error("Failed to save checkbox state:", err);
      }

      if (on_toggle) {
        on_toggle(is_checked);
      }
      recalculateGrade();
    });
  } catch (err) {
    console.error("Failed to load checkbox state:", err);
  }

  return { wrapper, checkbox };
}

function createWeightsContainer(display_element) {
  let container = document.querySelector(".weights-section");

  if (!container) {
    container = document.createElement("div");
    container.className = "weights-section";
    display_element.parentElement.appendChild(container);
  }

  return container;
}
