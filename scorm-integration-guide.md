# AHCBUS408 Budget Master - SCORM Integration Guide

## Project Overview
This package contains a complete web-based training module for AHCBUS408 Budget Management. The files are ready for SCORM integration to enable tracking and reporting within your LMS.

## File Structure
- `index.html`: Main entry point and course overview
- `lessons.html`: Contains all lesson content organized by categories
- `budget.html`: Interactive budget simulator for practice
- `assessments.html`: List of available assessments
- `farm-budget-assessment.html`: Main comprehensive assessment
- `styles.css`: All styling for the entire application
- `/images/`: Contains all image assets (if any)

## Key Integration Points

### 1. Course Initialization

**Location**: All HTML files, at the beginning of the main script section

**Integration Point**:
```javascript
// SCORM INTEGRATION POINT: Initialize SCORM API connection
// Add code here to:
// 1. Detect SCORM API
// 2. Initialize connection
// 3. Set lesson status to "incomplete" if not already started
// 4. Load any saved bookmark or suspend data

document.addEventListener('DOMContentLoaded', function() {
    // Existing initialization code
    
    // SCORM initialization would go here
    
    // Check for bookmarks and resume position if applicable
});