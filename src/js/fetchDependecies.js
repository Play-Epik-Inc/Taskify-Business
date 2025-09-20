let taskifyVersion, version;

try{
    fetch('https://playepikservercontents.netlify.app/dependecies/dependecies.json')
    .then(response => response.json())
          .then(data => {
            taskifyVersion = data.versionTaskify;
            console.log(taskifyVersion)
            document.getElementById('latestversion').innerText = "Latest version avaible: " + data.versionTaskify;
          })
} catch (error) {document.getElementById('latestversion').innerText = `Latest version avaible: (Unknown error: ${error})`;}


function getCurrentVersion(){
  fetch('version.json')
  .then(response => response.json())
          .then(data => {
            version = data.Version;
            console.log(version)
            document.getElementById('version').innerHTML = "Version: " + version;
          });

  setTimeout(() => {
    checkForUpdates();
  }, 1000);
}

function checkForUpdates(){
  if(taskifyVersion > version){
    let res = ipcRenderer.invoke("new-version", "A newer version of Taskify Business is avaible! (" + taskifyVersion + ")")
    .then(res =>{
      if(res)
        shell.openExternal("https://github.com/Play-Epik-Inc/Taskify-Business/releases/latest")
    })
  }
}

document.body.onload = getCurrentVersion();