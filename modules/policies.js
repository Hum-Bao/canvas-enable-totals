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
  if (policy.drop_lowest > 0 && processed.length > policy.drop_lowest) {
    processed.sort((a, b) => {
      const percent_a = a.max_points > 0 ? a.points_received / a.max_points : 0;
      const percent_b = b.max_points > 0 ? b.points_received / b.max_points : 0;
      return percent_a - percent_b;
    });
    processed = processed.slice(policy.drop_lowest);
  }

  // Full credit if >= N points earned
  if (policy.full_credit_threshold > 0) {
    const total_received = processed.reduce(
      (sum, g) => sum + g.points_received,
      0
    );
    if (total_received >= policy.full_credit_threshold) {
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
function saveGradePolicies(policies_map) {
  const policies = {};
  for (const [category, policy] of policies_map.entries()) {
    policies[category] = policy;
  }

  updateCourseSetting("policies", policies);
}

function loadGradePolicies() {
  const policies_obj = loadCourseSetting("policies", null);
  if (!policies_obj) {
    return null;
  }

  const policies_map = new Map();
  for (const [category, policy] of Object.entries(policies_obj)) {
    policies_map.set(category, policy);
  }

  return policies_map;
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
    const drop_input = row.querySelector("input[data-policy='drop_lowest']");
    const threshold_input = row.querySelector(
      "input[data-policy='full_credit_threshold']"
    );

    if (category) {
      const policy = {
        drop_lowest: parseInt(drop_input?.value || "0"),
        full_credit_threshold: parseFloat(threshold_input?.value || "0"),
      };

      // Only save if at least one policy is active
      if (policy.drop_lowest > 0 || policy.full_credit_threshold > 0) {
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

  const { wrapper } = createFeatureCheckbox({
    id: SELECTORS.grade_policies_checkbox,
    label: "Enable grade policies (drop lowest, full credit thresholds)",
    setting_key: "policies_enabled",
    panel: panel,
    on_toggle: null,
  });

  container.insertBefore(wrapper, panel);

  // Don't recalculate here - init() will do it after all UI is set up
}

function createPoliciesPanel(container, categories, saved_policies) {
  const { element: panel, tbody } = createFeatureTable({
    headers: ["Category", "Drop N Lowest", "Full Credit if ≥"],
    tbody_id: SELECTORS.grade_policies_body,
    include_panel: true,
  });

  container.appendChild(panel);
  populatePoliciesTable(tbody, categories, saved_policies);

  return panel;
}

function populatePoliciesTable(tbody, categories, saved_policies) {
  for (const category of categories) {
    const saved_policy = saved_policies?.get(category);
    const row = createPolicyRow(category, saved_policy);
    tbody.appendChild(row);
  }
}

function createPolicyRow(category, saved_policy) {
  const row = document.createElement("tr");

  const drop_lowest = saved_policy?.drop_lowest || 0;
  const full_credit_threshold = saved_policy?.full_credit_threshold || 0;

  row.innerHTML = `
    <th scope="row">${category}</th>
    <td>
      <input type="number" 
             min="0" 
             step="1" 
             value="${drop_lowest}" 
             data-policy="drop_lowest"
             data-category="${category}"
             class="policy-drop-input"
             title="Number of lowest grades to drop">
    </td>
    <td>
      <input type="number" 
             min="0" 
             step="0.01" 
             value="${full_credit_threshold}" 
             data-policy="full_credit_threshold"
             data-category="${category}"
             class="policy-threshold-input"
             title="Award full credit if total points earned >= this value">
    </td>
  `;

  // Add change listeners with debouncing
  const inputs = row.querySelectorAll("input, select");
  for (const input of inputs) {
    // For number inputs, debounce to handle spinner dragging
    if (input.type === "number") {
      input.addEventListener("input", () => {
        debounced_recalculate();
      });
      input.addEventListener("blur", () => {
        recalculateGrade();
      });
    } else {
      // For other inputs, recalculate immediately
      input.addEventListener("change", () => {
        recalculateGrade();
      });
    }
  }

  return row;
}
