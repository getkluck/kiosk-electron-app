
var state = 1;
var macKey = '';
var macKeyDecrypted = '';       // Dom: added
var terminalKey = '';           // Dom: added
var terminalKeyDecrypted = '';  // Dom: added
var AES_KEY;                    // Dom: added

// For SECURITY|REGISTER:
//    => REG_VER=1 uses SHA1 fingerprint, REG_VER=2 uses SHA1 fingerprint
// For SECURITY|REGISTER_ENCRYPTION:
//    => REG_VER=1 uses SHA1 fingerprint, REG_VER=2 uses SHA256 fingerprint
var reg_ver = '1';              // Dom: added
var reg_encr = false;           // Dom: added; T => do SECURITY|REGISTER_ENCRYPTION, F => do SECURITY|REGISTER
var macLabel = '';
var counter = 1;
var MAC = '';
const net = require('net');
var parser = require('xml2json-light');

global.Buffer = global.Buffer || require('buffer').Buffer;

if (typeof btoa === 'undefined') {
  global.btoa = function (str) {
    console.log("global.btoa called\n");
    return new Buffer(str, 'binary').toString('base64');
  };
}

if (typeof atob === 'undefined') {
  console.log("global.atob called\n");
  global.atob = function (b64Encoded) {
    return new Buffer(b64Encoded, 'base64').toString('binary');
  };
}

// net.connect({
//     port: 5015,
//     host:'192.168.1.227',
//     onread: {
//       // Reuses a 4KiB Buffer for every read from the socket.
//       buffer: Buffer.alloc(4 * 1024),
//       callback: function(nread, buf) {
//         // Received data is available in `buf` from 0 to `nread`.
//         console.log(buf.toString('utf8', 0, nread));
//       }
//     }
//   });

// <TRANSACTION>
// <FUNCTION_TYPE>PAYMENT</FUNCTION_TYPE>
// <COMMAND>CAPTURE</COMMAND>
// <TRANS_AMOUNT>1.00</TRANS_AMOUNT>
// <CAPTURECARD_EARLYRETURN>TRUE</CAPTURECARD_EARLYRETURN>
// <MANUAL_ENTRY>FALSE</MANUAL_ENTRY>
// <FORCE_FLAG></FORCE_FLAG>
//var PUBLIC_KEY = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAugflCYHdNLX1PK+2JpedLoL4JdwpapkpwoSIYOhBF9FFri+roRTqPyyosLFGMMnO5l65z9YY1cQYSENWfhLvPROD2Oruyl1k2wSYWT+23wTB0jJjA4ktk7Q2cErNzMNiLLP0tB3rOYJHxC1HjskKBmkblF5ZDeCNzVyeEdF37zfCDD5bBIjPSpmLgH1swDQIvpULhwhmyf1AaJX+oaaCQgu6wxrbP17auMJzAjhddwUgIbkCiAEcYu8fwyTXQWFcQtfA3nufCITAcI7jmtxrXKqKWgZ23oIgvmIM1y9l6Bp9QT8MvDn63wfj54fyOW5Jb66G19x/xVGF5lH68qPErwIDAQAB'

/* ---
const crypto = require("crypto");
//const { generateKeyPairSync } = require('crypto');
const  generateKeyPairSync = require('crypto');
// The `generateKeyPairSync` method accepts two arguments:
// 1. The type of keys we want, which in this case is "rsa"
// 2. An object with the properties of the key
const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  // The standard secure default length for RSA keys is 2048 bits
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'der'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'der'
  }
});
--- */

function arrayBufferToBase64String(arrayBuffer) 
{
    var byteArray = new Uint8Array(arrayBuffer)
    var byteString = ''
    for (var i=0; i<byteArray.byteLength; i++) 
    {
      byteString += String.fromCharCode(byteArray[i])
    }
    //return btoa(byteString)
    return base64StringToArrayBuffer(byteString)
}

function base64StringToArrayBuffer(b64str) 
{
  var byteStr = atob(b64str);
  var bytes = new Uint8Array(byteStr.length)
  for (var i = 0; i < byteStr.length; i++) 
  {
    bytes[i] = byteStr.charCodeAt(i)
  }
  return bytes.buffer
}

function getPublicKeySPKI(spkiPem)
{
  //console.log("getPublicKeySPKI - spkiPem=\n", spkiPem);
  
  const pemHeader = "-----BEGIN PUBLIC KEY-----";
  const pemFooter = "-----END PUBLIC KEY-----";
  var pemContents = spkiPem.substring(pemHeader.length, spkiPem.length - pemFooter.length);

  // Strip embedded newlines before returning string
  var strPEM = pemContents.replace(/\n|\r/g, '');

  //console.log("getPublicKeySPKI - strPEM=\n", strPEM);

  return strPEM;
}

function getSpkiDer(spkiPem)
{
  console.log("getSpkiDer - spkiPem=\n", spkiPem);
  
  const pemHeader = "-----BEGIN PUBLIC KEY-----";
  const pemFooter = "-----END PUBLIC KEY-----";
  var pemContents = spkiPem.substring(pemHeader.length, spkiPem.length - pemFooter.length);
  console.log("getSpkiDer - pemContents=\n", pemContents);

  // base64 decode the string to get the binary data

  //var binaryDerString = arrayBufferToBase64String(pemContents);
  var binaryDerString = atob(pemContents);
  console.log("getSpkiDer - binaryDerString=\n", binaryDerString);
  return str2ab(binaryDerString); 
}

function ab2str(buf) 
{
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}

function str2ab(str) 
{
  console.log("str2ab - str=\n", str);

  var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
  var bufView = new Uint16Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) 
  {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

// Generate new RSA key pair using node-rsa
const crypto = require("crypto");
const NodeRSA = require('node-rsa');

const rsa_key = new NodeRSA({b: 2048})
var publicKey_pem  = rsa_key.exportKey('public');
var privateKey = rsa_key.exportKey('private');
var privateKey_pem = rsa_key.exportKey('private').toString('base64');

if ((reg_encr) && (reg_ver==2))
{
  rsa_key.setOptions({encryptionScheme: 'pkcs1_oaep'});
}
else
{
  rsa_key.setOptions({encryptionScheme: 'pkcs1'}); // Can be 'pkcs1_oaep' or 'pkcs1'
}

console.log("public key PEM:\n" + publicKey_pem.toString('base64') + "\n");
console.log("private key PEM:\n" + privateKey_pem + "\n");

//const publicKey = getSpkiDer(publicKey_pem.toString('base64'));
const publicKey = getPublicKeySPKI(publicKey_pem.toString('base64'));
console.log("public key:\n" + publicKey + "\n");

var flag = false;

const client = net.createConnection({
  port: 5015,
  //host: '192.168.1.222'
  host: '192.168.1.43'
  //host: '10.80.14.161'
}, () => {
  // 'connect' listener.
  console.log('connected to server!');
  /**  
   * Unregister call
   */
  //  client.write(unregisterAll());
  
  var fingerprint_sha1 = crypto.createHash('sha1').update(atob(publicKey)).digest('hex');
  var fingerprint_sha256 = crypto.createHash('sha256').update(atob(publicKey)).digest('hex');

  console.log("fingerprint_sha1:   " + fingerprint_sha1.toUpperCase());   // Dom: show fingerprint of public key in hex format in log
  console.log("fingerprint_sha256: " + fingerprint_sha256.toUpperCase()); // Dom: show fingerprint of public key in hex format in log

  if (reg_encr)
  {
    client.write(registerEncryptionPOS());    // Dom: use SECURITY|REGISTER_ENCRYPTION
  }
  else
  {
    client.write(registerPOS());
  }

  state = 1;
});
client.on('data', (data) => {
  console.log('\nResponse:\n', data.toString());

  //Register POS response
  /* ---
  if (state == 1) {

    var json = parser.xml2json(data.toString());
    var jsonResult = JSON.parse(JSON.stringify(json));

    macKey = jsonResult.RESPONSE.MAC_KEY;
    macLabel = jsonResult.RESPONSE.MAC_LABEL;
    state = 2;
    var xmlRequest = testMac();
    console.log(xmlRequest);
    client.write(xmlRequest);
  }
  --- */
  if (state == 1) { // SECURITY|REGISTER or SECURITY|REGISTER_ENCRYPTION POS response

    var json = parser.xml2json(data.toString());
    var jsonResult = JSON.parse(JSON.stringify(json));

    macKey = jsonResult.RESPONSE.MAC_KEY;
    terminalKey = jsonResult.RESPONSE.TERMINAL_KEY; // For REGISTER_ENCRYPTION, MAC_KEY comes back as TERMINAL_KEY
    macLabel = jsonResult.RESPONSE.MAC_LABEL;

    if (reg_encr)
    {
      // Dom - let's decrypt TERMINAL_KEY to get the 128-bit AES key
      terminalKeyDecrypted = getDecryptedTerminalKey();
      AES_KEY = terminalKeyDecrypted;
      //console.log('Decrypted TERMINAL_KEY: ', terminalKeyDecrypted)
    }
    else
    {
      // Dom - let's decrypt MAC_KEY to get the 128-bit AES key
      macKeyDecrypted = getDecryptedMac();
      AES_KEY = macKeyDecrypted;
      //console.log('Decrypted MAC_KEY:', macKeyDecrypted)
    }
    
    state = 2;
    var xmlRequest = testMac();
    console.log(xmlRequest);
    client.write(xmlRequest);
  }
  else if (state == 2) // Test Mac Response
  {
    var json = parser.xml2json(data.toString());
    var jsonResult = JSON.parse(JSON.stringify(json));
    console.log(jsonResult);
    if (jsonResult.RESPONSE.RESULT == 'OK') {
      counter = counter + 1;

      MAC = crypto.createHmac("sha256", AES_KEY).update(counter.toString()).digest('base64');
      //console.log("New MAC:", MAC);
      state = 3;
      var xmlRequest = startSession(); // Session start request
      console.log(xmlRequest);
      client.write(xmlRequest);
    }
  }
  else if (state == 3) // Start Session Response
  {
    var json = parser.xml2json(data.toString());
    var jsonResult = JSON.parse(JSON.stringify(json));
    console.log(jsonResult);
    if (jsonResult.RESPONSE.RESULT == 'OK') {
      counter = counter + 1;

      MAC = crypto.createHmac("sha256", AES_KEY).update(counter.toString()).digest('base64');
      //console.log("New MAC:", MAC);
      state = 4;
      var xmlRequest = getCaptureRequest(); // Sale request
      console.log(xmlRequest);
      client.write(xmlRequest)
    }
  }
  else if (state == 4)
  {
    // var json = parser.xml2json(data.toString());
    // var jsonResult = JSON.parse(JSON.stringify(json));
    // console.log(jsonResult);
    // if (jsonResult.RESPONSE.RESULT == 'OK') {
      counter = counter + 1;

      MAC = crypto.createHmac("sha256", AES_KEY).update(counter.toString()).digest('base64');
      //console.log("New MAC:", MAC);
      state = 5;
      var xmlRequest = finishSession(); // finish session after sale response
      console.log(xmlRequest);
      client.write(xmlRequest)
    //}
  }
  // client.end();
});
client.on('end', () => {
  console.log('disconnected from server');
});

function registerPOS() {
  var XMLWriter = require('xml-writer');
  xw = new XMLWriter(true); // Dom: added true parameter for pretty-printed XML output
  xw.startDocument();

  // Dom: make sure ENTRY_CODE is padded out to 4 digits
  var startCode = between(1, 9999);
  if (startCode < 9999)
  {
    if (startCode <= 9999) { startCode = ("000"+startCode).slice(-4); }
  }

  xw.startElement('TRANSACTION')
    .writeElement('FUNCTION_TYPE', 'SECURITY')
    .writeElement('COMMAND', 'REGISTER')
    .writeElement('KEY', publicKey.toString('base64'));

  if (reg_ver == '1')
  {
    xw.writeElement('ENTRY_CODE', startCode);
    xw.writeElement('REG_VER', '1');
  }
  else
  {
    xw.writeElement('REG_VER', '2');
  }

  xw.endDocument();

  console.log(xw.toString());
  return xw.toString();
}

// This version uses SECURITY|REGISTER_ENCRYPTION with REG_VER=2
function registerEncryptionPOS() {
  var XMLWriter = require('xml-writer');
  xw = new XMLWriter(true); // Dom: added true parameter for pretty-printed XML output
  xw.startDocument();

  // REG_VER=1 uses SHA1 fingerprint, REG_VER=2 uses SHA256 fingerprint
  //reg_ver = '1'; 

  xw.startElement('TRANSACTION')
    .writeElement('FUNCTION_TYPE', 'SECURITY')
    .writeElement('COMMAND', 'REGISTER_ENCRYPTION')
    //.writeElement('KEY', publicKey.toString('base64'));
    .writeElement('KEY', publicKey);

  if (reg_ver == '1')
  {
    xw.writeElement('REG_VER', '1');
  }
  else
  {
    xw.writeElement('REG_VER', '2');
  }
  xw.endDocument();

  console.log("publicKey: [" + publicKey + "]");
  var fingerprint_sha1 = crypto.createHash('sha1').update(atob(publicKey)).digest('hex');
  var fingerprint_sha256 = crypto.createHash('sha256').update(atob(publicKey)).digest('hex');

  console.log("fingerprint_sha1:   " + fingerprint_sha1.toUpperCase());   // Dom: show fingerprint of public key in hex format in log
  console.log("fingerprint_sha256: " + fingerprint_sha256.toUpperCase()); // Dom: show fingerprint of public key in hex format in log

  // WORKS!
  //fingerprint_sha1 = crypto.createHash('sha1').update(atob(publicKey)).digest('hex');
  //console.log("fingerprint_sha1:   " + fingerprint_sha1.toUpperCase());   // Dom: show fingerprint of public key in hex format in log
  
  console.log('Sending SECURITY|REGISTER_ENCRYPTION request...');
  console.log(xw.toString());
  return xw.toString();
}

function unregisterAll() {
  var XMLWriter = require('xml-writer');
  xw = new XMLWriter(true); // Dom: added true parameter for pretty-printed XML output
  xw.startDocument();
  xw.startElement('TRANSACTION')
    .writeElement('FUNCTION_TYPE', 'SECURITY')
    .writeElement('COMMAND', 'UNREGISTERALL');

  xw.endDocument();
  console.log(xw.toString());
  return xw.toString();
}

//Function to start session

function getCaptureRequest() {
  var XMLWriter = require('xml-writer');
  xw = new XMLWriter(true); // Dom: added true parameter for pretty-printed XML output
  xw.startDocument();
  xw.startElement('TRANSACTION')
    .writeElement('FUNCTION_TYPE', 'PAYMENT')
    .writeElement('COMMAND', 'CAPTURE')
    .writeElement('PAYMENT_TYPE', '')
    .writeElement('TRANS_AMOUNT', '1.55')
    // .writeElement('CAPTURECARD_EARLYRETURN','TRUE')
    .writeElement('MANUAL_ENTRY', 'FALSE')
    .writeElement('MAC_LABEL', macLabel)
    .writeElement('COUNTER', counter)
    .writeElement('MAC', MAC)
    .writeElement('FORCE_FLAG', 'FALSE');

  xw.endDocument();
  return xw.toString();
}

/* <TRANSACTION>
  <FUNCTION_TYPE>DEVICE</FUNCTION_TYPE>
  <COMMAND>SET_PARM</COMMAND>
  <PARM_MID>001</PARM_MID>
  <PARM_TID>001</PARM_TID>
  <PARM_LANE>01</PARM_LANE>
  <PARM_HOST_IND>CP</PARM_HOST_IND>
</TRANSACTION> */
function setParam() {
  var XMLWriter = require('xml-writer');
  xw = new XMLWriter(true); // Dom: added true parameter for pretty-printed XML output
  xw.startDocument();
  xw.startElement('TRANSACTION')
    .writeElement('FUNCTION_TYPE', 'DEVICE')
    .writeElement('COMMAND', 'SET_PARM')
    .writeElement('PARM_MID', '001')
    .writeElement('PARM_TID', '001')
    .writeElement('PARM_LANE', '01')
    .writeElement('PARM_HOST_IND', 'CP')

  xw.endDocument();
  return xw.toString();
}

/* <FUNCTION_TYPE>SESSION</FUNCTION_TYPE>
<COMMAND>START</COMMAND>
<COUNTER>1</COUNTER>
<MAC> … </MAC>
<MAC_LABEL>REG2</MAC_LABEL>
<LANE>3</LANE>
<STORE_NUM>203</STORE_NUM>
<INVOICE>TA1234</INVOICE>
<SWIPE_AHEAD>1</SWIPE_AHEAD> */

function startSession() {
  // var crypto = require("crypto");

  // var decrypted = crypto.createHmac("sha256").update(jsonResult.RESPONSE.MAC_KEY).digest();
  // console.log(decrypted.toString());
  var XMLWriter = require('xml-writer');

  xw = new XMLWriter(true); // Dom: added true parameter for pretty-printed XML output
  xw.startDocument();
  xw.startElement('TRANSACTION')
    .writeElement('FUNCTION_TYPE', 'SESSION')
    .writeElement('COMMAND', 'START')
    .writeElement('BUSINESSDATE', '20210909')
    .writeElement('SWIPE_AHEAD', '1')
    .writeElement('TRAINING_MODE', '0')
    .writeElement('INVOICE', '234569')
    .writeElement('POS_IP', '192.168.1.152')
    .writeElement('POS_PORT', '5017')
    .writeElement('COUNTER', counter)
    .writeElement('MAC_LABEL', macLabel)
    .writeElement('MAC', MAC)
    .writeElement('NOTIFY_SCA_EVENTS', 'FALSE');

  xw.endDocument();
  return xw.toString();
}

function getDecryptedMac() {
  //var crypto = require("crypto");

  //console.log('MAC_KEY : ', Buffer.from(macKey))
  console.log('MAC_KEY : ', macKey)

  // Use node-rsa to do the decryption, instead of crypto module
  var macKey_bin = atob(macKey);  // First convert the MAC_KEY value from base64 to binary
  //console.log('macKey_bin: ', macKey_bin.toString('hex'));

  var decryptedString = rsa_key.decrypt(macKey);
  console.log('MAC_KEY (decrypted): ', decryptedString.toString('hex'));
  return decryptedString;

  const rsaPrivateKey = {
    key: privateKey_pem, //privateKey,
    passphrase: '',
    padding: crypto.constants.RSA_PKCS1_PADDING,
    type: 'pkcs8',
    format: 'der'
  };

  const decryptedMessage = crypto.privateDecrypt(
    rsaPrivateKey,
    atob(macKey)
  );
  return decryptedMessage;
}

function getDecryptedTerminalKey() {
  //var crypto = require("crypto");

  //console.log('TERMINAL_KEY : ', Buffer.from(terminalKey))
  console.log('TERMINAL_KEY : ', terminalKey)

  // Use node-rsa to do the decryption, instead of crypto module
  var terminalKey_bin = atob(terminalKey);  // First convert the TERMINAL_KEY value from base64 to binary
  //console.log('terminalKey_bin: ', terminalKey_bin.toString('hex'));

  var decryptedString = rsa_key.decrypt(terminalKey); // Was terminalKey_bin);
  console.log('TERMINAL_KEY (decrypted): ', decryptedString);
  return decryptedString;

  /* ---
  var paddingType;
  if (reg_ver == '1')
  {
    paddingType = crypto.constants.RSA_PKCS1_PADDING;
  }
  else
  {
    paddingType = crypto.constants.RSA_PKCS1_OAEP_PADDING;
  }
  --- */
  //var o1 = OAEPParameterSpec 

  const rsaPrivateKey = {
    key: privateKey_pem, //privateKey,
    passphrase: '',
    //padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    //...padding: paddingType,
    type: 'pkcs8',
    format: 'der'
  };

  const decryptedMessage = crypto.privateDecrypt(
    rsaPrivateKey,
    atob(terminalKey)
  );
  return decryptedMessage;
}

function testMac() {
  var XMLWriter = require('xml-writer');
  //var counterBuffer = Buffer.from(counter.toString());
  var counterBuffer = new Buffer(counter.toString());
  MAC = crypto.createHmac("sha256", AES_KEY).update(counter.toString()).digest('base64');
  console.log("MAC: " + MAC + "\n");
  xw = new XMLWriter(true); // Dom: added true parameter for pretty-printed XML output
  xw.startDocument();
  xw.startElement('TRANSACTION')
    .writeElement('FUNCTION_TYPE', 'SECURITY')
    .writeElement('COMMAND', 'TEST_MAC')
    .writeElement('MAC_LABEL', macLabel)
    .writeElement('MAC', MAC)
    .writeElement('COUNTER', counter);
  xw.endDocument();
  return xw.toString();
}

function finishSession() {
  var XMLWriter = require('xml-writer');
  xw = new XMLWriter(true); // Dom: added true parameter for pretty-printed XML output
  xw.startDocument();
  xw.startElement('TRANSACTION')
    .writeElement('FUNCTION_TYPE', 'SESSION')
    .writeElement('COMMAND', 'FINISH')
    .writeElement('MAC_LABEL', macLabel)
    .writeElement('MAC', MAC)
    .writeElement('COUNTER', counter);
  xw.endDocument();
  return xw.toString();
}

/**
 * Returns a random number between min (inclusive) and max (exclusive)
 */
function between(min, max) {
  return Math.floor(
    Math.random() * (max - min) + min
  )
}
