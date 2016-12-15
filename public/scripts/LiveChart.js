
var dataset = [{
	label: "Wind Speed",
	fill: false,
	backgroundColor:"rgba(220,220,220,1)",
	borderColor:"rgba(220,220,220,1)",
	data: [4]
},{
	label: "Power Rating",
	fill: false,
	backgroundColor:"rgba(151,187,205,1)",
	borderColor:"rgba(151,187,205,1)",
	data: [1]
}];

var lineChartData = {
	labels : [0],
	datasets : dataset
};

var config = {
	  type: 'line',
		data: lineChartData,
		options : {
			responsive: true,
			legend: {
				position: "bottom"
			},
			title: {
		    display: true,
		    text: "Wind Speed and Power Rating"
		  },
			scales: {
                    xAxes: [{
                        display: true,
                        scaleLabel: {
                            display: false,
                            labelString: 'Time'
                        },
												ticks: {
          autoSkip: false,
          maxRotation: 90,
          minRotation: 90
        }
                    }],
                    yAxes: [{
                        display: true,
                        scaleLabel: {
                            display: false,
                            labelString: 'Units'
                        }
                    }]
                }
		}
};



var myLiveChart;
var messageData;
var currentIndex = 0;

if (window.attachEvent) {window.attachEvent('onload', plotChart);}
else if (window.addEventListener) {window.addEventListener('load', plotChart, false);}
else {document.addEventListener('load', plotChart, false);}

function plotChart() {
		var canvas = document.getElementById('tagChart');
		var ctx = canvas.getContext('2d');
		myLiveChart = new Chart(ctx, config);
		var tsData = new XMLHttpRequest();
		var tsDataURL = "/chartdata";
		tsData.open('GET', tsDataURL, true);
		tsData.onload = function() {
			messageData= JSON.parse(tsData.response);
			// var resultString = JSON.stringify(messageData);
			if (messageData) {
				// console.log("json response:"+resultString);
				updateLiveChart(messageData,myLiveChart);
			}
		};
		tsData.onerror = function() {
			console.log("Error: Accessing TS Service for" );
			//document.getElementById("predix_asset_table").innerHTML = "Error fetching asset model info for tag: " + tagString;
		};
		tsData.send();
}

function updateLiveChart(messageData,myLiveChart){
	if(messageData && myLiveChart) {
		var tags = messageData.tags;
		var windspeed ;
		var powerrating;
		for(var i in tags) {
			var name = tags[i].name;
			if(name.indexOf("windspeed") >= 0)
			{
				windspeed=tags[i];
			} else if (name.indexOf("powerrating") >= 0){
				powerrating=tags[i];
			}
		}

		// for(var count in windspeed.results[0].values) {
		var d = new Date();
		var formatDate = d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
		//console.log("Time "+formatDate+"tag name "+windspeed.name+"value is "+windspeed.results[0].values[currentIndex][1]);
		//console.log("Time"+formatDate+"tag name"+powerrating.name+"value is "+powerrating.results[0].values[currentIndex][1]);

		// console.log('random: ', Math.random())
			config.data.labels.push(formatDate);
			//config.data.labels.push("^");
			config.data.datasets.forEach(function(dataset) {
				if(dataset.label == 'Wind Speed'){
					dataset.data.push(windspeed.results[0].values[currentIndex][1]);
				}else {
					dataset.data.push(powerrating.results[0].values[currentIndex][1]);
				}

      });
			window.myLiveChart.update();

			//myLiveChart.addData([windspeed.results[0].values[currentIndex][1], powerrating.results[0].values[currentIndex][1]], formatDate);

		currentIndex++;
		currentIndex = currentIndex >= windspeed.results[0].values.length ? 0 : currentIndex;
		if (config.data.datasets[0].data.length > 17) {
			config.data.labels.splice(0, 1);
			config.data.datasets[0].data.splice(0,1);
			config.data.datasets[1].data.splice(0,1);
			window.myLiveChart.update();
		}
	}

}

setInterval(function() {updateLiveChart(messageData, myLiveChart);}, 300);
