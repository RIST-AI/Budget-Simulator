// js/budget.js
import { auth, onAuthStateChanged, signOut, db, collection, addDoc } from './js/firebase-config.js';
import { requireAuth } from './js/auth.js';

// Ensure user is authenticated
requireAuth();

// Initialize budget functionality
document.addEventListener('DOMContentLoaded', function() {
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
    
    // Add income row
    document.getElementById('add-income').addEventListener('click', function() {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td><input type="text" placeholder="Income item"></td>
            <td><input type="number" placeholder="0.00"></td>
            <td><button class="btn-small btn-remove">Remove</button></td>
        `;
        
        const tbody = document.querySelector('#income-table tbody');
        tbody.appendChild(newRow);
        
        // Add event listener to the new remove button
        newRow.querySelector('.btn-remove').addEventListener('click', function() {
            tbody.removeChild(newRow);
            updateTotals();
        });
        
        // Add event listener to update totals when amount changes
        newRow.querySelector('input[type="number"]').addEventListener('input', updateTotals);
    });
    
    // Add expense row
    document.getElementById('add-expense').addEventListener('click', function() {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td><input type="text" placeholder="Expense item"></td>
            <td><input type="number" placeholder="0.00"></td>
            <td><button class="btn-small btn-remove">Remove</button></td>
        `;
        
        const tbody = document.querySelector('#expense-table tbody');
        tbody.appendChild(newRow);
        
        // Add event listener to the new remove button
        newRow.querySelector('.btn-remove').addEventListener('click', function() {
            tbody.removeChild(newRow);
            updateTotals();
        });
        
        // Add event listener to update totals when amount changes
        newRow.querySelector('input[type="number"]').addEventListener('input', updateTotals);
    });
    
    // Add event listeners to existing remove buttons
    document.querySelectorAll('.btn-remove').forEach(button => {
        button.addEventListener('click', function() {
            const row = button.closest('tr');
            row.parentNode.removeChild(row);
            updateTotals();
        });
    });
    
    // Add event listeners to existing number inputs
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('input', updateTotals);
    });
    
    // Reset button
    document.getElementById('reset-budget').addEventListener('click', function() {
        if (confirm('Are you sure you want to reset the budget? All data will be lost.')) {
            document.getElementById('budget-name').value = '';
            document.getElementById('budget-period').value = 'annual';
            document.getElementById('farm-type').value = 'dairy';
            
            // Reset income table
            const incomeBody = document.querySelector('#income-table tbody');
            incomeBody.innerHTML = `
                <tr>
                    <td><input type="text" placeholder="Income item"></td>
                    <td><input type="number" placeholder="0.00"></td>
                    <td><button class="btn-small btn-remove">Remove</button></td>
                </tr>
            `;
            
            // Reset expense table
            const expenseBody = document.querySelector('#expense-table tbody');
            expenseBody.innerHTML = `
                <tr>
                    <td><input type="text" placeholder="Expense item"></td>
                    <td><input type="number" placeholder="0.00"></td>
                    <td><button class="btn-small btn-remove">Remove</button></td>
                </tr>
            `;
            
            // Re-add event listeners
            document.querySelectorAll('.btn-remove').forEach(button => {
                button.addEventListener('click', function() {
                    const row = button.closest('tr');
                    row.parentNode.removeChild(row);
                    updateTotals();
                });
            });
            
            document.querySelectorAll('input[type="number"]').forEach(input => {
                input.addEventListener('input', updateTotals);
            });
            
            updateTotals();
        }
    });
    
    // Save button
    document.getElementById('save-budget').addEventListener('click', async function() {
        const user = auth.currentUser;
        if (!user) {
            alert('You must be logged in to save a budget.');
            return;
        }
        
        // Show loading state
        const saveButton = document.getElementById('save-budget');
        const originalButtonText = saveButton.textContent;
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';
        
        try {
            // Collect budget data
            const budgetData = {
                name: document.getElementById('budget-name').value || 'Untitled Budget',
                period: document.getElementById('budget-period').value,
                farmType: document.getElementById('farm-type').value,
                createdAt: new Date(),
                userId: user.uid,
                userEmail: user.email,
                income: [],
                expenses: []
            };
            
            // Collect income items
            document.querySelectorAll('#income-table tbody tr').forEach(row => {
                const itemInput = row.querySelector('input[type="text"]');
                const amountInput = row.querySelector('input[type="number"]');
                
                if (itemInput.value && amountInput.value) {
                    budgetData.income.push({
                        item: itemInput.value,
                        amount: parseFloat(amountInput.value)
                    });
                }
            });
            
            // Collect expense items
            document.querySelectorAll('#expense-table tbody tr').forEach(row => {
                const itemInput = row.querySelector('input[type="text"]');
                const amountInput = row.querySelector('input[type="number"]');
                
                if (itemInput.value && amountInput.value) {
                    budgetData.expenses.push({
                        item: itemInput.value,
                        amount: parseFloat(amountInput.value)
                    });
                }
            });
            
            // Calculate totals
            budgetData.totalIncome = budgetData.income.reduce((sum, item) => sum + item.amount, 0);
            budgetData.totalExpenses = budgetData.expenses.reduce((sum, item) => sum + item.amount, 0);
            budgetData.netResult = budgetData.totalIncome - budgetData.totalExpenses;
            
            // Save to Firestore
            const docRef = await addDoc(collection(db, 'budgets'), budgetData);
            console.log("Budget saved with ID:", docRef.id);
            
            // Show success message
            alert(`Budget "${budgetData.name}" saved successfully!`);
            
            // Reset button
            saveButton.disabled = false;
            saveButton.textContent = originalButtonText;
            
        } catch (error) {
            console.error('Error saving budget:', error);
            alert('Error saving budget: ' + error.message);
            
            // Reset button
            saveButton.disabled = false;
            saveButton.textContent = originalButtonText;
        }
    });
    
    // Initial calculation
    updateTotals();
});

// Function to update totals
function updateTotals() {
    // Calculate income total
    let incomeTotal = 0;
    document.querySelectorAll('#income-table tbody input[type="number"]').forEach(input => {
        incomeTotal += parseFloat(input.value || 0);
    });
    
    // Calculate expense total
    let expenseTotal = 0;
    document.querySelectorAll('#expense-table tbody input[type="number"]').forEach(input => {
        expenseTotal += parseFloat(input.value || 0);
    });
    
    // Calculate net result
    const netResult = incomeTotal - expenseTotal;
    
    // Update display
    document.getElementById('total-income').textContent = '$' + incomeTotal.toFixed(2);
    document.getElementById('total-expenses').textContent = '$' + expenseTotal.toFixed(2);
    document.getElementById('summary-income').textContent = '$' + incomeTotal.toFixed(2);
    document.getElementById('summary-expenses').textContent = '$' + expenseTotal.toFixed(2);
    document.getElementById('net-result').textContent = '$' + netResult.toFixed(2);
    
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