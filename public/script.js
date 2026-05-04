loadUserData();
function loadUserData(){
    const balicDisplay = document.getElementById('balic');
    const user = JSON.parse(localStorage.getItem('user'))

    if(!!user){
        balicDisplay.innerText = String(Number(user.balance).toFixed(2));        
    }
    else{
        balicDisplay.innerText = '0';
    }
    console.log(user.balance);
    
}

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    const isActive = sidebar.classList.toggle('active');
    overlay.classList.toggle('active', isActive);
}