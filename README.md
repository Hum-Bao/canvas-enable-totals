# Canvas Enable Totals

A userscript that enables grade calculations on Canvas LMS when instructors have disabled the total grade display.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)

## Features

### Grade Calculation

- Automatically calculates your current grade based on graded assignments
- Works with both weighted and unweighted grading systems
- Respects Canvas's "Calculate based only on graded assignments" setting
- Displays category totals and final grade totals directly in the grades table

### Custom Weights

- Override assignment category weights to experiment with different scenarios
- Instant visual feedback when weights don't sum to 100%
- Persistent settings saved per course

### Grade Policies

- **Drop Lowest:** Automatically drop N lowest scores from any category
- **Full Credit Threshold:** Award full credit if you earn a minimum number of points
- Apply different policies to different categories

### GPA Calculator

- Convert percentage grades to GPA on a 4.0 scale
- Fully customizable GPA ranges
- Add, edit, or remove GPA ranges to match your school's scale

## Installation

1. Install a userscript manager:
   - [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Firefox, Safari, Edge)
   - [Greasemonkey](https://www.greasespot.net/) (Firefox)
   - [Violentmonkey](https://violentmonkey.github.io/) (Chrome, Firefox, Edge)

2. Install the script [Here](https://raw.githubusercontent.com/Hum-Bao/canvas-enable-totals/refs/heads/main/CanvasEnableTotals.user.js)

3. Navigate to your Canvas grades page and the script will activate automatically!

## Usage

Once installed, visit any Canvas course grades page where totals are disabled. The script will:

- Display your calculated total at the top of the page
- Populate category totals in the grades table
- Add a final grade total row at the bottom
- Provide optional features (custom weights, policies, GPA) below the grade display

### Custom Weights

1. Check "Enable custom assignment weights"
2. Adjust the weight percentages for each category
3. Ensure weights sum to 100% (shown in red if not)
4. Your grade updates automatically

### Grade Policies

1. Check "Enable grade policies"
2. Set drop lowest count or full credit threshold for each category
3. Grade recalculates with policies applied

### GPA Scale

1. Check "Enable GPA calculation"
2. Click "+ Add Range" to define your GPA scale
3. Set min/max percentages and corresponding GPA values
4. Your GPA appears next to your percentage grade
