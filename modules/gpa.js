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

  try {
    localStorage.setItem(
      STORAGE_KEYS.gpa_scale(course_id),
      JSON.stringify(scaleArray)
    );
  } catch (err) {
    if (err.name === "QuotaExceededError") {
      console.error("LocalStorage quota exceeded. Cannot save GPA scale.");
      alert("Unable to save GPA scale. Storage quota exceeded.");
    } else {
      console.error("Failed to save GPA scale:", err);
    }
  }
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
  const { wrapper, savedState } = createFeatureCheckbox({
    id: SELECTORS.gpa_scale_checkbox,
    label: "Enable GPA calculation (4.0 scale)",
    storageKey: STORAGE_KEYS.gpa_scale_enabled(course_id),
    panel: panel,
    onToggle: null,
  });

  container.insertBefore(wrapper, panel);

  // Recalculate after UI is fully set up, if checkbox was previously checked
  if (savedState) {
    recalculateGrade();
  }
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
  const deleteButton = row.querySelector(".delete-row");
  deleteButton.addEventListener("click", () => {
    row.remove();
    recalculateGrade();
  });

  return row;
}
