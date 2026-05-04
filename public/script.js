loadUserData();

function loadUserData(){
    const balicDisplay = document.getElementById('balic');
    const user = JSON.parse(localStorage.getItem('user'))

    balicDisplay.innerText = String(user.balance);
}

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    const isActive = sidebar.classList.toggle('active');
    overlay.classList.toggle('active', isActive);
}