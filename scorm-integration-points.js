/**
 * AHCBUS408 Budget Master - SCORM Integration Points
 * 
 * This file contains example code showing how SCORM integration
 * could be implemented. This is provided as a reference for
 * the LMS administrator or SCORM developer who will be implementing the SCORM integration.
 */

// Global SCORM API reference
var API = null;

/**
 * Initialize SCORM connection
 * This should be called when the course first loads
 */
function initializeSCORM() {
    // Find the SCORM API
    API = findAPI(window);
    
    if (API) {
        // Initialize the connection
        var result = API.LMSInitialize("");
        
        if (result === "true" || result === true) {
            console.log("SCORM API initialized successfully");
            
            // Load any saved bookmark
            var bookmark = API.LMSGetValue("cmi.core.lesson_location");
            if (bookmark && bookmark !== "") {
                console.log("Found bookmark: " + bookmark);
                // Logic to navigate to the bookmarked location
                if (typeof openTab === "function") {
                    openTab(bookmark);
                }
            }
            
            // Set status to incomplete if not already set
            var status = API.LMSGetValue("cmi.core.lesson_status");
            if (status === "not attempted" || status === "") {
                API.LMSSetValue("cmi.core.lesson_status", "incomplete");
                API.LMSCommit("");
            }
            
            return true;
        } else {
            console.error("Failed to initialize SCORM API");
            return false;
        }
    } else {
        console.warn("SCORM API not found - running in standalone mode");
        return false;
    }
}

/**
 * Find the SCORM API in the parent windows
 */
function findAPI(win) {
    // Check if the API is in the current window
    if (win.API) return win.API;
    if (win.API_1484_11) return win.API_1484_11; // SCORM 2004
    
    // Check if we've reached the top window
    if (win.parent === win) return null;
    
    // Check the parent window
    return findAPI(win.parent);
}

/**
 * Save a bookmark to resume later
 */
function saveBookmark(location) {
    if (!API) return false;
    
    API.LMSSetValue("cmi.core.lesson_location", location);
    return API.LMSCommit("");
}

/**
 * Track lesson completion
 */
function trackLessonCompletion(lessonId, status) {
    if (!API) return false;
    
    // For SCORM 1.2, we can use objectives
    var index = findObjectiveIndex(lessonId);
    
    if (index !== -1) {
        API.LMSSetValue(`cmi.objectives.${index}.id`, lessonId);
        API.LMSSetValue(`cmi.objectives.${index}.status`, status);
        return API.LMSCommit("");
    }
    
    return false;
}

/**
 * Find or create an objective index for a lesson
 */
function findObjectiveIndex(lessonId) {
    if (!API) return -1;
    
    // Check how many objectives exist
    var count = API.LMSGetValue("cmi.objectives._count");
    
    // Look for existing objective with this ID
    for (var i = 0; i < count; i++) {
        var id = API.LMSGetValue(`cmi.objectives.${i}.id`);
        if (id === lessonId) return i;
    }
    
    // If not found, return the next available index
    return count;
}

/**
 * Submit assessment score
 */
function submitScore(score, maxScore) {
    if (!API) return false;
    
    // Calculate percentage
    var percentage = Math.round((score / maxScore) * 100);
    
    // Set the score
    API.LMSSetValue("cmi.core.score.raw", percentage);
    API.LMSSetValue("cmi.core.score.min", "0");
    API.LMSSetValue("cmi.core.score.max", "100");
    
    // Set completion status
    var passed = percentage >= 70; // Assuming 70% is passing
    API.LMSSetValue("cmi.core.lesson_status", passed ? "passed" : "failed");
    
    return API.LMSCommit("");
}

/**
 * Save detailed progress data
 */
function saveProgressData(data) {
    if (!API) return false;
    
    // Convert object to JSON string
    var jsonData = JSON.stringify(data);
    
    // Save to suspend_data
    API.LMSSetValue("cmi.suspend_data", jsonData);
    return API.LMSCommit("");
}

/**
 * Load saved progress data
 */
function loadProgressData() {
    if (!API) return null;
    
    var jsonData = API.LMSGetValue("cmi.suspend_data");
    
    if (jsonData && jsonData !== "") {
        try {
            return JSON.parse(jsonData);
        } catch (e) {
            console.error("Error parsing suspend_data JSON", e);
            return null;
        }
    }
    
    return null;
}

/**
 * Save student information
 */
function saveStudentInfo(studentName, studentId, startDate) {
    if (!API) return false;
    
    // In SCORM 1.2, we can store this in suspend_data
    var data = loadProgressData() || {};
    data.studentInfo = {
        name: studentName,
        id: studentId,
        startDate: startDate,
        timestamp: new Date().toISOString()
    };
    
    return saveProgressData(data);
}

/**
 * Track budget simulator activity
 */
function trackBudgetActivity(budgetData) {
    if (!API) return false;
    
    // Load existing data
    var data = loadProgressData() || {};
    
    // Add or update budget activity
    if (!data.budgetActivities) {
        data.budgetActivities = [];
    }
    
    // Add new activity with timestamp
    data.budgetActivities.push({
        timestamp: new Date().toISOString(),
        data: budgetData
    });
    
    // Keep only the last 5 activities to avoid exceeding size limits
    if (data.budgetActivities.length > 5) {
        data.budgetActivities = data.budgetActivities.slice(-5);
    }
    
    return saveProgressData(data);
}

/**
 * Track scenario application
 */
function trackScenario(scenarioType, scenarioData) {
    if (!API) return false;
    
    // Load existing data
    var data = loadProgressData() || {};
    
    // Add or update scenario tracking
    if (!data.scenarios) {
        data.scenarios = [];
    }
    
    // Add new scenario with timestamp
    data.scenarios.push({
        type: scenarioType,
        timestamp: new Date().toISOString(),
        data: scenarioData
    });
    
    return saveProgressData(data);
}

/**
 * Terminate the SCORM session
 */
function terminateSCORM() {
    if (!API) return false;
    
    return API.LMSFinish("");
}

/**
 * Example of how to use these functions in the course
 */
function exampleUsage() {
    // On course load
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize SCORM
        initializeSCORM();
        
        // Load any saved progress
        var savedData = loadProgressData();
        if (savedData) {
            // Restore the user's progress
            console.log("Restoring saved progress", savedData);
            
            // Example: Restore student info if available
            if (savedData.studentInfo) {
                document.getElementById('student-name').value = savedData.studentInfo.name;
                document.getElementById('student-id').value = savedData.studentInfo.id;
                document.getElementById('start-date').value = savedData.studentInfo.startDate;
            }
            
            // Example: Restore budget items if available
            if (savedData.budgetItems) {
                // Restore budget items
                budgetItems = savedData.budgetItems;
                updateBudgetItemsTable();
            }
        }
    });
    
    // When student info is validated
    function onStudentInfoValidated(studentName, studentId, startDate) {
        saveStudentInfo(studentName, studentId, startDate);
    }
    
    // When a lesson is completed
    function onLessonComplete(lessonId) {
        trackLessonCompletion(lessonId, "completed");
    }
    
    // When navigating to a new section
    function onNavigate(sectionId) {
        saveBookmark(sectionId);
    }
    
    // When using the budget simulator
    function onBudgetUpdate(budgetData) {
        trackBudgetActivity(budgetData);
    }
    
    // When applying a scenario
    function onScenarioApplied(scenarioType, scenarioData) {
        trackScenario(scenarioType, scenarioData);
    }
    
    // When submitting the assessment
    function onAssessmentSubmit(score) {
        submitScore(score, 100);
    }
    
    // Before the page unloads
    window.addEventListener('beforeunload', function() {
        // Save any unsaved progress
        var progressData = {
            // Collect current progress data
            lastPage: "current-page-id",
            completedLessons: ["lesson1", "lesson2"],
            // etc.
        };
        
        saveProgressData(progressData);
        
        // Only terminate if the user is actually leaving the course
        // (not just navigating between pages)
        if (isUserExitingCourse) {
            terminateSCORM();
        }
    });
}

/**
 * SCORM 2004 specific functions
 * These would be used if the LMS supports SCORM 2004 instead of SCORM 1.2
 */

// Initialize SCORM 2004
function initializeSCORM2004() {
    API = findAPI(window);
    
    if (API) {
        var result = API.Initialize("");
        
        if (result === "true" || result === true) {
            console.log("SCORM 2004 API initialized successfully");
            
            // Load any saved bookmark
            var bookmark = API.GetValue("cmi.location");
            if (bookmark && bookmark !== "") {
                console.log("Found bookmark: " + bookmark);
                // Logic to navigate to the bookmarked location
            }
            
            // Set completion status if not already set
            var completionStatus = API.GetValue("cmi.completion_status");
            if (completionStatus === "unknown" || completionStatus === "") {
                API.SetValue("cmi.completion_status", "incomplete");
                API.Commit("");
            }
            
            return true;
        } else {
            console.error("Failed to initialize SCORM 2004 API");
            return false;
        }
    } else {
        console.warn("SCORM 2004 API not found - running in standalone mode");
        return false;
    }
}

// Submit score for SCORM 2004
function submitScore2004(score, maxScore) {
    if (!API) return false;
    
    // Calculate scaled score (between 0 and 1)
    var scaledScore = score / maxScore;
    
    // Set the score
    API.SetValue("cmi.score.raw", score);
    API.SetValue("cmi.score.min", "0");
    API.SetValue("cmi.score.max", maxScore);
    API.SetValue("cmi.score.scaled", scaledScore);
    
    // Set success status
    var passed = scaledScore >= 0.7; // Assuming 70% is passing
    API.SetValue("cmi.success_status", passed ? "passed" : "failed");
    
    // Set completion status
    API.SetValue("cmi.completion_status", "completed");
    
    return API.Commit("");
}

// Terminate SCORM 2004 session
function terminateSCORM2004() {
    if (!API) return false;
    
    return API.Terminate("");
}