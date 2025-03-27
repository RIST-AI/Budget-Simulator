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
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('user-status').innerHTML = 'Logged in as: ' + user.email;
        } else {
            // Redirect to login if not authenticated
            window.location.href = 'index.html';
        }
    });
    
    // Logout functionality
    document.getElementById('logout-link').addEventListener('click', function(e) {
        e.preventDefault();
        signOut(auth).then(() => {
            window.location.href = 'index.html';
        }).catch((error) => {
            console.error("Error signing out:", error);
        });
    });
    
    try {
        // Load assessment content from Firestore
        await loadAssessmentContent();
        
        // Check if user has a draft or submitted assessment
        await checkExistingAssessment();
        
        // Set up event listeners
        setupEventListeners();
        
        // Hide loading indicator and show assessment
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
            assessmentContent = contentDoc.data();
            
            // Populate assessment content using the new HTML structure
            document.getElementById('assessment-title').textContent = assessmentContent.title || 'Farm Budget Assessment';
            document.getElementById('assessment-description').textContent = assessmentContent.description || 'Complete this assessment to demonstrate your understanding of farm budget management.';
            document.getElementById('scenario-text').textContent = assessmentContent.scenario || 'No scenario provided.';
            document.getElementById('instructions-text').textContent = assessmentContent.instructions || 'No instructions provided.';
            document.getElementById('budget-instructions').textContent = assessmentContent.budgetSetupInstructions || 'Create a budget for the farm based on the scenario.';
            document.getElementById('analysis-instructions').textContent = assessmentContent.analysisInstructions || 'Answer the following questions based on your budget.';
            
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
            if (assessment.answers) {
                document.getElementById('question1').value = assessment.answers.question1 || '';
                document.getElementById('question2').value = assessment.answers.question2 || '';
                document.getElementById('question3').value = assessment.answers.question3 || '';
            }
            
            // Update button text based on status
            if (assessment.status === 'submitted') {
                document.getElementById('submit-assessment').textContent = 'Update Submission';
            }
        }
    } catch (error) {
        console.error("Error checking existing assessment:", error);
    }
}

// Clear default rows from tables
function clearDefaultRows() {
    const incomeTable = document.getElementById('income-table').querySelector('tbody');
    const expenseTable = document.getElementById('expense-table').querySelector('tbody');
    
    incomeTable.innerHTML = '';
    expenseTable.innerHTML = '';
}

// Set up event listeners
function setupEventListeners() {
    // Add income button
    document.getElementById('add-income').addEventListener('click', function() {
        addIncomeRow('', '');
    });
    
    // Add expense button
    document.getElementById('add-expense').addEventListener('click', function() {
        addExpenseRow('', '');
    });
    
    // Save assessment button
    document.getElementById('save-assessment').addEventListener('click', saveAssessment);
    
    // Submit assessment button
    document.getElementById('submit-assessment').addEventListener('click', submitAssessment);
    
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
    const tbody = document.getElementById('income-table').querySelector('tbody');
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
    const tbody = document.getElementById('expense-table').querySelector('tbody');
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
    const incomeRows = document.getElementById('income-table').querySelectorAll('tbody tr');
    incomeRows.forEach(row => {
        const amountInput = row.querySelector('input[type="number"]');
        if (amountInput && amountInput.value) {
            totalIncome += parseFloat(amountInput.value) || 0;
        }
    });
    
    // Calculate expense total
    let totalExpenses = 0;
    const expenseRows = document.getElementById('expense-table').querySelectorAll('tbody tr');
    expenseRows.forEach(row => {
        const amountInput = row.querySelector('input[type="number"]');
        if (amountInput && amountInput.value) {
            totalExpenses += parseFloat(amountInput.value) || 0;
        }
    });
    
    // Calculate net result
    const netResult = totalIncome - totalExpenses;
    
    // Update the display
    document.getElementById('total-income').textContent = formatCurrency(totalIncome);
    document.getElementById('total-expenses').textContent = formatCurrency(totalExpenses);
    document.getElementById('net-result').textContent = formatCurrency(netResult);
    document.getElementById('summary-income').textContent = formatCurrency(totalIncome);
    document.getElementById('summary-expenses').textContent = formatCurrency(totalExpenses);
    
    // Add class based on net result
    const netResultElement = document.getElementById('net-result');
    if (netResult > 0) {
        netResultElement.className = 'positive';
    } else if (netResult < 0) {
        netResultElement.className = 'negative';
    } else {
        netResultElement.className = '';
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
    const incomeRows = document.getElementById('income-table').querySelectorAll('tbody tr');
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
    
    // Collect expense items
    const expenseRows = document.getElementById('expense-table').querySelectorAll('tbody tr');
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
                question1: document.getElementById('question1').value,
                question2: document.getElementById('question2').value,
                question3: document.getElementById('question3').value
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
    
    if (!document.getElementById('question1').value.trim() ||
        !document.getElementById('question2').value.trim() ||
        !document.getElementById('question3').value.trim()) {
        alert('Please answer all questions.');
        return;
    }
    
    // Confirm submission
    if (!confirm('Are you sure you want to submit this assessment? You can still make changes after submission.')) {
        return;
    }
    
    // Show loading state
    const submitButton = document.getElementById('submit-assessment');
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
                question1: document.getElementById('question1').value,
                question2: document.getElementById('question2').value,
                question3: document.getElementById('question3').value
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
        document.getElementById('assessment-content').style.display = 'none';
        document.getElementById('submission-success').style.display = 'block';
        
    } catch (error) {
        console.error('Error submitting assessment:', error);
        alert('Error submitting assessment: ' + error.message);
        
        // Reset button
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
}