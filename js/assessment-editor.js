// js/assessment-editor.js

import { auth, db, collection, doc, getDoc, setDoc, addDoc, deleteDoc, updateDoc, serverTimestamp } from './firebase-config.js';
import { requireRole, getCurrentUser } from './auth.js';

// Global variables
let currentUser = null;
let assessmentData = null;
let currentQuestionId = 1;

// Initialize the assessment editor
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Ensure user is authenticated and has trainer role
        currentUser = await requireRole('trainer');
        if (!currentUser) return; // User was redirected
        
        // Load existing assessment if available
        await loadAssessment();
        
        // Set up event listeners
        setupEventListeners();
        
        // Show the editor
        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('editor-container').style.display = 'block';
    } catch (error) {
        console.error("Error initializing editor:", error);
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.innerHTML = `
                <div class="error-message">Error initializing editor: ${error.message}</div>
                <button class="btn" onclick="location.reload()">Try Again</button>
            `;
        }
    }
});

// Set up event listeners for the editor
function setupEventListeners() {
    // Check if elements exist before adding event listeners
    const saveButton = document.getElementById('save-assessment');
    if (saveButton) {
        saveButton.addEventListener('click', saveAssessment);
    }
    
    const previewButton = document.getElementById('preview-assessment');
    if (previewButton) {
        previewButton.addEventListener('click', previewAssessment);
    }

    const publishButton = document.getElementById('publish-assessment');
    if (publishButton) {
        publishButton.addEventListener('click', publishAssessment);
    }
    
    const addQuestionButton = document.getElementById('add-question');
    if (addQuestionButton) {
        addQuestionButton.addEventListener('click', addQuestion);
    }
    
    const addScenarioButton = document.getElementById('add-scenario');
    if (addScenarioButton) {
        addScenarioButton.addEventListener('click', addScenario);
    }
    
    // Tab navigation
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            showTab(tabId);
        });
    });
}

// Load existing assessment data
async function loadAssessment() {
    try {
        // Check if there's an existing assessment
        const assessmentRef = doc(db, 'assessmentTemplate', 'current');
        const assessmentDoc = await getDoc(assessmentRef);
        
        if (assessmentDoc.exists()) {
            assessmentData = assessmentDoc.data();
            
            // Populate the form with existing data
            document.getElementById('assessment-title').value = assessmentData.title || '';
            document.getElementById('assessment-description').value = assessmentData.description || '';
            document.getElementById('assessment-instructions').value = assessmentData.instructions || '';
            
            // Load questions
            if (assessmentData.questions && assessmentData.questions.length > 0) {
                const questionsContainer = document.getElementById('questions-container');
                if (questionsContainer) {
                    questionsContainer.innerHTML = '';
                    
                    assessmentData.questions.forEach((question, index) => {
                        const questionId = index + 1;
                        const questionHTML = createQuestionHTML(questionId, question.text, question.points);
                        questionsContainer.innerHTML += questionHTML;
                    });
                    
                    currentQuestionId = assessmentData.questions.length + 1;
                }
            }
            
            // Load scenarios
            if (assessmentData.scenarios && assessmentData.scenarios.length > 0) {
                const scenariosContainer = document.getElementById('scenarios-container');
                if (scenariosContainer) {
                    scenariosContainer.innerHTML = '';
                    
                    assessmentData.scenarios.forEach((scenario, index) => {
                        const scenarioHTML = createScenarioHTML(index + 1, scenario.title, scenario.description);
                        scenariosContainer.innerHTML += scenarioHTML;
                    });
                }
            }
            
            // Show success message
            showStatusMessage('Assessment loaded successfully.', 'success');
        } else {
            // No existing assessment, create a new one
            assessmentData = {
                title: 'Farm Budget Assessment',
                description: 'Assessment for farm budgeting skills',
                instructions: 'Please complete all sections of this assessment.',
                questions: [],
                scenarios: [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                published: false
            };
            
            // Set default values in the form
            document.getElementById('assessment-title').value = assessmentData.title;
            document.getElementById('assessment-description').value = assessmentData.description;
            document.getElementById('assessment-instructions').value = assessmentData.instructions;
        }
    } catch (error) {
        console.error("Error loading assessment:", error);
        showStatusMessage('Error loading assessment: ' + error.message, 'error');
    }
}

// Save assessment
async function saveAssessment() {
    try {
        // Collect data from the form
        const title = document.getElementById('assessment-title').value;
        const description = document.getElementById('assessment-description').value;
        const instructions = document.getElementById('assessment-instructions').value;
        
        // Validate required fields
        if (!title || !description || !instructions) {
            showStatusMessage('Please fill in all required fields.', 'error');
            return;
        }
        
        // Collect questions
        const questions = [];
        const questionElements = document.querySelectorAll('.question-container');
        questionElements.forEach(element => {
            const questionId = element.getAttribute('data-question-id');
            const questionText = element.querySelector('.question-text').value;
            const questionPoints = parseInt(element.querySelector('.question-points').value) || 10;
            
            questions.push({
                id: questionId,
                text: questionText,
                points: questionPoints
            });
        });
        
        // Collect scenarios
        const scenarios = [];
        const scenarioElements = document.querySelectorAll('.scenario-container');
        scenarioElements.forEach(element => {
            const scenarioId = element.getAttribute('data-scenario-id');
            const scenarioTitle = element.querySelector('.scenario-title').value;
            const scenarioDescription = element.querySelector('.scenario-description').value;
            
            scenarios.push({
                id: scenarioId,
                title: scenarioTitle,
                description: scenarioDescription
            });
        });
        
        // Update assessment data
        assessmentData = {
            ...assessmentData,
            title,
            description,
            instructions,
            questions,
            scenarios,
            updatedAt: serverTimestamp(),
            updatedBy: currentUser.uid
        };
        
        // Save to Firestore
        const assessmentRef = doc(db, 'assessmentTemplate', 'current');
        await setDoc(assessmentRef, assessmentData);
        
        showStatusMessage('Assessment saved successfully!', 'success');
    } catch (error) {
        console.error("Error saving assessment:", error);
        showStatusMessage('Error saving assessment: ' + error.message, 'error');
    }
}

// Publish assessment
async function publishAssessment() {
    try {
        // First save the assessment
        await saveAssessment();
        
        // Update the published status
        assessmentData.published = true;
        assessmentData.publishedAt = serverTimestamp();
        assessmentData.publishedBy = currentUser.uid;
        
        // Save to Firestore
        const assessmentRef = doc(db, 'assessmentTemplate', 'current');
        await updateDoc(assessmentRef, {
            published: true,
            publishedAt: serverTimestamp(),
            publishedBy: currentUser.uid
        });
        
        showStatusMessage('Assessment published successfully!', 'success');
    } catch (error) {
        console.error("Error publishing assessment:", error);
        showStatusMessage('Error publishing assessment: ' + error.message, 'error');
    }
}

// Preview assessment
function previewAssessment() {
    try {
        // First save the current state
        saveAssessmentToLocalStorage();
        
        // Open preview in a new tab/window
        const previewWindow = window.open('assessment-preview.html', '_blank');
        
        // If popup was blocked, inform the user
        if (!previewWindow) {
            showStatusMessage('Preview popup was blocked. Please allow popups for this site.', 'error');
        }
    } catch (error) {
        console.error("Error previewing assessment:", error);
        showStatusMessage('Error previewing assessment: ' + error.message, 'error');
    }
}

// Save assessment data to localStorage for preview
function saveAssessmentToLocalStorage() {
    // Collect data from the form
    const title = document.getElementById('assessment-title').value;
    const description = document.getElementById('assessment-description').value;
    const instructions = document.getElementById('assessment-instructions').value;
    
    // Collect questions
    const questions = [];
    const questionElements = document.querySelectorAll('.question-container');
    questionElements.forEach(element => {
        const questionId = element.getAttribute('data-question-id');
        const questionText = element.querySelector('.question-text').value;
        const questionPoints = parseInt(element.querySelector('.question-points').value) || 10;
        
        questions.push({
            id: questionId,
            text: questionText,
            points: questionPoints
        });
    });
    
    // Collect scenarios
    const scenarios = [];
    const scenarioElements = document.querySelectorAll('.scenario-container');
    scenarioElements.forEach(element => {
        const scenarioId = element.getAttribute('data-scenario-id');
        const scenarioTitle = element.querySelector('.scenario-title').value;
        const scenarioDescription = element.querySelector('.scenario-description').value;
        
        scenarios.push({
            id: scenarioId,
            title: scenarioTitle,
            description: scenarioDescription
        });
    });
    
    // Create preview data
    const previewData = {
        title,
        description,
        instructions,
        questions,
        scenarios,
        previewTimestamp: new Date().toISOString()
    };
    
    // Save to localStorage
    localStorage.setItem('assessmentPreview', JSON.stringify(previewData));
}

// Add a new question
function addQuestion() {
    const questionsContainer = document.getElementById('questions-container');
    if (questionsContainer) {
        const questionHTML = createQuestionHTML(currentQuestionId, '', 10);
        questionsContainer.innerHTML += questionHTML;
        currentQuestionId++;
        
        // Add event listeners to the new question's buttons
        const newQuestion = questionsContainer.lastElementChild;
        if (newQuestion) {
            const removeButton = newQuestion.querySelector('.btn-remove');
            if (removeButton) {
                removeButton.addEventListener('click', function() {
                    newQuestion.remove();
                });
            }
        }
    }
}

// Add a new scenario
function addScenario() {
    const scenariosContainer = document.getElementById('scenarios-container');
    if (scenariosContainer) {
        const scenarioId = scenariosContainer.children.length + 1;
        const scenarioHTML = createScenarioHTML(scenarioId, '', '');
        scenariosContainer.innerHTML += scenarioHTML;
        
        // Add event listeners to the new scenario's buttons
        const newScenario = scenariosContainer.lastElementChild;
        if (newScenario) {
            const removeButton = newScenario.querySelector('.btn-remove');
            if (removeButton) {
                removeButton.addEventListener('click', function() {
                    newScenario.remove();
                });
            }
        }
    }
}

// Create HTML for a question
function createQuestionHTML(id, text = '', points = 10) {
    return `
        <div class="question-container" data-question-id="${id}">
            <div class="question-header">
                <h4>Question ${id}</h4>
                <div class="question-actions">
                    <button class="btn-small btn-remove">Remove</button>
                </div>
            </div>
            <div class="form-group">
                <label for="question-${id}-text">Question Text:</label>
                <textarea class="question-text" id="question-${id}-text" rows="3">${text}</textarea>
            </div>
            <div class="form-group">
                <label for="question-${id}-points">Points:</label>
                <input type="number" class="question-points" id="question-${id}-points" value="${points}" min="1" max="100">
            </div>
        </div>
    `;
}

// Create HTML for a scenario
function createScenarioHTML(id, title = '', description = '') {
    return `
        <div class="scenario-container" data-scenario-id="${id}">
            <div class="scenario-header">
                <h4>Scenario ${id}</h4>
                <div class="scenario-actions">
                    <button class="btn-small btn-remove">Remove</button>
                </div>
            </div>
            <div class="form-group">
                <label for="scenario-${id}-title">Scenario Title:</label>
                <input type="text" class="scenario-title" id="scenario-${id}-title" value="${title}">
            </div>
            <div class="form-group">
                <label for="scenario-${id}-description">Scenario Description:</label>
                <textarea class="scenario-description" id="scenario-${id}-description" rows="5">${description}</textarea>
            </div>
        </div>
    `;
}

// Show a tab
function showTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show the selected tab
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }
    
    // Add active class to the clicked button
    const activeButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// Show status message
function showStatusMessage(message, type = 'success') {
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        statusMessage.style.display = 'block';
        
        // Scroll to the message
        statusMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Hide the message after 5 seconds
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    }
}

// Add event listeners for remove buttons
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('btn-remove')) {
        const container = event.target.closest('.question-container, .scenario-container');
        if (container) {
            container.remove();
        }
    }
});

// Show the general tab by default
document.addEventListener('DOMContentLoaded', function() {
    showTab('general-tab');
});