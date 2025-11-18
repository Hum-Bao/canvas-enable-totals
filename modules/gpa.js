// ============================================================================
// Canvas Enable Totals - GPA Module
// Handles GPA calculation with customizable 4.0 scale
// ============================================================================

// ============================================================================
// GPA Calculation
// ============================================================================
function calculateGPA(percentage, gpa_scale) {
  if (!gpa_scale || gpa_scale.length === 0) {
    return null;
  }

  // Sort scale by min_percent descending to check from highest to lowest
  const sorted_scale = [...gpa_scale].sort(
    (a, b) => b.min_percent - a.min_percent
  );

  for (const range of sorted_scale) {
    if (percentage >= range.min_percent && percentage <= range.max_percent) {
      return range.gpa_value;
    }
  }

  return 0.0; // Below all ranges
}

// ============================================================================
// GPA Scale Storage Functions
// ============================================================================
function saveGPAScale(scale_array) {
  const course_id = getCourseId();
  if (!course_id) {
    return;
  }

  saveToStorage(STORAGE_KEYS.gpaScale(course_id), scale_array);
}

function loadGPAScale() {
  const course_id = getCourseId();
  if (!course_id) {
    return null;
  }

  return loadFromStorage(STORAGE_KEYS.gpaScale(course_id));
}

function getGPAScale() {
  const tbody = getGPAScaleBody();
  if (!tbody) {
    return [];
  }

  const scale = [];
  const rows = tbody.querySelectorAll("tr");

  for (const row of rows) {
    const min_input = row.querySelector("input[data-gpa='min']");
    const max_input = row.querySelector("input[data-gpa='max']");
    const gpa_input = row.querySelector("input[data-gpa='value']");

    if (min_input && max_input && gpa_input) {
      const min_percent = parseFloatOrZero(min_input.value);
      const max_percent = parseFloatOrZero(max_input.value);
      const gpa_value = parseFloatOrZero(gpa_input.value);

      if (max_percent >= min_percent) {
        scale.push({ min_percent, max_percent, gpa_value });
      }
    }
  }

  saveGPAScale(scale);
  return scale;
}

// ============================================================================
// GPA Scale UI Functions
// ============================================================================
function createGPAScaleUI() {
  const display_element = getDisplayElement();
  if (!display_element) {
    return;
  }

  const saved_scale = loadGPAScale();
  const container = createWeightsContainer(display_element);
  const panel = createGPAScalePanel(container, saved_scale);

  const course_id = getCourseId();
  const { wrapper } = createFeatureCheckbox({
    id: SELECTORS.gpa_scale_checkbox,
    label: "Enable GPA calculation (4.0 scale)",
    storage_key: STORAGE_KEYS.gpaScaleEnabled(course_id),
    panel: panel,
    on_toggle: null,
  });

  container.insertBefore(wrapper, panel);

  // Don't recalculate here - init() will do it after all UI is set up
}

function createGPAScalePanel(container, saved_scale) {
  const panel = document.createElement("div");
  panel.style.display = "none";
  panel.style.marginBottom = "20px";

  const description = document.createElement("p");
  description.style.marginBottom = "10px";
  description.style.fontSize = "0.9em";
  description.textContent =
    "Define your GPA scale ranges. Click 'Add Range' to get started.";
  panel.appendChild(description);

  const table = document.createElement("table");
  table.className = "summary";
  table.style.fontSize = "0.9em";

  table.innerHTML = `
    <thead>
      <tr>
        <th scope="col">Min %</th>
        <th scope="col">Max %</th>
        <th scope="col">GPA</th>
        <th scope="col">Action</th>
      </tr>
    </thead>
    <tbody id="${SELECTORS.gpa_scale_body}"></tbody>
  `;

  panel.appendChild(table);

  const tbody = table.querySelector("tbody");
  if (saved_scale && saved_scale.length > 0) {
    populateGPAScaleTable(tbody, saved_scale);
  }

  // Add "Add Range" button
  const add_button = document.createElement("button");
  add_button.textContent = "+ Add Range";
  add_button.className = "btn btn-small";
  add_button.style.marginTop = "10px";
  add_button.addEventListener("click", () => {
    const tbody_elem = document.getElementById(SELECTORS.gpa_scale_body);
    const new_row = createGPAScaleRow({
      min_percent: 0,
      max_percent: 100,
      gpa_value: 0,
    });
    tbody_elem.appendChild(new_row);
  });
  panel.appendChild(add_button);

  container.appendChild(panel);

  return panel;
}

function populateGPAScaleTable(tbody, scale) {
  for (const range of scale) {
    const row = createGPAScaleRow(range);
    tbody.appendChild(row);
  }
}

function createGPAScaleRow(range) {
  const row = document.createElement("tr");

  row.innerHTML = `
    <td>
      <input type="number" 
             min="0" 
             max="100" 
             step="0.01" 
             value="${range.min_percent}" 
             data-gpa="min"
             class="gpa-input"
             title="Minimum percentage for this range">
    </td>
    <td>
      <input type="number" 
             min="0" 
             max="100" 
             step="0.01" 
             value="${range.max_percent}" 
             data-gpa="max"
             class="gpa-input"
             title="Maximum percentage for this range">
    </td>
    <td>
      <input type="number" 
             min="0" 
             max="4" 
             step="0.01" 
             value="${range.gpa_value}" 
             data-gpa="value"
             class="gpa-input"
             title="GPA value for this range">
    </td>
    <td>
      <button class="btn btn-small delete-row" title="Delete this range">×</button>
    </td>
  `;

  // Add change listeners and validation
  const min_input = row.querySelector('[data-gpa="min"]');
  const max_input = row.querySelector('[data-gpa="max"]');
  const inputs = row.querySelectorAll("input");

  // Validate min/max relationship
  const validate_range = () => {
    const min_val = parseFloat(min_input.value) || 0;
    const max_val = parseFloat(max_input.value) || 0;

    if (min_val > max_val) {
      max_input.value = min_input.value;
    }
  };

  min_input.addEventListener("change", validate_range);
  max_input.addEventListener("change", validate_range);

  for (const input of inputs) {
    input.addEventListener("change", () => {
      recalculateGrade();
    });
  }

  // Add delete button listener
  const delete_button = row.querySelector(".delete-row");
  delete_button.addEventListener("click", () => {
    row.remove();
    recalculateGrade();
  });

  return row;
}
