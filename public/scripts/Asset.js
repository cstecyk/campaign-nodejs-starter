/**
function to submit for a Application
**/
function  submitTshirt() {

  var campaignconfig = new XMLHttpRequest();
  var campaignconfigurl = "/secure/campaignconfig";
  campaignconfig.open('GET', campaignconfigurl, true);
  campaignconfig.onload = function() {
    messageData= JSON.parse(campaignconfig.response);
     var resultString = JSON.stringify(messageData);
    if (messageData) {
      var redirectUrl = messageData.appUrl+'?pxUsername='+messageData.user+'&pxAppUrl='+messageData.referral;
       console.log("redirect Url:"+redirectUrl);
       window.open(redirectUrl);
    }
  };
  campaignconfig.onerror = function() {
    console.log("Error: Accessing campaign config" );
  };
  campaignconfig.send();

}

/**
 * gets Asset Data for the tags
**/
function getAssetData2() {
    // Get the Asset data if the Asset URI is enabled
    var tspecsdiv = document.getElementById("wind_turbine_specification");
    var sensorpecsdiv = document.getElementById("wind_turbine_sensor");
    var assetGetData = new XMLHttpRequest();
    var assetGetDataURL = "/predix-api/predix-asset/asset/wind_turbine_01";
    assetGetData.open('GET', assetGetDataURL, true);
    assetGetData.onload = function() {
      if (assetGetData.status >= 200 && assetGetData.status < 400) {
        document.getElementById("wind_turbine_specification").innerHTML = '';
        var resultJSON = JSON.parse(assetGetData.response)[0];
        var resultString = JSON.stringify(resultJSON);
        if (resultJSON) {
          var keys = Object.keys(resultJSON);
          var assetRowIndex = 0;
          for (var name in resultJSON ) {
            if(resultJSON.hasOwnProperty(name)) {
              // <label class="label" for="URI">URI : </label>
			  // <label class="label-value" for="URI Value">/asset/wind_turbine_01</label> <br>
              if(typeof resultJSON[name] == 'object')
              {
            	  if(name == "height") {
            		  var assetlabelValue = resultJSON[name].value+resultJSON[name].unit
             		 createLabelAndAppend("Height",assetlabelValue,tspecsdiv);
            	  }else if(name == "power-rating") {
            		  var assetlabelValue = resultJSON[name].value+resultJSON[name].unit
              		 createLabelAndAppend("Power Rating",assetlabelValue,tspecsdiv);
             	  }else if(name == "location") {
            		  var assetlabelValue = "lat : "+resultJSON[name].lat+",long : "+resultJSON[name].long
               		 createLabelAndAppend("Location",assetlabelValue,tspecsdiv);
              	  }else if(name == "readings") {
              		  if(typeof resultJSON[name]["power-output"] == 'object') {
              			createLabelAndAppendSensor("Power Rating",resultJSON[name]["power-output"],sensorpecsdiv)
              		  }
              		 if(typeof resultJSON[name]["power-rating"] == 'object') {
              			createLabelAndAppendSensor("Power Rating",resultJSON[name]["power-rating"],sensorpecsdiv)
               		  }
              		var mybr = document.createElement('br');
              		sensorpecsdiv.appendChild(mybr);
               		createLabelAndAppendSensor("Wind Speed",resultJSON[name]["wind-speed"],sensorpecsdiv)
               	  }
              } else {
            	  if(name == "uri") {
            		 createLabelAndAppend("URI",resultJSON[name],tspecsdiv);
            	  }else if (name == "serial") {
            		  createLabelAndAppend("Serial# ",resultJSON[name],tspecsdiv);
            	  }else if (name == "padMount") {
            		  createLabelAndAppend("Mount pad",resultJSON[name],tspecsdiv);
            	  }else if (name == "manufacturer") {
            		  createLabelAndAppend("Manufacturer",resultJSON[name],tspecsdiv);
            	  }else if (name == "model") {
            		  createLabelAndAppend("Model",resultJSON[name],tspecsdiv);
            	  }

              }
            }else {
              console.log('this is key '+name);
            }
          }

        } else {
          console.log("Asset Model Information is not available for:" );
        }
      }else if(assetGetData.status >= 404 ) {
        console.log("Asset Model Information is not available for:" );
      }
       else {
        console.log("Error: Error Acceesing Asset Service : " );
      }
    };
    assetGetData.onerror = function() {
      console.log("Error: Accessing Asset Service for : " );
    };

    assetGetData.send();
}

function createLabelAndAppendSensor(name,jsonvalue,sensorpecsdiv) {
	var itemsensorLabel = document.createElement("Label");
	itemsensorLabel.setAttribute("for", name);
	itemsensorLabel.className = "label";
	var myb = document.createElement('b');
	myb.innerHTML = name+" : ";
	itemsensorLabel.appendChild(myb);
	var mybr = document.createElement('br');
	itemsensorLabel.appendChild(mybr)
	sensorpecsdiv.appendChild(itemsensorLabel);
	createLabelAndAppend("Uri", jsonvalue.uri,sensorpecsdiv)
	createLabelAndAppend("Tag", jsonvalue.tag,sensorpecsdiv)
	createLabelAndAppend("Unit", jsonvalue.unit,sensorpecsdiv)
}


function createLabelAndAppend(name,value,tspecsdiv) {
	var itemLabel = document.createElement("Label");
  	itemLabel.setAttribute("for", name);
  	itemLabel.innerHTML = name+" : ";
  	itemLabel.className = "label";
  	tspecsdiv.appendChild(itemLabel);
  	var itemLabelvalue = document.createElement("Label");
  	itemLabelvalue.className ="label-value";
  	itemLabelvalue.setAttribute("for", name+"_value");
  	itemLabelvalue.innerHTML = value;
  	var mybr = document.createElement('br');
 	itemLabelvalue.appendChild(mybr);
    tspecsdiv.appendChild(itemLabelvalue);
}
