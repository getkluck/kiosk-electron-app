console.log('initialized');
const { app, BrowserWindow } = require('electron');
const { exec } = require('child_process');

app.whenReady().then(() => {

    const win = new BrowserWindow({
        webPreferences: {
        nodeIntegration: true,
        },
        frame: false,
        show: false,
    });

    win.once('ready-to-show', () => {
        win.show();
    });
    
    //set the project to kiosk mode
    
    //load kiosk web page if the environment is production load localhost if development
    if (process.env.DEVELOPMENT !== 'true') {
        win.loadURL('http://localhost:3000');
        //set the -webkit-app-region to drag the window
        win.webContents.on('did-finish-load', () => {
            win.webContents.insertCSS('* { -webkit-app-region: drag; }');
            //open dev tools, and set dimensions to responsive portrait 1080 x 1920
            win.webContents.openDevTools();
            win.setSize(1080, 1920);
        });
    } else {
        win.setKiosk(true);
        //start and load the react app
        win.loadURL('http://localhost:3000');
    };   

    //start the node server in public, after its loaded set show to true
    exec('nodemon public/server.js', (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            return;
        };
        console.log('loaded node');
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

