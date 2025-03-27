// js/assessment.js

// Import Firebase modules
import { auth, onAuthStateChanged, signOut, db, doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from './firebase-config.js';
import { getCurrentUser, updateNavigation } from './auth.js';

// Global variables
let currentUser = null;
let assessmentData = null;
let userScenario = null;

// Initialize the assessment page
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Initialize navigation
        await updateNavigation();
        
        // Get current user
        currentUser = await getCurrentUser();
        
        // Check if user is logged in
        if (!currentUser) {
            window.location.href = 'index.html';
            return;
        }
        
        // Set up logout functionality
        document.getElementById('logout-link').addEventListener('click', function(e) {
            e.preventDefault();
            signOut(auth).then(() => {
                window.location.href = 'index.html';
            }).catch((error) => {
                console.error("Error signing out:", error);
            });
        });
        
        // Load assessment content
        await loadAssessmentContent();
        
        // Check if user already has an assessment in progress
        await checkExistingAssessment();
        
        // Set up event listeners
        setupEventListeners();
        
        // Hide loading indicator and show assessment content
        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('assessment-content').style.display = 'block';
    } catch (error) {
        console.error("Error initializing assessment:", error);
        document.getElementById('loading-indicator').innerHTML = `
            <p>Error loading assessment: ${error.message}</p>
            <button class="btn" onclick="location.reload()">Try Again</button>
        `;
    }
});

// Load assessment content from Firestore
async function loadAssessmentContent() {
    try {
        // Get the assessment content document
        const contentDoc = await getDoc(doc(db, 'assessmentContent', 'current'));
        
        if (contentDoc.exists()) {
            assessmentData = contentDoc.data();
            
            // Populate assessment title and description
            document.getElementById('assessment-title').textContent = assessmentData.title || 'Farm Budget Assessment';
            document.getElementById('assessment-description').textContent = assessmentData.description || 'Complete this assessment to demonstrate your understanding of farm budget management.';
            
            // Populate instructions
            document.getElementById('instructions-text').textContent = assessmentData.instructions || 'Create a budget for the farm, answer the analysis questions, and submit your assessment for review.';
            document.getElementById('budget-instructions').textContent = assessmentData.budgetSetupInstructions || 'Create a budget for the farm by adding income and expense items.';
            document.getElementById('analysis-instructions').textContent = assessmentData.analysisInstructions || 'Based on your budget, answer the following questions.';
            
            // Assign a random scenario to the user
            assignScenario();
            
            // Populate questions
            populateQuestions();
        } else {
            throw new Error('Assessment content not found');
        }
    } catch (error) {
        console.error("Error loading assessment content:", error);
        throw error;
    }
}

// Assign a random scenario to the user
function assignScenario() {
    if (!assessmentData || !assessmentData.scenarios || assessmentData.scenarios.length === 0) {
        // Use default scenario if none are available
        userScenario = {
            id: 'default',
            title: 'Default Scenario',
            description: 'You are the manager of a farm. Create a budget and answer the questions.'
        };
    } else {
        // Select a random scenario
        const randomIndex = Math.floor(Math.random() * assessmentData.scenarios.length);
        userScenario = assessmentData.scenarios[randomIndex];
    }
    
    // Display the scenario
    document.getElementById('scenario-text').textContent = userScenario.description;
}

// Populate questions
function populateQuestions() {
    if (!assessmentData || !assessmentData.questions || assessmentData.questions.length === 0) {
        return;
    }
    
    const questionContainer = document.querySelector('.question-container');
    questionContainer.innerHTML = '';
    
    assessmentData.questions.forEach((question, index) => {
        const questionElement = document.createElement('div');
        questionElement.className = 'question';
        
        questionElement.innerHTML = `
            <h3>Question ${index + 1}</h3>
            <p>${question.text}</p>
            <textarea id="question${index + 1}" rows="5" placeholder="Your answer here..."></textarea>
        `;
        
        questionContainer.appendChild(questionElement);
    });
}

// Check if user already has an assessment in progress
async function checkExistingAssessment() {
    try {
        // Get user's assessment document
        const assessmentDoc = await getDoc(doc(db, 'assessments', currentUser.uid));
        
        if (assessmentDoc.exists() && !assessmentDoc.data().submitted) {
            const existingAssessment = assessmentDoc.data();
            
            // Populate budget
            if (existingAssessment.budget) {
                populateExistingBudget(existingAssessment.budget);
            }
            
            // Populate answers
            if (existingAssessment.answers) {
                populateExistingAnswers(existingAssessment.answers);
            }
            
            // Set scenario
            if (existingAssessment.scenario) {
                userScenario = existingAssessment.scenario;
                document.getElementById('scenario-text').textContent = userScenario.description;
            }
        }
    } catch (error) {
        console.error("Error checking existing assessment:", error);
    }
}

// Populate existing budget
function populateExistingBudget(budget) {
    // Populate farm type and budget period
    document.getElementById('farm-type').value = budget.farmType || 'mixed';
    document.getElementById('budget-period').value = budget.budgetPeriod || 'annual';
    
    // Populate income items
    const incomeTable = document.getElementById('income-table').querySelector('tbody');
    incomeTable.innerHTML = '';
    
    if (budget.incomeItems && budget.incomeItems.length > 0) {
        budget.incomeItems.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="text" value="${item.name}" placeholder="Income item"></td>
                <td><input type="number" value="${item.amount}" placeholder="0.00"></td>
                <td><button class="btn-small btn-remove">Remove</button></td>
            `;
            incomeTable.appendChild(row);
            
            // Add event listener to remove button
            row.querySelector('.btn-remove').addEventListener('click', function() {
                row.remove();
                updateBudgetTotals();
            });
        });
    } else {
        // Add a default empty row
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" placeholder="Income item"></td>
            <td><input type="number" placeholder="0.00"></td>
            <td><button class="btn-small btn-remove">Remove</button></td>
        `;
        incomeTable.appendChild(row);
        
        // Add event listener to remove button
        row.querySelector('.btn-remove').addEventListener('click', function() {
            if (incomeTable.querySelectorAll('tr').length > 1) {
                row.remove();
                updateBudgetTotals();
            }
        });
    }
    
    // Populate expense items
    const expenseTable = document.getElementById('expense-table').querySelector('tbody');
    expenseTable.innerHTML = '';
    
    if (budget.expenseItems && budget.expenseItems.length > 0) {
        budget.expenseItems.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="text" value="${item.name}" placeholder="Expense item"></td>
                <td><input type="number" value="${item.amount}" placeholder="0.00"></td>
                <td><button class="btn-small btn-remove">Remove</button></td>
            `;
            expenseTable.appendChild(row);
            
            // Add event listener to remove button
            row.querySelector('.btn-remove').addEventListener('click', function() {
                row.remove();
                updateBudgetTotals();
            });
        });
    } else {
        // Add a default empty row
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" placeholder="Expense item"></td>
            <td><input type="number" placeholder="0.00"></td>
            <td><button class="btn-small btn-remove">Remove</button></td>
        `;
        expenseTable.appendChild(row);
        
        // Add event listener to remove button
        row.querySelector('.btn-remove').addEventListener('click', function() {
            if (expenseTable.querySelectorAll('tr').length > 1) {
                row.remove();
                updateBudgetTotals();
            }
        });
    }
    
    // Update budget totals
    updateBudgetTotals();
}

// Populate existing answers
function populateExistingAnswers(answers) {
    Object.keys(answers).forEach(questionId => {
        const answerElement = document.getElementById(questionId);
        if (answerElement) {
            answerElement.value = answers[questionId];
        }
    });
}

// Set up event listeners
function setupEventListeners() {
    // Add income item
    document.getElementById('add-income').addEventListener('click', function() {
        const incomeTable = document.getElementById('income-table').querySelector('tbody');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" placeholder="Income item"></td>
            <td><input type="number" placeholder="0.00"></td>
            <td><button class="btn-small btn-remove">Remove</button></td>
        `;
        incomeTable.appendChild(row);
        
        // Add event listener to remove button
        row.querySelector('.btn-remove').addEventListener('click', function() {
            row.remove();
            updateBudgetTotals();
        });
        
        // Add event listeners to update totals when values change
        row.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', updateBudgetTotals);
            input.addEventListener('keyup', updateBudgetTotals);
        });
        
        // Focus on the new input
        row.querySelector('input').focus();
    });
    
    // Add expense item
    document.getElementById('add-expense').addEventListener('click', function() {
        const expenseTable = document.getElementById('expense-table').querySelector('tbody');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" placeholder="Expense item"></td>
            <td><input type="number" placeholder="0.00"></td>
            <td><button class="btn-small btn-remove">Remove</button></td>
        `;
        expenseTable.appendChild(row);
        
        // Add event listener to remove button
        row.querySelector('.btn-remove').addEventListener('click', function() {
            row.remove();
            updateBudgetTotals();
        });
        
        // Add event listeners to update totals when values change
        row.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', updateBudgetTotals);
            input.addEventListener('keyup', updateBudgetTotals);
        });
        
        // Focus on the new input
        row.querySelector('input').focus();
    });
    
    // Add event listeners to existing inputs
    document.querySelectorAll('#income-table input, #expense-table input').forEach(input => {
        input.addEventListener('change', updateBudgetTotals);
        input.addEventListener('keyup', updateBudgetTotals);
    });
    
    // Add event listeners to existing remove buttons
    document.querySelectorAll('.btn-remove').forEach(button => {
        button.addEventListener('click', function() {
            const row = this.closest('tr');
            const table = row.closest('table');
            const tbody = table.querySelector('tbody');
            
            // Only remove if there's more than one row
            if (tbody.querySelectorAll('tr').length > 1) {
                row.remove();
                updateBudgetTotals();
            }
        });
    });
    
    // Save assessment
    document.getElementById('save-assessment').addEventListener('click', saveAssessment);
    
    // Submit assessment
    document.getElementById('submit-assessment').addEventListener('click', submitAssessment);
    
    // Update budget totals initially
    updateBudgetTotals();
}

// Update budget totals
function updateBudgetTotals() {
    // Calculate total income
    let totalIncome = 0;
    document.querySelectorAll('#income-table tbody tr').forEach(row => {
        const amountInput = row.querySelector('input[type="number"]');
        const amount = parseFloat(amountInput.value) || 0;
        totalIncome += amount;
    });
    
    // Calculate total expenses
    let totalExpenses = 0;
    document.querySelectorAll('#expense-table tbody tr').forEach(row => {
        const amountInput = row.querySelector('input[type="number"]');
        const amount = parseFloat(amountInput.value) || 0;
        totalExpenses += amount;
    });
    
    // Calculate net result
    const netResult = totalIncome - totalExpenses;
    
    // Update display
    document.getElementById('total-income').textContent = `$${totalIncome.toFixed(2)}`;
    document.getElementById('total-expenses').textContent = `$${totalExpenses.toFixed(2)}`;
    document.getElementById('summary-income').textContent = `$${totalIncome.toFixed(2)}`;
    document.getElementById('summary-expenses').textContent = `$${totalExpenses.toFixed(2)}`;
    document.getElementById('net-result').textContent = `$${netResult.toFixed(2)}`;
    
    // Add color to net result based on value
    const netResultElement = document.getElementById('net-result');
    if (netResult > 0) {
        netResultElement.className = 'positive';
    } else if (netResult < 0) {
        netResultElement.className = 'negative';
    } else {
        netResultElement.className = '';
    }
}

// Save assessment
async function saveAssessment() {
    try {
        // Show saving indicator
        const saveButton = document.getElementById('save-assessment');
        const originalText = saveButton.textContent;
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';
        
        // Collect budget data
        const budget = collectBudgetData();
        
        // Collect answers
        const answers = collectAnswers();
        
        // Create assessment data
        const assessmentData = {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            scenario: userScenario,
            budget: budget,
            answers: answers,
            lastSaved: serverTimestamp(),
            submitted: false
        };
        
        // Save to Firestore
        await setDoc(doc(db, 'assessments', currentUser.uid), assessmentData);
        
        // Show success message
        alert('Assessment saved successfully!');
    } catch (error) {
        console.error("Error saving assessment:", error);
        alert('Error saving assessment: ' + error.message);
    } finally {
        // Reset button
        const saveButton = document.getElementById('save-assessment');
        saveButton.disabled = false;
        saveButton.textContent = 'Save Progress';
    }
}

// Submit assessment
async function submitAssessment() {
    try {
        // Validate assessment
        const validationResult = validateAssessment();
        if (!validationResult.valid) {
            alert(validationResult.message);
            return;
        }
        
        // Confirm submission
        if (!confirm('Are you sure you want to submit your assessment? You will not be able to make changes after submission.')) {
            return;
        }
        
        // Show submitting indicator
        const submitButton = document.getElementById('submit-assessment');
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
        
        // Collect budget data
        const budget = collectBudgetData();
        
        // Collect answers
        const answers = collectAnswers();
        
        // Create assessment data
        const assessmentData = {
            userId: currentUser.uid,
            userEmail: currentUser.email,
            scenario: userScenario,
            budget: budget,
            answers: answers,
            submittedAt: serverTimestamp(),
            submitted: true,
            status: 'submitted',
            feedback: null,
            grade: null
        };
        
        // Save to Firestore
        await setDoc(doc(db, 'assessments', currentUser.uid), assessmentData);
        
        // Show success message
        document.getElementById('assessment-content').style.display = 'none';
        document.getElementById('submission-success').style.display = 'block';
    } catch (error) {
        console.error("Error submitting assessment:", error);
        alert('Error submitting assessment: ' + error.message);
        
        // Reset button
        const submitButton = document.getElementById('submit-assessment');
        submitButton.disabled = false;
        submitButton.textContent = 'Submit Assessment';
    }
}

// Collect budget data
function collectBudgetData() {
    // Get farm type and budget period
    const farmType = document.getElementById('farm-type').value;
    const budgetPeriod = document.getElementById('budget-period').value;
    
    // Collect income items
    const incomeItems = [];
    document.querySelectorAll('#income-table tbody tr').forEach(row => {
        const nameInput = row.querySelector('input[type="text"]');
        const amountInput = row.querySelector('input[type="number"]');
        
        const name = nameInput.value.trim();
        const amount = parseFloat(amountInput.value) || 0;
        
        if (name || amount > 0) {
            incomeItems.push({
                name: name,
                amount: amount
            });
        }
    });
    
    // Collect expense items
    const expenseItems = [];
    document.querySelectorAll('#expense-table tbody tr').forEach(row => {
        const nameInput = row.querySelector('input[type="text"]');
        const amountInput = row.querySelector('input[type="number"]');
        
        const name = nameInput.value.trim();
        const amount = parseFloat(amountInput.value) || 0;
        
        if (name || amount > 0) {
            expenseItems.push({
                name: name,
                amount: amount
            });
        }
    });
    
    // Calculate totals
    let totalIncome = 0;
    incomeItems.forEach(item => totalIncome += item.amount);
    
    let totalExpenses = 0;
    expenseItems.forEach(item => totalExpenses += item.amount);
    
    const netResult = totalIncome - totalExpenses;
    
    // Return budget data
    return {
        farmType: farmType,
        budgetPeriod: budgetPeriod,
        incomeItems: incomeItems,
        expenseItems: expenseItems,
        totalIncome: totalIncome,
        totalExpenses: totalExpenses,
        netResult: netResult
    };
}

// Collect answers
function collectAnswers() {
    const answers = {};
    
    // Get all question textareas
    document.querySelectorAll('.question textarea').forEach(textarea => {
        answers[textarea.id] = textarea.value.trim();
    });
    
    return answers;
}

// Validate assessment
function validateAssessment() {
    // Validate budget
    const incomeItems = document.querySelectorAll('#income-table tbody tr');
    const expenseItems = document.querySelectorAll('#expense-table tbody tr');
    
    let hasValidIncome = false;
    incomeItems.forEach(row => {
        const nameInput = row.querySelector('input[type="text"]');
        const amountInput = row.querySelector('input[type="number"]');
        
        if (nameInput.value.trim() && parseFloat(amountInput.value) > 0) {
            hasValidIncome = true;
        }
    });
    
    if (!hasValidIncome) {
        return {
            valid: false,
            message: 'Please add at least one income item with a name and amount greater than zero.'
        };
    }
    
    let hasValidExpense = false;
    expenseItems.forEach(row => {
        const nameInput = row.querySelector('input[type="text"]');
        const amountInput = row.querySelector('input[type="number"]');
        
        if (nameInput.value.trim() && parseFloat(amountInput.value) > 0) {
            hasValidExpense = true;
        }
    });
    
    if (!hasValidExpense) {
        return {
            valid: false,
            message: 'Please add at least one expense item with a name and amount greater than zero.'
        };
    }
    
    // Validate answers
    const questions = document.querySelectorAll('.question textarea');
    for (let i = 0; i < questions.length; i++) {
        const textarea = questions[i];
        if (!textarea.value.trim()) {
            return {
                valid: false,
                message: `Please answer all questions. Question ${i + 1} is empty.`
            };
        }
    }
    
    return {
        valid: true
    };
}