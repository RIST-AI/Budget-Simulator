import { auth, db, collection, query, where, getDocs, doc, updateDoc, onSnapshot, addDoc, serverTimestamp, orderBy, getDoc } from './firebase-config.js';
import { requireRole, initAuth, getCurrentUser } from './auth.js';

// Initialize authentication
initAuth();

// Ensure user is authenticated and has trainer role
requireRole('trainer');

// Global variables
let currentSubmissionId = null;
let currentSubmissionStatus = null;
let currentTab = 'active';

// DOM elements
const loadingIndicator = document.getElementById('loading-indicator');
const activeTab = document.getElementById('active-tab');
const archivedTab = document.getElementById('archived-tab');
const activeAssessmentsContainer = document.getElementById('active-assessments-container');
const archivedAssessmentsContainer = document.getElementById('archived-assessments-container');
const assessmentDetail = document.getElementById('assessment-detail');
const backToListButton = document.getElementById('back-to-list');
const activeSearchInput = document.getElementById('active-search-input');
const archivedSearchInput = document.getElementById('archived-search-input');

// Modal elements
const confirmModal = document.getElementById('confirm-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalConfirm = document.getElementById('modal-confirm');
const modalCancel = document.getElementById('modal-cancel');
const closeModalButton = document.querySelector('.close-modal');

// Tab switching functionality
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        // Update active tab button
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');
        
        // Show corresponding tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const tabName = button.getAttribute('data-tab');
        document.getElementById(`${tabName}-tab`).classList.add('active');
        currentTab = tabName;
        
        // If we're on the assessment detail view, go back to the list
        if (assessmentDetail.style.display !== 'none') {
            showAssessmentsList();
        }
        
        // Load appropriate submissions
        loadSubmissions(tabName);
    });
});

// Modal functionality
function showModal(title, message, confirmAction) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    confirmModal.style.display = 'block';
    
    // Remove previous event listeners
    const newModalConfirm = modalConfirm.cloneNode(true);
    modalConfirm.parentNode.replaceChild(newModalConfirm, modalConfirm);
    
    // Add new event listener
    document.getElementById('modal-confirm').addEventListener('click', () => {
        confirmAction();
        confirmModal.style.display = 'none';
    });
}

// Close modal when clicking the X or Cancel
closeModalButton.onclick = () => {
    confirmModal.style.display = 'none';
};

modalCancel.onclick = () => {
    confirmModal.style.display = 'none';
};

// Close modal when clicking outside
window.onclick = (event) => {
    if (event.target === confirmModal) {
        confirmModal.style.display = 'none';
    }
};

// Load submissions based on status
async function loadSubmissions(status = 'active') {
    loadingIndicator.style.display = 'block';
    
    const container = status === 'active' ? 
        activeAssessmentsContainer : 
        archivedAssessmentsContainer;
        
    container.innerHTML = '';
    
    try {
        // Create a query to get submissions with the specified status
        const assessmentsRef = collection(db, 'assessments');
        const q = query(
            assessmentsRef, 
            where("status", "==", status === 'active' ? 'submitted' : 'archived'),
            where("submitted", "==", true)
        );
        
        const snapshot = await getDocs(q);
        
        loadingIndicator.style.display = 'none';
        
        if (snapshot.empty) {
            container.innerHTML = `<div class="info-message">No ${status} submissions found.</div>`;
            return;
        }
        
        let submissionsHTML = '';
        snapshot.forEach((doc) => {
            const submission = doc.data();
            submission.id = doc.id;
            
            const submissionDate = new Date(submission.submittedAt.seconds * 1000).toLocaleDateString();
            const studentEmail = submission.userEmail || 'No email provided';
            
            submissionsHTML += `
                <div class="assessment-card" id="submission-${submission.id}">
                    <div class="assessment-card-header">
                        <div class="assessment-type">Farm Budget Assessment</div>
                        <div class="assessment-duration">${submissionDate}</div>
                    </div>
                    <h3>${studentEmail}</h3>
                    <p>Farm Type: ${submission.budget?.farmType || 'Not specified'}</p>
                    <div class="assessment-actions">
                        <button class="btn" onclick="viewSubmission('${submission.id}')">Review</button>
                        ${status === 'active' ? 
                            `<button class="btn btn-warning" onclick="archiveSubmission('${submission.id}')">Archive</button>
                            <button class="btn btn-danger" onclick="deleteSubmission('${submission.id}')">Delete</button>` : 
                            `<button class="btn btn-success" onclick="restoreSubmission('${submission.id}')">Restore</button>
                            <button class="btn btn-danger" onclick="deleteSubmission('${submission.id}')">Delete</button>`
                        }
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = submissionsHTML;
    } catch (error) {
        console.error("Error loading submissions:", error);
        loadingIndicator.style.display = 'none';
        container.innerHTML = `<div class="error-message">Error loading submissions: ${error.message}</div>`;
    }
}

// View a submission
async function viewSubmission(submissionId) {
    loadingIndicator.style.display = 'block';
    assessmentDetail.style.display = 'none';
    
    try {
        const submissionRef = doc(db, 'assessments', submissionId);
        const submissionDoc = await getDoc(submissionRef);
        
        if (!submissionDoc.exists()) {
            throw new Error("Submission not found");
        }
        
        const submission = submissionDoc.data();
        submission.id = submissionDoc.id;
        
        // Store the current submission ID and status
        currentSubmissionId = submissionId;
        currentSubmissionStatus = submission.status || 'submitted';
        
        // Fill in submission details
        document.getElementById('student-email').textContent = submission.userEmail || 'No email provided';
        document.getElementById('submission-date').textContent = new Date(submission.submittedAt.seconds * 1000).toLocaleString();
        document.getElementById('submission-status').textContent = currentSubmissionStatus.charAt(0).toUpperCase() + currentSubmissionStatus.slice(1);
        
        // Show appropriate action buttons
        document.getElementById('active-actions').style.display = currentSubmissionStatus === 'submitted' ? 'block' : 'none';
        document.getElementById('archived-actions').style.display = currentSubmissionStatus === 'archived' ? 'block' : 'none';
        
        // Fill in budget info
        document.getElementById('farm-type').textContent = submission.budget?.farmType || 'Not specified';
        document.getElementById('budget-period').textContent = submission.budget?.budgetPeriod || 'Not specified';
        
        // Fill in income items
        const incomeItemsBody = document.getElementById('income-items-body');
        incomeItemsBody.innerHTML = '';

        if (submission.budget?.incomeItems && submission.budget.incomeItems.length > 0) {
            submission.budget.incomeItems.forEach(item => {
                const row = document.createElement('tr');
                
                const nameCell = document.createElement('td');
                nameCell.textContent = item.name || 'Unnamed item';
                row.appendChild(nameCell);
                
                const quantityCell = document.createElement('td');
                quantityCell.textContent = item.quantity || '1';
                row.appendChild(quantityCell);
                
                const priceCell = document.createElement('td');
                const price = parseFloat(item.price || 0);
                priceCell.textContent = `$${price.toFixed(2)}`;
                row.appendChild(priceCell);
                
                const amountCell = document.createElement('td');
                const amount = parseFloat(item.amount);
                amountCell.textContent = `$${amount.toFixed(2)}`;
                row.appendChild(amountCell);
                
                incomeItemsBody.appendChild(row);
            });
        } else {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 4; // Updated colspan to 4
            cell.textContent = 'No income items found';
            cell.style.textAlign = 'center';
            row.appendChild(cell);
            incomeItemsBody.appendChild(row);
        }

        // Fill in expense items
        const expenseItemsBody = document.getElementById('expense-items-body');
        expenseItemsBody.innerHTML = '';

        if (submission.budget?.expenseItems && submission.budget.expenseItems.length > 0) {
            submission.budget.expenseItems.forEach(item => {
                const row = document.createElement('tr');
                
                const nameCell = document.createElement('td');
                nameCell.textContent = item.name || 'Unnamed item';
                row.appendChild(nameCell);
                
                const quantityCell = document.createElement('td');
                quantityCell.textContent = item.quantity || '1';
                row.appendChild(quantityCell);
                
                const priceCell = document.createElement('td');
                const price = parseFloat(item.price || 0);
                priceCell.textContent = `$${price.toFixed(2)}`;
                row.appendChild(priceCell);
                
                const amountCell = document.createElement('td');
                const amount = parseFloat(item.amount);
                amountCell.textContent = `$${amount.toFixed(2)}`;
                row.appendChild(amountCell);
                
                expenseItemsBody.appendChild(row);
            });
        } else {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 4; // Updated colspan to 4
            cell.textContent = 'No expense items found';
            cell.style.textAlign = 'center';
            row.appendChild(cell);
            expenseItemsBody.appendChild(row);
        }
        
        // Update totals
        const totalIncome = submission.budget?.totalIncome || 0;
        const totalExpenses = submission.budget?.totalExpenses || 0;
        const netResult = submission.budget?.netResult || 0;
        
        document.getElementById('total-income').textContent = `$${totalIncome.toFixed(2)}`;
        document.getElementById('total-expenses').textContent = `$${totalExpenses.toFixed(2)}`;
        
        const netResultElement = document.getElementById('net-result');
        netResultElement.textContent = `$${netResult.toFixed(2)}`;
        netResultElement.className = netResult >= 0 ? 'positive' : 'negative';
        
        // Fill in student answers
        const answersContainer = document.getElementById('answers-container');
        answersContainer.innerHTML = '';
        
        if (submission.answers) {
            const answerKeys = Object.keys(submission.answers).sort();
            
            if (answerKeys.length > 0) {
                answerKeys.forEach((key, index) => {
                    const answerDiv = document.createElement('div');
                    answerDiv.className = 'student-answer';
                    
                    const questionNumber = key.replace('question', '');
                    
                    answerDiv.innerHTML = `
                        <h4>Question ${questionNumber}</h4>
                        <div class="answer-text">${submission.answers[key]}</div>
                    `;
                    
                    answersContainer.appendChild(answerDiv);
                });
            } else {
                answersContainer.innerHTML = '<p>No answers provided</p>';
            }
        } else {
            answersContainer.innerHTML = '<p>No answers provided</p>';
        }
        
        // Load comments
        await loadComments(submissionId);
        
        // Show the assessment detail view
        loadingIndicator.style.display = 'none';
        assessmentDetail.style.display = 'block';
        
        // Scroll to top
        window.scrollTo(0, 0);
    } catch (error) {
        console.error("Error viewing submission:", error);
        loadingIndicator.style.display = 'none';
        alert(`Error viewing submission: ${error.message}`);
    }
}

// Load comments for a submission
async function loadComments(submissionId) {
    const commentsContainer = document.getElementById('comments-container');
    commentsContainer.innerHTML = '<p>Loading comments...</p>';
    
    try {
        const commentsRef = collection(db, 'assessments', submissionId, 'comments');
        const q = query(commentsRef, orderBy('timestamp', 'desc'));
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            commentsContainer.innerHTML = '<p>No comments yet.</p>';
            return;
        }
        
        let commentsHTML = '';
        snapshot.forEach(doc => {
            const comment = doc.data();
            const date = comment.timestamp ? 
                new Date(comment.timestamp.seconds * 1000).toLocaleString() : 
                'Date unknown';
            
            commentsHTML += `
                <div class="comment">
                    <div class="comment-header">
                        <strong>${comment.trainerName || 'Trainer'}</strong>
                        <span>${date}</span>
                    </div>
                    <div class="comment-body">
                        ${comment.text}
                    </div>
                </div>
            `;
        });
        
        commentsContainer.innerHTML = commentsHTML;
    } catch (error) {
        console.error("Error loading comments:", error);
        commentsContainer.innerHTML = `<p>Error loading comments: ${error.message}</p>`;
    }
}

// Add a comment to a submission
async function addComment() {
    const commentText = document.getElementById('new-comment').value.trim();
    
    if (!commentText) {
        alert('Please enter a comment');
        return;
    }
    
    try {
        const user = await getCurrentUser();
        
        const commentsRef = collection(db, 'assessments', currentSubmissionId, 'comments');
        await addDoc(commentsRef, {
            text: commentText,
            trainerId: user.uid,
            trainerName: user.displayName || user.email,
            timestamp: serverTimestamp()
        });
        
        // Clear the comment input
        document.getElementById('new-comment').value = '';
        
        // Reload comments
        await loadComments(currentSubmissionId);
    } catch (error) {
        console.error("Error adding comment:", error);
        alert(`Error adding comment: ${error.message}`);
    }
}

// Show the assessments list
function showAssessmentsList() {
    assessmentDetail.style.display = 'none';
    document.getElementById(currentTab + '-tab').classList.add('active');
    currentSubmissionId = null;
}

// Archive a submission
async function archiveSubmission(submissionId) {
    showModal(
        "Archive Submission", 
        "Are you sure you want to archive this submission? It will be moved to the Archived tab.",
        async () => {
            try {
                const submissionRef = doc(db, 'assessments', submissionId);
                await updateDoc(submissionRef, {
                    status: 'archived'
                });
                console.log("Submission archived successfully");
                
                // If we're viewing this submission, update the UI
                if (currentSubmissionId === submissionId) {
                    showAssessmentsList();
                }
            } catch (error) {
                console.error("Error archiving submission:", error);
                alert(`Error archiving submission: ${error.message}`);
            }
        }
    );
}

// Restore a submission from archived
async function restoreSubmission(submissionId) {
    showModal(
        "Restore Submission", 
        "Are you sure you want to restore this submission? It will be moved back to Active submissions.",
        async () => {
            try {
                const submissionRef = doc(db, 'assessments', submissionId);
                await updateDoc(submissionRef, {
                    status: 'submitted'
                });
                console.log("Submission restored successfully");
                
                // If we're viewing this submission, update the UI
                if (currentSubmissionId === submissionId) {
                    showAssessmentsList();
                }
            } catch (error) {
                console.error("Error restoring submission:", error);
                alert(`Error restoring submission: ${error.message}`);
            }
        }
    );
}

// Delete a submission (mark as deleted)
async function deleteSubmission(submissionId) {
    showModal(
        "Delete Submission", 
        "Are you sure you want to delete this submission? This action can be undone by a database administrator.",
        async () => {
            try {
                const submissionRef = doc(db, 'assessments', submissionId);
                await updateDoc(submissionRef, {
                    status: 'deleted'
                });
                console.log("Submission marked as deleted successfully");
                
                // If we're viewing this submission, update the UI
                if (currentSubmissionId === submissionId) {
                    showAssessmentsList();
                }
            } catch (error) {
                console.error("Error deleting submission:", error);
                alert(`Error deleting submission: ${error.message}`);
            }
        }
    );
}

// Search functionality
function setupSearch() {
    activeSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterSubmissions(activeAssessmentsContainer, searchTerm);
    });
    
    archivedSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterSubmissions(archivedAssessmentsContainer, searchTerm);
    });
}

function filterSubmissions(container, searchTerm) {
    const cards = container.querySelectorAll('.assessment-card');
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load active submissions initially
    loadSubmissions('active');
    
    // Set up search functionality
    setupSearch();
    
    // Back to list button
    backToListButton.addEventListener('click', showAssessmentsList);
    
    // Add comment button
    document.getElementById('add-comment').addEventListener('click', addComment);
    
    // Archive button in detail view
    document.getElementById('archive-submission').addEventListener('click', () => {
        archiveSubmission(currentSubmissionId);
    });
    
    // Delete button in detail view
    document.getElementById('delete-submission').addEventListener('click', () => {
        deleteSubmission(currentSubmissionId);
    });
    
    // Restore button in detail view
    document.getElementById('restore-submission').addEventListener('click', () => {
        restoreSubmission(currentSubmissionId);
    });
    
    // Delete archived button in detail view
    document.getElementById('delete-archived-submission').addEventListener('click', () => {
        deleteSubmission(currentSubmissionId);
    });
});

// Make functions available globally for onclick handlers
window.viewSubmission = viewSubmission;
window.archiveSubmission = archiveSubmission;
window.restoreSubmission = restoreSubmission;
window.deleteSubmission = deleteSubmission;