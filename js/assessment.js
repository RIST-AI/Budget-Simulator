// js/assessment.js
import { auth, onAuthStateChanged, signOut, db, doc, getDoc, collection, addDoc, updateDoc, query, where, getDocs } from './firebase-config.js';
import { requireAuth } from './auth.js';

// Ensure user is authenticated
requireAuth();

// Global variables
let assessmentContent = {};
let currentAssessmentId = null;

// Initialize assessment functionality
document.addEventListener('DOMContentLoaded', async function() {
    // Update user status
    const userStatusElement = document.getElementById('user-status');
    if (userStatusElement) {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userStatusElement.innerHTML = 'Logged in as: ' + user.email;
            } else {
                // Redirect to login if not authenticated
                window.location.href = 'index.html';
            }
        });
    }
    
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
    
    try {
        // Load assessment content from Firestore
        await loadAssessmentContent();
        
        // Check if user has a draft or submitted assessment
        await checkExistingAssessment();
        
        // Set up event listeners
        setupEventListeners();
        
        // Hide loading indicator and show assessment
        const loadingIndicator = document.getElementById('loading-indicator');
        const assessmentContent = document.getElementById('assessment-content');
        
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        
        if (assessmentContent) {
            assessmentContent.style.display = 'block';
        }
    } catch (error) {
        console.error("Error initializing assessment:", error);
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.innerHTML = `
                <p>Error loading assessment: ${error.message}</p>
                <button class="btn" onclick="location.reload()">Try Again</button>
            `;
        }
    }
});

// Load assessment content from Firestore
async function loadAssessmentContent() {
    try {
        // Get the assessment content document
        const contentDoc = await getDoc(doc(db, 'assessmentContent', 'current'));
        
        if (contentDoc.exists()) {
            assessmentContent = contentDoc.data();
            
            // Debug: Log the element IDs we're trying to access
            console.log("Checking for elements:");
            console.log("assessment-title:", document.getElementById('assessment-title'));
            console.log("assessment-description:", document.getElementById('assessment-description'));
            console.log("scenario-text:", document.getElementById('scenario-text'));
            console.log("instructions-text:", document.getElementById('instructions-text'));
            console.log("budget-instructions:", document.getElementById('budget-instructions'));
            console.log("analysis-instructions:", document.getElementById('analysis-instructions'));
            
            // Safely set content for each element
            const setElementContent = (id, content) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = content;
                } else {
                    console.error(`Element with ID '${id}' not found`);
                }
            };
            
            setElementContent('assessment-title', assessmentContent.title || 'Farm Budget Assessment');
            setElementContent('assessment-description', assessmentContent.description || 'Complete this assessment to demonstrate your understanding of farm budget management.');
            setElementContent('scenario-text', assessmentContent.scenario || 'No scenario provided.');
            setElementContent('instructions-text', assessmentContent.instructions || 'No instructions provided.');
            setElementContent('budget-instructions', assessmentContent.budgetSetupInstructions || 'Create a budget for the farm based on the scenario.');
            setElementContent('analysis-instructions', assessmentContent.analysisInstructions || 'Answer the following questions based on your budget.');
            
        } else {
            throw new Error('Assessment content not found');
        }
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
        // Query for user's assessments
        const assessmentsQuery = query(
            collection(db, 'assessments'), 
            where('userId', '==', user.uid)
        );
        
        const snapshot = await getDocs(assessmentsQuery);
        
        if (!snapshot.empty) {
            // User has an assessment
            const assessmentDoc = snapshot.docs[0];
            const assessment = assessmentDoc.data();
            currentAssessmentId = assessmentDoc.id;
            
            // Load the assessment data
            if (assessment.budgetItems && assessment.budgetItems.length > 0) {
                // Clear default rows
                clearDefaultRows();
                
                // Add each budget item
                assessment.budgetItems.forEach(item => {
                    if (item.category === 'income') {
                        addIncomeRow(item.name, item.amount);
                    } else if (item.category === 'expense') {
                        addExpenseRow(item.name, item.amount);
                    }
                });
                
                // Update totals
                updateBudgetTotals();
            }
            
            // Load answers
            const question1 = document.getElementById('question1');
            const question2 = document.getElementById('question2');
            const question3 = document.getElementById('question3');
            
            if (assessment.answers) {
                if (question1) question1.value = assessment.answers.question1 || '';
                if (question2) question2.value = assessment.answers.question2 || '';
                if (question3) question3.value = assessment.answers.question3 || '';
            }
            
            // Update button text based on status
            const submitButton = document.getElementById('submit-assessment');
            if (submitButton && assessment.status === 'submitted') {
                submitButton.textContent = 'Update Submission';
            }
        }
    } catch (error) {
        console.error("Error checking existing assessment:", error);
    }
}

// Clear default rows from tables
function clearDefaultRows() {
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
}

// Set up event listeners
function setupEventListeners() {
    // Add income button
    const addIncomeBtn = document.getElementById('add-income');
    if (addIncomeBtn) {
        addIncomeBtn.addEventListener('click', function() {
            addIncomeRow('', '');
        });
    }
    
    // Add expense button
    const addExpenseBtn = document.getElementById('add-expense');
    if (addExpenseBtn) {
        addExpenseBtn.addEventListener('click', function() {
            addExpenseRow('', '');
        });
    }
    
    // Save assessment button
    const saveBtn = document.getElementById('save-assessment');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveAssessment);
    }
    
    // Submit assessment button
    const submitBtn = document.getElementById('submit-assessment');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitAssessment);
    }
    
    // Set up event delegation for remove buttons
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('btn-remove')) {
            const row = e.target.closest('tr');
            if (row) {
                row.remove();
                updateBudgetTotals();
            }
        }
    });
    
    // Set up event listeners for input changes to update totals
    document.addEventListener('input', function(e) {
        if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'number') {
            updateBudgetTotals();
        }
    });
}

// Add income row
function addIncomeRow(name = '', amount = '') {
    const incomeTable = document.getElementById('income-table');
    if (!incomeTable) {
        console.error("Income table not found");
        return;
    }
    
    const tbody = incomeTable.querySelector('tbody');
    if (!tbody) {
        console.error("Income table body not found");
        return;
    }
    
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td><input type="text" value="${name}" placeholder="Income item"></td>
        <td><input type="number" value="${amount}" placeholder="0.00"></td>
        <td><button class="btn-small btn-remove">Remove</button></td>
    `;
    
    tbody.appendChild(row);
    
    // Focus on the name input if it's a new empty row
    if (!name) {
        row.querySelector('input[type="text"]').focus();
    }
    
    updateBudgetTotals();
}

// Add expense row
function addExpenseRow(name = '', amount = '') {
    const expenseTable = document.getElementById('expense-table');
    if (!expenseTable) {
        console.error("Expense table not found");
        return;
    }
    
    const tbody = expenseTable.querySelector('tbody');
    if (!tbody) {
        console.error("Expense table body not found");
        return;
    }
    
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td><input type="text" value="${name}" placeholder="Expense item"></td>
        <td><input type="number" value="${amount}" placeholder="0.00"></td>
        <td><button class="btn-small btn-remove">Remove</button></td>
    `;
    
    tbody.appendChild(row);
    
    // Focus on the name input if it's a new empty row
    if (!name) {
        row.querySelector('input[type="text"]').focus();
    }
    
    updateBudgetTotals();
}

// Update budget totals
function updateBudgetTotals() {
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