const { ipcRenderer } = require('electron');

function OnLoad(){
    document.getElementById('container').style.animation = "FadeIn 1s forwards";

    //EVENT LISTENER
    document.getElementById('companyCreation').addEventListener('click', createCompany);
    document.getElementById('inputCompany').addEventListener('keydown', function(e){if(e.key === 'Enter') createCompany();});
}

function createCompany(){
    const input = document.getElementById('inputCompany');
    const value = input.value.trim();
    
    if (!value || value.length < 8){
        ipcRenderer.invoke('show-alert', "Invalid Company name. At least 8 characters."); 
        return;
    }
    else {
        ipcRenderer.send('save-companyName', value);
        document.getElementById('container').style.animation = "FadeOut 1s forwards";
        setTimeout(() => {window.location.href = "index.html";}, 1000);
    }
}

//DOM ON LOAD
document.body.onload = OnLoad();