// js/auth.js

import { auth, onAuthStateChanged } from './firebase-config.js';

// Simple authentication check that uses localStorage as backup
export function checkAuth() {
  return new Promise((resolve) => {
    // First check localStorage for a stored user
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      console.log("Using stored user from localStorage");
      resolve(true);
      return;
    }

    // If no stored user, check Firebase auth
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe(); // Unsubscribe immediately
      
      if (user) {
        console.log("User is authenticated via Firebase:", user.email);
        // Store user in localStorage for backup
        localStorage.setItem('currentUser', JSON.stringify({
          uid: user.uid,
          email: user.email
        }));
        resolve(true);
      } else {
        console.log("User is not authenticated, redirecting to login");
        
        // Check if we're already on the login page to prevent redirect loops
        if (!window.location.href.includes('login.html')) {
          window.location.href = 'login.html';
        }
        resolve(false);
      }
    });
  });
}

// Get current user with localStorage fallback
export function getCurrentUser() {
  // First try Firebase auth
  if (auth.currentUser) {
    return auth.currentUser;
  }
  
  // Fall back to localStorage
  const storedUser = localStorage.getItem('currentUser');
  if (storedUser) {
    return JSON.parse(storedUser);
  }
  
  return null;
}

// Simple function to get user role
export async function getUserRole() {
  const user = getCurrentUser();
  if (!user) return null;
  
  // Check localStorage first for role
  const storedRole = localStorage.getItem('userRole');
  if (storedRole) {
    return storedRole;
  }
  
  try {
    // If no stored role, fetch from Firestore
    const { db, doc, getDoc } = await import('./firebase-config.js');
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (userDoc.exists()) {
      const role = userDoc.data().role;
      // Store for future use
      localStorage.setItem('userRole', role);
      return role;
    }
  } catch (error) {
    console.error("Error getting user role:", error);
  }
  
  return null;
}