// js/navigation.js
import { getCurrentUser } from './auth.js';

// Navigation items configuration
const navItems = {
  all: [
    { id: 'budget-nav-item', text: 'Budget Simulator', href: 'budget.html' },
    { id: 'logout-nav-item', text: 'Logout', href: '#', class: 'logout-link' }
  ],
  student: [
    { id: 'assessment-nav-item', text: 'Assessment', href: 'assessment.html' }
  ],
  trainer: [
    { id: 'review-nav-item', text: 'Review Assessments', href: 'trainer-review.html' },
    { id: 'edit-nav-item', text: 'Edit Assessment', href: 'assessment-editor.html' }
  ]
};

// Function to generate navigation HTML
export async function generateNavigation() {
  const user = await getCurrentUser();
  const navElement = document.querySelector('nav ul');
  
  if (!navElement) {
    console.error('Navigation element not found');
    return;
  }
  
  // Clear existing navigation
  navElement.innerHTML = '';
  
  // Add items for all users
  navItems.all.forEach(item => {
    if (item.id === 'logout-nav-item' && !user) {
      // Don't show logout if not logged in
      return;
    }
    addNavItem(navElement, item);
  });
  
  if (user) {
    // Get user roles
    const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
    const isTrainer = userRoles.includes('trainer');
    
    // Add role-specific items
    if (isTrainer) {
      navItems.trainer.forEach(item => addNavItem(navElement, item));
    } else {
      navItems.student.forEach(item => addNavItem(navElement, item));
    }
  }
  
  // Set active nav item based on current page
  setActiveNavItem();
  
  // Add event listener for logout
  const logoutLinks = document.querySelectorAll('.logout-link');
  logoutLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      // Import here to avoid circular dependency
      import('./auth.js').then(auth => {
        auth.logoutUser();
      });
    });
  });
}

// Helper function to add a nav item
function addNavItem(navElement, item) {
  const li = document.createElement('li');
  li.id = item.id;
  
  const a = document.createElement('a');
  a.href = item.href;
  a.textContent = item.text;
  
  if (item.class) {
    a.classList.add(item.class);
  }
  
  li.appendChild(a);
  navElement.appendChild(li);
}

// Set the active nav item based on current page
function setActiveNavItem() {
  const currentPage = window.location.pathname.split('/').pop();
  const navLinks = document.querySelectorAll('nav a');
  
  navLinks.forEach(link => {
    const linkPage = link.getAttribute('href');
    if (linkPage === currentPage) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', generateNavigation);