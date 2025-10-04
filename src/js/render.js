const { ipcRenderer, shell } = require('electron');
const {execFile} = require('child_process');
const path = require('path');
const Chart = require('chart.js/auto').Chart;

//VARIABLES
let taskCreated = 0, taskCompleted = 0;
let autoClose = false, joinBeta = true, messageSend = false, characterLimit;
let companyName = undefined;
let taskCompletedColor = document.getElementById('colorTaskCreated').value, taskCreatedColor = document.getElementById('colorTaskCompleted').value;

const DEBUG = ipcRenderer.sendSync('checkForDebug');

//LOADING TODOs
const loaded = ipcRenderer.sendSync('load-todos') || {};

let chartData = loaded.chartData || {
  labels: Array(7).fill('').map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i)); 
    return date.toLocaleDateString();
  }),
  created: Array(7).fill(0),
  completed: Array(7).fill(0)
};

let tasksChart = null;

function OnLoad(){
  fetchVersion();
  fetchBuildNumber();
}

///MARK: TASK MANAGEMENT SECTION
window.todoManager = new class TodoManager {
  constructor() {
    const categoryID = document.getElementById('categoryClean');
    const newCompanyName = document.getElementById('nameCompany');
    const loaded = ipcRenderer.sendSync('load-todos') || {};

    this.todos = {
      softwareComponents: loaded.softwareComponents || [],
      fuoriManutenzione: loaded.fuoriManutenzione || []
    };
    
    taskCreated = loaded.taskCreated || 0;
    taskCompleted = loaded.taskCompleted || 0;
    autoClose = loaded.autoClose || false;
    joinBeta = typeof loaded.joinBeta === "boolean" ? loaded.joinBeta : true;
    companyName = loaded.companyName || undefined
    characterLimit = typeof loaded.characterLimit === 'boolean' ? loaded.characterLimit : false;

    //SET DEFAULT CHARACTER LIMIT
    this.inputCharactersUpdate(characterLimit);

    document.getElementById('colorTaskCreated').value = loaded.taskCompletedColor || "blue";
    document.getElementById('colorTaskCompleted').value = loaded.taskCreatedColor || "green";

    if(companyName === undefined)
      window.location.href = "createCompany.html";
    else
      document.getElementById("app").style.animation = "FadeIn 1s forwards";
    
    //EVENT LISTENERS
    document.getElementById('softwareAddBtn')
            .addEventListener('click', () => this.addTodoHandler('softwareComponents'));
    document.getElementById('softwareInput')
            .addEventListener('keypress', e => this.handleEnter(e, 'softwareComponents'));
    document.getElementById('userTypeIn')
            .addEventListener('keypress', e => this.handleEnter(e, 'softwareComponents'));
    document.getElementById('software')
            .addEventListener('keypress', e => this.handleEnter(e, 'softwareComponents'));
    document.getElementById('fuoriInput')
            .addEventListener('keypress', e => this.handleEnter(e, 'fuoriManutenzione'));
    document.getElementById('out')
            .addEventListener('keypress', e => this.handleEnter(e, 'fuoriManutenzione'));
    document.getElementById('userTypeOut')
            .addEventListener('keypress', e => this.handleEnter(e, 'fuoriManutenzione'));
    document.getElementById('fuoriAddBtn')
            .addEventListener('click', () => this.addTodoHandler('fuoriManutenzione'));
    document.getElementById('resetBtn')
            .addEventListener('click', () => this.resetData());
    document.getElementById('restartBtn')
            .addEventListener('click', () => this.restartApplication());
    document.getElementById('cleanSectionBtn')
            .addEventListener('click', () => this.markAsCompleted(categoryID.value));
    document.getElementById('changeNameBtn')
            .addEventListener('click', () => this.changeCompanyName(newCompanyName.value.trim()));
    document.getElementById('checkbox')
            .addEventListener('click', () => this.checkBox());
    document.getElementById('joinBeta')
            .addEventListener('click', () => this.joinBetaClicked());
    document.getElementById('characterLimit')
            .addEventListener('change', () => this.setCharacterLimit())
    document.getElementById('aiSendBtn')
            .addEventListener('click', e => this.sendAIMessage())
    document.getElementById('colorTaskCreated')
            .addEventListener('change', () => this.updateUI())
    document.getElementById('colorTaskCompleted')
            .addEventListener('change', () => this.updateUI())
    this.updateUI();
  }

  sendAIMessage(){
    const input = document.getElementById('aiInput');
    const message = input.value.trim();
    if(!input || !message){
      ipcRenderer.invoke('show-alert', "Invalid message. You cannot send empty messages.", "Invalid AI Message")
      return;
    }

    appendMsg(message, "you");
    input.value = '';
    CallAIFunction(message);
  }

  addToDo(taskName, previousVer, nextVer, category){
    this.todos[category].push({
      text: taskName,
      prevVersion: previousVer,
      nextVersion: nextVer,
      userName: "You",
      completed: false
    })

    taskCreated++;
    ipcRenderer.send('save-todos', { ...this.todos, taskCreated, taskCompleted, autoClose, companyName, chartData, joinBeta, taskCompletedColor, taskCreatedColor, characterLimit });
    this.updateUI();
  }

  addTodoHandler(category) {
    const inputId = category === 'softwareComponents' ? 'softwareInput' : 'fuoriInput';
    const prevVersionId = category === 'softwareComponents' ? 'softwarePrevVersion' : 'fuoriPrevVersion';
    const nextVersionId = category === 'softwareComponents' ? 'softwareNextVersion' : 'fuoriNextVersion';
    const employeeId = category === 'softwareComponents' ? 'userTypeIn': 'userTypeOut';

    const input = document.getElementById(inputId);
    const prevVersionInput = document.getElementById(prevVersionId);
    const nextVersionInput = document.getElementById(nextVersionId);
    const employeeField = document.getElementById(employeeId);

    const text = input.value.trim();
    const prevVersion = prevVersionInput.value.trim();
    const nextVersion = nextVersionInput.value.trim();
    let employeeName = employeeField.value.trim();

    if (!text){
      ipcRenderer.invoke('show-alert', "Invalid task name. Please enter a valid name.", "Task Creation Error");
      return;
    }

    if(prevVersion && !nextVersion){
      ipcRenderer.invoke('show-alert', "Invalid version format. Please enter a valid format.", "Task Creation Error")
      return;
    }
    
    if (!employeeName) employeeName = "You";
    this.todos[category].push({
      text,
      prevVersion,
      nextVersion,
      userName: employeeName,
      completed: false
    });

    input.value = '';
    prevVersionInput.value = '';
    nextVersionInput.value = '';
    employeeField.value = '';

    taskCreated++;
    ipcRenderer.send('save-todos', { ...this.todos, taskCreated, taskCompleted, autoClose, companyName, chartData, joinBeta, taskCompletedColor, taskCreatedColor, characterLimit });
    updateDailyData();
    this.updateUI();
  }

  handleEnter(e, category) {if (e.key === 'Enter') this.addTodoHandler(category);}

  removeTodo(category, index) {
    this.todos[category].splice(index, 1);
    taskCompleted++;
    ipcRenderer.send('save-todos', { ...this.todos, taskCreated, taskCompleted, autoClose, companyName, chartData, joinBeta, taskCompletedColor, taskCreatedColor, characterLimit });
    updateDailyData(); 
    this.updateUI();
  }

  updateUI() {
    const taskCreatedEl = document.getElementById('taskCreated');
    const taskCompletedEl = document.getElementById('taskCompleted');
    const autoCloseCheckbox = document.getElementById('checkbox');
    const joinBetaCheckBox = document.getElementById('joinBeta');
    const characterLimitCheckbox = document.getElementById('characterLimit');
    const dropDowntaskCreated = document.getElementById('colorTaskCreated').value;
    const dropDowntaskCompleted = document.getElementById('colorTaskCompleted').value;

    let colorTCompleted = null, colorTCreated = null, colorTCompletedBG = null, colorTCreatedBG = null;

    taskCreatedEl.innerText = `${taskCreated}`;
    taskCompletedEl.innerText = `${taskCompleted}`;
    autoCloseCheckbox.checked = autoClose;
    joinBetaCheckBox.checked = joinBeta;
    characterLimitCheckbox.checked = characterLimit;

    //COLOR SELECTION
    ///TASK COMPLETED
    switch(dropDowntaskCompleted){
      case 'red':
        colorTCompleted = 'rgba(255, 0, 0, 1)'; 
        colorTCompletedBG = 'rgba(255, 0, 0, 0.1)';
        break;
      case 'green':
        colorTCompleted = 'rgba(7,185,7,1)'; 
        colorTCompletedBG = 'rgba(7,185,7,0.1)'
        break;
      case 'blue':
        colorTCompleted = 'rgb(0, 157, 255)'; 
        colorTCompletedBG = 'rgba(0,157,255,0.1)'
        break;
      case 'orange':
        colorTCompleted = 'rgba(255, 149, 0, 1)';
        colorTCompletedBG = 'rgba(255, 149, 0, 0.1)';
        break;
      case 'yellow':
        colorTCompleted = 'rgba(255, 217, 0, 1)'; 
        colorTCompletedBG = 'rgba(255, 217, 0, 0.1)';
        break;
    }

    ///TASK CREATED
    switch(dropDowntaskCreated){
      case 'red':
        colorTCreated = 'rgba(255, 0, 0, 1)'; 
        colorTCreatedBG = 'rgba(255, 0, 0, 0.1)';
        break;
      case 'green':
        colorTCreated = 'rgba(7,185,7,1)'; 
        colorTCreatedBG = 'rgba(7,185,7,0.1)'
        break;
      case 'blue':
        colorTCreated = 'rgba(0,157,255,1)'; 
        colorTCreatedBG = 'rgba(0,157,255,0.1)'
        break;
      case 'orange':
        colorTCreated = 'rgba(255, 149, 0, 1)'; 
        colorTCreatedBG = 'rgba(255, 149, 0, 0.1)';
        break;
      case 'yellow':
        colorTCreated = 'rgba(255, 217, 0, 1)'; 
        colorTCreatedBG = 'rgba(255, 217, 0, 0.1)';
        break;
    }

    //AUTO-CLOSE SETTINGS
    if (!autoClose)
      window.addEventListener('scroll', this.handleScroll);
    else 
      window.removeEventListener('scroll', this.handleScroll);

    taskCreatedColor = document.getElementById('colorTaskCreated').value;
    taskCompletedColor = document.getElementById('colorTaskCompleted').value;

    ipcRenderer.send('save-todos', { ...this.todos, taskCreated, taskCompleted, autoClose, companyName, chartData, joinBeta, taskCompletedColor, taskCreatedColor, characterLimit });
    document.title = `Taskify Dashboard - ${companyName}`;
    this.renderList('softwareComponents', 'softwareList');
    this.renderList('fuoriManutenzione', 'fuoriList');

    //UPDATE CHART
    if (!tasksChart) {
      const ctx = document.getElementById('tasksChart').getContext('2d');
      tasksChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartData.labels, 
          datasets: [
            {
              label: 'Tasks Created',
              data: chartData.created,
              borderColor: colorTCreated,
              backgroundColor: colorTCreatedBG,
              tension: 0.3
            },
            {
              label: 'Tasks Completed',
              data: chartData.completed,
              borderColor: colorTCompleted,
              backgroundColor: colorTCompletedBG,
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              labels: {
                color: '#fff',
                font: {
                  family: 'Excon, Sans Serif',
                  size: 16
                }
              }
            },
            tooltip: {
              titleFont: {
                family: 'Excon, Sans Serif',
                size: 14,
                weight: 500
              },
              bodyFont: {
                family: 'Excon, Sans Serif',
                size: 12,
                weight: 'normal'
              },
              footerFont: {
                family: 'Excon, Sans Serif',
                size: 10,
                style: 'italic'
              },
            }
          },
          scales: {
            x: {
              ticks: {
                color: '#fff',
                font: {
                  family: 'Excon, Sans Serif',
                  size: 12
                }
              }
            },
            y: {
              ticks: {
                color: '#fff',
                font: {
                  family: 'Excon, Sans Serif',
                  size: 10
                },
                callback: function(value) {return Number.isInteger(value) ? value : null;}
              },
              beginAtZero: true
            }
          }
        }
      });
    } else {
      tasksChart.data.labels = chartData.labels;
      tasksChart.data.datasets[0].data = chartData.created;
      tasksChart.data.datasets[1].data = chartData.completed;
      tasksChart.data.datasets[0].borderColor = colorTCreated;
      tasksChart.data.datasets[0].backgroundColor = colorTCreatedBG;
      tasksChart.data.datasets[1].borderColor = colorTCompleted;
      tasksChart.data.datasets[1].backgroundColor = colorTCompletedBG;
      tasksChart.update();
    }
  }

  renderList(category, listId) {
    const list = document.getElementById(listId);
    list.innerHTML = '';

    this.todos[category].forEach((todo, idx) => {
        const li = document.createElement('li');
        const employee = todo.userName;
        let versionHtml = '';
        if (todo.prevVersion || todo.nextVersion) {
            versionHtml = `
                <small>
                    ${todo.prevVersion ? `<p class="versionPrev">${todo.prevVersion}</p>` : ''}
                    ${todo.prevVersion && todo.nextVersion ? ' > ' : ''}
                    ${todo.nextVersion ? `<p class="versionNext">${todo.nextVersion}</p>` : ''}
                </small><br>
            `;
        }
        li.innerHTML = `
            <span><b>${todo.text}</b></span>
            <div>
                ${versionHtml}
                <small>Assigned to: <i>${employee}</i></small>
                <div style="display: flex; gap: 5px; margin-top: 0px;">
                    <button class="delete-btn" style="width: 100px; background-color: white;" title="Mark as Completed">
                      <img src="assets/_complete.png" draggable="false" width="20px" height="20px">
                    </button>
                    <button class="edit-btn" id="editBtn" title="Edit Task">
                      <img src="assets/_edit.png" draggable="false" width="20px" height="20px">
                    </button>
                </div>
            </div>
        `;
        li.querySelector('.delete-btn')
          .addEventListener('click', () => this.removeTodo(category, idx));
        li.querySelector('.edit-btn')
          .addEventListener('click',() => this.modifyTask(category, idx));
        list.appendChild(li);
    });
  }

  resetData() {
    ipcRenderer.invoke('show-confirm', "Are you sure do you want to reset all Data saved?")
      .then(userResponse => {
        if (userResponse) {
          this.todos = {
            softwareComponents: [],
            fuoriManutenzione: []
          };
          taskCreated = 0;
          taskCompleted = 0;
          companyName = "";
          chartData = {
            labels: Array(7).fill('').map((_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - (6 - i));
              return date.toLocaleDateString();
            }),
            created: Array(7).fill(0),
            completed: Array(7).fill(0)
          };
          ipcRenderer.send('save-todos', { ...this.todos, taskCreated, taskCompleted, autoClose, companyName, chartData, joinBeta, taskCompletedColor, taskCreatedColor, characterLimit });
          this.updateUI();
          const res = ipcRenderer.invoke('show-alert', "Data succesfully reset, app will be restarted soon.")
          .then(() => {window.location.href = "boot.html";});
        }
      });
  }

  restartApplication(){
    ipcRenderer.invoke('show-confirm', "Are you sure you want to restart the app?")
    .then(userResponse =>{
      if(userResponse)
        window.location.href = "boot.html";
    })
  }

  markAsCompleted(categoryKey) {
    if (!this.todos[categoryKey]) {
      ipcRenderer.invoke('show-alert', "Invalid category selected.");
      return;
    }
    ipcRenderer.invoke('show-confirm',`Are you sure to mark complete the following category?`)
    .then(userResponse => {
      if (!userResponse) return;
      const list = this.todos[categoryKey];
      taskCompleted += list.length;

      this.todos[categoryKey] = [];
      ipcRenderer.send('save-todos', { ...this.todos, taskCreated, taskCompleted, autoClose, companyName, chartData, joinBeta, taskCompletedColor, taskCreatedColor, characterLimit });
      this.updateUI();
      ipcRenderer.invoke('show-alert', "Tasks marked as 'Completed'!");
    });
  }
  
  checkBox() {
    autoClose = !autoClose; 
    if (!autoClose) 
      window.addEventListener('scroll', this.handleScroll);
    else
      window.removeEventListener('scroll', this.handleScroll);
    ipcRenderer.send('save-todos', { ...this.todos, taskCreated, taskCompleted, autoClose, companyName, chartData, joinBeta, taskCompletedColor, taskCreatedColor, characterLimit });
  }

  joinBetaClicked(){
    joinBeta = !joinBeta;
    showBetaOptions(joinBeta);
    ipcRenderer.send('save-todos', { ...this.todos, taskCreated, taskCompleted, autoClose, companyName, chartData, joinBeta, taskCompletedColor, taskCreatedColor, characterLimit });
    this.updateUI();
  }
  
  handleScroll() {
    if (window.scrollY === 0) {
      document.getElementById('infoBox').style.display = "none";
      toggleButtons(true);
      showBetaOptions(joinBeta);
    }
  }

  changeCompanyName(newName) {
    if(!newName || newName.length < 8) {
      ipcRenderer.invoke('show-alert', "Invalid Company name. At least 8 characters.");
      return;
    }
    ipcRenderer.invoke('show-confirm', `Are you sure to change the company name to: ${newName}?`)
      .then(userResponse => {
        if (!userResponse) return;
        companyName = newName;
        ipcRenderer.send('save-todos', { ...this.todos, taskCreated, taskCompleted, autoClose, companyName, chartData, joinBeta, taskCompletedColor, taskCreatedColor, characterLimit });
        document.getElementById('nameCompany').value = '';
        ipcRenderer.invoke('show-alert', "Company name changed successfully!");
        this.updateUI();
      });
  }

  updateChart() {
    const now = new Date();
    const label = now.toLocaleDateString();
    chartData.labels.push(label);
    chartData.created.push(taskCreated);
    chartData.completed.push(taskCompleted);
    if (chartData.labels.length > 10) {
      chartData.labels.shift();
      chartData.created.shift();
      chartData.completed.shift();
    }
    if (tasksChart) {
      tasksChart.data.labels = chartData.labels;
      tasksChart.data.datasets[0].data = chartData.created;
      tasksChart.data.datasets[1].data = chartData.completed;
      tasksChart.update();
    }
  }

  modifyTask(category, index) {
    const task = this.todos[category][index];
    if (!task){
      ipcRenderer.invoke('show-alert', "Task not found."); 
      return;
    }
    ipcRenderer.invoke('shareSettings', characterLimit);
    ipcRenderer.invoke('show-input-alert', category, index);
  }

  setCharacterLimit(){
    characterLimit = !characterLimit;
    this.inputCharactersUpdate(characterLimit);
  }

  inputCharactersUpdate(value){
    const inputs = document.querySelectorAll("input");

    if(!value){
      inputs.forEach(e =>{
        if(!e.dataset.originalMaxLength){
          const max = e.getAttribute('maxlength');
          if(max != null)
            e.dataset.originalMaxLength = max;
        }
        e.removeAttribute('maxlength');
      });
    }
    else{
      inputs.forEach(e => {
        const length = e.dataset.originalMaxLength;
        if(length !== undefined)
          e.setAttribute('maxlength', length);
        else
          e.setAttribute('maxlength', 20);
      });
    }
    ipcRenderer.send('save-todos', { ...this.todos, taskCreated, taskCompleted, autoClose, companyName, chartData, joinBeta, taskCompletedColor, taskCreatedColor, characterLimit });
  }
}();

//OPEN INFO AND SETTINGS
const buttons =[
  info = document.getElementById('ibtn'),
  settings = document.getElementById('sbtn'),
  ai = document.getElementById('openSidebarBtn')
];

function openInfoBox(){
  document.getElementById('infoBox').style.display = 'block';
  document.getElementById('infoBox').scrollIntoView({ behavior: 'smooth' });
  toggleButtons(false);
}

function closeInfoBox(){
  document.getElementById('app').scrollIntoView({ behavior: 'smooth' });
  document.getElementById('infoBox').style.display = 'none';
  toggleButtons(true);
}

function openSettings(){
  document.getElementById('infoBox').style.display = 'block';
  document.getElementById('settings').scrollIntoView({behavior: 'smooth'});
  toggleButtons(false);
}

function toggleButtons(value){
  buttons.forEach(e  => {e.style.display = (value) ? "block" : "none";});
}

async function quitApplication() {
  const userConfirmed = await ipcRenderer.invoke('show-confirm', "Are you sure you want to close the app?");
  if (userConfirmed)
    ipcRenderer.send('quit-app');
}

function fetchVersion(){
  fetch('version.json')
  .then(response => response.json())
          .then(data => {
            const version = data.Version;
            document.getElementById('version').innerHTML = "Version: " + version;
          });
}

function fetchBuildNumber(){
  fetch('version.json')
  .then(response => response.json())
          .then(data => {
            const BuildNumber = data.BuildNumber;
            document.getElementById('build').innerHTML = "Build: " + BuildNumber;
          });
}

function updateDailyData() {
  const today = new Date().toLocaleDateString();
  const lastLabel = chartData.labels[chartData.labels.length - 1];

  if (lastLabel !== today) {
    chartData.labels.push(today);
    chartData.created.push(taskCreated);
    chartData.completed.push(taskCompleted);

    if (chartData.labels.length > 7) {
      chartData.labels.shift();
      chartData.created.shift();
      chartData.completed.shift();
    }
  } 
  else {
    chartData.created[chartData.created.length - 1] = taskCreated;
    chartData.completed[chartData.completed.length - 1] = taskCompleted;
  }
}

//EDIT TASKS FUNCTIONS
ipcRenderer.on('task-modified', (event, category, index, taskData) => {
    window.todoManager.todos[category][index].text = taskData.text;
    window.todoManager.todos[category][index].prevVersion = taskData.prevVersion;
    window.todoManager.todos[category][index].nextVersion = taskData.nextVersion;
    ipcRenderer.send('save-todos', { ...this.todos, taskCreated, taskCompleted, autoClose, companyName, chartData, joinBeta, taskCompletedColor, taskCreatedColor, characterLimit });
    window.todoManager.updateUI();
});

ipcRenderer.on('delete-task', (event, category, index) => {
    window.todoManager.todos[category].splice(index, 1);
    taskCreated--;
    ipcRenderer.send('save-todos', { ...this.todos, taskCreated, taskCompleted, autoClose, companyName, chartData, joinBeta, taskCompletedColor, taskCreatedColor, characterLimit });
    window.todoManager.updateUI();
});

///MARK: AI SECTION
//AI ASSISTANT
function CallAIFunction(input){
  let scriptPath;
  const unpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'src', 'ai', 'contentAnalizer.py');
  const packedPath = path.join(process.resourcesPath, 'src', 'ai', 'contentAnalizer.py');
  scriptPath = (DEBUG) ? 'src/ai/contentAnalizer.py' : ((require('fs').existsSync(unpackedPath)) ? unpackedPath : packedPath);

  execFile('python', [scriptPath, input], (error, stdout, stderr) =>{
    if(error){
      appendMsg(`Error during the load of AI Scripts: ${error.message}`, "AI");
      return;
    }
    try{
      const result = JSON.parse(stdout);
      if (result.tasks && Array.isArray(result.tasks) && !Object.prototype.hasOwnProperty.call(result, 'modify') && !Object.prototype.hasOwnProperty.call(result, 'type')) {
        result.tasks.forEach(task => {
           appendMsg(`Task Created! ${task.name} (${task.prev_version} → ${task.next_version})`, "AI");
          window.todoManager.addToDo(task.name, task.prev_version, task.next_version, task.category);
        });
      } else if (result.name && !Object.prototype.hasOwnProperty.call(result, 'modify') && !Object.prototype.hasOwnProperty.call(result, 'type')) {
        appendMsg(`Task Created! ${result.name} (${result.prev_version} → ${result.next_version})`, "AI");
        window.todoManager.addToDo(result.name, result.prev_version, result.next_version, result.category);
      } else if(Object.prototype.hasOwnProperty.call(result, 'modify')){
        const todos = window.todoManager.todos[result.category];
        const index = todos.findIndex(t => t.text === result.name);

        if(index !== -1){
          window.todoManager.modifyTask(result.category, index);
          appendMsg(`Editing task: ${result.name}`, "AI");
        }
        else
          appendMsg(`Task "${result.name}" not found in category "${result.category == "fuoriManutenzione"? "Out Of Maintenance" : "Maintenance Tasks"}"`, "AI");
      }
      else if (result.name && Object.prototype.hasOwnProperty.call(result, 'type')){
        const todos = window.todoManager.todos[result.category];
        const index = todos.findIndex(t => t.text === result.name);

        if(index !== -1){
          window.todoManager.removeTodo(result.category, index);
          appendMsg(`Deleting task: ${result.name}`, "AI");
          taskCreated--;
        }
        else
        appendMsg(`Task "${result.name}" not found in category "${result.category == "fuoriManutenzione"? "Out Of Maintenance" : "Maintenance Tasks"}"`, "AI")
      }
      else{
        if (typeof result === "object")
          appendMsg(JSON.stringify(result, null, 2), "AI");
        if(result == "cleared")
          clearChat();
        else
          appendMsg(result, "AI");
      }
    }
    catch(e) {appendMsg("An unknown error occured: " + e, "AI");}
  });
}

//SIDEBAR VARIABLES
const sidebar = document.getElementById('sidebarAI');
const openSidebarBtn = document.getElementById('openSidebarBtn');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const aiSendBtn = document.getElementById('aiSendBtn');
const aiInput = document.getElementById('aiInput');
const aiChatHistory = document.getElementById('aiChatHistory');

//SIDEBAR ACTIONS
openSidebarBtn.onclick = () =>{
  sidebar.classList.add('open');
  setTimeout(() =>{aiInput.focus();}, 400);

  if(!messageSend){
    CallAIFunction("hello");
    messageSend = true;
  }
};

closeSidebarBtn.onclick = () =>{sidebar.classList.remove('open');}

aiSendBtn.onclick = () => {
  const msg = aiInput.value.trim();
  if(!msg) return;

  appendMsg(msg, "you");
  
  if (!sidebar.classList.contains('open')) 
    sidebar.classList.add('open');

  CallAIFunction(msg);
  setTimeout(() => {appendMsg("AI: Elaborating request...", "AI");}, 800);
}

aiInput.addEventListener('keydown', function(e){if(e.key === 'Enter') aiSendBtn.click();});

aiInput.addEventListener('focus', () => aiInput.classList.add('ai-glow'));
aiInput.addEventListener('blur', () => aiInput.classList.remove('ai-glow'));

function appendMsg(text, who = "ai"){
  const div = document.createElement('div');
  div.className = 'ai-chat-msg ' + (who.toLowerCase() === "you" ? "user" : "ai");

  if(who === "AI")
    div.innerHTML = `
            <div>
                <label class="aiText">AI Assistant: </label>
                <p style="display: inline;"> ${text} </p>
            </div>
        `;
  else{
    div.innerHTML = `
        <div>
            <label class="youText">You: </label>
            <p style="display: inline;"> ${text} </p>
        </div>
    `;
  }
  
  aiChatHistory.appendChild(div);
  aiChatHistory.scrollTop = aiChatHistory.scrollHeight;
}

function clearChat() {
  const chatHistory = document.querySelector('.ai-chat-history');
  chatHistory.innerHTML = (chatHistory) ? '' : chatHistory.innerHTML;
}

function showBetaOptions(value){
  if(!autoClose)
    document.getElementById('openSidebarBtn').style.display = (value === true && window.scrollY === 0) ? "block" : "none";
}

//INFO ABOUT BETA PROGRAM
function ShowInfoPanel(textToShow){ipcRenderer.invoke('show-alert', textToShow)}

//WEB REFERENCES SECTION
document.getElementById('repoGitBtn').addEventListener('click', () =>{shell.openExternal("https://github.com/Play-Epik-Inc/Taskify-Business");});
document.getElementById('licenseBtn').addEventListener('click', () =>{shell.openExternal("https://github.com/Play-Epik-Inc/Taskify-Business/blob/main/LICENSE");});

//NEED HELP SECTION
document.getElementById('feedback').addEventListener('click', () =>{
  document.getElementById("feedbackSelection").classList.toggle("feedbackSelection")
  document.getElementById('menuFeedback').classList.toggle("arrowMenu")
});
document.getElementById("bug").addEventListener('click', () =>{shell.openExternal("https://github.com/Play-Epik-Inc/Taskify-Business/issues/new?labels=bug")})
document.getElementById("feedbackBtn").addEventListener('click', () =>{shell.openExternal("https://github.com/Play-Epik-Inc/Taskify-Business/issues/new?labels=enhancement")})
document.getElementById('contactUs').addEventListener('click', () =>{shell.openExternal("https://play-epik-incorporation.netlify.app/contactus#morehelp");});

//DOM ON LOAD
document.body.onload = OnLoad();