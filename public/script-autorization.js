function toggleForm() {
    document.getElementById('formLogin').classList.toggle('active');
    document.getElementById('formRegister').classList.toggle('active');
}

async function handleRegister() {
    const login = document.getElementById('reg-login').value;
    const pass = document.getElementById('reg-pass').value;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: login, password: pass })
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            toggleForm();
        } else {
            alert("Ошибка: " + data.error);
        }
    } catch (err) {
        console.error("Ошибка при запросе:", err);
        alert("Ошибка соединения с сервером");
    }
}

async function handleAuth(){
    const login = document.getElementById('auth-login').value;
    const pass = document.getElementById('auth-pass').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login: login, password: pass })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('user', JSON.stringify({ login: data.login, balance: data.balance }));
            window.location.href = 'index.html';
        } else {
            alert("Ошибка: " + data.error);
        }
    } catch (err) {
        console.error("Ошибка при запросе:", err);
        alert("Ошибка соединения с сервером");
    }
}