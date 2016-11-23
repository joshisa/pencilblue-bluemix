/**
 * This is a sample configuration meant to get users and up running on a local 
 * machine.  The configuration will not support multi-process on a single 
 * server or multi-server/elastic environments.  For more detailed information 
 * on the options provided please refer to the /include/config.js file.
 * 
 * The file can be renamed to "config.js" in the same directory as this file 
 * and it will be used as the configuration when PencilBlue is started.  If 
 * this file is used then there is no need to create a "config.json"
 */

// Modifications for BlueMix compatibility
var mongoCreds = {};
var redisCreds = {};
var bluemixport = (process.env.VCAP_APP_PORT || '8080');
var bluemixhost = (process.env.VCAP_APP_HOST || '127.0.0.1');
var appurl = 'https://127.0.0.1:8080';
var mongodbUri = require('mongodb-uri');
var redisUri = require("redis-url");
var cloud = false;
var redisNo = true;
var workers = 1; //Defaulting to 1 worker to allow plugin installations with FakeRedis
var redisHost = "127.0.0.1";
var redisPort = "27017";

if (process.env.VCAP_SERVICES) {
  console.log("PencilBlue: Bluemix PaaS environment detected.")
  cloud = true;
  appurl = 'https://' + JSON.parse(process.env.VCAP_APPLICATION)["application_uris"][0];
  try {
      var services = JSON.parse(process.env.VCAP_SERVICES);
      // look for a service starting with 'mysql'
      // MySQL is the only one supported by Ghost right now
      for (var svcName in services) {
          if (svcName.match(/^compose-for-mongodb/)) {
              mongoCreds = services[svcName][0]['credentials'];
              var uriObject = mongodbUri.parse(mongoCreds.uri)
              mongoCreds.host = uriObject.hosts[0].host
              mongoCreds.port = uriObject.hosts[0].port
              mongoCreds.user = uriObject.username
              mongoCreds.password = uriObject.password
              mongoCreds.client = 'mongo';
              mongoCreds.userpass = mongoCreds.user + ":" + mongoCreds.password + "@"
              mongoCreds.db = uriObject.database;
          }
          if (svcName.match(/^compose-for-redis/)) {
              redisCreds = services[svcName][0]['credentials'];
              var ruriObject = redisUri.parse(redisCreds.uri);
              redisCreds.hostname = ruriObject.hostname;
              redisCreds.hostport = ruriObject.host;
              redisCreds.port = ruriObject.port;
              redisCreds.client = ruriObject.protocol;
              redisCreds.db = ruriObject.database;
          }
      }

      // Testing whether we found a redis service attached or not
      if (Object.keys(redisCreds).length) {
        redisNo = false;
        workers = 6;
        redisHost = redisCreds.hostname;
        redisPort = parseInt(redisCreds.port, 10);
        console.log("PencilBlue: Bluemix: Redis instance detected. Incrementing default worker count to " + workers)
      }
  } catch (e) {
      console.log(e);
  }
} else {
  console.log("PencilBlue: Help Local. Be Local. We're running local!");
  // Initializing defaults
  mongoCreds.host = 'localhost';
  mongoCreds.port = '27017';
  mongoCreds.userpass = '';
  mongoCreds.client = 'mongo';
  mongoCreds.db = 'pencildb';
  mongoCreds.ca_certificate_base64 = '';
}

console.log("PencilBlue: App URL configured to " + appurl)


module.exports = {
    "siteName": "PencilBlue Bluemix Sample Site",
    "siteRoot": appurl,
    "sitePort": bluemixport,
    "logging": {
        "level": "info"
    },
    "db": {
        "type": mongoCreds.client,
        "servers": [
          "mongodb://" + mongoCreds.userpass + mongoCreds.host + ":" + mongoCreds.port
        ],
        "name": mongoCreds.db,
        "options": {
          "server": {
             "ssl": cloud,
             "sslValidate": cloud,
             "sslCert": Buffer.from(mongoCreds.ca_certificate_base64, 'base64').toString('ascii'),
             "sslCA" : [Buffer.from(mongoCreds.ca_certificate_base64, 'base64').toString('ascii')]
          }
        },
        "writeConcern": "majority",
        "query_logging": false,
        "authentication": {
          "un": mongoCreds.user,
          "pw": mongoCreds.password
        }
    },
    "cache": {
        "fake": redisNo,
        "host": redisHost,
        "port": redisPort,
        "uri": redisCreds.uri
    },
    "settings": {
        "use_memory": false,
        "use_cache": !redisNo
    },
    "templates": {
        "use_memory": true,
        "use_cache": false
    },
    "plugins": {
        "caching": {
            "use_memory": false,
            "use_cache": !redisNo
        }
    },
    "registry": {
        "type": "mongo"
    },
    "session": {
        "storage": mongoCreds.client
    },
    "media": {
        "provider": "/plugins/bluemix-objstor-pencilblue/include/bluemix-objstor-media-provider.js"
        //"provider": "mongo",
        //"max_upload_size": 6 * 1024 * 1024
    },
    "cluster": {
        "workers": workers,
        "self_managed": true
    },
    "multisite": {
        "enabled": false,
        "globalRoot": 'http://0.0.0.0:8080'
    }
};
