

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    const isActive = sidebar.classList.toggle('active');
    overlay.classList.toggle('active', isActive);
}

function plusBtnClick() {
    const value = document.getElementById('bet-value');
    const balance = Number(document.getElementById('balic').innerText);
    
    if(Number(balance) >= value.value + 1){
        value.value = Number(value.value) + 1;
    }
    else {
        value.value = balance;
    }
}

function minusBtnClick() {
    const value = document.getElementById('bet-value');

    if(Number(value.value) > 0){
        value.value = Number(value.value) - 1;
    }
}

function semiBtnClick() {
    const value = document.getElementById('bet-value');

    value.value = Math.round(Number(value.value) / 2 * 100) / 100;
}

function allinBtnClick() {
    const value = document.getElementById('bet-value');
    const balance = Number(document.getElementById('balic').innerText);

    value.value = balance;
}

function x2BtnClick() {
    const value = document.getElementById('bet-value');
    const balance = Number(document.getElementById('balic').innerText);

    if(Number(balance) > Math.round(Number(value.value) * 2 * 100) / 100){
        value.value = Math.round(Number(value.value) * 2 * 100) / 100;
    }
    else {
        value.value = balance;
    }
}

function betInputClick() {
    console.log('asdad');
}

