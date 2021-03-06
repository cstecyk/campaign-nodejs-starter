/**
 * This module can be used to set up reverse proxying from client to Predix services.
 * It assumes only one UAA instance, one UAA client, and one instance of each service.
 * Use setUaaConfig() and setServiceConfig() for local development.
 * In cloud foundry, set the following environment vars: clientId, base64ClientCredential
 * Info for bound services is read from VCAP environment variables.
 */

var url = require('url');
var express = require('express');
var expressProxy = require('express-http-proxy');
var HttpsProxyAgent = require('https-proxy-agent');
var router = express.Router();
var vcapServices = {};

var corporateProxyServer = process.env.http_proxy || process.env.HTTP_PROXY || process.env.https_proxy || process.env.HTTPS_PROXY;
var corporateProxyAgent;
if (corporateProxyServer) {
	corporateProxyAgent = new HttpsProxyAgent(corporateProxyServer);
}

var clientId = process.env.clientId;
var base64ClientCredential = process.env.base64ClientCredential;
var uaaURL = (function() {
	var vcapsServices = process.env.VCAP_SERVICES ? JSON.parse(process.env.VCAP_SERVICES) : {};
	var uaaService = vcapsServices['predix-uaa'];
	var uaaURL;

	if(uaaService) {
		uaaURL = uaaService[0].credentials.uri;
	}
	return uaaURL;
}) ();
//console.log('clientId: ' + clientId);
//console.log('base64ClientCredential: ' + base64ClientCredential);
//console.log('uaaURL: ' + uaaURL);

// Pass a VCAPS object here if desired, for local config.
//  Otherwise, this module reads from VCAP_SERVICES environment variable.
var setServiceConfig = function(vcaps) {
	vcapServices = vcaps;
	setProxyRoutes();
};

var setUaaConfig = function(options) {
	clientId = options.clientId || clientId;
	uaaURL = options.uaaURL || uaaURL;
	base64ClientCredential = options.base64ClientCredential || base64ClientCredential;
};

var getClientToken = function(successCallback, errorCallback) {
	//console.log("calling clientToken" + clientId + base64ClientCredential)
	var request = require('request');
	var options = {
		method: 'POST',
		url: uaaURL + '/oauth/token',
		form: {
			'grant_type': 'client_credentials',
			'client_id': clientId
		},
		headers: {
			'Authorization': 'Basic ' + base64ClientCredential
		}
	};

	request(options, function(err, response, body) {
		if (!err && response.statusCode == 200) {
			 //console.log('response from getClientToken: ' + body);
			var clientTokenResponse = JSON.parse(body);
			//console.log('response from getClientToken: ' + clientTokenResponse.access_token);
			successCallback(clientTokenResponse['token_type'] + ' ' + clientTokenResponse['access_token']);
		} else if (errorCallback) {
			errorCallback(body);
		} else {
			console.log('ERROR fetching client token: ' + body);
		}
	});
};

function cleanResponseHeaders (rsp, data, req, res, cb) {
	res.removeHeader('Access-Control-Allow-Origin');
	cb(null, data);
}

function buildDecorator(key, credentials) {
	var zoneId = getEndpointAndZone(key, credentials).zoneId;
	var decorator = function(req) {
		// if (req.session) {
		// 	console.log('session: ' + JSON.stringify(req.session));
		// } else {
		// 	console.log('no session');
		// }
		// console.log('zone id: ' + zoneId);
		if (corporateProxyAgent) {
			req.agent = corporateProxyAgent;
		}
		req.headers['Content-Type'] = 'application/json';
		req.headers['Predix-Zone-Id'] = zoneId;
		return req;
	};
	return decorator;
}

function getEndpointAndZone(key, credentials) {
	var out = {};
	// ugly code needed since vcap service variables are not consistent across services
	// TODO: all the other predix services
	if (key === 'predix-asset') {
		//console.log('proxy found ' + key);
		out.serviceEndpoint = credentials.uri;
		out.zoneId = credentials.zone['http-header-value'];
	} else if (key === 'predix-timeseries') {
		var urlObj = url.parse(credentials.query.uri);
		out.serviceEndpoint = urlObj.protocol + '//' + urlObj.host;
		out.zoneId = credentials.query['zone-http-header-value'];
	}
	if (!out.serviceEndpoint) {
		console.log('no proxy set for service: ' + key);
	}
	return out;
}

var setProxyRoute = function(key, credentials) {
	// console.log(JSON.stringify(credentials));
	var routeOptions = getEndpointAndZone(key, credentials);
	if (!routeOptions.serviceEndpoint) {
		return;
	}
	//console.log('setting proxy route for key: ' + key);
	console.log('serviceEndpoint: ' + routeOptions.serviceEndpoint);
	// console.log('zone id: ' + routeOptions.zoneId);
	var decorator = buildDecorator(key, credentials);

	router.use('/' + key, expressProxy(routeOptions.serviceEndpoint, {
		https: true,
		forwardPath: function (req) {
			console.log('req.url: ' + req.url);
			return req.url;
		},
		intercept: cleanResponseHeaders,
		decorateRequest: decorator
	}));
};

// Fetches client token and stores in session.
router.use('/', function(req,res,next){
	function errorHandler(errorString) {
		// TODO: fix, so it doesn't return a status 200.
		//  Tried sendStatus, but headers were already set.
		res.send(errorString);
	}
	console.log('proxy root route');
	if (req.session) {
		 console.log('session found.');
		if (!req.session.clientToken) {
			 //console.log('fetching client token');
			getClientToken(function(token) {
				req.session.clientToken = token;
				req.headers['Authorization'] = req.session.clientToken;
				next();
			}, errorHandler);
		} else {
			 //console.log('client token found in session'+req.session.clientToken);
			req.headers['Authorization'] = req.session.clientToken;
			next();
		}
	} else {
		next(res.sendStatus(403).send('Forbidden'));
	}
});

// TODO: Support for multiple instances of the same service.
var setProxyRoutes = function() {
	var vcapString = process.env.VCAP_SERVICES;
	var serviceKeys = [];
	vcapServices = vcapString ? JSON.parse(vcapString) : vcapServices;
	//console.log('vcaps: ' + JSON.stringify(vcapServices));

	serviceKeys = Object.keys(vcapServices);
	serviceKeys.forEach(function(key) {
		setProxyRoute(key, vcapServices[key][0].credentials);
	});
};
setProxyRoutes();

module.exports = {
	router: router,
	setServiceConfig: setServiceConfig,
	setUaaConfig: setUaaConfig
};
