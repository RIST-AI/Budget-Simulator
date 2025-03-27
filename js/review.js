// js/review.js
import { auth, onAuthStateChanged, signOut, db, doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion } from './firebase-config.js';
import { requireRole } from './auth.js';

// Ensure user is authenticated and has trainer role
requireRole('trainer');

// Global variables
let assessments = [];
let currentAssessment = null;

// Initialize review functionality
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
        // Load all submitted assessments
        await loadAssessments();
        
        // Set up event listeners
        setupEventListeners();
        
        // Hide loading indicator and show assessments list
        document.getElementById('loading-indicator').style.display = 'none';
        document.getElementById('assessments-list').style.display = 'block';
    } catch (error) {
        console.error("Error initializing review page:", error);
        document.getElementById('loading-indicator').innerHTML = `
            <p>Error loading assessments: ${error.message}</p>
            <button class="btn" onclick="location.reload()">Try Again</button>
        `;
    }
});

// Load all submitted assessments
async function loadAssessments() {
    try {
        // Query for submitted assessments
        const assessmentsQuery = query(
            collection(db, 'assessments'), 
            where('status', '==', 'submitted')
        );
        
        const snapshot = await getDocs(assessmentsQuery);
        
        if (snapshot.empty) {
            document.getElementById('assessments-container').innerHTML = `
                <p>No assessments have been submitted yet.</p>
            `;
            return;
        }
        
        // Store assessments
        assessments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Display assessments
        displayAssessments(assessments);
    } catch (error) {
        console.error("Error loading assessments:", error);
        throw error;
    }
}

// Display assessments in the list
function displayAssessments(assessmentsToDisplay) {
    const container = document.getElementById('assessments-container');
    container.innerHTML = '';
    
    if (assessmentsToDisplay.length === 0) {
        container.innerHTML = `<p>No assessments found matching your search.</p>`;
        return;
    }
    
    assessmentsToDisplay.forEach(assessment => {
        let submittedDate = 'Unknown date';
        
        // Handle different date formats
        if (assessment.submittedAt) {
            if (assessment.submittedAt.seconds) {
                // Firestore timestamp
                submittedDate = new Date(assessment.submittedAt.seconds * 1000).toLocaleDateString();
            } else if (assessment.submittedAt instanceof Date) {
                // JavaScript Date object
                submittedDate = assessment.submittedAt.toLocaleDateString();
            } else if (typeof assessment.submittedAt === 'string') {
                // Already formatted string
                submittedDate = assessment.submittedAt;
            }
        }
        
        const hasComments = assessment.comments && assessment.comments.length > 0;
        
        const card = document.createElement('div');
        card.className = 'assessment-card';
        card.innerHTML = `
            <div class="assessment-card-header">
                <span class="assessment-type">Farm Budget Assessment</span>
                <span class="assessment-date">Submitted: ${submittedDate}</span>
            </div>
            <h3>Student: ${assessment.userEmail}</h3>
            <div class="assessment-details">
                <p>Status: ${hasComments ? 'Reviewed' : 'Pending Review'}</p>
                <p>Net Result: ${formatCurrency(assessment.budget?.netResult || 0)}</p>
            </div>
            <div class="assessment-actions">
                <button class="btn view-assessment" data-id="${assessment.id}">Review Assessment</button>
            </div>
        `;
        
        container.appendChild(card);
        
        // Add click event to the button
        card.querySelector('.view-assessment').addEventListener('click', function() {
            const assessmentId = this.getAttribute('data-id');
            viewAssessment(assessmentId);
        });
    });
}

// Set up event listeners
function setupEventListeners() {
    // Search functionality
    document.getElementById('search-input').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        
        // Filter assessments by student email
        const filteredAssessments = assessments.filter(assessment => 
            assessment.userEmail.toLowerCase().includes(searchTerm)
        );
        
        // Display filtered assessments
        displayAssessments(filteredAssessments);
    });
    
    // Back to list button
    document.getElementById('back-to-list').addEventListener('click', function() {
        document.getElementById('assessment-detail').style.display = 'none';
        document.getElementById('assessments-list').style.display = 'block';
    });
    
    // Add comment button
    document.getElementById('add-comment').addEventListener('click', addComment);
}

// View assessment details
async function viewAssessment(assessmentId) {
    try {
        // Get assessment document
        const assessmentDoc = await getDoc(doc(db, 'assessments', assessmentId));
        
        if (!assessmentDoc.exists()) {
            alert('Assessment not found');
            return;
        }
        
        // Store current assessment
        currentAssessment = {
            id: assessmentDoc.id,
            ...assessmentDoc.data()
        };
        
        // Display assessment details
        document.getElementById('student-email').textContent = currentAssessment.userEmail;
        
        let submittedDate = 'Unknown date';
        
        // Handle different date formats for submitted date
        if (currentAssessment.submittedAt) {
            if (currentAssessment.submittedAt.seconds) {
                // Firestore timestamp
                submittedDate = new Date(currentAssessment.submittedAt.seconds * 1000).toLocaleDateString();
            } else if (currentAssessment.submittedAt instanceof Date) {
                // JavaScript Date object
                submittedDate = currentAssessment.submittedAt.toLocaleDateString();
            } else if (typeof currentAssessment.submittedAt === 'string') {
                // Already formatted string
                submittedDate = currentAssessment.submittedAt;
            }
        }
        
        document.getElementById('submission-date').textContent = submittedDate;
        
        // Display budget items
        displayBudgetItems(currentAssessment.budgetItems || []);
        
        // Display answers
        document.getElementById('answer1').textContent = currentAssessment.answers?.question1 || 'No answer provided';
        document.getElementById('answer2').textContent = currentAssessment.answers?.question2 || 'No answer provided';
        document.getElementById('answer3').textContent = currentAssessment.answers?.question3 || 'No answer provided';
        
        // Display comments
        displayComments(currentAssessment.comments || []);
        
        // Show assessment detail view
        document.getElementById('assessments-list').style.display = 'none';
        document.getElementById('assessment-detail').style.display = 'block';
    } catch (error) {
        console.error("Error viewing assessment:", error);
        alert('Error loading assessment details: ' + error.message);
    }
}

// Display budget items
function displayBudgetItems(budgetItems) {
    const tableBody = document.getElementById('budget-items-body');
    tableBody.innerHTML = '';
    
    // Calculate totals
    let totalIncome = 0;
    let totalExpenses = 0;
    
    // Add each budget item to the table
    budgetItems.forEach(item => {
        // Update totals
        if (item.category === 'income') {
            totalIncome += item.amount;
        } else if (item.category === 'expense') {
            totalExpenses += item.amount;
        }
        
        const row = document.createElement('tr');
        
        // Create cells
        const nameCell = document.createElement('td');
        nameCell.textContent = item.name;
        
        const categoryCell = document.createElement('td');
        categoryCell.textContent = item.category === 'income' ? 'Income' : 'Expense';
        
        const amountCell = document.createElement('td');
        amountCell.textContent = formatCurrency(item.amount);
        
        // Add cells to row
        row.appendChild(nameCell);
        row.appendChild(categoryCell);
        row.appendChild(amountCell);
        
        // Add row to table
        tableBody.appendChild(row);
    });
    
    // Calculate net result
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

// Display comments
function displayComments(comments) {
    const commentsContainer = document.getElementById('comments-container');
    commentsContainer.innerHTML = '';
    
    if (!comments || comments.length === 0) {
        commentsContainer.innerHTML = '<p>No comments yet.</p>';
        return;
    }
    
    comments.forEach(comment => {
        // Format the date properly
        let commentDate = 'Unknown date';
        
        if (comment.createdAt) {
            if (comment.createdAt.seconds) {
                // Firestore timestamp
                commentDate = new Date(comment.createdAt.seconds * 1000).toLocaleDateString();
            } else if (comment.createdAt instanceof Date) {
                // JavaScript Date object
                commentDate = comment.createdAt.toLocaleDateString();
            } else if (typeof comment.createdAt === 'string') {
                // Already formatted string
                commentDate = comment.createdAt;
            }
        }
        
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
}

// Add comment to assessment
async function addComment() {
    if (!currentAssessment) {
        alert('No assessment selected');
        return;
    }
    
    const commentText = document.getElementById('new-comment').value.trim();
    
    if (!commentText) {
        alert('Please enter a comment');
        return;
    }
    
    // Show loading state
    const commentButton = document.getElementById('add-comment');
    const originalButtonText = commentButton.textContent;
    commentButton.disabled = true;
    commentButton.textContent = 'Adding...';
    
    try {
        const user = auth.currentUser;
        
        // Format the date as a string to avoid "Invalid Date" issues
        const now = new Date();
        const formattedDate = now.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        // Create comment object with formatted date string
        const comment = {
            text: commentText,
            createdAt: formattedDate,
            createdBy: user.email
        };
        
        // Update assessment document
        await updateDoc(doc(db, 'assessments', currentAssessment.id), {
            comments: arrayUnion(comment)
        });
        
        // Add comment to current assessment
        if (!currentAssessment.comments) {
            currentAssessment.comments = [];
        }
        currentAssessment.comments.push(comment);
        
        // Display updated comments
        displayComments(currentAssessment.comments);
        
        // Clear comment input
        document.getElementById('new-comment').value = '';
        
        // Show success message
        alert('Comment added successfully');
        
    } catch (error) {
        console.error('Error adding comment:', error);
        alert('Error adding comment: ' + error.message);
    } finally {
        // Reset button
        commentButton.disabled = false;
        commentButton.textContent = originalButtonText;
    }
}

// Format currency
function formatCurrency(amount) {
    return '$' + Number(amount).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}