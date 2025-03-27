// js/assessment-editor.js
import { auth, onAuthStateChanged, signOut, db, doc, getDoc, setDoc } from './firebase-config.js';
import { getCurrentUser, updateNavigation } from './auth.js';

document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Initialize navigation
        await updateNavigation();
        
        // Get current user
        const user = await getCurrentUser();
        
        // Check if user is logged in
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        // Check if user has trainer role
        const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
        if (!userRoles.includes('trainer')) {
            alert('Access denied. You need trainer privileges to access this page.');
            window.location.href = 'index.html';
            return;
        }
        
        // Update user status
        document.getElementById('user-status').innerHTML = 'Logged in as: ' + user.email;
        
        // Set up logout functionality
        document.getElementById('logout-link').addEventListener('click', function(e) {
            e.preventDefault();
            signOut(auth).then(() => {
                window.location.href = 'index.html';
            }).catch((error) => {
                console.error("Error signing out:", error);
            });
        });
        
        // Continue with the rest of the initialization
        await loadAssessmentContent();
        setupEventListeners();
        
        // Hide loading indicator and show editor
        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('editor-content').style.display = 'block';
    } catch (error) {
        console.error("Error initializing editor:", error);
        document.getElementById('loading-indicator').innerHTML = `
            <p>Error loading assessment content: ${error.message}</p>
            <button class="btn" onclick="location.reload()">Try Again</button>
        `;
    }
});

// Global variables
let originalContent = {};

// Load assessment content from Firestore
async function loadAssessmentContent() {
    try {
        // Get the assessment content document
        const contentDoc = await getDoc(doc(db, 'assessmentContent', 'current'));
        
        if (contentDoc.exists()) {
            // Store original content for reset functionality
            originalContent = contentDoc.data();
            
            // Populate basic form fields
            document.getElementById('assessment-title').value = originalContent.title || '';
            document.getElementById('assessment-description').value = originalContent.description || '';
            document.getElementById('instructions-text').value = originalContent.instructions || '';
            document.getElementById('budget-instructions').value = originalContent.budgetSetupInstructions || '';
            document.getElementById('analysis-instructions').value = originalContent.analysisInstructions || '';
            
            // Populate scenarios
            populateScenarios(originalContent.scenarios || []);
            
            // Populate questions
            populateQuestions(originalContent.questions || []);
        } else {
            // Create default content if none exists
            originalContent = {
                title: 'Farm Budget Assessment',
                description: 'Complete this assessment to demonstrate your understanding of farm budget management.',
                instructions: 'Create a budget for the farm, answer the analysis questions, and submit your assessment for review.',
                budgetSetupInstructions: 'Create a budget for Green Valley Farm by adding income and expense items. Include all major income sources and expense categories relevant to a mixed farming operation.',
                analysisInstructions: 'Based on your budget, answer the following questions to demonstrate your understanding of farm budget management.',
                scenarios: [
                    {
                        id: 'scenario1',
                        title: 'Green Valley Farm',
                        description: 'You are the manager of Green Valley Farm, a mixed farming operation that produces crops and raises livestock. The farm owner has asked you to prepare a budget, analyze it, and make recommendations for improvements.'
                    }
                ],
                questions: [
                    {
                        id: 'q1',
                        text: 'Explain the key factors that influenced your income projections. What assumptions did you make?'
                    },
                    {
                        id: 'q2',
                        text: 'Identify the major expense categories in your budget and explain how you would prioritize them if you needed to reduce costs.'
                    },
                    {
                        id: 'q3',
                        text: 'Based on your budget analysis, what recommendations would you make to improve the farm\'s profitability?'
                    }
                ]
            };
            
            // Populate form fields with default content
            document.getElementById('assessment-title').value = originalContent.title;
            document.getElementById('assessment-description').value = originalContent.description;
            document.getElementById('instructions-text').value = originalContent.instructions;
            document.getElementById('budget-instructions').value = originalContent.budgetSetupInstructions;
            document.getElementById('analysis-instructions').value = originalContent.analysisInstructions;
            
            // Populate scenarios
            populateScenarios(originalContent.scenarios);
            
            // Populate questions
            populateQuestions(originalContent.questions);
        }
    } catch (error) {
        console.error("Error loading assessment content:", error);
        throw error;
    }
}

// Populate scenarios
function populateScenarios(scenarios) {
    const scenariosContainer = document.getElementById('scenarios-container');
    scenariosContainer.innerHTML = '';
    
    if (!scenarios || scenarios.length === 0) {
        // Add a default scenario if none exist
        scenarios = [
            {
                id: 'scenario1',
                title: 'Default Scenario',
                description: 'Enter your scenario description here.'
            }
        ];
    }
    
    scenarios.forEach((scenario, index) => {
        const scenarioElement = document.createElement('div');
        scenarioElement.className = 'scenario-container';
        scenarioElement.dataset.id = scenario.id || `scenario${Date.now()}${index}`;
        
        scenarioElement.innerHTML = `
            <div class="question-actions">
                <button class="btn-small btn-remove scenario-remove">Remove</button>
            </div>
            <div class="form-group">
                <label for="scenario-title-${index}">Scenario Title</label>
                <input type="text" id="scenario-title-${index}" class="scenario-title" value="${scenario.title || ''}" placeholder="Enter scenario title">
            </div>
            <div class="form-group">
                <label for="scenario-desc-${index}">Scenario Description</label>
                <textarea id="scenario-desc-${index}" class="scenario-description" placeholder="Enter scenario description">${scenario.description || ''}</textarea>
            </div>
        `;
        
        scenariosContainer.appendChild(scenarioElement);
        
        // Add remove event listener
        scenarioElement.querySelector('.scenario-remove').addEventListener('click', function() {
            if (document.querySelectorAll('.scenario-container').length > 1) {
                if (confirm('Are you sure you want to remove this scenario?')) {
                    scenarioElement.remove();
                }
            } else {
                alert('You must have at least one scenario.');
            }
        });
    });
}

// Populate questions
function populateQuestions(questions) {
    const questionsContainer = document.getElementById('questions-container');
    questionsContainer.innerHTML = '';
    
    if (!questions || questions.length === 0) {
        // Add default questions if none exist
        questions = [
            {
                id: 'q1',
                text: 'Explain the key factors that influenced your income projections. What assumptions did you make?'
            },
            {
                id: 'q2',
                text: 'Identify the major expense categories in your budget and explain how you would prioritize them if you needed to reduce costs.'
            },
            {
                id: 'q3',
                text: 'Based on your budget analysis, what recommendations would you make to improve the farm\'s profitability?'
            }
        ];
    }
    
    questions.forEach((question, index) => {
        const questionElement = document.createElement('div');
        questionElement.className = 'question-container';
        questionElement.dataset.id = question.id || `q${Date.now()}${index}`;
        
        questionElement.innerHTML = `
            <div class="question-actions">
                <button class="btn-small btn-remove question-remove">Remove</button>
            </div>
            <div class="form-group">
                <label for="question-text-${index}">Question ${index + 1}</label>
                <textarea id="question-text-${index}" class="question-text" placeholder="Enter question text">${question.text || ''}</textarea>
            </div>
        `;
        
        questionsContainer.appendChild(questionElement);
        
        // Add remove event listener
        questionElement.querySelector('.question-remove').addEventListener('click', function() {
            if (document.querySelectorAll('.question-container').length > 1) {
                if (confirm('Are you sure you want to remove this question?')) {
                    questionElement.remove();
                    // Renumber questions
                    updateQuestionNumbers();
                }
            } else {
                alert('You must have at least one question.');
            }
        });
    });
}

// Update question numbers after adding/removing questions
function updateQuestionNumbers() {
    const questionContainers = document.querySelectorAll('.question-container');
    questionContainers.forEach((container, index) => {
        const label = container.querySelector('label');
        if (label) {
            label.textContent = `Question ${index + 1}`;
        }
    });
}

// Set up event listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons and content
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
    
    // Add scenario button
    document.getElementById('add-scenario').addEventListener('click', function() {
        const scenariosContainer = document.getElementById('scenarios-container');
        const scenarioCount = scenariosContainer.querySelectorAll('.scenario-container').length;
        
        const newScenario = document.createElement('div');
        newScenario.className = 'scenario-container';
        newScenario.dataset.id = `scenario${Date.now()}`;
        
        newScenario.innerHTML = `
            <div class="question-actions">
                <button class="btn-small btn-remove scenario-remove">Remove</button>
            </div>
            <div class="form-group">
                <label for="scenario-title-${scenarioCount}">Scenario Title</label>
                <input type="text" id="scenario-title-${scenarioCount}" class="scenario-title" placeholder="Enter scenario title">
            </div>
            <div class="form-group">
                <label for="scenario-desc-${scenarioCount}">Scenario Description</label>
                <textarea id="scenario-desc-${scenarioCount}" class="scenario-description" placeholder="Enter scenario description"></textarea>
            </div>
        `;
        
        scenariosContainer.appendChild(newScenario);
        
        // Add remove event listener
        newScenario.querySelector('.scenario-remove').addEventListener('click', function() {
            if (confirm('Are you sure you want to remove this scenario?')) {
                newScenario.remove();
            }
        });
        
        // Focus on the new scenario title
        newScenario.querySelector('.scenario-title').focus();
    });
    
    // Add question button
    document.getElementById('add-question').addEventListener('click', function() {
        const questionsContainer = document.getElementById('questions-container');
        const questionCount = questionsContainer.querySelectorAll('.question-container').length;
        
        const newQuestion = document.createElement('div');
        newQuestion.className = 'question-container';
        newQuestion.dataset.id = `q${Date.now()}`;
        
        newQuestion.innerHTML = `
            <div class="question-actions">
                <button class="btn-small btn-remove question-remove">Remove</button>
            </div>
            <div class="form-group">
                <label for="question-text-${questionCount}">Question ${questionCount + 1}</label>
                <textarea id="question-text-${questionCount}" class="question-text" placeholder="Enter question text"></textarea>
            </div>
        `;
        
        questionsContainer.appendChild(newQuestion);
        
        // Add remove event listener
        newQuestion.querySelector('.question-remove').addEventListener('click', function() {
            if (document.querySelectorAll('.question-container').length > 1) {
                if (confirm('Are you sure you want to remove this question?')) {
                    newQuestion.remove();
                    // Renumber questions
                    updateQuestionNumbers();
                }
            } else {
                alert('You must have at least one question.');
            }
        });
        
        // Focus on the new question text
        newQuestion.querySelector('.question-text').focus();
    });
    
    // Reset button
    document.getElementById('reset-button').addEventListener('click', function() {
        if (confirm('Are you sure you want to reset all changes?')) {
            resetForm();
        }
    });
    
    // Save button
    document.getElementById('save-button').addEventListener('click', saveChanges);
}

// Reset form to original content
function resetForm() {
    document.getElementById('assessment-title').value = originalContent.title || '';
    document.getElementById('assessment-description').value = originalContent.description || '';
    document.getElementById('instructions-text').value = originalContent.instructions || '';
    document.getElementById('budget-instructions').value = originalContent.budgetSetupInstructions || '';
    document.getElementById('analysis-instructions').value = originalContent.analysisInstructions || '';
    
    // Reset scenarios
    populateScenarios(originalContent.scenarios || []);
    
    // Reset questions
    populateQuestions(originalContent.questions || []);
    
    showStatusMessage('Form reset to original values', 'success');
}

// Collect scenarios from the form
function collectScenarios() {
    const scenarios = [];
    const scenarioContainers = document.querySelectorAll('.scenario-container');
    
    scenarioContainers.forEach(container => {
        const id = container.dataset.id;
        const title = container.querySelector('.scenario-title').value.trim();
        const description = container.querySelector('.scenario-description').value.trim();
        
        scenarios.push({
            id: id,
            title: title,
            description: description
        });
    });
    
    return scenarios;
}

// Collect questions from the form
function collectQuestions() {
    const questions = [];
    const questionContainers = document.querySelectorAll('.question-container');
    
    questionContainers.forEach(container => {
        const id = container.dataset.id;
        const text = container.querySelector('.question-text').value.trim();
        
        questions.push({
            id: id,
            text: text
        });
    });
    
    return questions;
}

// Save changes to Firestore
async function saveChanges() {
    // Show loading state
    const saveButton = document.getElementById('save-button');
    const originalButtonText = saveButton.textContent;
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    
    try {
        // Collect form data
        const title = document.getElementById('assessment-title').value.trim();
        const description = document.getElementById('assessment-description').value.trim();
        const instructions = document.getElementById('instructions-text').value.trim();
        const budgetSetupInstructions = document.getElementById('budget-instructions').value.trim();
        const analysisInstructions = document.getElementById('analysis-instructions').value.trim();
        
        // Collect scenarios and questions
        const scenarios = collectScenarios();
        const questions = collectQuestions();
        
        // Validate form data
        if (!title) {
            throw new Error('Please enter an assessment title');
        }
        
        if (scenarios.length === 0) {
            throw new Error('Please add at least one scenario');
        }
        
        if (questions.length === 0) {
            throw new Error('Please add at least one question');
        }
        
        // Check for empty scenarios
        for (let i = 0; i < scenarios.length; i++) {
            if (!scenarios[i].title || !scenarios[i].description) {
                throw new Error(`Scenario ${i + 1} has empty fields. Please fill in all scenario fields.`);
            }
        }
        
        // Check for empty questions
        for (let i = 0; i < questions.length; i++) {
            if (!questions[i].text) {
                throw new Error(`Question ${i + 1} is empty. Please fill in all questions.`);
            }
        }
        
        // Get current user
        const user = await getCurrentUser();
        if (!user) {
            throw new Error('You must be logged in to save changes');
        }
        
        // Create updated content object
        const updatedContent = {
            title: title,
            description: description,
            instructions: instructions,
            budgetSetupInstructions: budgetSetupInstructions,
            analysisInstructions: analysisInstructions,
            scenarios: scenarios,
            questions: questions,
            updatedAt: new Date(),
            updatedBy: user.email
        };
        
        // Save to Firestore
        await setDoc(doc(db, 'assessmentContent', 'current'), updatedContent);
        
        // Update original content
        originalContent = { ...updatedContent };
        
        // Show success message
        showStatusMessage('Assessment content updated successfully!', 'success');
    } catch (error) {
        console.error('Error saving changes:', error);
        showStatusMessage('Error: ' + error.message, 'error');
    } finally {
        // Reset button
        saveButton.disabled = false;
        saveButton.textContent = originalButtonText;
    }
}

// Show status message
function showStatusMessage(message, type) {
    const statusElement = document.getElementById('status-message');
    statusElement.textContent = message;
    statusElement.className = 'status-message ' + type;
    statusElement.style.display = 'block';
    
    // Hide message after 5 seconds
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 5000);
}