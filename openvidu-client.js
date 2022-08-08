var OV;
var session;
var sessionName;	// Name of the video session the user will connect to
var token;			// Token retrieved from OpenVidu Server

/* OPENVIDU METHODS */
function joinSession() {

	getToken((token) => {

		OV = new OpenVidu();
		session = OV.initSession();

		session.on('streamCreated', (event) => {
			session.subscribe(event.stream, 'video-container');
		});

		session.on('streamDestroyed', (event) => {
			removeUserData(event.stream.connection);
		});

		session.on('exception', (exception) => {
			console.warn(exception);
		});

		var userName = $('#userName').val()

		session.connect(token, { clientData: userName })
			.then(() => {

				document.getElementById('session-title').innerText = sessionName;
				document.getElementById('join').style.display = 'none';
				document.getElementById('session').style.display = 'block';

				var publisher = OV.initPublisher('video-container', {
					audioSource: undefined, // The source of audio. If undefined default microphone
					videoSource: null, // The source of video. If undefined default webcam
					publishAudio: true,  	// Whether you want to start publishing with your audio unmuted or not
					publishVideo: true,  	// Whether you want to start publishing with your video enabled or not
					resolution: '640x480',  // The resolution of your video
					frameRate: 30,			// The frame rate of your video
					insertMode: 'APPEND',	// How the video is inserted in the target element 'video-container'
					mirror: false       	// Whether to mirror your local video or not
				});

				publisher.on('videoElementCreated', (event) => {
					var userData = {
						userName: userName
					};
					appendUserData(event.element, userData);
				});

				session.publish(publisher);

			})
			.catch(error => {
				console.warn('There was an error connecting to the session:', error.code, error.message);
			});
	});

	return false;
}

function leaveSession() {
	session.disconnect();
	session = null;

	document.getElementById('join').style.display = 'block';
	document.getElementById('session').style.display = 'none';
}

function getToken(callback) {
	sessionName = document.querySelector("#sessionName").value  // Video-call chosen by the user

	httpPostRequest(
		'https://service.openvidu.stage.weje.io/getToken',
		{sessionName: sessionName},
		'Request of TOKEN gone WRONG:',
		(response) => {
			token = response.token; // Get token from response
			console.warn('Request of TOKEN gone WELL (TOKEN:' + token + ')');
			callback(token); // Continue the join operation
		}
	);
}

function removeUser() {
	httpPostRequest(
		'https://service.openvidu.stage.weje.io/removeUser',
		{sessionName: sessionName, token: token},
		'User couldn\'t be removed from session',
		(response) => {
			console.warn("You have been removed from session " + sessionName);
		}
	);
}

function httpPostRequest(url, body, errorMsg, callback) {
	var http = new XMLHttpRequest();
	http.open('POST', url, true);
	http.setRequestHeader('Content-type', 'application/json');
	http.addEventListener('readystatechange', processRequest, false);
	http.send(JSON.stringify(body));

	function processRequest() {
		if (http.readyState == 4) {
			if (http.status == 200) {
				try {
					callback(JSON.parse(http.responseText));
				} catch (e) {
					callback();
				}
			} else {
				console.warn(errorMsg);
				console.warn(http.responseText);
			}
		}
	}
}

/* APPLICATION BROWSER METHODS */

function appendUserData(videoElement, connection) {
	var userName;
	var nodeId;
	if (connection.userName) {
		userName = connection.userName;
		nodeId = 'main-videodata';
	} else {
		userName = JSON.parse(connection.data).clientData;
		nodeId = connection.connectionId;
	}
	var dataNode = document.createElement('div');
	dataNode.className = "data-node";
	dataNode.id = "data-" + nodeId;
	dataNode.innerHTML = "<p class='userName'>" + userName + "</p>";
	videoElement.parentNode.insertBefore(dataNode, videoElement.nextSibling);
}

function removeUserData(connection) {
	document.querySelector("#data-" + connection.connectionId).remove();
}
