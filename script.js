// Budget data structure
let budgetData = {
    timeframe: 'monthly',
    periods: 12,
    income: {
        crops: Array(12).fill(0),
        livestock: Array(12).fill(0),
        services: Array(12).fill(0),
        other: Array(12).fill(0)
    },
    expenses: {
        seeds: Array(12).fill(0),
        fertilizer: Array(12).fill(0),
        equipment: Array(12).fill(0),
        labor: Array(12).fill(0),
        utilities: Array(12).fill(0),
        insurance: Array(12).fill(0)
    }
};

// Initialize the budget with some sample data
function initializeBudget() {
    // Sample income data
    budgetData.income.crops = [0, 0, 5000, 2000, 0, 0, 8000, 10000, 5000, 0, 0, 0];
    budgetData.income.livestock = [2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000, 2000];
    budgetData.income.services = [500, 500, 500, 1000, 1000, 1500, 1500, 1500, 1000, 500, 500, 500];
    budgetData.income.other = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100];
    
    // Sample expense data
    budgetData.expenses.seeds = [2000, 3000, 1000, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    budgetData.expenses.fertilizer = [0, 1500, 1500, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    budgetData.expenses.equipment = [500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500];
    budgetData.expenses.labor = [800, 800, 1200, 1200, 1200, 1500, 2000, 2000, 1500, 1000, 800, 800];
    budgetData.expenses.utilities = [300, 300, 300, 300, 300, 400, 400, 400, 300, 300, 300, 300];
    budgetData.expenses.insurance = [0, 0, 0, 2000, 0, 0, 0, 0, 0, 0, 0, 0];
}

// Initialize the budget table
function initializeBudgetTable() {
    const table = document.getElementById('budget-table');
    if (!table) return; // Exit if we're not on the budget page
    
    // Add cells to each budget row
    const rows = document.querySelectorAll('.budget-row');
    rows.forEach(row => {
        const category = row.getAttribute('data-category');
        const item = row.getAttribute('data-item');
        
        // Add input cells for each period
        for (let i = 0; i < budgetData.periods; i++) {
            const cell = document.createElement('td');
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'budget-cell';
            input.min = '0';
            
            // Set the value from our budget data
            if (category === 'income') {
                input.value = budgetData.income[item][i];
            } else {
                input.value = budgetData.expenses[item][i];
            }
            
            // Add event listener to update the budget data when changed
            input.addEventListener('change', function() {
                if (category === 'income') {
                    budgetData.income[item][i] = parseFloat(this.value) || 0;
                } else {
                    budgetData.expenses[item][i] = parseFloat(this.value) || 0;
                }
                updateTotals();
            });
            
            cell.appendChild(input);
            row.appendChild(cell);
        }
        
        // Add total cell
        const totalCell = document.createElement('td');
        totalCell.className = 'row-total';
        totalCell.textContent = calculateRowTotal(category, item);
        row.appendChild(totalCell);
    });
    
    // Initialize total rows
    updateTotals();
}

// Calculate total for a row
function calculateRowTotal(category, item) {
    if (category === 'income') {
        return budgetData.income[item].reduce((sum, val) => sum + val, 0);
    } else {
        return budgetData.expenses[item].reduce((sum, val) => sum + val, 0);
    }
}

// Update all totals in the budget table
function updateTotals() {
    const table = document.getElementById('budget-table');
    if (!table) return;
    
    // Update row totals
    const rows = document.querySelectorAll('.budget-row');
    rows.forEach(row => {
        const category = row.getAttribute('data-category');
        const item = row.getAttribute('data-item');
        const totalCell = row.querySelector('.row-total');
        if (totalCell) {
            totalCell.textContent = calculateRowTotal(category, item).toFixed(2);
        }
    });
    
    // Update income total row
    const incomeTotalRow = document.getElementById('income-total-row');
    if (incomeTotalRow) {
        // Clear existing cells
        while (incomeTotalRow.children.length > 1) {
            incomeTotalRow.removeChild(incomeTotalRow.lastChild);
        }
        
        // Calculate and add period totals
        for (let i = 0; i < budgetData.periods; i++) {
            const periodTotal = Object.values(budgetData.income).reduce((sum, item) => sum + item[i], 0);
            const cell = document.createElement('td');
            cell.textContent = periodTotal.toFixed(2);
            incomeTotalRow.appendChild(cell);
        }
        
        // Add grand total
        const grandTotal = Object.values(budgetData.income).reduce(
            (sum, item) => sum + item.reduce((s, val) => s + val, 0), 0
        );
        const totalCell = document.createElement('td');
        totalCell.textContent = grandTotal.toFixed(2);
        incomeTotalRow.appendChild(totalCell);
    }
    
    // Update expense total row
    const expenseTotalRow = document.getElementById('expense-total-row');
    if (expenseTotalRow) {
        // Clear existing cells
        while (expenseTotalRow.children.length > 1) {
            expenseTotalRow.removeChild(expenseTotalRow.lastChild);
        }
        
        // Calculate and add period totals
        for (let i = 0; i < budgetData.periods; i++) {
            const periodTotal = Object.values(budgetData.expenses).reduce((sum, item) => sum + item[i], 0);
            const cell = document.createElement('td');
            cell.textContent = periodTotal.toFixed(2);
            expenseTotalRow.appendChild(cell);
        }
        
        // Add grand total
        const grandTotal = Object.values(budgetData.expenses).reduce(
            (sum, item) => sum + item.reduce((s, val) => s + val, 0), 0
        );
        const totalCell = document.createElement('td');
        totalCell.textContent = grandTotal.toFixed(2);
        expenseTotalRow.appendChild(totalCell);
    }
    
    // Update net profit row
    const netProfitRow = document.getElementById('net-profit-row');
    if (netProfitRow) {
        // Clear existing cells
        while (netProfitRow.children.length > 1) {
            netProfitRow.removeChild(netProfitRow.lastChild);
        }
        
        // Calculate and add period net profits
        for (let i = 0; i < budgetData.periods; i++) {
            const incomeTotal = Object.values(budgetData.income).reduce((sum, item) => sum + item[i], 0);
            const expenseTotal = Object.values(budgetData.expenses).reduce((sum, item) => sum + item[i], 0);
            const netProfit = incomeTotal - expenseTotal;
            
            const cell = document.createElement('td');
            cell.textContent = netProfit.toFixed(2);
            
            // Add color coding
            if (netProfit < 0) {
                cell.className = 'negative-variance';
            } else if (netProfit > 0) {
                cell.className = 'positive-variance';
            }
            
            netProfitRow.appendChild(cell);
        }
        
        // Add grand total net profit
        const incomeGrandTotal = Object.values(budgetData.income).reduce(
            (sum, item) => sum + item.reduce((s, val) => s + val, 0), 0
        );
        const expenseGrandTotal = Object.values(budgetData.expenses).reduce(
            (sum, item) => sum + item.reduce((s, val) => s + val, 0), 0
        );
        const netProfitTotal = incomeGrandTotal - expenseGrandTotal;
        
        const totalCell = document.createElement('td');
        totalCell.textContent = netProfitTotal.toFixed(2);
        
        // Add color coding
        if (netProfitTotal < 0) {
            totalCell.className = 'negative-variance';
        } else if (netProfitTotal > 0) {
            totalCell.className = 'positive-variance';
        }
        
        netProfitRow.appendChild(totalCell);
    }
}

// Change timeframe between monthly and quarterly
function changeTimeframe() {
    const timeframeSelect = document.getElementById('timeframe');
    if (!timeframeSelect) return;
    
    const newTimeframe = timeframeSelect.value;
    if (newTimeframe === budgetData.timeframe) return;
    
    budgetData.timeframe = newTimeframe;
    
    // Update periods
    if (newTimeframe === 'monthly') {
        budgetData.periods = 12;
        
        // Convert quarterly data to monthly (simple division)
        if (budgetData.periods === 4) {
            Object.keys(budgetData.income).forEach(item => {
                const quarterly = [...budgetData.income[item]];
                budgetData.income[item] = Array(12).fill(0).map((_, i) => quarterly[Math.floor(i/3)] / 3);
            });
            
            Object.keys(budgetData.expenses).forEach(item => {
                const quarterly = [...budgetData.expenses[item]];
                budgetData.expenses[item] = Array(12).fill(0).map((_, i) => quarterly[Math.floor(i/3)] / 3);
            });
        }
        
        // Update header labels
        const headers = document.getElementById('period-headers').children;
        const months = ['Item', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Total'];
        for (let i = 0; i < headers.length; i++) {
            headers[i].textContent = months[i];
        }
    } else {
        budgetData.periods = 4;
        
        // Convert monthly data to quarterly (simple aggregation)
        if (budgetData.periods === 12) {
            Object.keys(budgetData.income).forEach(item => {
                const monthly = [...budgetData.income[item]];
                budgetData.income[item] = [
                    monthly[0] + monthly[1] + monthly[2],
                    monthly[3] + monthly[4] + monthly[5],
                    monthly[6] + monthly[7] + monthly[8],
                    monthly[9] + monthly[10] + monthly[11]
                ];
            });
            
            Object.keys(budgetData.expenses).forEach(item => {
                const monthly = [...budgetData.expenses[item]];
                budgetData.expenses[item] = [
                    monthly[0] + monthly[1] + monthly[2],
                    monthly[3] + monthly[4] + monthly[5],
                    monthly[6] + monthly[7] + monthly[8],
                    monthly[9] + monthly[10] + monthly[11]
                ];
            });
        }
        
        // Update header labels
        const headers = document.getElementById('period-headers').children;
        const quarters = ['Item', 'Q1', 'Q2', 'Q3', 'Q4', 'Total'];
        for (let i = 0; i < headers.length; i++) {
            if (i < quarters.length) {
                headers[i].textContent = quarters[i];
            } else {
                headers[i].textContent = '';
            }
        }
    }
    
    // Rebuild the table
    const rows = document.querySelectorAll('.budget-row');
    rows.forEach(row => {
        // Remove all cells except the first one (item name)
        while (row.children.length > 1) {
            row.removeChild(row.lastChild);
        }
    });
    
    // Re-initialize the table
    initializeBudgetTable();
}

// Reset the budget to initial values
function resetBudget() {
    initializeBudget();
    
    // Update input values
    const rows = document.querySelectorAll('.budget-row');
    rows.forEach(row => {
        const category = row.getAttribute('data-category');
        const item = row.getAttribute('data-item');
        const inputs = row.querySelectorAll('input');
        
        inputs.forEach((input, i) => {
            if (category === 'income') {
                input.value = budgetData.income[item][i];
            } else {
                input.value = budgetData.expenses[item][i];
            }
        });
    });
    
    updateTotals();
}

// Save budget (in a real app, this would save to a server)
function saveBudget() {
    alert('Budget saved successfully!');
    // In a real application, this would send the data to a server
    console.log('Budget data:', budgetData);
}

// Apply scenario to the budget
function applyScenario(scenarioType) {
    switch(scenarioType) {
        case 'drought':
            // Reduce crop income by 30%
            for (let i = 0; i < budgetData.periods; i++) {
                budgetData.income.crops[i] *= 0.7;
                // But increase prices by 15%
                budgetData.income.crops[i] *= 1.15;
            }
            alert('Drought scenario applied: Crop yields reduced by 30%, but prices increased by 15%');
            break;
            
        case 'breakdown':
            // Add $5000 to equipment expense in current month (using month 3 for demo)
            budgetData.expenses.equipment[2] += 5000;
            alert('Equipment breakdown scenario applied: $5,000 added to equipment expenses in March');
            break;
            
        case 'market':
            // 20% decrease in all product prices for 3 months
            for (let i = 0; i < 3; i++) {
                budgetData.income.crops[i] *= 0.8;
                budgetData.income.livestock[i] *= 0.8;
            }
            alert('Market price drop scenario applied: 20% decrease in product prices for the next 3 months');
            break;
    }
    
    // Update the budget table with new values
    const rows = document.querySelectorAll('.budget-row');
    rows.forEach(row => {
        const category = row.getAttribute('data-category');
        const item = row.getAttribute('data-item');
        const inputs = row.querySelectorAll('input');
        
        inputs.forEach((input, i) => {
            if (category === 'income') {
                input.value = budgetData.income[item][i].toFixed(2);
            } else {
                input.value = budgetData.expenses[item][i].toFixed(2);
            }
        });
    });
    
    updateTotals();
}

// Check quiz answers
function checkQuizAnswers() {
    const quizAnswers = document.querySelectorAll('.quiz-answer');
    let allCorrect = true;
    
    quizAnswers.forEach(answer => {
        const selectedValue = answer.value;
        const correctValue = answer.getAttribute('data-correct');
        
        if (selectedValue === correctValue) {
            answer.style.borderColor = '#27ae60';
        } else if (selectedValue) {
            answer.style.borderColor = '#e74c3c';
            allCorrect = false;
        }
    });
    
    const feedbackElement = document.getElementById('quiz-feedback');
    if (feedbackElement) {
        if (allCorrect && quizAnswers.length > 0 && quizAnswers[0].value) {
            feedbackElement.textContent = 'Great job! All answers are correct.';
            feedbackElement.className = 'quiz-feedback correct';
        } else if (!allCorrect) {
            feedbackElement.textContent = 'Some answers are incorrect. Please try again.';
            feedbackElement.className = 'quiz-feedback incorrect';
        }
    }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeBudget();
    initializeBudgetTable();
});