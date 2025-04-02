import { auth, db, collection, query, where, getDocs, doc, updateDoc, onSnapshot, addDoc, serverTimestamp, orderBy, getDoc, arrayUnion } from './firebase-config.js';
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
const finalizedTab = document.getElementById('finalized-tab');
const activeAssessmentsContainer = document.getElementById('active-assessments-container');
const finalizedAssessmentsContainer = document.getElementById('finalized-assessments-container');
const assessmentDetail = document.getElementById('assessment-detail');
const backToListButton = document.getElementById('back-to-list');
const activeSearchInput = document.getElementById('active-search-input');
const finalizedSearchInput = document.getElementById('finalized-search-input');

// Modal elements
const confirmModal = document.getElementById('confirm-modal');
const modalTitle = confirmModal ? document.getElementById('modal-title') : null;
const modalMessage = confirmModal ? document.getElementById('modal-message') : null;
const modalConfirm = confirmModal ? document.getElementById('modal-confirm') : null;
const modalCancel = confirmModal ? document.getElementById('modal-cancel') : null;
const closeModalButton = confirmModal ? document.querySelector('.close-modal') : null;

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
        const tabContent = document.getElementById(`${tabName}-tab`);
        if (tabContent) {
            tabContent.classList.add('active');
        }
        currentTab = tabName;
        
        // If we're on the assessment detail view, go back to the list
        if (assessmentDetail && assessmentDetail.style.display !== 'none') {
            showAssessmentsList();
        }
        
        // Load appropriate submissions
        loadSubmissions(tabName);
    });
});

// Modal functionality
function showModal(title, message, confirmAction) {
    if (!confirmModal || !modalTitle || !modalMessage || !modalConfirm) return;
    
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    confirmModal.style.display = 'block';
    
    // Remove previous event listeners
    const newModalConfirm = modalConfirm.cloneNode(true);
    modalConfirm.parentNode.replaceChild(newModalConfirm, modalConfirm);
    
    // Add new event listener
    const newConfirmButton = document.getElementById('modal-confirm');
    if (newConfirmButton) {
        newConfirmButton.addEventListener('click', () => {
            confirmAction();
            confirmModal.style.display = 'none';
        });
    }
}

// Close modal when clicking the X or Cancel
if (closeModalButton) {
    closeModalButton.onclick = () => {
        if (confirmModal) confirmModal.style.display = 'none';
    };
}

if (modalCancel) {
    modalCancel.onclick = () => {
        if (confirmModal) confirmModal.style.display = 'none';
    };
}

// Close modal when clicking outside
window.onclick = (event) => {
    if (confirmModal && event.target === confirmModal) {
        confirmModal.style.display = 'none';
    }
};

// Load submissions based on status
// Load submissions based on status
async function loadSubmissions(status = 'active') {
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
    
    const container = status === 'active' ? 
        activeAssessmentsContainer : 
        finalizedAssessmentsContainer;
        
    if (!container) {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        return;
    }
    
    container.innerHTML = '';
    
    try {
        // Create a query to get submissions with the specified status
        const assessmentsRef = collection(db, 'assessments');
        let q;
        
        if (status === 'active') {
            // Active submissions include both submitted and feedback_provided
            q = query(
                assessmentsRef,
                where("submitted", "==", true),
                where("status", "in", ["submitted", "feedback_provided"])
            );
        } else {
            // Finalized tab shows finalized submissions
            q = query(
                assessmentsRef,
                where("submitted", "==", true),
                where("status", "==", "finalized")
            );
        }
        
        const snapshot = await getDocs(q);
        
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        
        if (snapshot.empty) {
            container.innerHTML = `<div class="info-message">No ${status} submissions found.</div>`;
            return;
        }
        
        // Process each submission and build HTML
        const processSubmissions = async () => {
            let submissionsHTML = '';
            
            // Process each submission
            for (const docSnapshot of snapshot.docs) {
                const submission = docSnapshot.data();
                submission.id = docSnapshot.id;
                
                const submissionDate = submission.submittedAt ? 
                    new Date(submission.submittedAt.seconds * 1000).toLocaleDateString() : 
                    'Date unknown';
                
                // Get student name from users collection if available
                let studentName = '';
                if (submission.userId) {
                    try {
                        const userDoc = await getDoc(doc(db, 'users', submission.userId));
                        if (userDoc.exists()) {
                            studentName = userDoc.data().fullName || '';
                        }
                    } catch (error) {
                        console.error("Error fetching user data:", error);
                    }
                }
                
                const studentEmail = submission.userEmail || 'No email provided';
                const studentDisplay = studentName ? 
                    `${studentName} (${studentEmail})` : 
                    studentEmail;
                
                submissionsHTML += `
                    <div class="assessment-card" id="submission-${submission.id}">
                        <div class="assessment-card-header">
                            <div class="assessment-type">Farm Budget Assessment</div>
                            <div class="assessment-duration">${submissionDate}</div>
                        </div>
                        <h3>${studentDisplay}</h3>
                        <p>Farm Type: ${submission.budget?.farmType || 'Not specified'}</p>
                        <div class="assessment-actions">
                            <button class="btn" onclick="viewSubmission('${submission.id}')">Review</button>
                            ${status === 'active' ? 
                                `<button class="btn btn-danger" onclick="deleteSubmission('${submission.id}')">Delete</button>` : 
                                `<button class="btn btn-warning" onclick="reopenSubmission('${submission.id}')">Reopen</button>
                                <button class="btn btn-danger" onclick="deleteSubmission('${submission.id}')">Delete</button>`
                            }
                        </div>
                    </div>
                `;
            }
            
            container.innerHTML = submissionsHTML;
        };
        
        // Execute the async processing
        await processSubmissions();
        
    } catch (error) {
        console.error("Error loading submissions:", error);
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        if (container) {
            container.innerHTML = `<div class="error-message">Error loading submissions: ${error.message}</div>`;
        }
    }
}

// View a submission
async function viewSubmission(submissionId) {
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
    if (assessmentDetail) {
        assessmentDetail.style.display = 'none';
    }
    
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
        currentSubmissionStatus = submission.status || 
                                 (submission.submitted ? 'submitted' : 'saved');
        
        // Fill in submission details
        const studentEmailElement = document.getElementById('student-email');
        if (studentEmailElement) {
            // Try to get the user's full name from the users collection
            try {
                const userDoc = await getDoc(doc(db, 'users', submission.userId));
                if (userDoc.exists() && userDoc.data().fullName) {
                    studentEmailElement.textContent = `${userDoc.data().fullName} (${submission.userEmail || 'No email provided'})`;
                } else {
                    studentEmailElement.textContent = submission.userEmail || 'No email provided';
                }
            } catch (error) {
                console.error("Error fetching user details:", error);
                studentEmailElement.textContent = submission.userEmail || 'No email provided';
            }
        }
        
        const submissionDateElement = document.getElementById('submission-date');
        if (submissionDateElement && submission.submittedAt) {
            submissionDateElement.textContent = new Date(submission.submittedAt.seconds * 1000).toLocaleString();
        }
        
        const submissionStatusElement = document.getElementById('submission-status');
        if (submissionStatusElement) {
            submissionStatusElement.textContent = capitalizeFirstLetter(currentSubmissionStatus);
        }
        
        // Show appropriate action buttons based on status
        const feedbackActions = document.getElementById('feedback-actions');
        const finalizedActions = document.getElementById('finalized-actions');
        
        if (feedbackActions) feedbackActions.style.display = 'none';
        if (finalizedActions) finalizedActions.style.display = 'none';
        
        if (currentSubmissionStatus === 'submitted' || currentSubmissionStatus === 'feedback_provided') {
            if (feedbackActions) feedbackActions.style.display = 'block';
        } else if (currentSubmissionStatus === 'finalized') {
            if (finalizedActions) finalizedActions.style.display = 'block';
        }
        
        // Fill in budget info
        const farmTypeElement = document.getElementById('farm-type');
        if (farmTypeElement) {
            farmTypeElement.textContent = submission.budget?.farmType || 'Not specified';
        }
        
        const budgetPeriodElement = document.getElementById('budget-period');
        if (budgetPeriodElement) {
            budgetPeriodElement.textContent = submission.budget?.budgetPeriod || 'Not specified';
        }
        
        // Fill in income items
        const incomeItemsBody = document.getElementById('income-items-body');
        if (incomeItemsBody) {
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
                    const amount = parseFloat(item.amount || 0);
                    amountCell.textContent = `$${amount.toFixed(2)}`;
                    row.appendChild(amountCell);
                    
                    incomeItemsBody.appendChild(row);
                });
            } else {
                const row = document.createElement('tr');
                const cell = document.createElement('td');
                cell.colSpan = 4;
                cell.textContent = 'No income items found';
                cell.style.textAlign = 'center';
                row.appendChild(cell);
                incomeItemsBody.appendChild(row);
            }
        }
        
        // Fill in expense items
        const expenseItemsBody = document.getElementById('expense-items-body');
        if (expenseItemsBody) {
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
                    const amount = parseFloat(item.amount || 0);
                    amountCell.textContent = `$${amount.toFixed(2)}`;
                    row.appendChild(amountCell);
                    
                    expenseItemsBody.appendChild(row);
                });
            } else {
                const row = document.createElement('tr');
                const cell = document.createElement('td');
                cell.colSpan = 4;
                cell.textContent = 'No expense items found';
                cell.style.textAlign = 'center';
                row.appendChild(cell);
                expenseItemsBody.appendChild(row);
            }
        }
        
        // Update totals
        const totalIncome = submission.budget?.totalIncome || 0;
        const totalExpenses = submission.budget?.totalExpenses || 0;
        const netResult = submission.budget?.netResult || 0;
        
        const totalIncomeElement = document.getElementById('total-income');
        if (totalIncomeElement) {
            totalIncomeElement.textContent = `$${totalIncome.toFixed(2)}`;
        }
        
        const totalExpensesElement = document.getElementById('total-expenses');
        if (totalExpensesElement) {
            totalExpensesElement.textContent = `$${totalExpenses.toFixed(2)}`;
        }
        
        const netResultElement = document.getElementById('net-result');
        if (netResultElement) {
            netResultElement.textContent = `$${netResult.toFixed(2)}`;
            netResultElement.className = netResult >= 0 ? 'positive' : 'negative';
        }
        
        // Fill in student answers
        const answersContainer = document.getElementById('answers-container');
        if (answersContainer) {
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
        }
        
        // Show grade field if not already finalized
        const gradeContainer = document.getElementById('grade-container');
        if (gradeContainer) {
            if (currentSubmissionStatus === 'finalized') {
                gradeContainer.innerHTML = `
                    <h3>Grade</h3>
                    <p><strong>Final Grade:</strong> ${submission.grade || 'Not graded'}</p>
                    <p><strong>Score:</strong> ${submission.score || '0'}/100</p>
                `;
            } else {
                gradeContainer.innerHTML = `
                    <h3>Grade</h3>
                    <div class="form-group">
                        <label for="assessment-grade">Select Grade:</label>
                        <select id="assessment-grade" class="grade-select">
                            <option value="">Select a grade...</option>
                            <option value="Pass">Pass</option>
                            <option value="Fail">Fail</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="assessment-score">Score (out of 100):</label>
                        <input type="number" id="assessment-score" min="0" max="100" value="0">
                    </div>
                `;
            }
        }
        
        // Load comments
        await loadComments(submissionId);
        
        // Show the assessment detail view
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        if (assessmentDetail) {
            assessmentDetail.style.display = 'block';
        }
        
        // Scroll to top
        window.scrollTo(0, 0);
    } catch (error) {
        console.error("Error viewing submission:", error);
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        alert(`Error viewing submission: ${error.message}`);
    }
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.replace('_', ' ').slice(1);
}

// Load comments for a submission
async function loadComments(submissionId) {
    const commentsContainer = document.getElementById('comments-container');
    if (!commentsContainer) return;
    
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

// Show the assessments list
function showAssessmentsList() {
    if (assessmentDetail) {
        assessmentDetail.style.display = 'none';
    }
    
    const tabContent = document.getElementById(currentTab + '-tab');
    if (tabContent) {
        tabContent.classList.add('active');
    }
    
    currentSubmissionId = null;
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
                
                // Reload submissions
                loadSubmissions(currentTab);
            } catch (error) {
                console.error("Error deleting submission:", error);
                alert(`Error deleting submission: ${error.message}`);
            }
        }
    );
}

// Add feedback and request resubmission
async function provideFeedback() {
    const commentInput = document.getElementById('new-comment');
    if (!commentInput) return;
    
    const commentText = commentInput.value.trim();
    
    if (!commentText) {
        alert('Please enter feedback comments before requesting resubmission.');
        return;
    }
    
    try {
        const user = await getCurrentUser();
        
        // Show loading indicator
        const feedbackButton = document.getElementById('provide-feedback');
        if (feedbackButton) {
            feedbackButton.disabled = true;
            feedbackButton.textContent = 'Submitting...';
        }
        
        // Create feedback entry
        const feedbackEntry = {
            timestamp: new Date(),
            comments: commentText,
            trainerEmail: user.email,
            trainerName: user.displayName || user.email,
            requestResubmission: true
        };
        
        // Update assessment document
        const submissionRef = doc(db, 'assessments', currentSubmissionId);
        await updateDoc(submissionRef, {
            status: 'feedback_provided',
            feedback: commentText, // For backward compatibility
            feedbackHistory: arrayUnion(feedbackEntry)
        });
        
        // Add comment to comments collection
        const commentsRef = collection(db, 'assessments', currentSubmissionId, 'comments');
        await addDoc(commentsRef, {
            text: commentText,
            trainerId: user.uid,
            trainerName: user.displayName || user.email,
            timestamp: serverTimestamp(),
            isResubmissionRequest: true
        });
        
        // Show success message
        alert('Feedback submitted successfully. The student will be notified to resubmit their assessment.');
        
        // Reload comments
        await loadComments(currentSubmissionId);
        
        // Update UI to reflect new status
        const submissionStatusElement = document.getElementById('submission-status');
        if (submissionStatusElement) {
            submissionStatusElement.textContent = 'Feedback Provided';
        }
        
    } catch (error) {
        console.error("Error providing feedback:", error);
        alert(`Error providing feedback: ${error.message}`);
    } finally {
        // Reset button
        const feedbackButton = document.getElementById('provide-feedback');
        if (feedbackButton) {
            feedbackButton.disabled = false;
            feedbackButton.textContent = 'Provide Feedback & Request Resubmission';
        }
        
        // Clear comment input
        const commentInput = document.getElementById('new-comment');
        if (commentInput) {
            commentInput.value = '';
        }
    }
}

// Finalize assessment with grade
async function finalizeAssessment() {
    const commentInput = document.getElementById('new-comment');
    const gradeSelect = document.getElementById('assessment-grade');
    const scoreInput = document.getElementById('assessment-score');
    
    if (!commentInput || !gradeSelect || !scoreInput) return;
    
    const commentText = commentInput.value.trim();
    const grade = gradeSelect.value;
    const score = parseInt(scoreInput.value) || 0;
    
    if (!grade) {
        alert('Please select a grade (Pass/Fail) before finalizing the assessment.');
        return;
    }
    
    if (score < 0 || score > 100) {
        alert('Please enter a valid score between 0 and 100.');
        return;
    }
    
    try {
        const user = await getCurrentUser();
        
        // Show loading indicator
        const finalizeButton = document.getElementById('finalize-assessment');
        if (finalizeButton) {
            finalizeButton.disabled = true;
            finalizeButton.textContent = 'Finalizing...';
        }
        
        // Create feedback entry
        const feedbackEntry = {
            timestamp: new Date(),
            comments: commentText || 'Assessment finalized.',
            trainerEmail: user.email,
            trainerName: user.displayName || user.email,
            requestResubmission: false,
            grade: grade,
            score: score
        };
        
        // Update assessment document
        const submissionRef = doc(db, 'assessments', currentSubmissionId);
        await updateDoc(submissionRef, {
            status: 'finalized',
            grade: grade,
            score: score,
            finalizedAt: new Date(),
            finalizedBy: user.uid,
            feedbackHistory: arrayUnion(feedbackEntry)
        });
        
        // Add comment to comments collection if provided
        if (commentText) {
            const commentsRef = collection(db, 'assessments', currentSubmissionId, 'comments');
            await addDoc(commentsRef, {
                text: commentText + `\n\nGrade: ${grade}\nScore: ${score}/100`,  // Include grade and score in comment
                trainerId: user.uid,
                trainerName: user.displayName || user.email,
                timestamp: serverTimestamp(),
                isFinalization: true,
                grade: grade,
                score: score
            });
        } else {
            // If no comment was provided, still add a system comment with the grade info
            const commentsRef = collection(db, 'assessments', currentSubmissionId, 'comments');
            await addDoc(commentsRef, {
                text: `Assessment has been graded.\n\nGrade: ${grade}\nScore: ${score}/100`,
                trainerId: user.uid,
                trainerName: user.displayName || user.email,
                timestamp: serverTimestamp(),
                isFinalization: true,
                grade: grade,
                score: score
            });
        }
        
        // Show success message
        alert(`Assessment finalized successfully with grade: ${grade} (${score}/100)`);
        
        // Return to list view and reload submissions
        showAssessmentsList();
        loadSubmissions(currentTab);
        
    } catch (error) {
        console.error("Error finalizing assessment:", error);
        alert(`Error finalizing assessment: ${error.message}`);
    } finally {
        // Reset button
        const finalizeButton = document.getElementById('finalize-assessment');
        if (finalizeButton) {
            finalizeButton.disabled = false;
            finalizeButton.textContent = 'Grade & Finalize Assessment';
        }
        
        // Clear comment input
        const commentInput = document.getElementById('new-comment');
        if (commentInput) {
            commentInput.value = '';
        }
    }
}

// Reopen a finalized submission
async function reopenSubmission(submissionId) {
    showModal(
        "Reopen Submission",
        "Are you sure you want to reopen this submission for resubmission? The student will be able to make changes.",
        async () => {
            try {
                const user = await getCurrentUser();
                
                // Create feedback entry
                const feedbackEntry = {
                    timestamp: new Date(),
                    comments: "Assessment reopened for resubmission.",
                    trainerEmail: user.email,
                    trainerName: user.displayName || user.email,
                    requestResubmission: true
                };
                
                // Update assessment document
                const submissionRef = doc(db, 'assessments', submissionId);
                await updateDoc(submissionRef, {
                    status: 'feedback_provided',
                    feedbackHistory: arrayUnion(feedbackEntry)
                });
                
                // Show success message
                alert('Assessment returned for resubmission.');
                
                // If we're viewing this submission, update the UI
                if (currentSubmissionId === submissionId) {
                    showAssessmentsList();
                }
                
                // Reload submissions
                loadSubmissions(currentTab);
            } catch (error) {
                console.error("Error reopening submission:", error);
                alert(`Error: ${error.message}`);
            }
        }
    );
}

// Search functionality
function setupSearch() {
    if (activeSearchInput) {
        activeSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterSubmissions(activeAssessmentsContainer, searchTerm);
        });
    }
    
    if (finalizedSearchInput) {
        finalizedSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterSubmissions(finalizedAssessmentsContainer, searchTerm);
        });
    }
}

function filterSubmissions(container, searchTerm) {
    if (!container) return;
    
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
    console.log("DOM fully loaded");
    
    try {
        // First, make sure all required elements exist
        console.log("Checking for required elements...");
        
        // Check for tab elements
        console.log("Tab elements:", {
            activeTab: !!activeTab,
            finalizedTab: !!finalizedTab,
            activeAssessmentsContainer: !!activeAssessmentsContainer,
            finalizedAssessmentsContainer: !!finalizedAssessmentsContainer,
            assessmentDetail: !!assessmentDetail
        });
        
        // Load active submissions initially
        console.log("Loading submissions...");
        loadSubmissions('active');
        
        // Set up search functionality
        console.log("Setting up search...");
        setupSearch();
        
        console.log("Setting up event listeners...");
        
        // Use event delegation for all buttons to avoid null reference errors
        document.addEventListener('click', function(e) {
            // Back to list button
            if (e.target && e.target.id === 'back-to-list') {
                console.log("Back to list clicked");
                showAssessmentsList();
            }
            
            // Provide feedback button
            if (e.target && e.target.id === 'provide-feedback') {
                console.log("Provide feedback clicked");
                provideFeedback();
            }
            
            // Finalize assessment button
            if (e.target && e.target.id === 'finalize-assessment') {
                console.log("Finalize assessment clicked");
                finalizeAssessment();
            }
            
            // Reopen assessment button
            if (e.target && e.target.id === 'reopen-assessment') {
                console.log("Reopen assessment clicked");
                reopenSubmission(currentSubmissionId);
            }
            
            // Delete submission button
            if (e.target && e.target.id === 'delete-submission') {
                console.log("Delete submission clicked");
                deleteSubmission(currentSubmissionId);
            }
        });
        
        console.log("Event listeners set up successfully");
        
    } catch (error) {
        console.error("Error in DOMContentLoaded event:", error);
    }
});

// Make functions available globally for onclick handlers
window.viewSubmission = viewSubmission;
window.deleteSubmission = deleteSubmission;
window.reopenSubmission = reopenSubmission;