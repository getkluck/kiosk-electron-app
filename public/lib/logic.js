"use strict";

  const MyServer = () => {

    var net = require('net');
    const fetch = require('node-fetch');
    const express = require('express');
    const app = express();
    const http = require('http');
    const server = http.createServer(app);
    const { performance } = require('perf_hooks');
    const io = require("socket.io")(server, { maxHttpBufferSize: 1e8, });
    const NodeRSA = require('node-rsa');
    var crypto = require('crypto');
    var { randomUUID } = require('crypto');

    var client;
    var secondaryClient;
    var counter = 1; 
    var MAC = '';
    var MAC_LABEL;
    var key = '';
    const rsa_key = new NodeRSA({b: 2048});
    var publicKey  = rsa_key.exportKey('public');
    var privateKey = rsa_key.exportKey('private');
    var privateKey_pem = rsa_key.exportKey('private').toString('base64');
    rsa_key.setOptions({encryptionScheme: 'pkcs1'});
    const pemHeader = "-----BEGIN PUBLIC KEY-----";
    const pemFooter = "-----END PUBLIC KEY-----";
    var pemContents = publicKey.substring(pemHeader.length, publicKey.length - pemFooter.length);
    let localSettings = {};
    let terminal = {};
    let token = '';

    function xml2json(xmlStr){ 
        xmlStr = cleanXML(xmlStr);
        return xml2jsonRecurse(xmlStr,0); 
    };

    function xml2jsonRecurse(xmlStr) {
        var obj = {},
            tagName, indexClosingTag, inner_substring, tempVal, openingTag;
        while (xmlStr.match(/<[^\/][^>]*>/)) {
            openingTag = xmlStr.match(/<[^\/][^>]*>/)[0];
            tagName = openingTag.substring(1, openingTag.length - 1);
            indexClosingTag = xmlStr.indexOf(openingTag.replace('<', '</'));
            // account for case where additional information in the openning tag
            if (indexClosingTag == -1) {
                tagName = openingTag.match(/[^<][\w+$]*/)[0];
                indexClosingTag = xmlStr.indexOf('</' + tagName);
                if (indexClosingTag == -1) {
                    indexClosingTag = xmlStr.indexOf('<\\/' + tagName);
                };
            };
            inner_substring = xmlStr.substring(openingTag.length, indexClosingTag);
            if (inner_substring.match(/<[^\/][^>]*>/)) {
                tempVal = xml2json(inner_substring);
            }
            else {
                tempVal = inner_substring;
            };
            // account for array or obj //
            if (obj[tagName] === undefined) {
                obj[tagName] = tempVal;
            }
            else if (Array.isArray(obj[tagName])) {
                obj[tagName].push(tempVal);
            }
            else {
                obj[tagName] = [obj[tagName], tempVal];
            };
            xmlStr = xmlStr.substring(openingTag.length * 2 + 1 + inner_substring.length);
        };
        return obj;
    };

    function cleanXML(xmlStr) {
        xmlStr = xmlStr.replace(/:/g, '');
        xmlStr = xmlStr.replace(/\n|\t|\r/g, ''); //replace special characters
        xmlStr = xmlStr.replace(/ {1,}<|\t{1,}</g, '<'); //replace leading spaces and tabs
        xmlStr = xmlStr.replace(/> {1,}|>\t{1,}/g, '>'); //replace trailing spaces and tabs
        xmlStr = xmlStr.replace(/<\?[^>]*\?>/g, ''); //delete docType tags
        return xmlStr;
    };

    //post a log of the failed post to the server
    function postError(data, error) {
      console.log(data, error);
      let log = {
        loggerId: randomUUID(),
        timeStamp: new Date()[Symbol.toPrimitive]('number') / 1000,
        level: "WARN",
        logger: `src: logic.js ` + terminal?.terminalName + ' location: ' + terminal?.locationId,
        message: String(error) + ' ' + JSON.stringify(data?.ip) ,
        throwable: "KIOSK",
        ipAddress: terminal?.localIpAddress,
        userName: terminal?.terminalName,
        currentClientId: terminal?.clientId,
        sendLogs: true
      };

      console.log(error);

      fetch((localSettings?.url?.url ?? 'https://restaurant-rest.getkluck.com') + '/loggers', {
        method: 'POST',
        body: (JSON.stringify(log)),
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        }
      }).then(data => {
      }).catch(error => {
        console.error(error);
      });
    };
    
    io.on('connection', (socket) => {
      socket.emit('connect');
      // get the directory for the desktop
      const homedir = require('os').homedir();
      const fs = require('node:fs');
      //check if there is a settings file in kluckNode, if not create one using settingsBackup.json in the kluckNode folder and emit the settings to the client
      fs.access(homedir + '/Desktop/kluckNode/settings.json', fs.F_OK, (err) => {
        console.log(err);
        if (err) {
          fs.copyFile(homedir + '/Desktop/kluckNode/settingsBackup.json', homedir + '/Desktop/kluckNode/settings.json', (err) => {
            if (err) throw err;
            fs.readFile(homedir + '/Desktop/kluckNode/settings.json', 'utf8', (err, data) => {
              if (err) throw err;
              localSettings = JSON.parse(data);
              io.emit('settings',(data));
            });
          });
        } else {
          fs.readFile(homedir + '/Desktop/kluckNode/settings.json', 'utf8', (err, data) => {
            if (err) throw err;
              localSettings = JSON.parse(data);
              io.emit('settings', JSON.parse(JSON.stringify(data)));
          });
        };
      });

      console.log("someone connected");

      global.null = () => {};

      global.run = (arg) => {
        if(arg.name === "start" || arg.name === 'GIFT_CARD' || arg.name === "sale" || arg.name === "finish" || arg.name === "test_pair" || arg.name === "last_tran" || arg.name === "SAF") {
          counter = counter + 1;
        };
        if (arg.key.mac !== "NOT FOUND"){
          try { 
        io.emit('receiveMessage', arg.command.replace('ENTERKEY', pemContents.toString('base64')).replace('ENTERMAC',MAC).replace('MACLABEL', arg.key.macLabel).replace('MACCOUNTER', counter.toString()));
            const rsa_key3 = new NodeRSA(arg.key.key, {b: 2048});
            rsa_key3.setOptions({encryptionScheme: 'pkcs1'});
            key = rsa_key3.decrypt(arg.key.mac);
            MAC = crypto.createHmac("sha256", key).update(counter.toString()).digest('base64');
            client.write(arg.command.replace('ENTERKEY', pemContents.toString('base64')).replace('ENTERMAC',MAC).replace('MACLABEL', arg.key.macLabel).replace('MACCOUNTER', counter.toString()));
            } catch (e) {
          };
        } else {
        io.emit('receiveMessage', arg.command.replace('ENTERKEY', pemContents.toString('base64')).replace('ENTERMAC',MAC).replace('MACLABEL', arg.key.macLabel).replace('MACCOUNTER', counter.toString()));
          MAC = crypto.createHmac("sha256", key).update(counter.toString()).digest('base64');
          client.write(arg.command.replace('ENTERKEY', pemContents.toString('base64')).replace('ENTERMAC',MAC).replace('MACLABEL', MAC_LABEL).replace('MACCOUNTER', counter.toString()));
        };
      };

      socket.on('updateFile', (data, callback) => {
        const fs = require('node:fs');
        const homedir = require('os').homedir();
        fs.writeFile(homedir + '/Desktop/kluckNode/' + data.fileName, JSON.stringify(data.data), (err, data) => {
              if (!err) callback('success');
              callback(err);
        });
      });

      socket.on('readFile', (data, callback) => {
          const fs = require('node:fs');
          const homedir = require('os').homedir();
          fs.readFile(homedir + '/Desktop/kluckNode/' + data,
              'utf8',
              (err, data) => {
                if (!err) callback(data);
                else callback(err);
          });
      });
      
      const checkPrintTime = (startTime, endTime) => {
        let data = endTime - startTime;
        if (data / 1000 > 10) {
          postError(data, 'print attempt time is greater than 5 minutes');
        };
      };

      socket.once('disconnect', (reason) => {
        socket.removeAllListeners();
        console.log('disconnected', reason);
      });

      socket.on('sendTicket', (data) => {
        //post to the server
        terminal = data.terminal;
        token = data.token;
        let startTime = performance.now();
        let endTime;
        //check if the is has http at the beginning
        if (data.ip === undefined) {
          if (data.localIpAddress === undefined) {
            return;
          } else {
            data.ip = data.localIpAddress
          }
        };
        if (!data.ip.includes('http')) data.ip = 'http://' + data.ip;
        if (data.ip.length === 0) {
          return;
        };
        try {
          fetch( data.ip, {
            method: 'POST',
            body: (data.data),
            headers: { 'Content-Type': 'application/json' }
          }).then(response => {console.log(response);
            }).then(data => { 
                endTime = performance.now();
                checkPrintTime(startTime, endTime, data);
              }).catch(error => {
                endTime = performance.now();
                postError(data, error);
                socket.emit('postError', error);
                fetch(data.ip, {
                  method: 'POST',
                  body: (data.data),
                  headers: { 'Content-Type': 'application/json' }
                  }).then(response => {
                    response.json();
                    }).then(data => {
                      endTime = performance.now();
                      checkPrintTime(startTime, endTime, data);
                      }).catch(error => {
                        postError(data, error);
                        endTime = performance.now();
                        if (typeof data.backup === 'string') {
                          fetch(data.backup, {
                            method: 'POST',
                            body: (data.data),
                            headers: { 'Content-Type': 'application/json' }
                          }).then(response => {
                              response.json();
                              }).then(data => {
                                endTime = performance.now();
                                checkPrintTime(startTime, endTime, data);
                                }).catch(error => {
                                    endTime = performance.now();
                                    postError(data, error);
                                });
                        };
                      });
              });
        } catch (e) {
        };
      });

      let isConnecting = false;

      function checkConnectionStatus(clientConnector) {
        //ping the client to check if it is still connected
        // Check client connection status
        if (!client.destroyed && !client.connecting) {
            io.emit('connectionSuccess', 'Client connected successfully');
        } else {
            // Attempt reconnection
            clientConnector();
        };
        // Check secondary client connection status
        if (!secondaryClient.destroyed && !secondaryClient.connecting) {
        } else {
            // Attempt reconnection
            clientConnector();
        };
      };

      socket.on('command', (arg) => {
        if (client === undefined) {
          if (arg.ip === undefined) {
            io.emit('connectionError', 'No IP address provided');
            return;
          };
          const clientConnector = () => {
              if (isConnecting) {
                  return;
              };
              isConnecting = true;
              client = net.createConnection({
                  port: 5015,
                  host: arg.ip,
                  keepAlive: (true, 10),
              });
              secondaryClient = net.createConnection({
                  port: 5016,
                  host: arg.ip,
                  keepAlive: (true, 10),
              });
              client.on('close', function() {
                  setTimeout(clientConnector, 1000);
                  io.emit('connectionError', 'Client closed');
                  isConnecting = false;
              });
              client.on('error', function(error) {
                  console.log('here',error);
                  setTimeout(clientConnector, 1000);
                  io.emit('connectionError', error.toString());
                  isConnecting = false;
              });
              secondaryClient.on('error', function(error) {
                  console.log('here',error)
                  setTimeout(clientConnector, 10000);
                  io.emit('connectionError', error.toString());
                  isConnecting = false;
              });
              client.on('connect', function() {
                  global[arg.func](arg);
                  io.emit('connectionSuccess', 'Client connected successfully');
                  isConnecting = false;
              });
              client.on('data', (data) => {
              });
              secondaryClient.on('connect', function() {
                  global[arg.func](arg);
                  io.emit('connectionSuccess', 'Secondary client connected successfully');
                  isConnecting = false;
              });
              if (typeof client === 'object') socket.emit('receiveMessage', 'Connecting to client...' + JSON.stringify(client));
          };
            clientConnector();
            setInterval(()=> checkConnectionStatus(clientConnector), 5000);
        } else {
          try {
            client.on('data', (data) => {
                if (data.toString().includes('<RESPONSE_TEXT>Operation SUCCESSFUL')) {
                  counter = Number(xml2json(data.toString()).RESPONSE.COUNTER);
                };
                if (data.toString().includes('<MAC_KEY>')) {
                  var macResponse = xml2json(data.toString()).RESPONSE.MAC_KEY;
                  key = rsa_key.decrypt(macResponse);
                  io.emit("receiveMessage",  {label:"MAC",mac: macResponse.toString(), macLabel:xml2json(data.toString()).RESPONSE.MAC_LABEL, key: privateKey, counter: counter});
                  MAC_LABEL = xml2json(data.toString()).RESPONSE.MAC_LABEL;
                };
                if (data.toString().includes('<RESPONSE_TEXT>Match</RESPONSE_TEXT>')) {
                  counter = counter + 1;
                };
                  io.emit('receiveMessage', data.toString());
            });
            global[arg.func](arg);
          } catch (e) {
          };
        };
      });

      socket.on('cancel', (data) => {
        secondaryClient?.write(data.replace('ENTERKEY', pemContents.toString('base64')).replace('ENTERMAC',MAC).replace('MACLABEL', MAC_LABEL).replace('MACCOUNTER', counter.toString()));
      });

      socket.on('disconnect', (reason)=> {
        io.emit('disconnect', reason);
      });

      socket.on('restartSystem', (data) => {
        const exec = require('child_process').exec;
        exec('shutdown /r /t 0', function(msg) { console.log(msg) });
      });

    });
    
    io.on("disconnect", (reason)=> {
      io.emit('disconnect', reason);
    });

    process.on('uncaughtException', function (err) {       
      console.log(err);
      //Send some notification about the error  
      process.exit(1);
    });

    server.listen(5000);
  
    return 'Loaded';

  };

module.exports =  MyServer;