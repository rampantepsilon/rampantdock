//Requirements for application
const { app, BrowserWindow, Menu, Tray, Notification, globalShortcut, shell, dialog } = require('electron');
const https = require('https');
const path = require('path');
const Store = require('./store.js');
const axios = require('axios');

//App information
function title(){
  var title = 'TweetDeck Standalone Client';
  return title;
}
function buildNum(){
  const build = '2020.07.29';
  return build;
}
function versionNum(){
  const version = app.getVersion();
  return version;
}
const changelogOptions = {
  type: 'info',
  buttons: ['Close'],
  title: 'Changelog',
  message: 'Changes in v3.1.0',
  detail: `- Added Email to the Menu (Gmail, Yahoo, Outlook, and AOL at launch)
- Fixed bug where app would ask about the Media window on minimize even if the window wasn't visible.
- Change Tray Icon to show menu when clicked rather than focusing the window.

If you have any suggestions for the app, please reach out to me on Twitter @rampantepsilon or Discord (RampantEpsilon#7868).`
}

//Global References & Variables
let mainWindow; //Main Window
let musicWindow; //Music Window
let emailWindow; //Email Window
var homeWindow; //Tracker for Music Window in mainWindow
var emailWindowT; //Tracker for Email Window in mainWindow
var not2; //Tracker for if notification2 should be shown
var currentVer = versionNum(); //variable for versionNum where functions can't be called
var commit; //Info from GitHub showing newest tag for release
var manualCheck = 'false'; //Tracker for if update check was initiated by user or automatic
var musicOn = 'false'; //Tracker for if musicWindow has been created
var mediaShow = 'false'; //Tracker for if mediaWindow is shown
var emailOn = 'false'; //Tracker for if emailWindow has been created
var emailShow = 'false'; //Tracker for if emailWindow is shown
var launchCheck = 'true'; //Tracker for first check

//Initialize Storage Method Store
const store = new Store(
  {
    configName: 'user-preferences',
    defaults:{
      windowBounds: { width: 1280, height: 720 }, //mainWindow default
      musicBounds: { width: 620, height: 400 }, //musicWindow default (Possibly change to bigger?)
      emailBounds: { width: 800, height: 450 }, //emailWindow default
      tooltip: 'yes',
      tooltipLaunch: 'yes', //Default to show Notifications
      isMaximized: 'no', //Default to basic window size (Windows Only)
      mIsMaximized: 'no', //Default to basic mediaWindow size (Windows Only)
      eIsMaximized: 'no' //Default to basic emailWindow size (Windows Only)
    }
  }
);

//Get Stored Remember for Tooltip
if (!store.get('tooltip')){
  store.set('tooltip', 'yes')
}
if (!store.get('tooltipLaunch')){
  store.set('tooltipLaunch', 'yes')
}
if (!store.get('isMaximized')){
  store.set('isMaximized', 'no')
}
if (!store.get('mIsMaximized')){
  store.set('mIsMaximized', 'no')
}
if (!store.get('eIsMaximized')){
  store.set('eIsMaximized', 'no')
}
let tooltip = store.get('tooltip');
let onLaunch = store.get('tooltipLaunch')
var tooltipOptions = {
  type: 'question',
  title: 'Notification Preference',
  message: 'Do you want to show all notifications from this app?\n\nPlease note: Even if you diable notifications, you will still be notified that TweetDeck will be running in the background. This will just turn off notifications about shortcuts and supporting the developer.\nYou can change this at any time from the Notification button in the menubar.',
  icon: __dirname + '/logo.png',
  checkboxLabel: 'Never Ask On Startup',
  checkboxChecked: false,
  buttons: ['Enable Notifications', 'Disable Notifications']
}

//Application menu
/*Template of options*/
let menuT = [
  {
    label: 'Media',
    submenu: [
      {
        label: 'Video',
        submenu: [
          {
            label: 'YouTube',
            id: 'yt',
            click(){
              disableMusic();
              musicWin('youtube');
            }
          },{
            label: 'Twitch',
            id: 'twitch',
            click(){
              disableMusic();
              musicWin('twitch');
            }
          }
        ]
      },{
        label: 'Music',
        submenu: [
          {
            label: 'Spotify',
            id: 'spotify',
            click(){
              disableMusic();
              musicWin('spotify');
            }
          },{
            label: 'OCRemix Radio',
            id: 'ocr',
            click(){
              disableMusic();
              musicWin('ocr');
            }
          }
        ]
      }
    ]
  },{
    label: 'Email',
    submenu: [
      {
        label: 'G-Mail',
        id: 'gmail',
        click(){
          disableEmail('gmail');
          emailWin('gmail');
        }
      },{
        label: 'Yahoo',
        id: 'yahoo',
        click(){
          disableEmail('yahoo');
          emailWin('yahoo');
        }
      },{
        label: 'Outlook',
        id: 'outlook',
        click(){
          disableEmail('outlook');
          emailWin('outlook');
        }
      },{
        label: 'AOL',
        id: 'aol',
        click(){
          disableEmail('aol');
          emailWin('aol');
        }
      }
    ]
  },{
    label: 'Edit',
    submenu: [
      {
        label: 'Undo',
        role: 'undo',
        accelerator: 'CommandOrControl+Z'
      },{
        label: 'Redo',
        role: 'redo',
        accelerator: 'CommandOrControl+Y'
      },{
        type: 'separator'
      },{
        label: 'Cut',
        role: 'cut',
        accelerator: 'CommandOrControl+X'
      },{
        label: 'Copy',
        role: 'copy',
        accelerator: 'CommandOrControl+C'
      },{
        label: 'Paste',
        role: 'paste',
        accelerator: 'CommandOrControl+V'
      },{
        label: 'Delete',
        role: 'delete'
      },{
        type: 'separator'
      },{
        label: 'Select All',
        role: 'selectAll',
        accelerator: 'CommandOrControl+A'
      }
    ]
  },{
    label: 'View',
    submenu: [
      {
        label: 'Reload',
        role: 'reload',
        accelerator: 'F5'
      },{
        label: 'Clear Cache & Reload',
        role: 'forceReload',
        accelerator: 'CommandOrControl+F5'
      },{
        label: 'Toggle Dev Tools',
        role: 'toggledevtools',
        accelerator: 'CommandOrControl+Alt+I',
        enabled: true,
        visible: false
      },{
        type: 'separator'
      },{
        label: 'Actual Size',
        role: 'resetZoom',
        accelerator: 'CommandOrControl+0'
      },{
        label: 'Zoom In',
        role: 'zoomIn',
        accelerator: 'CommandOrControl+Plus'
      },{
        label: 'Zoom Out',
        role: 'zoomOut',
        accelerator: 'CommandOrControl+-'
      },{
        type: 'separator'
      },{
        label: 'Toggle Full Screen',
        role: 'togglefullscreen',
        accelerator: 'CommandOrControl+F11'
      }
    ]
  },{
    label: 'Window',
    submenu: [
      {
        label: 'Minimize',
        role: 'minimize',
        accelerator: 'CommandOrControl+M'
      },{
        label: 'Close',
        role: 'close',
        accelerator: 'CommandOrControl+W'
      }
    ]
  },{
    label: 'Notifications',
    click(){
      dialog.showMessageBox(tooltipOptions).then(result => {
        if (result.checkboxChecked === true){
          store.set('tooltipLaunch', 'no')
        } else {
          store.set('tooltipLaunch', 'yes')
        }
        if (result.response === 0){
          store.set('tooltip', 'yes')
        }
        if (result.response === 1){
          store.set('tooltip', 'no');
        }
      })
    }
  },{
    label: 'About',
    role: 'about',
    submenu: [
      {
        label: title(),
        enabled: false,
      },{
        label: "Version " + versionNum(),
        enabled: false,
      },{
        label: "Build: " + buildNum(),
        enabled: false,
      },{
        label: "Changelog",
        click(){
          changeLog()
        }
      },{
        label: 'Check For Updates',
        id: 'update-check',
        click(){
          manualCheck = 'true';
          updateCheck();
        }
      },{
        label: 'Download Update',
        id: 'dl-update',
        visible: false,
        click(){
          shell.openExternal('https://github.com/rampantepsilon/tweetdeck/releases');
        }
      }
    ]
  }
]
const menu = Menu.buildFromTemplate(menuT); //Add Template to Menu

//Function for Changelog
function changeLog(){
  dialog.showMessageBox(null, changelogOptions, (response, checkboxChecked) =>{});
}

//MenuItem Variables
var updateItem = menu.getMenuItemById('dl-update'); //Download Updates Button
var upd8CheckBtn = menu.getMenuItemById('update-check'); //Check for Updates Button

//Music Function for enable/disable options
var musicSources = ['yt','spotify','ocr','twitch'];
function disableMusic(){
  for (var i = 0; i < musicSources.length; i++){
    menu.getMenuItemById(musicSources[i]).enabled = false;
  }
}
function enableMusic(){
  for (var i = 0; i < musicSources.length; i++){
    menu.getMenuItemById(musicSources[i]).enabled = true;
  }
}

//Music Function for enable/disable options
var emailSources = ['gmail','yahoo','outlook','aol'];
function disableEmail(source){
  menu.getMenuItemById(source).enabled = false;
}
function enableEmail(source){
  menu.getMenuItemById(source).enabled = true;
}

//mainWindow function to be called by app.on('ready')
function createWindow () {
  //Call Notification Dialog before window loads
  var lLoop = onLaunch;
  if (lLoop == 'yes'){
    dialog.showMessageBox(tooltipOptions).then(result => {
      if (result.checkboxChecked === true){
        store.set('tooltipLaunch', 'no')
      } else {
        store.set('tooltipLaunch', 'yes')
      }
      if (result.response === 0){
        store.set('tooltip', 'yes')
      }
      if (result.response === 1){
        store.set('tooltip', 'no');
      }
    })
  }

  var show = true; //Variable for tracking if window is active
  let { width, height } = store.get('windowBounds'); //Get Stored window dimensions
  let isMaximized = store.get('isMaximized');

  //Window Variables
  const mainWindow = new BrowserWindow({
    width: width,
    height: height,
    icon: __dirname + "/logo.png",
    title: title(),
    webPreferences: {
      nativeWindowOpen: true,
      nodeIntegration: true
    }
  })

  if (process.platform == 'win32'){
    if (isMaximized == 'yes'){
      mainWindow.maximize();
    }
  }

  //Page to load (Leaving other file commented out until finished)
  mainWindow.loadURL('https://tweetdeck.twitter.com')
  //mainWindow.loadFile('src/index.html')

  // Open the DevTools (Uncomment to open on launch. Press Ctrl+Alt+I to open in app with or without this line)
  //mainWindow.webContents.openDevTools()

  //Add Menu (Leaving other code incase both windows need different menus)
  Menu.setApplicationMenu(menu)
  //mainWindow.setMenu(menu);

  //Options for dialog asking to hide/show music too
  var optionsHMusic = {
    type: 'question',
    title: 'Media Confirmation',
    message: 'TweetDeck is trying to hide all windows.\nDo you want to hide the Media window?',
    icon: __dirname + '/logo.png',
    buttons: ['Yes', 'No']
  }
  var optionsSMusic = {
    type: 'question',
    title: 'Media Confirmation',
    message: 'TweetDeck is trying to show all windows.\nDo you want to show the Media window?',
    icon: __dirname + '/logo.png',
    buttons: ['Yes', 'No']
  }

  //Options for dialog asking to hide/show Email too
  var optionsHEmail = {
    type: 'question',
    title: 'Email Confirmation',
    message: 'TweetDeck is trying to hide all windows.\nDo you want to hide the Email window?',
    icon: __dirname + '/logo.png',
    buttons: ['Yes', 'No']
  }
  var optionsSEmail = {
    type: 'question',
    title: 'Email Confirmation',
    message: 'TweetDeck is trying to show all windows.\nDo you want to show the Email window?',
    icon: __dirname + '/logo.png',
    buttons: ['Yes', 'No']
  }

  //Store Information About Size
  mainWindow.on('resize', () => {
    //Get Bounds
    let { width, height } = mainWindow.getBounds();
    //Save Information
    store.set('windowBounds', { width, height });
  })

  // Emitted when the window is minimized.
  mainWindow.on('minimize', function(event){
    event.preventDefault();
    show = false;
    mainWindow.hide(); //Pass all other variables to .on('hide')
    if (musicOn == 'true'){
      if (mediaShow == 'true'){
        dialog.showMessageBox(optionsHMusic).then(result => {
          if (result.response === 0){
            homeWindow.hide();
          }
        })
      }
    }
    if (emailOn == 'true'){
      if (emailShow == 'true'){
        dialog.showMessageBox(optionsHEmail).then(result => {
          if (result.response === 0){
            emailWindowT.hide();
          }
        })
      }
    }
  })

  // Emitted when the window is maximized.
  mainWindow.on('maximize', function(event){
    store.set('isMaximized', 'yes')
  })

  // Emitted when the window exits a maximized state.
  mainWindow.on('unmaximize', function(event){
    store.set('isMaximized', 'no')
  })

  // Emitted when the window is closed.
  mainWindow.on('close', function(event){
    event.preventDefault();
    show = false;
    mainWindow.hide(); //Pass all other variables to .on('hide')
    if (musicOn == 'true'){
      if (mediaShow == 'true'){
        dialog.showMessageBox(optionsHMusic).then(result => {
          if (result.response === 0){
            homeWindow.hide();
          }
        })
      }
    }
    if (emailOn == 'true'){
      if (emailShow == 'true'){
        dialog.showMessageBox(optionsHEmail).then(result => {
          if (result.response === 0){
            emailWindowT.hide();
          }
        })
      }
    }
    event.returnValue = false;
  })

  // Emitted when the window is hidden.
  mainWindow.on('hide', function(event){
    show = false;
    myNotification.show();
    var loop = tooltip
    if (loop == 'yes'){
      not2 = setInterval(notif2, 1800000)
      console.log('not2 started.')
    }
  })

  // Emitted when the window is shown.
  mainWindow.on('show',function(event){
    if (musicOn == 'true'){
      if (mediaShow == 'false'){
        dialog.showMessageBox(optionsSMusic).then(result => {
          if (result.response === 0){
            homeWindow.show();
          }
        })
      }
    }
    if (emailOn == 'true'){
      if (emailShow == 'false'){
        dialog.showMessageBox(optionsSEmail).then(result => {
          if (result.response === 0){
            emailWindowT.show();
          }
        })
      }
    }
    if (process.platform == 'win32'){
      if (isMaximized == 'yes'){
        mainWindow.maximize();
      }
    }
    var loop = tooltip
    if (loop == 'yes'){
      clearInterval(not2);
      console.log('not2 stopped.')
    }
  })

  //Open all links in the Default Browser
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  })

  //Initialize Tray
  tray = new Tray(__dirname + '/logo.png');
  //Tray Menu Items
  const trayOptions = [
    {
      label: 'TweetDeck', enabled: false, icon: __dirname + '/logo-small.png'
    },{
      type: 'separator'
    },{
      label: 'Open TweetDeck', click: function () {
        mainWindow.show();
      }
    },{
      type: 'separator'
    },{
      label: 'Open Music Window', click: function () {
        if (musicOn == 'true'){
          homeWindow.show();
        }
      }
    },{
      label: 'Open Email Window', click: function () {
        if (emailOn == 'true'){
          emailWindowT.show();
        }
      }
    },{
      type: 'separator'
    },{
      label: 'Quit', click: function () {
        mainWindow.destroy();
        app.quit();
      }
    }
  ];
  const trayMenu = Menu.buildFromTemplate(trayOptions);
  //Set Tray Menu
  tray.setContextMenu(trayMenu);

  //Add tray click function
  if (process.platform == 'win32'){
    tray.on('click', function(){
      tray.popUpContextMenu(trayOptions);
    })
  }

  //Notifications
  const myNotification = new Notification({
    title: 'TweetDeck',
    body: 'TweetDeck is still running. Right-click the icon in the taskbar to close.',
    icon: __dirname + '/logo.png'
  })
  const secondNotif = new Notification({
    title: 'TweetDeck',
    body: 'Did you know? Press Ctrl+Alt+Shift+T or CMD+Alt+Shift+T to open/minimize TweetDeck.',
    icon: __dirname + '/logo.png'
  })
  const promotion = new Notification({
    title: 'TweetDeck',
    body: 'Like what you see? Consider Donating to the Developer! Visit paypal.me/tomjware',
    icon: __dirname + '/logo.png'
  })
  const update = new Notification({
    title: 'TweetDeck',
    body: 'New Update Available! Download @ github.com/rampantepsilon/tweetdeck/releases',
    icon: __dirname + '/logo.png'
  })

  //Function to show secondNotif via setInterval
  function notif2(){
    secondNotif.show();
  }

  //Function to show promotion via setInterval
  function promo(){
    var loop = tooltip
    if (loop == 'yes'){
      promotion.show();
    }
  }

  //Function to show update if there is a new update via setInterval
  function updateNotif(){
    if (commit > currentVer){
      update.show();
    }
  }

  //Register Global Shortcut
  globalShortcut.register('CommandOrControl+Alt+Shift+T', () => {
    if (show == true){
      mainWindow.hide();
      show = false;
    } else {
      mainWindow.show();
      show = true;
    }
  })

  //Functions to be called upon completion
  updateCheck() //Initial update check
  setInterval(updateCheck, 3600000) //Check for updates every hour
  var promoTimer = setInterval(promo, 7200000) //Promote support the creator every 2 hours
  setInterval(updateNotif, 28800000); //Notify every 8 hours if there's a new update
}

//musicWindow function to be called by Music menuItem
function musicWin(location){
  mediaShow = 'true'; //Mark window as shown
  //Get musicBounds if available if not create defaults
  if (!store.get('musicBounds')){
    store.set('musicBounds', { width: 620, height: 400 })
  }
  let { width, height } = store.get('musicBounds');
  let mIsMaximized = store.get('mIsMaximized');

  //musicWindow options
  const musicWindow = new BrowserWindow({
    width: width,
    height: height,
    icon: __dirname + "/logo.png",
    title: title(),
    webPreferences: {
      nativeWindowOpen: true,
      nodeIntegration: true
    }
  })

  if (process.platform == 'win32'){
    if (mIsMaximized == 'yes'){
      musicWindow.maximize();
    }
  }

  //Redirect based on location provided by menuItem
  if (location == 'youtube'){
    musicWindow.loadURL('https://youtube.com')
  }
  if (location == 'twitch'){
    musicWindow.loadURL('https://twitch.tv')
  }
  if (location == 'spotify'){
    musicWindow.loadURL('https://open.spotify.com/?utm_source=web-player&utm_campaign=bookmark')
  }
  if (location == 'ocr'){
    musicWindow.loadURL('https://rainwave.cc/ocremix/')
  }

  //Set Variables to notify mainWindow about the musicWindow
  homeWindow = musicWindow;
  musicOn = 'true';

  // Emitted when the window is maximized.
  musicWindow.on('maximize', function(event){
    store.set('mIsMaximized', 'yes')
  })

  // Emitted when the window exits a maximized state.
  musicWindow.on('unmaximize', function(event){
    store.set('mIsMaximized', 'no')
  })

  //Store Information About Size
  musicWindow.on('resize', () => {
    //Get Bounds
    let { width, height } = musicWindow.getBounds();
    //Save Information
    store.set('musicBounds', { width, height });
  })

  // Emitted when the window is minimized.
  musicWindow.on('minimize', function(event){
    event.preventDefault();
    show = false;
    mediaShow = 'false';
    musicWindow.hide();
  })

  // Emitted when the window is hidden.
  musicWindow.on('hide', function(event){
    show = false;
    mediaShow = 'false';
  })

  musicWindow.on('show', function(event){
    mediaShow = 'true';
    if (process.platform == 'win32'){
      if (mIsMaximized == 'yes'){
        musicWindow.maximize();
      }
    }
  })

  // Emitted when the window is closed.
  musicWindow.on('close', function(event){
    musicOn = 'false';
    mediaShow = 'false';
    enableMusic()
  })
}

//emailWindow function to be called by Email menuItem
function emailWin(location){
  emailShow = 'true'; //Mark window as shown
  //Get emailBounds if available if not create defaults
  if (!store.get('emailBounds')){
    store.set('emailBounds', { width: 800, height: 450 })
  }
  let { width, height } = store.get('emailBounds');
  let eIsMaximized = store.get('eIsMaximized');

  //musicWindow options
  const emailWindow = new BrowserWindow({
    width: width,
    height: height,
    icon: __dirname + "/logo.png",
    title: title(),
    webPreferences: {
      nativeWindowOpen: true,
      nodeIntegration: true
    }
  })

  if (process.platform == 'win32'){
    if (eIsMaximized == 'yes'){
      emailWindow.maximize();
    }
  }

  //Redirect based on location provided by menuItem
  if (location == 'gmail'){
    emailWindow.loadURL('https://mail.google.com')
  }
  if (location == 'yahoo'){
    emailWindow.loadURL('https://mail.yahoo.com')
  }
  if (location == 'outlook'){
    emailWindow.loadURL('https://outlook.live.com')
  }
  if (location == 'aol'){
    emailWindow.loadURL('https://mail.aol.com')
  }

  //Set Variables to notify mainWindow about the musicWindow
  emailWindowT = emailWindow;
  emailOn = 'true';

  // Emitted when the window is maximized.
  emailWindow.on('maximize', function(event){
    store.set('eIsMaximized', 'yes')
  })

  // Emitted when the window exits a maximized state.
  emailWindow.on('unmaximize', function(event){
    store.set('eIsMaximized', 'no')
  })

  //Store Information About Size
  emailWindow.on('resize', () => {
    //Get Bounds
    let { width, height } = emailWindow.getBounds();
    //Save Information
    store.set('emailBounds', { width, height });
  })

  // Emitted when the window is minimized.
  emailWindow.on('minimize', function(event){
    event.preventDefault();
    show = false;
    emailShow = 'false';
    emailWindow.hide();
  })

  // Emitted when the window is hidden.
  emailWindow.on('hide', function(event){
    show = false;
    emailShow = 'false';
  })

  emailWindow.on('show', function(event){
    emailShow = 'true';
    if (process.platform == 'win32'){
      if (eIsMaximized == 'yes'){
        emailWindow.maximize();
      }
    }
  })

  // Emitted when the window is closed.
  emailWindow.on('close', function(event){
    emailOn = 'false';
    emailShow = 'false';
    enableEmail(location)
  })

  //Open all links in the Default Browser
  emailWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

//Dialog boxes for manual Check for Updates
const options2 = {
  type: 'info',
  title: 'Updates Available',
  message: 'New Update Available. Click the Download Update button in the About Menu.',
  icon: __dirname + '/logo.png',
  buttons: ['Ok']
}
const options3 = {
  type: 'info',
  title: 'No New Updates',
  message: 'No New Update Available. Please check back later or wait for the notification.',
  icon: __dirname + '/logo.png',
  buttons: ['Ok']
}

//Check for Updates function
function updateCheck(){
  upd8CheckBtn.enabled = false;

  //Fix Unauthorized Error
  const instance = axios.create({
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    })
  });

  //Get New Version Info
  instance.get('http://rampantepsilon.site/projectResources/tweetdeckVersion.js')
    .then(response => {
      var version = response.data;
      version = version.substr(0,5);

      //Complete Update Check
      if (version > currentVer){
        updateItem.visible = true;
        //If manualCheck then show dialog status
        if (manualCheck == "true" || launchCheck == 'true'){
          dialog.showMessageBox(options2, (index) => {
            event.sender.send('information-dialog-selection', index)
          })
        }
        console.log("Done v" + version + " found.");
        launchCheck = 'false';
      } else {
        //If manualCheck then show dialog status
        if (manualCheck == 'true'){
          dialog.showMessageBox(options3, (index) => {
            event.sender.send('information-dialog-selection', index)
          })
        }
        console.log("Done");
        launchCheck = 'false';
      }
    })
    .catch(error => {
      console.log(error);
    })

  upd8CheckBtn.enabled = true;
}
