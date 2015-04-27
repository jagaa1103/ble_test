//SafeLight


var noble = require('./index');
var http = require('http');
var pizza = require('./pizza');

'use strict';

var os = require('os');
var ifaces = os.networkInterfaces();

Object.keys(ifaces).forEach(function (ifname) {
  var alias = 0
    ;

  ifaces[ifname].forEach(function (iface) {
    if ('IPv4' !== iface.family || iface.internal !== false) {
      // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      return;
    }

    if (alias >= 1) {
      // this single interface has multiple ipv4 addresses
      console.log(ifname + ':' + alias, iface.address);
    } else {
      // this interface has only one ipv4 adress
      console.log(ifname, iface.address);
    }
  });
});


//button is attaced to pin 17, led to 18  
// http://next-page.co.kr/web/health/chi_reportHeartScanner.php?device_name=xxxx&uuid=xxxx&mac_address=xxxx&timestamp=yyyy-mm-dd hh:mm:ss  

// http://next-page.co.kr/web/health/chi_reportHeartScanner.php?device_name=xxxx&uuid=xxxx&mac_address=xxxx&timestamp=yyyy-mm-dd hh:mm:ss  

var control_center_url = "http://next-page.co.kr/web/health/";
var control_center_test_url = "http://next-page.co.kr/web/health/";


  function getTime() {
    var d = new Date();   
    return (pad(d.getHours())+ ":" +pad(d.getMinutes()) +":"+ pad(d.getSeconds()))
  }

// 1. Ble ready ?
// 2. uuid / macaddress / device_name : 유니크한 디바이스만 전담하도록
// 2. 사운드 처리(필요시) - 옵션 
// 3. 마이크 녹음 - 옵션
// 4. 값이 이상시 처리  hearterate = 0 


console.log("\r\n\r\n\r\n-----------------------------------");
console.log(getTime()+ ' : @>> start app ...' + new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''));

// console.log(noble);

var heart = null;
var pedo = null;  

// var deviceUUID = "63d25b72e7bc40188b3cca62ba0d111c";
var deviceUUID = null;

var heartBleServiceUuid = 'fff0';
var heartBleService = null;

var outChaUuid = 'fff3';
var inChaUuid = 'fff4';
var inCha = null;
var outCha = null;
var TARGET_BLE_PREFIX = 'BlueLE';
var haveConnection = false;

var device_name = null;
var device_uuid = null;
var timestamp = null;
var mac_address = null;


var sosAlarmTimer = null;

  function pad(n) {
    return (n < 10) ? ("0" + n) : n;
  } 
  

  function startMonitoring() {
      console.log(getTime()+ ' : @>> startMonitoring...');
      // 5시간 이상 무보고시
      // ...
  } 

  function startScanning() {
      console.log(getTime()+ ' : @>> start scanning...1');
      haveConnection = false;

      // noble.startScanning();
      noble.startScanning([heartBleServiceUuid], false);
  } 

  function stopScanning() {
      console.log(getTime()+ ' : @>> stopScanning...');
    noble.stopScanning();
  } 

  noble.on('stateChange', function(state) {
    if (state === 'poweredOn') {
         console.log(getTime()+ ' : poweredOn...'+ new Date());
        startScanning();
        setInterval(function(){
            startMonitoring();
        }, 120000);

    } else {
          console.error(getTime()+ ' : *********** powered OFF ********* ...');
       stopScanning();
    }
  })



noble.on('discover', function(peripheral) {
  

  console.log('\r\n');
  try {
    var device_name = peripheral.advertisement.localName;
    console.log(getTime()+ ' : found peripheral '
    + "\r\n\t\t, device_name : [" + device_name +"]"
    + "\r\n\t\t, uuid : [" + peripheral.uuid + "]"
    + "\r\n\t\t, rssi : [" + peripheral.rssi + "]"
    + "\r\n\t\t, power : [" + peripheral.advertisement.txPowerLevel + "]"
    + "\r\n\t\t, manufacturerData : [" + peripheral.advertisement.manufacturerData + "]"
     );
    } catch(e){
        console.log(e.message);
    }
  if (device_name == undefined || !device_name || device_name.indexOf(TARGET_BLE_PREFIX) < 0) {
      console.log(getTime()+ '@>> device_name mismatch : SKIPPED!');
  } else {
    if (haveConnection == true) {
      console.log(getTime()+ '@>> Already This Reader have a pending Connection : SKIPPED!');
      stopScanning();
      return;
    }

    haveConnection = true;
    

    setTimeout(function() {
        try{
            connectBLE(peripheral);
        } catch (e) {
            console.log(e.message);
        }
    }, 3000);
  }

})

function connectBLE(peripheral) {
    console.log('\r\n');
    console.log(getTime()+ ' : @>> connect to ... ' + peripheral.advertisement.localName);


    peripheral.connect(function(err) {
      outCha = null;
      inCha = null;

         deviceUUID = peripheral.uuid;
         mac_address = peripheral.uuid;
         device_name = peripheral.advertisement.localName;
          console.log(getTime()+ ' : @>> connect SUCCESS!');
          stopScanning();

         if (err) {
            console.log( getTime()+ '@>> ERROR ON connect err = ' + err+'\r\n\r\n');  
            startScanning();
            return;
         } 
           peripheral.once('disconnect', function(err) {
            console.log( getTime()+ '@>> peripheral.once > disconnect');  
            console.log(getTime()+ ' : on-> disconnect, err :' + err);
            console.log(getTime()+ ' : \n\n--------------------start scanning...for recovery');

            startScanning();
           });

        
        console.log(getTime()+ ' : @>> discoverServices...');
        peripheral.discoverServices([heartBleServiceUuid], function(err, services) {
           console.log(getTime()+ ' : @>> discoverServices : ' + services.length );
         services.forEach(function(service) {
           console.log('\r\n--------------------------');
           console.log(getTime()+ ' : @>> discoverServices uuid : ' + service.uuid);
            
            service.discoverCharacteristics([], function(err, characteristics) {

              characteristics.forEach(function(characteristic) {
                //
                // Loop through each characteristic and match them to the
                // UUIDs that we know about.
                //
                console.log(getTime()+ ' : @>> found characteristic:', characteristic.uuid);

                if (characteristic.uuid == inChaUuid) {
                    inCha = characteristic;
                }
                if (characteristic.uuid == outChaUuid) {
                    outCha = characteristic;
                                console.log(getTime()+ ' : @>> found characteristic:', outCha);
                }
                
              })

                if (inCha && outCha) {
                    setInterval(function(){
                      writeMessage();
                    }, 5000);

                  readData();
              }
              else {
                console.log(getTime()+ ' : @>> missing characteristics');
              }
            })
        })
    })
  })
}


function readData() {
    console.log(getTime()+ ' : @>> waiting application message...');
    inCha.on('read', function(data, isNotification) {
        console.log('\r\n');
        console.log(getTime()+ ' : data:' + data);
        writeMessage();
    });

    inCha.notify(true, function(err) {
    });  

}

function writeMessage() {
    console.log(getTime()+ ' : @>> writeMessage...');

          // // outCha.notify(true, function(err) {
          //   //
          //   // Bake at 450 degrees!
          //   var message = new Buffer("testmessage");
          //   // temperature.writeUInt16BE(450, 0);
          //   outCha.write(message, false, function(err) {
          //     if (err) {
          //       console.log('write error : ' + err);
          //     } else {
          //       console.log('write toppings ok1');

          //     }
          //   });
          // // });

      var toppings = new Buffer(2);
      toppings.writeUInt16BE(
        pizza.PizzaToppings.EXTRA_CHEESE |
        pizza.PizzaToppings.CANADIAN_BACON |
        pizza.PizzaToppings.PINEAPPLE,
        0
      );
      var message1 = new Buffer('test', 'hex');
      // outCha.on('write', true, function(err) {
      //       if (!err) {
      //         console.log(getTime()+ ' :     @>> outCha.on > write OK---------------------!!!!');
      //       } else {
      //         console.log(getTime()+ ' :     @>> outCha.on > write error *************************');
      //       }
      //     });

      outCha.write(message1, true, function(err) {
        if (!err) {
          console.log('write toppings ok1');
          
        } else {
          console.log('toppings error1');
        }     
      });
}

