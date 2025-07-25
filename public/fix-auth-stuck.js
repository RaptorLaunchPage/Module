// Emergency fix for stuck authentication states
// Run this in the browser console if you're stuck on the loading screen

console.log('🔧 Running emergency authentication fix...');

// Clear all local storage
localStorage.clear();
sessionStorage.clear();

// Clear any auth-related cookies
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

console.log('✅ Cleared all stored authentication data');

// Force reload to start fresh
setTimeout(() => {
  console.log('🔄 Reloading page...');
  window.location.href = '/auth/login';
}, 1000);