import { auth, db, collection, query, activeAssessmentRef, where, getDocs, doc, updateDoc, onSnapshot, addDoc, serverTimestamp, orderBy, getDoc, arrayUnion } from './firebase-config.js';
import { requireRole, initAuth, getCurrentUser } from './auth.js';

// Initialize authentication
initAuth();

// Ensure user is authenticated and has trainer role
requireRole('trainer');

const submissionsRef = collection(db, 'submissions');

// Global variables
let currentSubmissionId = null;
let currentSubmissionStatus = null;
let currentTab = 'active';
let assessmentFilter = '';

// DOM elements
const loadingIndicator = document.getElementById('loading-indicator');
const activeTab = document.getElementById('active-tab');
const finalisedTab = document.getElementById('finalised-tab');
const activeAssessmentsContainer = document.getElementById('active-assessments-container');
const finalisedAssessmentsContainer = document.getElementById('finalised-assessments-container');
const assessmentDetail = document.getElementById('assessment-detail');
const backToListButton = document.getElementById('back-to-list');
const activeSearchInput = document.getElementById('active-search-input');
const finalisedSearchInput = document.getElementById('finalised-search-input');

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
    
    // Safer approach to handling event listeners
    try {
        // First, remove existing onclick handler
        modalConfirm.onclick = null;
        
        // Create a new fresh reference to ensure we have the element
        const confirmButton = document.getElementById('modal-confirm');
        if (confirmButton) {
            confirmButton.onclick = () => {
                confirmAction();
                confirmModal.style.display = 'none';
            };
        } else {
            // If we can't find the button, add a direct listener to modalConfirm
            modalConfirm.addEventListener('click', () => {
                confirmAction();
                confirmModal.style.display = 'none';
            });
        }
    } catch (error) {
        console.error("Error setting up modal:", error);
        // Last resort fallback
        if (confirm(`${title}\n\n${message}`)) {
            confirmAction();
        }
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
async function loadSubmissions(status = 'active') {
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
    
    const container = status === 'active' ? 
        activeAssessmentsContainer : 
        finalisedAssessmentsContainer;
        
    if (!container) {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        return;
    }
    
    container.innerHTML = '';
    
    try {
        // Create a query to get submissions with the specified status
        // Make sure we're using the correct collection
        let q;
        
        // Dynamic query based on status and filter
        if (status === 'active') {
            if (assessmentFilter) {
                q = query(
                    submissionsRef,
                    where("status", "in", ["submitted", "feedback_provided"]),
                    where("assessmentId", "==", assessmentFilter)
                );
            } else {
                q = query(
                    submissionsRef,
                    where("status", "in", ["submitted", "feedback_provided"])
                );
            }
        } else {
            if (assessmentFilter) {
                q = query(
                    submissionsRef,
                    where("status", "==", "finalised"),
                    where("assessmentId", "==", assessmentFilter)
                );
            } else {
                q = query(
                    submissionsRef,
                    where("status", "==", "finalised")
                );
            }
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
            // Get active assessment ID ONCE at the beginning
            let activeAssessmentId = null;
            try {
                const activeDoc = await getDoc(activeAssessmentRef);
                if (activeDoc.exists()) {
                    activeAssessmentId = activeDoc.data().assessmentId;
                    console.log("Active assessment ID:", activeAssessmentId);
                } else {
                    console.log("No active assessment found");
                }
            } catch (error) {
                console.error("Error getting active assessment:", error);
            }

            // Group submissions by student
            const studentSubmissions = {};
            
            // Process each submission
            for (const docSnapshot of snapshot.docs) {
                const submission = docSnapshot.data();
                submission.id = docSnapshot.id;
                
                // Get student info
                const userId = submission.userId;
                if (!userId) continue;
                
                // Initialize student group if not exists
                if (!studentSubmissions[userId]) {
                    studentSubmissions[userId] = {
                        info: {
                            name: '',
                            email: submission.userEmail || 'No email'
                        },
                        submissions: []
                    };
                    
                    // Try to get student name
                    try {
                        const userDoc = await getDoc(doc(db, 'users', userId));
                        if (userDoc.exists()) {
                            studentSubmissions[userId].info.name = userDoc.data().fullName || '';
                        }
                    } catch (error) {
                        console.error("Error fetching user data:", error);
                    }
                }
                
                const assessmentTitle = submission.assessmentTitle || 'Assessment';
                submission.assessmentTitle = assessmentTitle;
                
                // Add to student's submissions
                studentSubmissions[userId].submissions.push(submission);
            }
            
            // Build HTML by student groups
            let submissionsHTML = '';
            
            // Sort students alphabetically
            const sortedStudentIds = Object.keys(studentSubmissions).sort((a, b) => {
                const nameA = studentSubmissions[a].info.name.toLowerCase() || studentSubmissions[a].info.email.toLowerCase();
                const nameB = studentSubmissions[b].info.name.toLowerCase() || studentSubmissions[b].info.email.toLowerCase();
                return nameA.localeCompare(nameB);
            });
            
            sortedStudentIds.forEach(userId => {
                const student = studentSubmissions[userId];
                const studentDisplayName = student.info.name || 'Student';
                const studentEmail = student.info.email;
                
                submissionsHTML += `
                    <div class="student-group" style="margin-bottom: 30px;">
                        <div class="student-header" style="padding: 10px; background-color: #f0f0f0; margin-bottom: 10px; border-radius: 4px;">
                            <h3>${studentDisplayName} (${studentEmail})</h3>
                        </div>
                        <div class="student-submissions" style="padding-left: 10px;">
                `;
                
                // Add each submission for this student
                student.submissions.forEach(submission => {
                    const submissionDate = submission.submittedAt ? 
                        new Date(submission.submittedAt.seconds * 1000).toLocaleDateString() : 
                        'Date unknown';
                    
                    // Use activeAssessmentId from above when building HTML
                    submissionsHTML += `
                        <div class="assessment-card" id="submission-${submission.id}">
                            <div class="assessment-card-header">
                                <div class="assessment-type">${submission.assessmentTitle || 'Assessment'}</div>
                                <div class="assessment-duration">${submissionDate}</div>
                            </div>
                            <p>Status: ${submission.status || 'Submitted'}</p>
                            <p>Assessment: ${submission.assessmentTitle || 'Not specified'}</p>
                            <div class="assessment-actions">
                                ${status === 'active' ? 
                                    `<button class="btn" onclick="viewSubmission('${submission.id}')">Review</button>
                                    <button class="btn btn-danger" onclick="deleteSubmission('${submission.id}')">Delete</button>` : 
                                    `<button class="btn btn-primary" onclick="viewPublicUrl('${submission.id}')">View Public URL</button>
                                    ${(submission.assessmentId === activeAssessmentId) ? 
                                        `<button class="btn" onclick="viewSubmission('${submission.id}')">Review</button>
                                        <button class="btn btn-warning" onclick="reopenSubmission('${submission.id}')">Reopen</button>` : 
                                        '<!-- Non-active assessment -->'
                                    }
                                    <button class="btn btn-danger" onclick="deleteSubmission('${submission.id}')">Delete</button>`
                                }
                            </div>
                        </div>
                    `;
                });
                
                submissionsHTML += `
                        </div>
                    </div>
                `;
            });
            
            // If no submissions are found
            if (sortedStudentIds.length === 0) {
                submissionsHTML = `<div class="info-message">No ${status} submissions found${assessmentFilter ? ' for the selected assessment' : ''}.</div>`;
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

// View public URL in new tab
async function viewPublicUrl(submissionId) {
    try {
        const submissionRef = doc(db, 'submissions', submissionId);
        const submissionDoc = await getDoc(submissionRef);
        
        if (!submissionDoc.exists()) {
            throw new Error("Submission not found");
        }
        
        const submission = submissionDoc.data();
        
        if (!submission.publicAccessToken) {
            throw new Error("This assessment doesn't have a public URL yet");
        }
        
        // Generate public URL using robust path construction
        const origin = window.location.origin;
        const pathParts = window.location.pathname.split('/');
        pathParts.pop(); // Remove current filename
        const basePath = pathParts.join('/');
        const publicUrl = `${origin}${basePath}/view-assessment.html?id=${submissionId}&token=${submission.publicAccessToken}`;
        
        // Open in new tab
        window.open(publicUrl, '_blank');
    } catch (error) {
        console.error("Error viewing public URL:", error);
        alert(`Error: ${error.message}`);
    }
}

// Make the function available globally
window.viewPublicUrl = viewPublicUrl;
// View a submission
async function viewSubmission(submissionId) {
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
    if (assessmentDetail) {
        assessmentDetail.style.display = 'none';
    }
    
    try {
        const submissionRef = doc(db, 'submissions', submissionId);
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
        const studentNameElement = document.getElementById('student-name');
        const studentEmailElement = document.getElementById('student-email');
        
        if (studentNameElement && studentEmailElement) {
            // Try to get the user's full name from the users collection
            try {
                if (submission.userId) {
                    const userDoc = await getDoc(doc(db, 'users', submission.userId));
                    if (userDoc.exists() && userDoc.data().fullName) {
                        studentNameElement.textContent = userDoc.data().fullName;
                    } else {
                        studentNameElement.textContent = 'Unknown';
                    }
                } else {
                    studentNameElement.textContent = 'Unknown';
                }
                
                // Set email separately
                studentEmailElement.textContent = submission.userEmail || 'No email provided';
            } catch (error) {
                console.error("Error fetching user details:", error);
                studentNameElement.textContent = 'Unknown';
                studentEmailElement.textContent = submission.userEmail || 'No email provided';
            }
        }
        
        // Get assessment title
        let assessmentTitle = 'Assessment';
        try {
            if (submission.assessmentId) {
                const assessmentDoc = await getDoc(doc(db, 'submissions', submission.assessmentId));
                if (assessmentDoc.exists()) {
                    assessmentTitle = assessmentDoc.data().title || 'Assessment';
                    
                    // Add assessment title to the UI
                    const assessmentTitleElement = document.createElement('p');
                    assessmentTitleElement.innerHTML = `<strong>Assessment:</strong> ${assessmentTitle}`;
                    
                    // Insert after student info
                    const studentInfoElement = document.querySelector('.assessment-meta');
                    if (studentInfoElement) {
                        studentInfoElement.appendChild(assessmentTitleElement);
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching assessment data:", error);
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
        const finalisedActions = document.getElementById('finalised-actions');
        
        if (feedbackActions) feedbackActions.style.display = 'none';
        if (finalisedActions) finalisedActions.style.display = 'none';
        
        if (currentSubmissionStatus === 'submitted' || currentSubmissionStatus === 'feedback_provided') {
            if (feedbackActions) feedbackActions.style.display = 'block';
        } else if (currentSubmissionStatus === 'finalised') {
            if (finalisedActions) finalisedActions.style.display = 'block';
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
        
        // Show grade field if not already finalised
        const gradeContainer = document.getElementById('grade-container');
        if (gradeContainer) {
            if (currentSubmissionStatus === 'finalised') {
                gradeContainer.innerHTML = `
                    <h3>Grade</h3>
                    <p><strong>Final Grade:</strong> ${submission.grade || 'Not graded'}</p>
                `;
            } else {
                gradeContainer.innerHTML = `
                    <h3>Grade</h3>
                    <div class="form-group">
                        <label for="assessment-grade">Select Grade:</label>
                        <select id="assessment-grade" class="grade-select">
                            <option value="">Select a grade...</option>
                            <option value="Satisfactory">Satisfactory</option>
                            <option value="Unsatisfactory">Unsatisfactory</option>
                        </select>
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
        const commentsRef = collection(db, 'submissions', submissionId, 'comments');
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

async function isCurrentActiveAssessment(assessmentId) {
    try {
        const activeDoc = await getDoc(activeAssessmentRef);
        return activeDoc.exists() && activeDoc.data().assessmentId === assessmentId;
    } catch (error) {
        console.error("Error checking active assessment:", error);
        return false;
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
                const submissionRef = doc(db, 'submissions', submissionId);
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
        const submissionRef = doc(db, 'submissions', currentSubmissionId);
        await updateDoc(submissionRef, {
            status: 'feedback_provided',
            feedback: commentText, // For backward compatibility
            feedbackHistory: arrayUnion(feedbackEntry)
        });
        
        // Add comment to comments collection
        const commentsRef = collection(db, 'submissions', currentSubmissionId, 'comments');
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

// finalise assessment with grade
async function finaliseAssessment() {
    const commentInput = document.getElementById('new-comment');
    const gradeSelect = document.getElementById('assessment-grade');
    
    if (!commentInput || !gradeSelect) return;
    
    const commentText = commentInput.value.trim();
    const grade = gradeSelect.value;
    
    if (!grade) {
        alert('Please select a grade (Satisfactory/Unsatisfactory) before finalizing the assessment.');
        return;
    }
    
    try {
        const user = await getCurrentUser();
        
        // Show loading indicator
        const finaliseButton = document.getElementById('finalise-assessment');
        if (finaliseButton) {
            finaliseButton.disabled = true;
            finaliseButton.textContent = 'Finalizing...';
        }
        
        // Generate a public access token (random string)
        const publicAccessToken = generateAccessToken();
        
        // Create feedback entry
        const feedbackEntry = {
            timestamp: new Date(),
            comments: commentText || 'Assessment finalised.',
            trainerEmail: user.email,
            trainerName: user.displayName || user.email,
            requestResubmission: false,
            grade: grade
        };
        
        // Get student name if available
        let studentName = '';
        try {
            if (currentSubmissionId) {
                const submissionDoc = await getDoc(doc(db, 'submissions', currentSubmissionId));
                if (submissionDoc.exists()) {
                    const submission = submissionDoc.data();
                    if (submission.userId) {
                        const userDoc = await getDoc(doc(db, 'users', submission.userId));
                        if (userDoc.exists()) {
                            studentName = userDoc.data().fullName || '';
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching student name:", error);
        }
        
        // Update assessment document
        const submissionRef = doc(db, 'submissions', currentSubmissionId);
        await updateDoc(submissionRef, {
            status: 'finalised',
            grade: grade,
            finalisedAt: new Date(),
            finalisedBy: user.uid,
            feedbackHistory: arrayUnion(feedbackEntry),
            publicAccessToken: publicAccessToken,
            studentName: studentName // Store student name for public view
        });
        
        // Generate public URL
        const origin = window.location.origin;
        const pathParts = window.location.pathname.split('/');
        pathParts.pop(); // Remove current filename (trainer-review.html)
        const basePath = pathParts.join('/');
        const publicUrl = `${origin}${basePath}/view-assessment.html?id=${currentSubmissionId}&token=${publicAccessToken}`;

        
        // Add comment to comments collection if provided
        if (commentText) {
            const commentsRef = collection(db, 'submissions', currentSubmissionId, 'comments');
            await addDoc(commentsRef, {
                text: commentText + `\n\nGrade: ${grade}`,
                trainerId: user.uid,
                trainerName: user.displayName || user.email,
                timestamp: serverTimestamp(),
                isFinalization: true,
                grade: grade
            });
        } else {
            // If no comment was provided, still add a system comment with the grade info
            const commentsRef = collection(db, 'submissions', currentSubmissionId, 'comments');
            await addDoc(commentsRef, {
                text: `Assessment has been graded.\n\nGrade: ${grade}`,
                trainerId: user.uid,
                trainerName: user.displayName || user.email,
                timestamp: serverTimestamp(),
                isFinalization: true,
                grade: grade
            });
        }
        
        // Show success message with public URL
        const message = `Assessment finalised successfully with grade: ${grade}\n\nPublic URL (copy to share):\n${publicUrl}`;
        alert(message);
        
        // Copy URL to clipboard
        try {
            await navigator.clipboard.writeText(publicUrl);
            console.log('Public URL copied to clipboard');
        } catch (err) {
            console.error('Failed to copy URL: ', err);
        }
        
        // Return to list view and reload submissions
        showAssessmentsList();
        loadSubmissions(currentTab);
        
    } catch (error) {
        console.error("Error finalizing assessment:", error);
        alert(`Error finalizing assessment: ${error.message}`);
    } finally {
        // Reset button
        const finaliseButton = document.getElementById('finalise-assessment');
        if (finaliseButton) {
            finaliseButton.disabled = false;
            finaliseButton.textContent = 'Grade & finalise Assessment';
        }
        
        // Clear comment input
        const commentInput = document.getElementById('new-comment');
        if (commentInput) {
            commentInput.value = '';
        }
    }
}

// Generate a random access token
function generateAccessToken() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 20; i++) {
        token += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return token;
}

// Copy public URL to clipboard
async function copyPublicUrl() {
    if (!currentSubmissionId) return;
    
    try {
        const submissionRef = doc(db, 'submissions', currentSubmissionId);
        const submissionDoc = await getDoc(submissionRef);
        
        if (!submissionDoc.exists()) {
            throw new Error("Submission not found");
        }
        
        const submission = submissionDoc.data();
        
        if (!submission.publicAccessToken) {
            throw new Error("This assessment doesn't have a public URL yet");
        }
        
        // Generate public URL - made more robust by not assuming exact filename
        const origin = window.location.origin;
        const pathParts = window.location.pathname.split('/');
        // Remove the last part (current filename) and add view-assessment.html
        pathParts.pop();
        const basePath = pathParts.join('/');
        const publicUrl = `${origin}${basePath}/view-assessment.html?id=${currentSubmissionId}&token=${submission.publicAccessToken}`;
        
        // Copy to clipboard
        await navigator.clipboard.writeText(publicUrl);
        
        alert("Public URL copied to clipboard!");
    } catch (error) {
        console.error("Error copying public URL:", error);
        alert(`Error: ${error.message}`);
    }
}

// Make the function available globally for event handlers
window.copyPublicUrl = copyPublicUrl;

// Reopen a finalised submission
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
                const submissionRef = doc(db, 'submissions', submissionId);
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
    
    if (finalisedSearchInput) {
        finalisedSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterSubmissions(finalisedAssessmentsContainer, searchTerm);
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

// Setup function for assessment filtering
function setupAssessmentFilter() {
    const reviewHeader = document.querySelector('.tab-container');
    
    // Create filter element
    const filterDiv = document.createElement('div');
    filterDiv.className = 'assessment-filter';
    filterDiv.style.marginBottom = '20px';
    filterDiv.style.marginTop = '10px';
    filterDiv.style.padding = '10px';
    filterDiv.style.backgroundColor = '#f9f9f9';
    filterDiv.style.borderRadius = '4px';
    filterDiv.innerHTML = `
        <div class="form-group">
            <label for="assessment-filter" style="margin-right: 10px; font-weight: bold;">Filter by Assessment:</label>
            <select id="assessment-filter" style="padding: 5px; min-width: 200px;">
                <option value="">All Assessments</option>
                <!-- Assessment options will be added dynamically -->
            </select>
        </div>
    `;
    
    // Insert after tab buttons
    reviewHeader.insertBefore(filterDiv, document.getElementById('active-tab'));
    
    // Load available assessments
    loadAssessmentOptions();
    
    // Add event listener
    const filterSelect = document.getElementById('assessment-filter');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            assessmentFilter = e.target.value;
            loadSubmissions(currentTab);
        });
    }
}

// Function to load assessment options
async function loadAssessmentOptions() {
    try {
        const filterSelect = document.getElementById('assessment-filter');
        if (!filterSelect) return;
        
        // Get all assessments from the correct collection
        const assessmentsSnapshot = await getDocs(collection(db, 'assessments'));
        
        // Create options
        let options = '<option value="">All Assessments</option>';
        
        // Get active assessment ID
        let activeAssessmentId = '';
        try {
            const activeDoc = await getDoc(activeAssessmentRef);
            if (activeDoc.exists()) {
                activeAssessmentId = activeDoc.data().assessmentId;
            }
        } catch (error) {
            console.error("Error getting active assessment:", error);
        }
        
        // Create a map of assessment IDs to titles
        const assessmentTitles = {};
        
        // First pass - collect all assessment titles
        assessmentsSnapshot.forEach(doc => {
            const assessment = doc.data();
            const id = doc.id;
            const title = assessment.title || 'Unnamed Assessment';
            assessmentTitles[id] = title;
        });
        
        // Now get submissions to count them
        const submissionsSnapshot = await getDocs(collection(db, 'submissions'));
        const submissionCounts = {};
        
        // Count submissions per assessment
        submissionsSnapshot.forEach(doc => {
            const submission = doc.data();
            const assessmentId = submission.assessmentId;
            if (assessmentId) {
                submissionCounts[assessmentId] = (submissionCounts[assessmentId] || 0) + 1;
            }
        });
        
        // Create dropdown options
        Object.keys(assessmentTitles).forEach(id => {
            const title = assessmentTitles[id];
            const count = submissionCounts[id] || 0;
            const isActive = id === activeAssessmentId;
            
            options += `<option value="${id}" ${isActive ? 'style="font-weight: bold;"' : ''}>
                ${title} (${count} submissions) ${isActive ? '(Active)' : ''}
            </option>`;
        });
        
        filterSelect.innerHTML = options;
    } catch (error) {
        console.error("Error loading assessment options:", error);
    }
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
            finalisedTab: !!finalisedTab,
            activeAssessmentsContainer: !!activeAssessmentsContainer,
            finalisedAssessmentsContainer: !!finalisedAssessmentsContainer,
            assessmentDetail: !!assessmentDetail
        });
        
        // Load active submissions initially
        console.log("Loading submissions...");
        loadSubmissions('active');
        
        // Set up search functionality
        console.log("Setting up search...");
        setupSearch();

        setupAssessmentFilter();

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
            
            // finalise assessment button
            if (e.target && e.target.id === 'finalise-assessment') {
                console.log("finalise assessment clicked");
                finaliseAssessment();
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

            // Copy Public URL button - ADD THIS NEW CONDITION
            if (e.target && e.target.id === 'copy-public-url') {
                console.log("Copy public URL clicked");
                copyPublicUrl();
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