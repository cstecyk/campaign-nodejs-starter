var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var expressProxy = require('express-http-proxy');
var proxyMiddleware = require('http-proxy-middleware');
var url = require('url');
var HttpsProxyAgent = require('https-proxy-agent');

var index = require('./routes/index');
var proxy = require('./routes/proxy');


/*******************************************************
INITIALIZE VARIABLES (LOCAL OR VCAP BASED ON ENV)
*******************************************************/

var CLIENT_ID;
var CALLBACK_URL;
var AUTHORIZATION_URL;
var TOKEN_URL;
var WS_URL;
var windServiceUrl;
var uaaUri;
var base64ClientCredential;
var cfStrategy;

// Connected Device env variables
var assetTagname = '';
var assetURL = '';
var assetZoneId = '';
var timeseriesZone = '';
var timeseriesURL = '';
var isConnectedTimeseriesEnabled = false;
var isConnectedAssetEnabled = false;

// campaign Configuration details
var applicationuser = '';
var campaignappurl = '';

// This vcap object is used by the proxy module.
function buildVcapObjectFromLocalConfig(config) {
	// console.log('local config: ' + JSON.stringify(config));
	var vcapObj = {};
	if (config.uaaURL) {
		vcapObj['predix-uaa'] = [{
			credentials: {
				uri: config.uaaURL
			}
		}];
	}
	if (config.timeseriesURL) {
		vcapObj['predix-timeseries'] = [{
			credentials: {
				query: {
					uri: config.timeseriesURL,
					'zone-http-header-value': config['timeseries_zone']
				}
			}
		}];
	}
	if (config.assetURL) {
		vcapObj['predix-asset'] = [{
			credentials: {
				uri: config.assetURL,
				zone: {
					'http-header-value': config.assetZoneId
				}
			}
		}];
	}
	return vcapObj;
}

// checking NODE_ENV to load cloud properties from VCAPS
// or development properties from config.json
var node_env = process.env.node_env || 'development';
console.log('************'+node_env+'******************');
if(node_env === 'development') {
	var devConfig = require('./config.json')[node_env];
	// console.log(devConfig);
	uaaUri = devConfig.uaaURL;
	base64ClientCredential = devConfig.base64ClientCredential;
	CLIENT_ID = devConfig.clientId;
	AUTHORIZATION_URL = devConfig.uaaURL;
	TOKEN_URL = devConfig.uaaURL;
	CALLBACK_URL = devConfig.appUrl+"/callback";
	WS_URL='ws://localhost:3000/';
	// Connected Device env variables
	if(devConfig.tagname) {
		assetTagname = devConfig.tagname;
	}
	assetURL = devConfig.assetURL;
	assetZoneId = devConfig.assetZoneId;
	timeseriesZone = devConfig.timeseries_zone;
	timeseriesURL = devConfig.timeseriesURL;

	proxy.setServiceConfig(buildVcapObjectFromLocalConfig(devConfig));
	proxy.setUaaConfig(devConfig);

	applicationuser = devConfig.username;
	campaignappurl = devConfig.campaignappurl;
	referralurl=devConfig.appUrl;

} else {
	// read VCAP_SERVICES
	var vcapsServices = JSON.parse(process.env.VCAP_SERVICES);
	var uaaService = vcapsServices[process.env.uaa_service_label];
	var assetService = vcapsServices['predix-asset'];
	var timeseriesService = vcapsServices['predix-timeseries'];
	windServiceUrl = process.env.windServiceUrl;


	if(uaaService) {
		//console.log('UAA service URL is  '+uaaService[0].credentials.uri)
		AUTHORIZATION_URL = uaaService[0].credentials.uri;
		TOKEN_URL = uaaService[0].credentials.uri;
	}
	if(assetService) {
		assetURL = assetService[0].credentials.uri + "/" + process.env.assetMachine;
		assetZoneId = assetService[0].credentials.zone["http-header-value"];
	}
	if(timeseriesService) {
		timeseriesZone = timeseriesService[0].credentials.query["zone-http-header-value"];
		timeseriesURL = timeseriesService[0].credentials.query.uri;
	}

	// read VCAP_APPLICATION
	var vcapsApplication = JSON.parse(process.env.VCAP_APPLICATION);
	CALLBACK_URL = 'https://'+vcapsApplication.uris[0]+"/callback";
	WS_URL='wss://'+vcapsApplication.uris[0]+"/";
	base64ClientCredential = process.env.base64ClientCredential;
	CLIENT_ID = process.env.clientId;

	if(process.env.tagname) {
		assetTagname = process.env.tagname;
	}

	applicationuser = process.env.username;
	campaignappurl = process.env.campaignappurl;
	referralurl='https://'+vcapsApplication.uris[0];
}


var connectedDeviceConfig = {
	assetTagname : assetTagname,
	assetURL : assetURL,
	assetZoneId : assetZoneId,
	timeseriesZone : timeseriesZone,
	timeseriesURL : timeseriesURL,
	uaaURL : uaaUri,
	uaaClientId: CLIENT_ID,
	uaaBase64ClientCredential: base64ClientCredential
};

var campaignConfig = {
	user : applicationuser,
	appUrl : campaignappurl,
	referral : referralurl
};

console.log('AUTHORIZATION_URL: ' + AUTHORIZATION_URL);
console.log('TOKEN_URL: ' + TOKEN_URL);
console.log('connectedDeviceConfig: ' + JSON.stringify(connectedDeviceConfig));
console.log('***************************');


/**********************************************************************
       SETTING UP EXRESS SERVER
***********************************************************************/
var app = express();

app.set('connectedDeviceConfig', connectedDeviceConfig);
app.set('campaignConfig', campaignConfig);

app.set('trust proxy', 1);
app.use(cookieParser('predixsample'));
// Initializing default session store
// *** this session store in only development use redis for prod **
app.use(session({
	secret: 'predixsample',
	name: 'cookie_name',
	proxy: true,
	resave: true,
	saveUninitialized: true}));

//Initializing application modules
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

var server = app.listen(process.env.VCAP_APP_PORT || 3000, function () {
	console.log ('Server started on port: ' + server.address().port);
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/chartjs-scripts', express.static(__dirname + '/node_modules/chart.js/dist/'));


/****************************************************************************
	SETTING ROUTES
*****************************************************************************/

app.use('/', index);

app.get('/favicon.ico', function (req, res) {
	res.send('favicon.ico');
});

app.use('/predix-api',proxy.router);

/**
 * Api to access Timeseries data, currently using the Query response from Timeseries.
 */
app.get('/chartdata', function(req, res) {
	// console.log('in main secure route.  req.session = ' + JSON.stringify(req.session));
	console.log('Accessing the section ...'+path.join(__dirname + '/machine-simulator-Ts.json'));
	res.sendFile(path.join(__dirname + '/machine-simulator-Ts.json'));
});

app.get('/secure/campaignconfig', function(req, res) {
	console.log('getting campaign config details.');
	res.json(req.app.get('campaignConfig'));
});

// error handlers

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// development error handler - prints stacktrace
if (app.get('env') === 'development') {
	app.use(function(err, req, res) {
		if (!res.headersSent) {
			res.status(err.status || 500);
			res.send({
				message: err.message,
				error: err
			});
		}
	});
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res) {
	if (!res.headersSent) {
		res.status(err.status || 500);
		res.send({
			message: err.message,
			error: {}
		});
	}
});
module.exports = app;
