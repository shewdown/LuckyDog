function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    const isActive = sidebar.classList.toggle('active');
    overlay.classList.toggle('active', isActive);
}