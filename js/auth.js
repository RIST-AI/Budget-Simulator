// js/auth.js
import { auth, onAuthStateChanged } from './firebase-config.js';

// Pages that don't require authentication
const publicPages = ['index.html', 'login.html', 'register.html'];

// Check if current page is in the public pages list
function isPublicPage() {
    const currentPath = window.location.pathname;
    const currentPage = currentPath.substring(currentPath.lastIndexOf('/') + 1);
    return publicPages.includes(currentPage) || currentPath.endsWith('/') || currentPath === '';
}

// Authentication check function
export function checkAuth() {
    // Skip auth check on public pages
    if (isPublicPage()) {
        console.log("Public page - no auth check needed");
        return Promise.resolve(true);
    }
    
    console.log("Protected page - checking authentication");
    
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe(); // Unsubscribe immediately to prevent memory leaks
            
            if (!user) {
                console.log("User not authenticated, redirecting to login");
                window.location.href = 'login.html';
                resolve(false);
            } else {
                console.log("User authenticated:", user.email);
                resolve(true);
            }
        });
        
        // Timeout after 3 seconds in case Firebase is slow
        setTimeout(() => {
            console.warn("Auth check timed out");
            window.location.href = 'login.html';
            resolve(false);
        }, 3000);
    });
}

// Export current user function
export function getCurrentUser() {
    return auth.currentUser;
}