// ==UserScript==
// @name         Canvas Enable Totals
// @namespace    humbao.dev
// @version      2.0
// @description  Return calculation of totals on Canvas
// @author       HumBao
// @include      http*://canvas.*.edu/courses/*/grades
// @include      http*://*.instructure.com/courses/*/grades
// @run-at       document-end
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/Hum-Bao/canvas-enable-totals/refs/heads/Experimental/CanvasEnableTotals-modular.user.js
// @updateURL    https://raw.githubusercontent.com/Hum-Bao/canvas-enable-totals/refs/heads/Experimental/CanvasEnableTotals.meta.js
// @require      https://raw.githubusercontent.com/Hum-Bao/canvas-enable-totals/refs/heads/Experimental/modules/core.js
// @require      https://raw.githubusercontent.com/Hum-Bao/canvas-enable-totals/refs/heads/Experimental/modules/weights.js
// @require      https://raw.githubusercontent.com/Hum-Bao/canvas-enable-totals/refs/heads/Experimental/modules/policies.js
// @require      https://raw.githubusercontent.com/Hum-Bao/canvas-enable-totals/refs/heads/Experimental/modules/gpa.js
// ==/UserScript==

// ============================================================================
// Canvas Enable Totals
// ============================================================================
// Enables grade totals on Canvas LMS.
//   - core.js: Constants, utilities, core grade calculation logic
//   - weights.js: Custom weights feature (storage + UI)
//   - policies.js: Grade policies (drop lowest, full credit threshold)
//   - gpa.js: GPA calculation with customizable 4.0 scale
// ============================================================================

(function init() {
  "use strict";

  // Inject CSS styles first
  injectStyles();

  const display_element = getDisplayElement();

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
  createGradePoliciesUI(categories);
  createGPAScaleUI();
})();
