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
  courseSettings: (course_id) => `canvas_course_settings_${course_id}`,
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

// Debounce utility to prevent excessive recalculations
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ============================================================================
// LocalStorage Helpers - Consolidated per Course
// ============================================================================
function getCourseSettings() {
  const course_id = getCourseId();
  if (!course_id) {
    return null;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.courseSettings(course_id));
    return stored ? JSON.parse(stored) : {};
  } catch (err) {
    console.error("Failed to load course settings:", err);
    return {};
  }
}

function saveCourseSettings(settings) {
  const course_id = getCourseId();
  if (!course_id) {
    return;
  }

  try {
    localStorage.setItem(
      STORAGE_KEYS.courseSettings(course_id),
      JSON.stringify(settings)
    );
  } catch (err) {
    if (err.name === "QuotaExceededError") {
      console.error("LocalStorage quota exceeded. Cannot save data.");
      alert("Unable to save settings. Storage quota exceeded.");
    } else {
      console.error("Failed to save to localStorage:", err);
    }
  }
}

function updateCourseSetting(key, value) {
  const settings = getCourseSettings() || {};
  settings[key] = value;
  saveCourseSettings(settings);
}

function loadCourseSetting(key, default_value = null) {
  const settings = getCourseSettings();
  return settings && settings[key] !== undefined
    ? settings[key]
    : default_value;
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
  // Verify element is still in DOM
  if (
    dom_cache.display_element &&
    !document.body.contains(dom_cache.display_element)
  ) {
    dom_cache.display_element = null;
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
  // Verify element is still in DOM
  if (dom_cache.grade_table && !document.body.contains(dom_cache.grade_table)) {
    dom_cache.grade_table = null;
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
  // Verify element is still in DOM
  if (
    dom_cache.custom_weight_body &&
    !document.body.contains(dom_cache.custom_weight_body)
  ) {
    dom_cache.custom_weight_body = null;
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
  // Verify element is still in DOM
  if (
    dom_cache.grade_policies_body &&
    !document.body.contains(dom_cache.grade_policies_body)
  ) {
    dom_cache.grade_policies_body = null;
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
  // Verify element is still in DOM
  if (
    dom_cache.gpa_scale_body &&
    !document.body.contains(dom_cache.gpa_scale_body)
  ) {
    dom_cache.gpa_scale_body = null;
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
  // Verify element is still in DOM
  if (
    dom_cache.gpa_scale_checkbox &&
    !document.body.contains(dom_cache.gpa_scale_checkbox)
  ) {
    dom_cache.gpa_scale_checkbox = null;
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
let cached_weight_map_size = 0;

// Check if cache should be invalidated based on whether weights changed
function shouldInvalidateCache(weight_map) {
  // Only invalidate if the weight map structure changed (categories added/removed)
  // Not just because values changed
  return !assignment_cache || weight_map.size !== cached_weight_map_size;
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
  // Check if we should use cache or rebuild
  if (assignment_cache && !shouldInvalidateCache(weight_map)) {
    return assignment_cache;
  }

  const assignments_by_category = new Map();
  const grade_table = getGradeTable();

  if (!grade_table) {
    return assignments_by_category;
  }

  const rows = grade_table.querySelectorAll("tbody tr");

  for (const row of rows) {
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
  cached_weight_map_size = weight_map.size;
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
  // Cache all selector queries for this row at once
  const max_points_element = row.querySelector(SELECTORS.max_points);
  const category_element = row.querySelector(SELECTORS.category);
  const points_received_element = row.querySelector(SELECTORS.points_received);

  // Early exit if any required element is missing
  if (!max_points_element || !category_element || !points_received_element) {
    return null;
  }

  // Extract max points
  const max_points = parseFloat(
    max_points_element.textContent.replace(/^\/\s*/, "").trim()
  );
  if (max_points === 0 || !Number.isFinite(max_points)) {
    return null;
  }

  // Extract category
  const category = category_element.textContent.trim();

  // Skip zero-weight categories
  if (weight_map?.get(category) === 0) {
    return null;
  }

  // Extract points received
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
  // Don't invalidate cache here - let extractAllAssignments decide
  // Cache will only be invalidated when weight map structure changes

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
  updateCategoryTotals(grade_map);
}

// Debounced version for input events (300ms delay)
const debounced_recalculate = debounce(recalculateGrade, 300);

// ============================================================================
// Category Totals Display
// ============================================================================
function updateCategoryTotals(grade_map) {
  const grade_table = getGradeTable();
  if (!grade_table) {
    return;
  }

  // Find all category total rows
  const category_rows = grade_table.querySelectorAll("tr.group_total");

  for (const row of category_rows) {
    // Get category name from the row
    const title_element = row.querySelector("th.title");
    if (!title_element) {
      continue;
    }

    const category = title_element.textContent.trim();
    const category_data = grade_map.get(category);

    if (!category_data) {
      continue;
    }

    // Calculate percentage
    const percentage =
      category_data.possible > 0
        ? (category_data.received / category_data.possible) * 100
        : 0;

    // Update the score display (left side - percentage)
    // The .grade element is inside .tooltip which is inside .score_holder
    const score_holder = row.querySelector(".score_holder .tooltip .grade");
    const points_possible_element = row.querySelector(
      ".details .possible.points_possible"
    );

    if (score_holder) {
      score_holder.textContent = `${formatPercent(percentage)}%`;
    }

    // Update points earned / possible (right side)
    if (points_possible_element) {
      points_possible_element.textContent = `${category_data.received.toFixed(2)} / ${category_data.possible.toFixed(2)}`;
      points_possible_element.setAttribute(
        "aria-label",
        `${category_data.received.toFixed(2)} out of ${category_data.possible.toFixed(2)} points`
      );
    }
  }

  // Update final grade total row
  updateFinalGradeRow(grade_map);
}

function updateFinalGradeRow(grade_map) {
  const grade_table = getGradeTable();
  if (!grade_table) {
    return;
  }

  let final_grade_row = grade_table.querySelector(
    "tr#submission_final-grade, tr.final_grade"
  );

  // If the row doesn't exist, create it
  if (!final_grade_row) {
    final_grade_row = createFinalGradeRow();
    if (!final_grade_row) {
      return;
    }

    // Append to the table body
    const tbody = grade_table.querySelector("tbody");
    if (tbody) {
      tbody.appendChild(final_grade_row);
    } else {
      return;
    }
  }

  // Calculate total points across all categories
  let total_received = 0;
  let total_possible = 0;

  for (const [, category_data] of grade_map.entries()) {
    total_received += category_data.received;
    total_possible += category_data.possible;
  }

  const percentage =
    total_possible > 0 ? (total_received / total_possible) * 100 : 0;

  // Update the grade display (percentage)
  // The .grade element is inside .tooltip which is inside .score_holder
  const score_holder = final_grade_row.querySelector(
    ".score_holder .tooltip .grade"
  );
  if (score_holder) {
    score_holder.textContent = `${formatPercent(percentage)}%`;
  }

  // Update points earned / possible (right side)
  const points_possible_element = final_grade_row.querySelector(
    ".details .possible.points_possible"
  );
  if (points_possible_element && total_possible > 0) {
    points_possible_element.textContent = `${total_received.toFixed(2)} / ${total_possible.toFixed(2)}`;
    points_possible_element.setAttribute(
      "aria-label",
      `${total_received.toFixed(2)} out of ${total_possible.toFixed(2)} points`
    );
  }
}

function createFinalGradeRow() {
  const row = document.createElement("tr");
  row.className = "student_assignment hard_coded final_grade";
  row.setAttribute("data-muted", "true");
  row.setAttribute("data-pending_quiz", "false");
  row.id = "submission_final-grade";

  row.innerHTML = `
    <th class="title" scope="row">Total</th>
    <td class="due"></td>
    <td class="submitted"></td>
    <td class="status" scope="row"></td>
    <td class="assignment_score" title="">
      <div style="position: relative; height: 100%;" class="score_holder">
        <span class="assignment_presenter_for_submission" style="display: none;"></span>
        <span class="react_pill_container"></span>
        <span class="tooltip">
          <span class="grade"></span>
        </span>
        <div style="display: none;">
          <span class="original_points"></span>
          <span class="original_score"></span>
          <span class="what_if_score"></span>
          <span class="student_entered_score"></span>
          <span class="submission_status">none</span>
          <span class="assignment_group_id"></span>
          <span class="assignment_id">final-grade</span>
          <span class="group_weight"></span>
          <span class="rules"></span>
        </div>
      </div>
    </td>
    <td class="asset_processors_cell" data-assignment-id="final-grade" data-submission-id="" data-assignment-name="Total"></td>
    <td class="details">
      <span class="possible points_possible" aria-label=""></span>
    </td>
    <td></td>
  `;

  return row;
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
  const { id, label, setting_key, panel, on_toggle } = config;

  const wrapper = document.createElement("div");
  wrapper.className = "ic-Form-control ic-Form-control--checkbox";
  wrapper.innerHTML = `
    <input type="checkbox" id="${id}">
    <label class="ic-Label" for="${id}">${label}</label>
  `;

  const checkbox = wrapper.querySelector("input");

  try {
    const saved_state = loadCourseSetting(setting_key, false);
    checkbox.checked = saved_state;
    panel.style.display = saved_state ? "" : "none";

    checkbox.addEventListener("change", (e) => {
      const is_checked = e.target.checked;
      panel.style.display = is_checked ? "" : "none";

      try {
        updateCourseSetting(setting_key, is_checked);
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

// ============================================================================
// Generic Table Factory
// ============================================================================
function createFeatureTable(config) {
  const {
    headers,
    tbody_id,
    include_panel = false,
    footer_html = null,
    description = null,
  } = config;

  const wrapper = include_panel ? document.createElement("div") : null;
  if (wrapper) {
    wrapper.style.display = "none";
    wrapper.style.marginBottom = "20px";
  }

  if (description && wrapper) {
    const desc_element = document.createElement("p");
    desc_element.style.marginBottom = "10px";
    desc_element.style.fontSize = "0.9em";
    desc_element.textContent = description;
    wrapper.appendChild(desc_element);
  }

  const table = document.createElement("table");
  table.className = "summary";

  const header_cells = headers.map((h) => `<th scope="col">${h}</th>`).join("");
  table.innerHTML = `
    <thead>
      <tr>${header_cells}</tr>
    </thead>
    <tbody id="${tbody_id}"></tbody>
    ${footer_html ? `<tfoot>${footer_html}</tfoot>` : ""}
  `;

  if (wrapper) {
    wrapper.appendChild(table);
    return { element: wrapper, table, tbody: table.querySelector("tbody") };
  } else {
    table.style.display = "none";
    return { element: table, table, tbody: table.querySelector("tbody") };
  }
}
