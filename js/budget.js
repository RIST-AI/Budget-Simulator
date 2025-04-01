// js/budget.js
import { auth, onAuthStateChanged, signOut, db, doc, getDoc, collection, addDoc, updateDoc, query, where, getDocs } from './firebase-config.js';
import { requireAuth, updateNavigation } from './auth.js';

// Global variables
let currentUser = null;

// Initialize budget functionality
document.addEventListener('DOMContentLoaded', async function() {
    try {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.textContent = 'Loading...';
            loadingIndicator.className = ''; // Remove any spinner classes
        }
        // Initialize navigation first
        await updateNavigation();
        
        // Ensure user is authenticated
        currentUser = await requireAuth();
        
        // If user is null, the function will redirect and we should stop execution
        if (!currentUser) {
            return;
        }
        
        // Update user status
        const userStatusElement = document.getElementById('user-status');
        if (userStatusElement) {
            userStatusElement.innerHTML = 'Logged in as: ' + currentUser.email;
        }
        
        // Set up event listeners after we know the user is authenticated and navigation is loaded
        setupEventListeners();
        
        // Initial calculation
        updateTotals();
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
        const budgetContent = document.getElementById('budget-content');
        if (budgetContent) {
            budgetContent.style.display = 'block';
        }
    } catch (error) {
        console.error("Error initializing budget:", error);
    }
});

// Set up event listeners
function setupEventListeners() {
    // Logout functionality - UPDATED SELECTOR to match navigation.js
    const logoutLink = document.querySelector('.logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            signOut(auth).then(() => {
                window.location.href = 'index.html';
            }).catch((error) => {
                console.error("Error signing out:", error);
            });
        });
    } else {
        console.warn("Logout link not found in the DOM");
    }
    
    // Add income row
    const addIncomeButton = document.getElementById('add-income');
    if (addIncomeButton) {
        addIncomeButton.addEventListener('click', function() {
            const tbody = document.querySelector('#income-table tbody');
            if (!tbody) return;
            
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td><input type="text" placeholder="Income item"></td>
                <td><input type="number" placeholder="0.00"></td>
                <td><button class="btn-small btn-remove">Remove</button></td>
            `;
            
            tbody.appendChild(newRow);
            
            // Add event listener to the new remove button
            const removeButton = newRow.querySelector('.btn-remove');
            if (removeButton) {
                removeButton.addEventListener('click', function() {
                    tbody.removeChild(newRow);
                    updateTotals();
                });
            }
            
            // Add event listener to update totals when amount changes
            const numberInput = newRow.querySelector('input[type="number"]');
            if (numberInput) {
                numberInput.addEventListener('input', updateTotals);
            }
            
            // Focus on the new input
            const textInput = newRow.querySelector('input[type="text"]');
            if (textInput) {
                textInput.focus();
            }
        });
    }
    
    // Add expense row
    const addExpenseButton = document.getElementById('add-expense');
    if (addExpenseButton) {
        addExpenseButton.addEventListener('click', function() {
            const tbody = document.querySelector('#expense-table tbody');
            if (!tbody) return;
            
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td><input type="text" placeholder="Expense item"></td>
                <td><input type="number" placeholder="0.00"></td>
                <td><button class="btn-small btn-remove">Remove</button></td>
            `;
            
            tbody.appendChild(newRow);
            
            // Add event listener to the new remove button
            const removeButton = newRow.querySelector('.btn-remove');
            if (removeButton) {
                removeButton.addEventListener('click', function() {
                    tbody.removeChild(newRow);
                    updateTotals();
                });
            }
            
            // Add event listener to update totals when amount changes
            const numberInput = newRow.querySelector('input[type="number"]');
            if (numberInput) {
                numberInput.addEventListener('input', updateTotals);
            }
            
            // Focus on the new input
            const textInput = newRow.querySelector('input[type="text"]');
            if (textInput) {
                textInput.focus();
            }
        });
    }
    
    // Add event listeners to existing remove buttons
    document.querySelectorAll('.btn-remove').forEach(button => {
        if (button) {
            button.addEventListener('click', function() {
                const row = button.closest('tr');
                if (row && row.parentNode) {
                    row.parentNode.removeChild(row);
                    updateTotals();
                }
            });
        }
    });
    
    // Add event listeners to existing number inputs
    document.querySelectorAll('input[type="number"]').forEach(input => {
        if (input) {
            input.addEventListener('input', updateTotals);
        }
    });
    
    // Reset button
    const resetButton = document.getElementById('reset-budget');
    if (resetButton) {
        resetButton.addEventListener('click', function() {
            if (confirm('Are you sure you want to reset the budget? All data will be lost.')) {
                resetBudget();
            }
        });
    }
}

// Function to update totals
function updateTotals() {
    // Calculate income total
    let incomeTotal = 0;
    document.querySelectorAll('#income-table tbody input[type="number"]').forEach(input => {
        if (input) {
            incomeTotal += parseFloat(input.value || 0);
        }
    });
    
    // Calculate expense total
    let expenseTotal = 0;
    document.querySelectorAll('#expense-table tbody input[type="number"]').forEach(input => {
        if (input) {
            expenseTotal += parseFloat(input.value || 0);
        }
    });
    
    // Calculate net result
    const netResult = incomeTotal - expenseTotal;
    
    // Update display
    const totalIncomeElement = document.getElementById('total-income');
    if (totalIncomeElement) {
        totalIncomeElement.textContent = '$' + incomeTotal.toFixed(2);
    }
    
    const totalExpensesElement = document.getElementById('total-expenses');
    if (totalExpensesElement) {
        totalExpensesElement.textContent = '$' + expenseTotal.toFixed(2);
    }
    
    const summaryIncomeElement = document.getElementById('summary-income');
    if (summaryIncomeElement) {
        summaryIncomeElement.textContent = '$' + incomeTotal.toFixed(2);
    }
    
    const summaryExpensesElement = document.getElementById('summary-expenses');
    if (summaryExpensesElement) {
        summaryExpensesElement.textContent = '$' + expenseTotal.toFixed(2);
    }
    
    const netResultElement = document.getElementById('net-result');
    if (netResultElement) {
        netResultElement.textContent = '$' + netResult.toFixed(2);
        
        // Add class based on net result
        if (netResult > 0) {
            netResultElement.className = 'positive';
        } else if (netResult < 0) {
            netResultElement.className = 'negative';
        } else {
            netResultElement.className = '';
        }
    }
}

// Function to reset budget
function resetBudget() {
    const budgetNameElement = document.getElementById('budget-name');
    if (budgetNameElement) {
        budgetNameElement.value = '';
    }
    
    const budgetPeriodElement = document.getElementById('budget-period');
    if (budgetPeriodElement) {
        budgetPeriodElement.value = 'annual';
    }
    
    const farmTypeElement = document.getElementById('farm-type');
    if (farmTypeElement) {
        farmTypeElement.value = 'dairy';
    }
    
    // Reset income table
    const incomeBody = document.querySelector('#income-table tbody');
    if (incomeBody) {
        incomeBody.innerHTML = `
            <tr>
                <td><input type="text" placeholder="Income item"></td>
                <td><input type="number" placeholder="0.00"></td>
                <td><button class="btn-small btn-remove">Remove</button></td>
            </tr>
        `;
    }
    
    // Reset expense table
    const expenseBody = document.querySelector('#expense-table tbody');
    if (expenseBody) {
        expenseBody.innerHTML = `
            <tr>
                <td><input type="text" placeholder="Expense item"></td>
                <td><input type="number" placeholder="0.00"></td>
                <td><button class="btn-small btn-remove">Remove</button></td>
            </tr>
        `;
    }
    
    // Re-add event listeners
    document.querySelectorAll('.btn-remove').forEach(button => {
        if (button) {
            button.addEventListener('click', function() {
                const row = button.closest('tr');
                if (row && row.parentNode) {
                    row.parentNode.removeChild(row);
                    updateTotals();
                }
            });
        }
    });
    
    document.querySelectorAll('input[type="number"]').forEach(input => {
        if (input) {
            input.addEventListener('input', updateTotals);
        }
    });
    
    updateTotals();
    
    // Show status message
    showStatusMessage('Budget has been reset.', 'info');
}

// Function to show status message
function showStatusMessage(message, type = 'success') {
    // Check if status message element exists, if not create it
    let statusMessage = document.getElementById('status-message');
    if (!statusMessage) {
        statusMessage = document.createElement('div');
        statusMessage.id = 'status-message';
        
        // Insert at the top of the main content
        const mainContent = document.querySelector('main');
        if (mainContent && mainContent.firstChild) {
            mainContent.insertBefore(statusMessage, mainContent.firstChild);
        }
    }
    
    // Set message and type
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
    
    // Scroll to the message
    statusMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Hide the message after 5 seconds
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 5000);
}