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

async function updateNavigation() {
    const user = await getCurrentUser();
    
    const loginItem = document.getElementById('login-nav-item');
    const logoutItem = document.getElementById('logout-nav-item');
    const userStatus = document.getElementById('user-status');
    const studentItems = document.querySelectorAll('.student-only');
    const trainerItems = document.querySelectorAll('.trainer-only');
    const dashboardLink = document.getElementById('dashboard-link');
    const authRequiredItems = document.querySelectorAll('.auth-required');
    
    if (user) {
      // User is logged in
      if (loginItem) loginItem.style.display = 'none';
      if (logoutItem) logoutItem.style.display = 'inline-block';
      if (userStatus) userStatus.innerHTML = `Logged in as: ${user.email}`;
      
      // Show all auth-required elements
      authRequiredItems.forEach(item => item.style.display = '');
      
      // Get user roles as array
      const userRoles = Array.isArray(user.roles) ? user.roles : [user.role];
      
      // Handle student items
      studentItems.forEach(item => {
        item.style.display = userRoles.includes('student') ? '' : 'none';
      });
      
      // Handle trainer items - IMPORTANT: explicitly set display:none for non-trainers
      trainerItems.forEach(item => {
        item.style.display = userRoles.includes('trainer') ? '' : 'none';
      });
      
      if (dashboardLink) {
        if (userRoles.includes('trainer')) {
          dashboardLink.href = 'trainer-dashboard.html';
        } else if (userRoles.includes('student')) {
          dashboardLink.href = 'student-dashboard.html';
        }
      }
    } else {
      // User is not logged in
      if (loginItem) loginItem.style.display = '';
      if (logoutItem) logoutItem.style.display = 'none';
      if (userStatus) userStatus.innerHTML = '';
      
      // Hide role-specific and auth-required items
      studentItems.forEach(item => item.style.display = 'none');
      trainerItems.forEach(item => item.style.display = 'none');
      authRequiredItems.forEach(item => item.style.display = 'none');
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
      window.location.href = 'index.html';
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
  updateNavigation,
  initAuth,
  redirectIfLoggedIn
};