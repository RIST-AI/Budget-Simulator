// js/auth.js

import { auth, onAuthStateChanged, signOut, db, doc, getDoc } from './firebase-config.js';

// Check if user is logged in and get their role
async function getCurrentUser() {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe(); // Stop listening immediately
      
      if (user) {
        try {
          // Get user role from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            resolve({
              uid: user.uid,
              email: user.email,
              role: userData.role,
              roles: userData.roles || [userData.role], // Support both role and roles fields
              fullName: userData.fullName || '',
              studentId: userData.studentId || '',
              // Add any other user properties you need
            });
          } else {
            resolve({ uid: user.uid, email: user.email, role: 'unknown', roles: ['unknown'] });
          }
        } catch (error) {
          console.error("Error getting user data:", error);
          resolve({ uid: user.uid, email: user.email, role: 'unknown', roles: ['unknown'] });
        }
      } else {
        resolve(null); // Not logged in
      }
    });
  });
}

// Redirect to login if not authenticated
async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    // Save the current URL to redirect back after login
    sessionStorage.setItem('redirectUrl', window.location.href);
    window.location.href = 'login.html';
    return null;
  }
  return user;
}

// Check if user has specific role and redirect if not
async function requireRole(requiredRoles) {
  const user = await requireAuth();
  if (!user) return null; // Already redirected to login
  
  if (!Array.isArray(requiredRoles)) {
    requiredRoles = [requiredRoles]; // Convert to array if single role
  }
  
  // Check if user has any of the required roles
  const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
  const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
  
  if (!hasRequiredRole) {
    // User doesn't have required role, redirect to appropriate dashboard
    if (userRoles.includes('student')) {
      window.location.href = 'student-dashboard.html';
    } else if (userRoles.includes('trainer')) {
      window.location.href = 'trainer-dashboard.html';
    } else {
      window.location.href = 'index.html';
    }
    return null;
  }
  
  return user;
}

// Handle logout
function logoutUser() {
  return signOut(auth).then(() => {
    window.location.href = 'login.html';
  });
}

// Update UI based on authentication state
// In auth.js, update the updateNavigation function:

// js/auth.js - Update the updateNavigation function

export async function updateNavigation() {
    const user = await getCurrentUser();
    
    // Update user status display
    const userStatusElement = document.getElementById('user-status');
    if (userStatusElement) {
        if (user) {
            userStatusElement.innerHTML = `
                <p>Logged in as: <strong>${user.email}</strong></p>
                <p class="user-role">${user.role || 'Student'}</p>
            `;
        } else {
            userStatusElement.innerHTML = `
                <p>Not logged in</p>
                <a href="login.html" class="btn-small">Login</a>
            `;
        }
    }
    
    // Show/hide trainer-only navigation items
    const trainerOnlyItems = document.querySelectorAll('.trainer-only');
    if (user && (user.role === 'trainer' || (user.roles && user.roles.includes('trainer')))) {
        // User is a trainer, show trainer-only items
        trainerOnlyItems.forEach(item => {
            item.style.display = 'block';
        });
    } else {
        // User is not a trainer, hide trainer-only items
        trainerOnlyItems.forEach(item => {
            item.style.display = 'none';
        });
    }
    
    // Show/hide logout link
    const logoutNavItem = document.getElementById('logout-nav-item');
    if (logoutNavItem) {
        if (user) {
            logoutNavItem.style.display = 'block';
        } else {
            logoutNavItem.style.display = 'none';
        }
    }
}
// Initialize authentication on page load
function initAuth() {
  document.addEventListener('DOMContentLoaded', async () => {
    await updateNavigation();
    
    // Set up logout functionality
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
      logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        logoutUser();
      });
    }
  });
}

// Auto-redirect to dashboard if already logged in (for login page)
async function redirectIfLoggedIn() {
  const user = await getCurrentUser();
  if (user) {
    // Get user roles as array
    const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
    
    if (userRoles.includes('student')) {
      window.location.href = 'student-dashboard.html';
    } else if (userRoles.includes('trainer')) {
      window.location.href = 'trainer-dashboard.html';
    } else {
      window.location.href = 'budget.html';
    }
    return true;
  }
  return false;
}

export { 
  getCurrentUser, 
  requireAuth, 
  requireRole,
  logoutUser,
  initAuth,
  redirectIfLoggedIn
};