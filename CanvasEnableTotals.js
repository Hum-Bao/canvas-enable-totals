// ==UserScript==
// @name         Canvas Enable Totals
// @namespace    humbao.dev
// @version      1.0
// @description  Return calculation of totals on Canvas
// @author       HumBao
// @include      http*://canvas.*.edu/courses/*/grades
// @include      http*://*.instructure.com/courses/*/grades
// @run-at document-end
// ==/UserScript==

function GetFinalGrade(weight_map, grade_map, total_calc) {
  let finalGrade = 0;
  let total_weight = 0;
  grade_map.forEach((totals, category) => {
    if (totals.possible > 0 && weight_map.has(category)) {
      let categoryScore =
        (totals.received / totals.possible) * weight_map.get(category);
      total_weight += weight_map.get(category);
      finalGrade += categoryScore;
    }
  });

  finalGrade = (finalGrade * 100) / total_weight;

  total_calc.style.fontSize = "16px";

  total_calc.textContent = "Total: " + finalGrade.toFixed(2) + "%";
}

function GetGrades(weight_map) {
  const grade_map = new Map();
  const grade_table = document.getElementById("grades_summary");
  if (grade_table) {
    grade_table.querySelectorAll("tbody tr").forEach((row) => {
      let max_points = row.querySelector(
        "td:nth-of-type(4) > div > span:nth-child(3) > span:nth-child(2)"
      );
      if (max_points) {
        max_points = max_points.textContent.replace(/^\/\s*/, "").trim();
        if (max_points == "0") {
          return;
        }
      }

      let category = row.querySelector("th .context");
      if (category) {
        category = category.textContent.trim();
        //Skip category if weight is 0
        if (weight_map.has(category) && weight_map.get(category) === 0) {
          return;
        }
      }

      let points_received = row.querySelector(
        "td:nth-of-type(4) > div > span:nth-child(3) > span.grade"
      );
      if (points_received) {
        points_received = points_received.lastChild.textContent.trim();
        if (points_received.includes("-")) {
          return;
        }
      }
      if (category && points_received && max_points) {
        if (!grade_map.has(category)) {
          grade_map.set(category, { received: 0, possible: 0 });
        }

        let totals = grade_map.get(category) || { received: 0, possible: 0 };

        totals.received += parseFloat(points_received);
        totals.possible += parseFloat(max_points);
        grade_map.set(category, totals);
      }
    });
  } else {
    console.warn("Grades summary table not found.");
  }
  return grade_map;
}

function GetWeights(total_calc) {
  if (total_calc && total_calc.textContent.includes("disabled")) {
    const weight_map = new Map();
    const weight_table = document.querySelector("table.summary");
    if (weight_table) {
      const rows = weight_table.querySelectorAll("tbody tr");

      rows.forEach((row) => {
        const category = row.querySelector("th[scope='row']");
        const weight = row.querySelector("td");

        if (category && weight) {
          weight_map.set(
            category.textContent.trim(),
            parseFloat(weight.textContent.trim().match(/(\d+(\.\d+)?)%/)[1])
          );
        }
      });

      return weight_map;
    }
  } else {
    console.log(
      "Extension disabled as calculation of totals is already enabled"
    );
    return;
  }
}

(function () {
  "use strict";
  const total_calc = document.getElementById("student-grades-final");
  var weight_map;
  var grade_map;
  if (total_calc) {
    weight_map = GetWeights(total_calc);
    grade_map = GetGrades(weight_map);
    GetFinalGrade(weight_map, grade_map, total_calc);
  }
})();
