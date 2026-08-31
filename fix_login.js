const fs = require('fs');
let html = fs.readFileSync('lorraineenterprise.html', 'utf8');

// Find the login function and replace it
const loginStart = html.indexOf("document.getElementById('loginBtn')?.addEventListener('click', async () => {");
if (loginStart !== -1) {
    const loginEnd = html.indexOf("});", loginStart) + 2;
    const before = html.substring(0, loginStart);
    const after = html.substring(loginEnd);
    
    const newLogin = `document.getElementById('loginBtn')?.addEventListener('click', async () => {
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value.trim();
            
            if (!email || !password) {
                showToast('Please enter email and password.', 'error');
                return;
            }
            
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();
                if (data.success) {
                    showToast('Login successful! Welcome ' + data.user.name, 'success');
                    // You can add redirect here
                } else {
                    showToast(data.message || 'Login failed', 'error');
                }
            } catch (error) {
                showToast('Login error: ' + error.message, 'error');
            }
        });`;
    
    html = before + newLogin + after;
    fs.writeFileSync('lorraineenterprise.html', html);
    console.log('✅ Login function fixed!');
} else {
    console.log('❌ Login function not found');
}
