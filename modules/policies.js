// ============================================================================
// Canvas Enable Totals - Grade Policies Module (Exclusions)
// Handles drop lowest and full credit threshold policies
// ============================================================================

// ============================================================================
// Grade Policy Application
// ============================================================================
function applyGradePolicy(grades, policy) {
  if (!policy) {
    return grades;
  }

  let processed = [...grades];

  // Drop N lowest grades
  if (policy.dropLowest > 0 && processed.length > policy.dropLowest) {
    processed.sort((a, b) => {
      const percent_a = a.max_points > 0 ? a.points_received / a.max_points : 0;
      const percent_b = b.max_points > 0 ? b.points_received / b.max_points : 0;
      return percent_a - percent_b;
    });
    processed = processed.slice(policy.dropLowest);
  }

  // Full credit if >= N points earned
  if (policy.fullCreditThreshold > 0) {
    const total_received = processed.reduce(
      (sum, g) => sum + g.points_received,
      0
    );
    if (total_received >= policy.fullCreditThreshold) {
      const total_possible = processed.reduce(
        (sum, g) => sum + g.max_points,
        0
      );
      return [
        {
          points_received: total_possible,
          max_points: total_possible,
        },
      ];
    }
  }

  return processed;
}

// ============================================================================
// Grade Policies Storage Functions
// ============================================================================
function saveGradePolicies(policiesMap) {
  const course_id = getCourseId();
  if (!course_id) {
    return;
  }

  try {
    const policies = {};
    for (const [category, policy] of policiesMap.entries()) {
      policies[category] = policy;
    }

    localStorage.setItem(
      STORAGE_KEYS.policies(course_id),
      JSON.stringify(policies)
    );
  } catch (err) {
    if (err.name === "QuotaExceededError") {
      console.error("LocalStorage quota exceeded. Cannot save grade policies.");
      alert("Unable to save grade policies. Storage quota exceeded.");
    } else {
      console.error("Failed to save grade policies:", err);
    }
  }
}

function loadGradePolicies() {
  const course_id = getCourseId();
  if (!course_id) {
    return null;
  }

  const stored = localStorage.getItem(STORAGE_KEYS.policies(course_id));
  if (!stored) {
    return null;
  }

  try {
    const policies_obj = JSON.parse(stored);
    const policies_map = new Map();

    for (const [category, policy] of Object.entries(policies_obj)) {
      policies_map.set(category, policy);
    }

    return policies_map;
  } catch (err) {
    console.error("Failed to load grade policies:", err);
    return null;
  }
}

function getGradePolicies() {
  const tbody = getGradePoliciesBody();
  if (!tbody) {
    return new Map();
  }

  const policies_map = new Map();
  const rows = tbody.querySelectorAll("tr");

  for (const row of rows) {
    const category = row.querySelector("th")?.textContent.trim();
    const drop_input = row.querySelector("input[data-policy='dropLowest']");
    const threshold_input = row.querySelector(
      "input[data-policy='fullCreditThreshold']"
    );

    if (category) {
      const policy = {
        dropLowest: parseInt(drop_input?.value || "0"),
        fullCreditThreshold: parseFloat(threshold_input?.value || "0"),
      };

      // Only save if at least one policy is active
      if (policy.dropLowest > 0 || policy.fullCreditThreshold > 0) {
        policies_map.set(category, policy);
      }
    }
  }

  saveGradePolicies(policies_map);
  return policies_map;
}

// ============================================================================
// Grade Policies UI Functions
// ============================================================================
function createGradePoliciesUI(categories) {
  const display_element = getDisplayElement();
  if (!display_element) {
    return;
  }

  const saved_policies = loadGradePolicies();
  const container = createWeightsContainer(display_element);
  const panel = createPoliciesPanel(container, categories, saved_policies);

  const course_id = getCourseId();
  const { wrapper } = createFeatureCheckbox({
    id: SELECTORS.grade_policies_checkbox,
    label: "Enable grade policies (drop lowest, full credit thresholds)",
    storageKey: STORAGE_KEYS.policies_enabled(course_id),
    panel: panel,
    onToggle: null,
  });

  container.insertBefore(wrapper, panel);
}

function createPoliciesPanel(container, categories, savedPolicies) {
  const panel = document.createElement("div");
  panel.style.display = "none";
  panel.style.marginBottom = "20px";

  const table = document.createElement("table");
  table.className = "summary";

  table.innerHTML = `
    <thead>
      <tr>
        <th scope="col">Category</th>
        <th scope="col">Drop N Lowest</th>
        <th scope="col">Full Credit if ≥</th>
      </tr>
    </thead>
    <tbody id="${SELECTORS.grade_policies_body}"></tbody>
  `;

  panel.appendChild(table);
  container.appendChild(panel);

  const tbody = table.querySelector("tbody");
  populatePoliciesTable(tbody, categories, savedPolicies);

  return panel;
}

function populatePoliciesTable(tbody, categories, savedPolicies) {
  for (const category of categories) {
    const saved_policy = savedPolicies?.get(category);
    const row = createPolicyRow(category, saved_policy);
    tbody.appendChild(row);
  }
}

function createPolicyRow(category, savedPolicy) {
  const row = document.createElement("tr");

  const drop_lowest = savedPolicy?.dropLowest || 0;
  const full_credit_threshold = savedPolicy?.fullCreditThreshold || 0;

  row.innerHTML = `
    <th scope="row">${category}</th>
    <td>
      <input type="number" 
             min="0" 
             step="1" 
             value="${drop_lowest}" 
             data-policy="dropLowest"
             data-category="${category}"
             style="width: 60px;"
             title="Number of lowest grades to drop">
    </td>
    <td>
      <input type="number" 
             min="0" 
             step="0.01" 
             value="${full_credit_threshold}" 
             data-policy="fullCreditThreshold"
             data-category="${category}"
             style="width: 80px;"
             title="Award full credit if total points earned >= this value">
    </td>
  `;

  // Add change listeners
  const inputs = row.querySelectorAll("input, select");
  for (const input of inputs) {
    input.addEventListener("change", () => {
      recalculateGrade();
    });
  }

  return row;
}
