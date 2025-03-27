// js/assessment.js
import { auth, onAuthStateChanged, signOut, db, doc, getDoc, collection, addDoc, updateDoc, query, where, getDocs } from './firebase-config.js';
import { requireAuth } from './auth.js';

// Ensure user is authenticated
requireAuth();

// Global variables
let currentAssessmentId = null;

// Initialize assessment functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded");
    
    // Update user status
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const userStatusElement = document.getElementById('user-status');
            if (userStatusElement) {
                userStatusElement.innerHTML = 'Logged in as: ' + user.email;
            }
        } else {
            // Redirect to login if not authenticated
            window.location.href = 'index.html';
        }
    });
    
    // Logout functionality
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            signOut(auth).then(() => {
                window.location.href = 'index.html';
            }).catch((error) => {
                console.error("Error signing out:", error);
            });
        });
    }
    
    // Load assessment content
    loadAssessmentContent()
        .then(() => checkExistingAssessment())
        .then(() => setupEventListeners())
        .then(() => {
            // Hide loading indicator and show assessment
            const loadingIndicator = document.getElementById('loading-indicator');
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
            
            const assessmentContent = document.getElementById('assessment-content');
            if (assessmentContent) {
                assessmentContent.style.display = 'block';
            }
        })
        .catch(error => {
            console.error("Error initializing assessment:", error);
            const loadingIndicator = document.getElementById('loading-indicator');
            if (loadingIndicator) {
                loadingIndicator.innerHTML = `
                    <p>Error loading assessment: ${error.message}</p>
                    <button class="btn" onclick="location.reload()">Try Again</button>
                `;
            }
        });
});

// Load assessment content from Firestore
async function loadAssessmentContent() {
    try {
        console.log("Loading assessment content");
        // Get the assessment content document
        const contentDoc = await getDoc(doc(db, 'assessmentContent', 'current'));
        
        if (!contentDoc.exists()) {
            throw new Error('Assessment content not found');
        }
        
        const content = contentDoc.data();
        console.log("Content loaded:", content);
        
        // Set content if elements exist
        const setContent = (id, text) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = text;
            } else {
                console.warn(`Element with ID '${id}' not found`);
            }
        };
        
        setContent('assessment-title', content.title || 'Farm Budget Assessment');
        setContent('assessment-description', content.description || 'Complete this assessment to demonstrate your understanding of farm budget management.');
        setContent('scenario-text', content.scenario || 'No scenario provided.');
        setContent('instructions-text', content.instructions || 'No instructions provided.');
        setContent('budget-instructions', content.budgetSetupInstructions || 'Create a budget for the farm based on the scenario.');
        setContent('analysis-instructions', content.analysisInstructions || 'Answer the following questions based on your budget.');
        
    } catch (error) {
        console.error("Error loading assessment content:", error);
        throw error;
    }
}

// Check if user has an existing assessment
async function checkExistingAssessment() {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        console.log("Checking for existing assessment");
        // Query for user's assessments
        const assessmentsQuery = query(
            collection(db, 'assessments'), 
            where('userId', '==', user.uid)
        );
        
        const snapshot = await getDocs(assessmentsQuery);
        
        if (snapshot.empty) {
            console.log("No existing assessment found");
            return;
        }
        
        console.log("Existing assessment found");
        // User has an assessment
        const assessmentDoc = snapshot.docs[0];
        const assessment = assessmentDoc.data();
        currentAssessmentId = assessmentDoc.id;
        
        // Load budget items
        if (assessment.budgetItems && assessment.budgetItems.length > 0) {
            console.log("Loading budget items:", assessment.budgetItems.length);
            
            // Clear default rows
            const incomeTable = document.getElementById('income-table');
            const expenseTable = document.getElementById('expense-table');
            
            if (incomeTable) {
                const incomeTbody = incomeTable.querySelector('tbody');
                if (incomeTbody) incomeTbody.innerHTML = '';
            }
            
            if (expenseTable) {
                const expenseTbody = expenseTable.querySelector('tbody');
                if (expenseTbody) expenseTbody.innerHTML = '';
            }
            
            // Add each budget item
            assessment.budgetItems.forEach(item => {
                if (item.category === 'income') {
                    addBudgetRow('income', item.name, item.amount);
                } else if (item.category === 'expense') {
                    addBudgetRow('expense', item.name, item.amount);
                }
            });
            
            // Update totals
            calculateTotals();
        }
        
        // Load answers
        if (assessment.answers) {
            console.log("Loading answers");
            const question1 = document.getElementById('question1');
            const question2 = document.getElementById('question2');
            const question3 = document.getElementById('question3');
            
            if (question1) question1.value = assessment.answers.question1 || '';
            if (question2) question2.value = assessment.answers.question2 || '';
            if (question3) question3.value = assessment.answers.question3 || '';
        }
        
        // Update button text based on status
        if (assessment.status === 'submitted') {
            const submitButton = document.getElementById('submit-assessment');
            if (submitButton) {
                submitButton.textContent = 'Update Submission';
            }
        }
    } catch (error) {
        console.error("Error checking existing assessment:", error);
    }
}

// Set up event listeners
function setupEventListeners() {
    console.log("Setting up event listeners");
    
    // Add income button
    const addIncomeBtn = document.getElementById('add-income');
    if (addIncomeBtn) {
        addIncomeBtn.addEventListener('click', function() {
            addBudgetRow('income');
        });
    } else {
        console.warn("Add income button not found");
    }
    
    // Add expense button
    const addExpenseBtn = document.getElementById('add-expense');
    if (addExpenseBtn) {
        addExpenseBtn.addEventListener('click', function() {
            addBudgetRow('expense');
        });
    } else {
        console.warn("Add expense button not found");
    }
    
    // Save assessment button
    const saveBtn = document.getElementById('save-assessment');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveAssessment);
    } else {
        console.warn("Save assessment button not found");
    }
    
    // Submit assessment button
    const submitBtn = document.getElementById('submit-assessment');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitAssessment);
    } else {
        console.warn("Submit assessment button not found");
    }
    
    // Set up event delegation for remove buttons
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('btn-remove')) {
            const row = e.target.closest('tr');
            if (row) {
                row.remove();
                calculateTotals();
            }
        }
    });
    
    // Set up event listeners for input changes to update totals
    document.addEventListener('input', function(e) {
        if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'number') {
            calculateTotals();
        }
    });
}

// Add a budget row (income or expense)
function addBudgetRow(type, name = '', amount = '') {
    const tableId = type === 'income' ? 'income-table' : 'expense-table';
    const table = document.getElementById(tableId);
    
    if (!table) {
        console.warn(`Table with ID '${tableId}' not found`);
        return;
    }
    
    const tbody = table.querySelector('tbody');
    if (!tbody) {
        console.warn(`Table body not found in '${tableId}'`);
        return;
    }
    
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td><input type="text" value="${name}" placeholder="${type === 'income' ? 'Income item' : 'Expense item'}"></td>
        <td><input type="number" value="${amount}" placeholder="0.00"></td>
        <td><button class="btn-small btn-remove">Remove</button></td>
    `;
    
    tbody.appendChild(row);
    
    // Focus on the name input if it's a new empty row
    if (!name) {
        const nameInput = row.querySelector('input[type="text"]');
        if (nameInput) nameInput.focus();
    }
    
    calculateTotals();
}

// Calculate budget totals
function calculateTotals() {
    // Calculate income total
    let totalIncome = 0;
    const incomeTable = document.getElementById('income-table');
    if (incomeTable) {
        const incomeRows = incomeTable.querySelectorAll('tbody tr');
        incomeRows.forEach(row => {
            const amountInput = row.querySelector('input[type="number"]');
            if (amountInput && amountInput.value) {
                totalIncome += parseFloat(amountInput.value) || 0;
            }
        });
    }
    
    // Calculate expense total
    let totalExpenses = 0;
    const expenseTable = document.getElementById('expense-table');
    if (expenseTable) {
        const expenseRows = expenseTable.querySelectorAll('tbody tr');
        expenseRows.forEach(row => {
            const amountInput = row.querySelector('input[type="number"]');
            if (amountInput && amountInput.value) {
                totalExpenses += parseFloat(amountInput.value) || 0;
            }
        });
    }
    
    // Calculate net result
    const netResult = totalIncome - totalExpenses;
    
    // Update the display
    const updateElementText = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = formatCurrency(value);
        }
    };
    
    updateElementText('total-income', totalIncome);
    updateElementText('total-expenses', totalExpenses);
    updateElementText('net-result', netResult);
    updateElementText('summary-income', totalIncome);
    updateElementText('summary-expenses', totalExpenses);
    
    // Add class based on net result
    const netResultElement = document.getElementById('net-result');
    if (netResultElement) {
        if (netResult > 0) {
            netResultElement.className = 'positive';
        } else if (netResult < 0) {
            netResultElement.className = 'negative';
        } else {
            netResultElement.className = '';
        }
    }
}

// Format currency
function formatCurrency(amount) {
    return '$' + Number(amount).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Collect budget items from the tables
function collectBudgetItems() {
    const budgetItems = [];
    
    // Collect income items
    const incomeTable = document.getElementById('income-table');
    if (incomeTable) {
        const incomeRows = incomeTable.querySelectorAll('tbody tr');
        incomeRows.forEach(row => {
            const nameInput = row.querySelector('input[type="text"]');
            const amountInput = row.querySelector('input[type="number"]');
            
            if (nameInput && nameInput.value && amountInput && amountInput.value) {
                budgetItems.push({
                    id: Date.now() + Math.random(), // Generate a unique ID
                    name: nameInput.value.trim(),
                    category: 'income',
                    amount: parseFloat(amountInput.value) || 0
                });
            }
        });
    }
    
    // Collect expense items
    const expenseTable = document.getElementById('expense-table');
    if (expenseTable) {
        const expenseRows = expenseTable.querySelectorAll('tbody tr');
        expenseRows.forEach(row => {
            const nameInput = row.querySelector('input[type="text"]');
            const amountInput = row.querySelector('input[type="number"]');
            
            if (nameInput && nameInput.value && amountInput && amountInput.value) {
                budgetItems.push({
                    id: Date.now() + Math.random(), // Generate a unique ID
                    name: nameInput.value.trim(),
                    category: 'expense',
                    amount: parseFloat(amountInput.value) || 0
                });
            }
        });
    }
    
    return budgetItems;
}

// Save assessment progress
async function saveAssessment() {
    const user = auth.currentUser;
    if (!user) {
        alert('You must be logged in to save your assessment.');
        return;
    }
    
    // Show loading state
    const saveButton = document.getElementById('save-assessment');
    if (!saveButton) return;
    
    const originalButtonText = saveButton.textContent;
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    
    try {
        // Collect budget items
        const budgetItems = collectBudgetItems();
        
        // Calculate totals
        let totalIncome = 0;
        let totalExpenses = 0;
        
        budgetItems.forEach(item => {
            if (item.category === 'income') {
                totalIncome += item.amount;
            } else if (item.category === 'expense') {
                totalExpenses += item.amount;
            }
        });
        
        const netResult = totalIncome - totalExpenses;
        
        // Get answers
        const question1 = document.getElementById('question1');
        const question2 = document.getElementById('question2');
        const question3 = document.getElementById('question3');
        
        // Collect assessment data
        const assessmentData = {
            userId: user.uid,
            userEmail: user.email,
            budgetItems: budgetItems,
            budget: {
                totalIncome: totalIncome,
                totalExpenses: totalExpenses,
                netResult: netResult
            },
            answers: {
                question1: question1 ? question1.value : '',
                question2: question2 ? question2.value : '',
                question3: question3 ? question3.value : ''
            },
            status: 'draft',
            updatedAt: new Date()
        };
        
        // Save to Firestore
        if (currentAssessmentId) {
            // Update existing assessment
            await updateDoc(doc(db, 'assessments', currentAssessmentId), assessmentData);
        } else {
            // Create new assessment
            assessmentData.createdAt = new Date();
            const docRef = await addDoc(collection(db, 'assessments'), assessmentData);
            currentAssessmentId = docRef.id;
        }
        
        // Show success message
        alert('Assessment saved successfully!');
        
    } catch (error) {
        console.error('Error saving assessment:', error);
        alert('Error saving assessment: ' + error.message);
    } finally {
        // Reset button
        saveButton.disabled = false;
        saveButton.textContent = originalButtonText;
    }
}

// Submit assessment
async function submitAssessment() {
    const user = auth.currentUser;
    if (!user) {
        alert('You must be logged in to submit an assessment.');
        return;
    }
    
    // Collect budget items
    const budgetItems = collectBudgetItems();
    
    // Validate assessment
    if (budgetItems.length === 0) {
        alert('Please add at least one budget item.');
        return;
    }
    
    const question1 = document.getElementById('question1');
    const question2 = document.getElementById('question2');
    const question3 = document.getElementById('question3');
    
    if ((!question1 || !question1.value.trim()) ||
        (!question2 || !question2.value.trim()) ||
        (!question3 || !question3.value.trim())) {
        alert('Please answer all questions.');
        return;
    }
    
    // Confirm submission
    if (!confirm('Are you sure you want to submit this assessment? You can still make changes after submission.')) {
        return;
    }
    
    // Show loading state
    const submitButton = document.getElementById('submit-assessment');
    if (!submitButton) return;
    
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    
    try {
        // Calculate totals
        let totalIncome = 0;
        let totalExpenses = 0;
        
        budgetItems.forEach(item => {
            if (item.category === 'income') {
                totalIncome += item.amount;
            } else if (item.category === 'expense') {
                totalExpenses += item.amount;
            }
        });
        
        const netResult = totalIncome - totalExpenses;
        
        // Collect assessment data
        const assessmentData = {
            userId: user.uid,
            userEmail: user.email,
            budgetItems: budgetItems,
            budget: {
                totalIncome: totalIncome,
                totalExpenses: totalExpenses,
                netResult: netResult
            },
            answers: {
                question1: question1 ? question1.value : '',
                question2: question2 ? question2.value : '',
                question3: question3 ? question3.value : ''
            },
            status: 'submitted',
            updatedAt: new Date()
        };
        
        // Save to Firestore
        if (currentAssessmentId) {
            // Update existing assessment
            assessmentData.submittedAt = new Date();
            await updateDoc(doc(db, 'assessments', currentAssessmentId), assessmentData);
        } else {
            // Create new assessment
            assessmentData.createdAt = new Date();
            assessmentData.submittedAt = new Date();
            const docRef = await addDoc(collection(db, 'assessments'), assessmentData);
            currentAssessmentId = docRef.id;
        }
        
        // Show success message and hide assessment content
        const assessmentContent = document.getElementById('assessment-content');
        const submissionSuccess = document.getElementById('submission-success');
        
        if (assessmentContent) assessmentContent.style.display = 'none';
        if (submissionSuccess) submissionSuccess.style.display = 'block';
        
    } catch (error) {
        console.error('Error submitting assessment:', error);
        alert('Error submitting assessment: ' + error.message);
        
        // Reset button
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
}