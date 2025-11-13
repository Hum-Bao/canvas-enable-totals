// ============================================================================
// Canvas Enable Totals - GPA Module
// Handles GPA calculation with customizable 4.0 scale
// ============================================================================

// ============================================================================
// GPA Calculation
// ============================================================================
function calculateGPA(percentage, gpaScale) {
  if (!gpaScale || gpaScale.length === 0) {
    return null;
  }

  // Sort scale by min_percent descending to check from highest to lowest
  const sortedScale = [...gpaScale].sort(
    (a, b) => b.min_percent - a.min_percent
  );

  for (const range of sortedScale) {
    if (percentage >= range.min_percent && percentage <= range.max_percent) {
      return range.gpa_value;
    }
  }

  return 0.0; // Below all ranges
}

// ============================================================================
// GPA Scale Storage Functions
// ============================================================================
function saveGPAScale(scaleArray) {
  const course_id = getCourseId();
  if (!course_id) {
    return;
  }

  localStorage.setItem(
    STORAGE_KEYS.gpa_scale(course_id),
    JSON.stringify(scaleArray)
  );
}

function loadGPAScale() {
  const course_id = getCourseId();
  if (!course_id) {
    return null;
  }

  const stored = localStorage.getItem(STORAGE_KEYS.gpa_scale(course_id));
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored);
  } catch (err) {
    console.error("Failed to load GPA scale:", err);
    return null;
  }
}

function saveGPAScaleCheckboxState(checked) {
  const course_id = getCourseId();
  if (!course_id) {
    return;
  }

  localStorage.setItem(STORAGE_KEYS.gpa_scale_enabled(course_id), checked);
}

function loadGPAScaleCheckboxState() {
  const course_id = getCourseId();
  if (!course_id) {
    return false;
  }

  return (
    localStorage.getItem(STORAGE_KEYS.gpa_scale_enabled(course_id)) === "true"
  );
}

function getGPAScale() {
  const tbody = document.getElementById(SELECTORS.gpa_scale_body);
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
  const display_element = document.getElementById(SELECTORS.grade_display);
  if (!display_element) {
    return;
  }

  const saved_scale = loadGPAScale();
  const container = createWeightsContainer(display_element);
  const checkbox = createGPAScaleCheckbox(container);
  const panel = createGPAScalePanel(container, saved_scale);

  setupGPAScaleCheckboxBehavior(checkbox, panel);
}

function createGPAScaleCheckbox(container) {
  const wrapper = document.createElement("div");
  wrapper.className = "ic-Form-control ic-Form-control--checkbox";
  wrapper.style.marginBottom = "15px";
  wrapper.style.marginTop = "20px";
  wrapper.innerHTML = `
    <input type="checkbox" id="${SELECTORS.gpa_scale_checkbox}">
    <label class="ic-Label" for="${SELECTORS.gpa_scale_checkbox}">
      Enable GPA calculation (4.0 scale)
    </label>
  `;

  container.appendChild(wrapper);
  return wrapper.querySelector("input");
}

function createGPAScalePanel(container, savedScale) {
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
  if (savedScale && savedScale.length > 0) {
    populateGPAScaleTable(tbody, savedScale);
  }

  // Add "Add Range" button
  const addButton = document.createElement("button");
  addButton.textContent = "+ Add Range";
  addButton.className = "btn btn-small";
  addButton.style.marginTop = "10px";
  addButton.addEventListener("click", () => {
    const tbody_elem = document.getElementById(SELECTORS.gpa_scale_body);
    const newRow = createGPAScaleRow({
      min_percent: 0,
      max_percent: 100,
      gpa_value: 0,
    });
    tbody_elem.appendChild(newRow);
  });
  panel.appendChild(addButton);

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
             style="width: 70px;"
             title="Minimum percentage for this range">
    </td>
    <td>
      <input type="number" 
             min="0" 
             max="100" 
             step="0.01" 
             value="${range.max_percent}" 
             data-gpa="max"
             style="width: 70px;"
             title="Maximum percentage for this range">
    </td>
    <td>
      <input type="number" 
             min="0" 
             max="4" 
             step="0.01" 
             value="${range.gpa_value}" 
             data-gpa="value"
             style="width: 60px;"
             title="GPA value for this range">
    </td>
    <td>
      <button class="btn btn-small delete-row" style="color: red; font-weight: bold;" title="Delete this range">×</button>
    </td>
  `;

  // Add change listeners
  const inputs = row.querySelectorAll("input");
  for (const input of inputs) {
    input.addEventListener("change", () => {
      recalculateGrade();
    });
  }

  // Add delete button listener
  const deleteButton = row.querySelector(".delete-row");
  deleteButton.addEventListener("click", () => {
    row.remove();
    recalculateGrade();
  });

  return row;
}

function setupGPAScaleCheckboxBehavior(checkbox, panel) {
  const saved_state = loadGPAScaleCheckboxState();
  checkbox.checked = saved_state;
  panel.style.display = saved_state ? "" : "none";

  checkbox.addEventListener("change", (e) => {
    const is_checked = e.target.checked;
    panel.style.display = is_checked ? "" : "none";
    saveGPAScaleCheckboxState(is_checked);
    recalculateGrade();
  });

  // Recalculate on load if checkbox was previously checked
  if (saved_state) {
    recalculateGrade();
  }
}
