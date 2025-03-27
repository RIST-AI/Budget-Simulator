// js/assessment.js
import { auth, onAuthStateChanged, signOut, db, doc, getDoc, collection, addDoc, updateDoc, query, where, getDocs } from './firebase-config.js';
import { requireAuth } from './auth.js';

// Ensure user is authenticated
requireAuth();

// Global variables
let assessmentContent = {};
let budgetItems = [];
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
        document.getElementById('assessment-form').style.display = 'block';
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
            
            // Populate assessment content
            document.getElementById('assessment-content').innerHTML = `
                <div class="assessment-instructions">
                    <h3>${assessmentContent.title || 'Farm Budget Assessment'}</h3>
                    <p>${assessmentContent.description || 'Complete this assessment to demonstrate your understanding of farm budget management.'}</p>
                    
                    <div class="scenario-details">
                        <h4>Scenario</h4>
                        <p>${assessmentContent.scenario || 'No scenario provided.'}</p>
                    </div>
                    
                    <div class="assessment-instructions">
                        <h4>Instructions</h4>
                        <p>${assessmentContent.instructions || 'No instructions provided.'}</p>
                    </div>
                </div>
            `;
            
            // Populate budget setup content
            document.getElementById('budget-setup-content').innerHTML = `
                <p>${assessmentContent.budgetSetupInstructions || 'Create a budget for the farm based on the scenario.'}</p>
            `;
            
            // Populate analysis questions
            document.getElementById('analysis-questions').innerHTML = `
                <p>${assessmentContent.analysisInstructions || 'Answer the following questions based on your budget.'}</p>
            `;
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
            if (assessment.budgetItems) {
                budgetItems = assessment.budgetItems;
                updateBudgetTable();
            }
            
            // Load answers
            if (assessment.answers) {
                document.getElementById('question1').value = assessment.answers.question1 || '';
                document.getElementById('question2').value = assessment.answers.question2 || '';
                document.getElementById('question3').value = assessment.answers.question3 || '';
            }
            
            // Check for trainer comments
            if (assessment.comments && assessment.comments.length > 0) {
                const commentsContainer = document.getElementById('comments-container');
                commentsContainer.innerHTML = '';
                
                assessment.comments.forEach(comment => {
                    const commentDate = comment.createdAt ? new Date(comment.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown date';
                    
                    commentsContainer.innerHTML += `
                        <div class="trainer-comment">
                            <div class="comment-header">
                                <span class="comment-date">${commentDate}</span>
                            </div>
                            <div class="comment-body">
                                <p>${comment.text}</p>
                            </div>
                        </div>
                    `;
                });
                
                document.getElementById('trainer-comments').style.display = 'block';
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

// Set up event listeners
function setupEventListeners() {
    // Category change event
    document.getElementById('item-category').addEventListener('change', function() {
        // You could add subcategory logic here if needed
    });
    
    // Add budget item button
    document.getElementById('add-budget-item').addEventListener('click', addBudgetItem);
    
    // Save draft button
    document.getElementById('save-draft').addEventListener('click', saveDraft);
    
    // Submit assessment button
    document.getElementById('submit-assessment').addEventListener('click', submitAssessment);
}

// Add budget item
function addBudgetItem() {
    // Get input values
    const itemName = document.getElementById('item-name').value.trim();
    const category = document.getElementById('item-category').value;
    const amount = parseFloat(document.getElementById('item-amount').value) || 0;
    
    // Validate inputs
    if (!itemName) {
        alert('Please enter an item name.');
        return;
    }
    
    if (!category) {
        alert('Please select a category.');
        return;
    }
    
    if (amount <= 0) {
        alert('Please enter a valid amount greater than zero.');
        return;
    }
    
    // Create budget item object
    const budgetItem = {
        id: Date.now(), // Unique ID for the item
        name: itemName,
        category: category,
        amount: amount
    };
    
    // Add to budget items array
    budgetItems.push(budgetItem);
    
    // Update the table
    updateBudgetTable();
    
    // Clear the form
    document.getElementById('item-name').value = '';
    document.getElementById('item-category').value = '';
    document.getElementById('item-amount').value = '';
    
    // Focus on item name field
    document.getElementById('item-name').focus();
}

// Update budget table
function updateBudgetTable() {
    const tableBody = document.getElementById('budget-items-body');
    tableBody.innerHTML = '';
    
    // Add each budget item to the table
    budgetItems.forEach(item => {
        const row = document.createElement('tr');
        
        // Create cells
        const nameCell = document.createElement('td');
        nameCell.textContent = item.name;
        
        const categoryCell = document.createElement('td');
        categoryCell.textContent = item.category === 'income' ? 'Income' : 'Expense';
        
        const amountCell = document.createElement('td');
        amountCell.textContent = formatCurrency(item.amount);
        
        const actionsCell = document.createElement('td');
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.className = 'btn-small btn-remove';
        removeButton.addEventListener('click', () => removeBudgetItem(item.id));
        actionsCell.appendChild(removeButton);
        
        // Add cells to row
        row.appendChild(nameCell);
        row.appendChild(categoryCell);
        row.appendChild(amountCell);
        row.appendChild(actionsCell);
        
        // Add row to table
        tableBody.appendChild(row);
    });
    
    // Update totals
    updateBudgetTotals();
}

// Remove budget item
function removeBudgetItem(id) {
    budgetItems = budgetItems.filter(item => item.id !== id);
    updateBudgetTable();
}

// Update budget totals
function updateBudgetTotals() {
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
    
    // Update the display
    document.getElementById('total-income').textContent = formatCurrency(totalIncome);
    document.getElementById('total-expenses').textContent = formatCurrency(totalExpenses);
    document.getElementById('net-result').textContent = formatCurrency(netResult);
    
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
    return '$' + amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Save assessment draft
async function saveDraft() {
    const user = auth.currentUser;
    if (!user) {
        alert('You must be logged in to save a draft.');
        return;
    }
    
    // Show loading state
    const saveButton = document.getElementById('save-draft');
    const originalButtonText = saveButton.textContent;
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    
    try {
        // Collect assessment data
        const assessmentData = {
            userId: user.uid,
            userEmail: user.email,
            budgetItems: budgetItems,
            answers: {
                question1: document.getElementById('question1').value,
                question2: document.getElementById('question2').value,
                question3: document.getElementById('question3').value
            },
            status: 'draft',
            updatedAt: new Date()
        };
        
        // Calculate budget totals
        let totalIncome = 0;
        let totalExpenses = 0;
        
        budgetItems.forEach(item => {
            if (item.category === 'income') {
                totalIncome += item.amount;
            } else if (item.category === 'expense') {
                totalExpenses += item.amount;
            }
        });
        
        assessmentData.budget = {
            totalIncome: totalIncome,
            totalExpenses: totalExpenses,
            netResult: totalIncome - totalExpenses
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
        alert('Assessment draft saved successfully!');
        
    } catch (error) {
        console.error('Error saving assessment draft:', error);
        alert('Error saving assessment draft: ' + error.message);
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
        // Collect assessment data
        const assessmentData = {
            userId: user.uid,
            userEmail: user.email,
            budgetItems: budgetItems,
            answers: {
                question1: document.getElementById('question1').value,
                question2: document.getElementById('question2').value,
                question3: document.getElementById('question3').value
            },
            status: 'submitted',
            updatedAt: new Date()
        };
        
        // Calculate budget totals
        let totalIncome = 0;
        let totalExpenses = 0;
        
        budgetItems.forEach(item => {
            if (item.category === 'income') {
                totalIncome += item.amount;
            } else if (item.category === 'expense') {
                totalExpenses += item.amount;
            }
        });
        
        assessmentData.budget = {
            totalIncome: totalIncome,
            totalExpenses: totalExpenses,
            netResult: totalIncome - totalExpenses
        };
        
        // Save to Firestore
        if (currentAssessmentId) {
            // Update existing assessment
            await updateDoc(doc(db, 'assessments', currentAssessmentId), assessmentData);
        } else {
            // Create new assessment
            assessmentData.createdAt = new Date();
            assessmentData.submittedAt = new Date();
            const docRef = await addDoc(collection(db, 'assessments'), assessmentData);
            currentAssessmentId = docRef.id;
        }
        
        // Show success message
        alert('Assessment submitted successfully!');
        
    } catch (error) {
        console.error('Error submitting assessment:', error);
        alert('Error submitting assessment: ' + error.message);
    } finally {
        // Reset button
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
}