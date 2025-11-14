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
  policies_enabled: (course_id) => `canvas_grade_policies_enabled_${course_id}`,
  gpa_scale: (course_id) => `canvas_gpa_scale_${course_id}`,
  gpa_scale_enabled: (course_id) => `canvas_gpa_scale_enabled_${course_id}`,
};

// ============================================================================
// Utility Functions
// ============================================================================
const formatPercent = (n) => (Number.isFinite(n) ? n.toFixed(2) : "0.00");

const parseFloatOrZero = (value) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

// ============================================================================
// DOM Cache
// ============================================================================
const dom_cache = {
  gradeTable: null,
  displayElement: null,
  customWeightBody: null,
  gradePoliciesBody: null,
  gpaScaleBody: null,
  courseId: null,
};

function getCourseId() {
  if (!dom_cache.courseId) {
    dom_cache.courseId =
      window.location.pathname.match(/\/courses\/(\d+)/)?.[1] || null;
  }
  return dom_cache.courseId;
}

function getDisplayElement() {
  if (!dom_cache.displayElement) {
    dom_cache.displayElement = document.getElementById(SELECTORS.grade_display);
  }
  return dom_cache.displayElement;
}

function getGradeTable() {
  if (!dom_cache.gradeTable) {
    dom_cache.gradeTable = document.getElementById(SELECTORS.grade_table);
  }
  return dom_cache.gradeTable;
}

function getCustomWeightBody() {
  if (!dom_cache.customWeightBody) {
    dom_cache.customWeightBody = document.getElementById(
      SELECTORS.custom_weight_body
    );
  }
  return dom_cache.customWeightBody;
}

function getGradePoliciesBody() {
  if (!dom_cache.gradePoliciesBody) {
    dom_cache.gradePoliciesBody = document.getElementById(
      SELECTORS.grade_policies_body
    );
  }
  return dom_cache.gradePoliciesBody;
}

function getGPAScaleBody() {
  if (!dom_cache.gpaScaleBody) {
    dom_cache.gpaScaleBody = document.getElementById(SELECTORS.gpa_scale_body);
  }
  return dom_cache.gpaScaleBody;
}

// ============================================================================
// Assignment Cache
// ============================================================================
let assignmentCache = null;

function invalidateAssignmentCache() {
  assignmentCache = null;
}

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

  // Calculate GPA if enabled
  const gpa_checkbox = document.getElementById(SELECTORS.gpa_scale_checkbox);
  let gpa_text = "";

  if (gpa_checkbox?.checked) {
    const gpa_scale = getGPAScale();
    const gpa = calculateGPA(final_grade, gpa_scale);

    if (gpa !== null) {
      gpa_text = ` (GPA: ${gpa.toFixed(2)})`;
    }
  }

  display_element.style.fontSize = "16px";
  display_element.textContent = `Total: ${formatPercent(final_grade)}%${gpa_text}`;
}

function extractAllAssignments(weight_map) {
  if (assignmentCache) {
    return assignmentCache;
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

  assignmentCache = assignments_by_category;
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
  const { id, label, storageKey, panel, onToggle } = config;

  const wrapper = document.createElement("div");
  wrapper.className = "ic-Form-control ic-Form-control--checkbox";
  wrapper.innerHTML = `
    <input type="checkbox" id="${id}">
    <label class="ic-Label" for="${id}">${label}</label>
  `;

  const checkbox = wrapper.querySelector("input");

  try {
    const savedState = localStorage.getItem(storageKey) === "true";
    checkbox.checked = savedState;
    panel.style.display = savedState ? "" : "none";

    checkbox.addEventListener("change", (e) => {
      const isChecked = e.target.checked;
      panel.style.display = isChecked ? "" : "none";

      try {
        localStorage.setItem(storageKey, isChecked);
      } catch (err) {
        console.error("Failed to save checkbox state:", err);
      }

      if (onToggle) {
        onToggle(isChecked);
      }
      recalculateGrade();
    });
  } catch (err) {
    console.error("Failed to load checkbox state:", err);
  }

  return { wrapper, checkbox };
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
