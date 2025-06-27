const { ipcRenderer } = require('electron')

function OnLoad(){
  setTimeout(() =>{
    document.getElementById('loading').style.animation = "FadeOut 0.5s linear forwards";
  }, 500)
  setTimeout(() =>{
    document.getElementById('loading').style.display = "none";
    document.getElementById('main').style.animation = "FadeIn 0.5s linear forwards";
  }, 1000);
}

function submitInput() {
  //NEW TASK NAME
  const inputName = document.getElementById('inputName').value.trim();

  //PREVIOUS OR NEWER VERSION
  const previousVersion = document.getElementById('inputPV').value.trim();
  const newerVersion = document.getElementById('inputNV').value.trim();

  //SEND NEW VALUES
  if(inputName)
    ipcRenderer.send('inputSend', inputName, "task_name")
  if(previousVersion)
    ipcRenderer.send('inputSend', previousVersion, "prev_version")
  if(newerVersion)
    ipcRenderer.send('inputSend', newerVersion, "next_version")
  window.close();
}

function DeleteTask(){
  ipcRenderer.send('deleteTask');
  window.close();
}

function Quit() {window.close();}

ipcRenderer.on('retrieveTaskName', (event, name) =>{
  document.getElementById('startingText').innerHTML = `Modify the proprieties of the actual selected task (${name}).`
  document.getElementById('inputName').value = name;
});