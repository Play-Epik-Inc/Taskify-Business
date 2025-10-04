const { ipcRenderer } = require('electron')

function OnLoad(){
  setTimeout(() =>{document.getElementById('loading').style.animation = "FadeOut 0.5s linear forwards";}, 100)
  setTimeout(() =>{
    document.getElementById('loading').style.display = "none";
    document.getElementById('main').style.animation = "FadeIn 0.5s linear forwards";
  }, 500);

  //ENTER HANDLER
  document.getElementById("inputName").addEventListener("keypress", e => submitInputHandler(e));
  document.getElementById("inputPV").addEventListener("keypress", e => submitInputHandler(e));
  document.getElementById("inputNV").addEventListener("keypress", e => submitInputHandler(e));
}

function submitInputHandler(e){if(e.key === 'Enter') submitInput();}

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
  ipcRenderer.invoke("show-confirm", "Are you sure you want to delete this Task?")
    .then(userResponse => {
      if(userResponse){
        ipcRenderer.send('deleteTask'); 
        Quit();
      }
    });
}

function Quit() {window.close();}

function SetCharacterLimits(value){
  const inputs = document.querySelectorAll("input");

  if(!value){
    inputs.forEach(e =>{
      if(!e.dataset.originalMaxLength){
        const max = e.getAttribute("maxlength");
        if(max != null)
          e.dataset.originalMaxLength = max;
      }
      e.removeAttribute("maxlength")
    });
  }
  else
    inputs.forEach(e => {
      const length = e.dataset.originalMaxLength;
      if(length !== undefined)
        e.setAttribute("maxlength", length);
      else
        e.setAttribute("maxlength", 20);
    });
}

//GET TASK DATAS 
ipcRenderer.on('retrieveTaskName', (event, name) =>{document.getElementById('inputName').value = name;});
ipcRenderer.on('retrieveVersion', (event, version, elementID) => {document.getElementById(elementID).value = version;});
ipcRenderer.on('retrieveSetting', (event, characterLimit) =>{SetCharacterLimits(characterLimit)});

//DOM ON LOAD
document.body.onload = OnLoad();