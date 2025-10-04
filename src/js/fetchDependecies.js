let taskifyVersion, version;

try{
    fetch('https://playepikservercontents.netlify.app/dependencies/dependencies.json')
    .then(response => response.json())
          .then(data => {
            taskifyVersion = data.versionTaskify;
            document.getElementById('latestversion').innerText = "Latest version avaible: " + data.versionTaskify;
          })
} catch (ex) {document.getElementById('latestversion').innerText = `Latest version avaible: Impossible to retrieve the latest version, check your internet wi-fi.`;}


function getCurrentVersion(){
  fetch('version.json')
  .then(response => response.json())
          .then(data => {
            version = data.Version;
            document.getElementById('version').innerHTML = "Version: " + version;
            document.getElementById('build').innerHTML = "Build: " + data.BuildNumber;
          });

  setTimeout(checkForUpdates, 1000);
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