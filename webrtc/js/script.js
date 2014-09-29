var username = "undefined";

var myPeerConnection;

var myVideo;
var yourVideo;
var myScreen;
var yourScreen;

var buttonSendChat;
var buttonFileInput;
var buttonShareWebcam;
var buttonShareScreen;
var buttonStopReceiveWebcam;

var peerConnection;
var peerConnectionServer;
var peerConnectionOptions;

var browserSupportWebRTC = true;

var address;
var socket;

$(document).ready(function() {

	myVideo = document.getElementById("myVideo");
	yourVideo = document.getElementById("yourVideo");
	myScreen = document.getElementById("myScreen");
	yourScreen = document.getElementById("yourScreen");

	buttonSendChat = document.getElementById('sendChat');
	buttonFileInput = document.getElementById('fileInput');
	buttonShareWebcam = document.getElementById('buttonShareWebcam');
	buttonShareScreen = document.getElementById('buttonShareScreen');
	buttonStopReceiveWebcam = document.getElementById('buttonStopReceiveWebcam');

	peerConnectionServer = getPeerConnectionServers();
	peerConnectionOptions = getPeerConnectionOptions();
	dataChannelOptions = getDataChannelOptions();

	socket = new FancyWebSocket(address);

	socket.bind('open',  socketOpen);
	socket.bind('close', socketClose);
	socket.bind('message', socketMessage);
	
	socket.connect();

	MyPeerConnection.setAllVideosElements(myVideo, yourVideo, myScreen, yourScreen);
	MyPeerConnection.setOnReceiveWebcam(receiveWebcamSuccess, receiveWebcamError);
	MyPeerConnection.setOnReceiveScreen(receiveScreenSuccess, receiveScreenError);
	MyPeerConnection.beforeReceiveWebcam(confirmReceiveWebcam);
	MyPeerConnection.beforeReceiveScreen(confirmReceiveScreen);

	MyPeerConnection.initialize(peerConnectionServer, peerConnectionOptions, sendMessageThroughSocket, disconnect, onInitializeError);
	if (browserSupportWebRTC)
		MyPeerConnection.createDataChannel(receiveChat, onOpenChannel, onCloseChannel, onErrorChannel);
});

//before unload
$(window).on('beforeunload', function(){

});

var sendMessageThroughSocket = function(param1, param2) {
	socket.send('message', JSON.stringify({type:param1, message:param2}));
};

var sendMessageTrhoughDataChannel = function(param1, param2) {			
	messageChannel = JSON.stringify({type:param1, message:param2});
	MyPeerConnection.sendDataChannel(messageChannel);
};


/***********************
		initialize handler
**********************/

function disconnect() {
	console.log('Receive disconnect');
	MyPeerConnection.setSendMessage(sendMessageThroughSocket);

	addMessageChannelToTextareaWithName('Server', 'Your friend is gone.');

	buttonShareWebcam.innerHTML = "Share my webcam";
	buttonShareWebcam.onclick = shareWebcam;
	buttonShareWebcam.value = 'pending';
	buttonShareWebcam.disabled = true;

	buttonShareScreen.innerHTML = "Share my screen";
	buttonShareScreen.onclick = shareScreen;
	buttonShareScreen.value = 'pending';
	buttonShareScreen.disabled = true;

	buttonSendChat.disabled = true;
	buttonFileInput.disabled = true;
}

function onInitializeError(error) {
	addMessageChannelToTextareaWithName('Server', error);
	browserSupportWebRTC = false;
	socket.disconnect();
}

/***********************
		Buttons handler
***********************/
function shareWebcam() {
	MyPeerConnection.startWebcamSharing(webcamSuccess, webcamError);

	buttonShareWebcam.disabled = true;
	buttonShareWebcam.innerHTML = "Connection...";
	buttonShareWebcam.value = 'connecting';
}

function stopSharingWebcam() {
	buttonShareWebcam.disabled = true;
	buttonShareWebcam.innerHTML = "Disconnection...";
	buttonShareWebcam.value = 'closing';

	MyPeerConnection.stopWebcamSharing();

	buttonShareWebcam.innerHTML = "Share my webcam";
	buttonShareWebcam.onclick = shareWebcam;
	buttonShareWebcam.value = 'pending';
	buttonShareWebcam.disabled = false;
}

function shareScreen() {
	MyPeerConnection.startScreenSharing(screenSuccess, screenError);

	buttonShareScreen.disabled = true;
	buttonShareScreen.innerHTML = "Connection...";
	buttonShareScreen.value = 'connecting';
}

function stopSharingScreen() {
	buttonShareScreen.disabled = true;
	buttonShareScreen.innerHTML = "Disconnection...";
	buttonShareScreen.value = 'closing';

	MyPeerConnection.stopScreenSharing();

	buttonShareScreen.innerHTML = "Share my screen";
	buttonShareScreen.onclick = shareScreen;
	buttonShareScreen.value = 'pending';
	buttonShareScreen.disabled = false;
}

function sendChat () {
	chatText = document.getElementById("chatInput").value;
	chatText = chatText.replace(new RegExp('<', 'g'), '&lt;');
	chatText = chatText.replace(new RegExp('>', 'g'), '&gt;');
	if (chatText != "") {
		sendMessageChannel(chatText);
		addMessageChannelToTextareaWithName(username, chatText);
		document.getElementById("chatInput").value = "";
	}
}

function sendFile (listFiles) {
	if (listFiles && listFiles[0].size < 10240) {
		var file = listFiles[0];
		reader = new FileReader();
		////alert(event.target.result);
		reader.onload = function (event) {
			fileChannel = JSON.stringify({
				'username': username,
				'fileName': file.name,
				'fileType': file.type,
				'fileSize': file.size,
				'file': encodeURI(event.target.result)
			});
			MyPeerConnection.sendDataChannel(fileChannel);
			addMessageChannelToTextarea('* File sent.');
		};
		reader.readAsDataURL(file);
	}
	else {
		addMessageChannelToTextarea(' * Can not read file or file size bigger than 10 ko');
	}
}


/**********************
		Chat functions
**********************/

function addMessageChannelToTextarea(text) {
	$log = $('#log');
	if (text != '') {
		$log.append('<p>' + text + '</p>');
	}
}

function addMessageChannelToTextareaWithName (name, text) {
	addMessageChannelToTextarea('<span id="sender">' + name + '</span>: ' + text);
}

function sendMessageChannel (text) {
	if (text != "") {			
		messageChannel = JSON.stringify({
			'username': username,
			'text': text
		});
		MyPeerConnection.sendDataChannel(messageChannel);
	}
}


/**********************
		Drag and drop
**********************/

function dragOverHandler(event) {
	// Do not propagate the event
	event.stopPropagation();
	// Prevent default behavior, in particular when we drop images or links
	event.preventDefault(); 
}

function dropHandler(event) {
	// Do not propagate the event
	event.stopPropagation();
	// Prevent default behavior, in particular when we drop images or links
	event.preventDefault(); 

	sendFile(event.dataTransfer.files);
}

/********************
	Webcam callback
********************/
function webcamSuccess() {
	console.log('On webcam successs');

	buttonShareWebcam.innerHTML = "Stop sharing my webcam";
	buttonShareWebcam.onclick = stopSharingWebcam;
	buttonShareWebcam.value = 'sharing';
	buttonShareWebcam.disabled = false;
}

function webcamError(error) {
	console.error(error);

	buttonShareWebcam.innerHTML = "Share my webcam";
	buttonShareWebcam.onclick = shareWebcam;
	buttonShareWebcam.value = 'pending';
	buttonShareWebcam.disabled = false;
}

/*********************
	Receive webcam
********************/
function confirmReceiveWebcam() {
	if (confirm('Do you accept webcam sharing from your interlocutor ?')) {
    	return true;
  	}
  	else 
  	{
    	return false;
  	}
}

function receiveWebcamSuccess() {
	console.log('On receive webcam Success');
}

function receiveWebcamError(error) {
	console.error(error);
}

/******************
	Screen callback
*****************/
function screenSuccess() {
	console.log('On screen success');

	buttonShareScreen.innerHTML = "Stop sharing my screen";
	buttonShareScreen.onclick = stopSharingScreen;
	buttonShareScreen.value = 'sharing';
	buttonShareScreen.disabled = false;
}

function screenError(error) {
	console.error(message);

	buttonShareScreen.innerHTML = "Share my screen";
	buttonShareScreen.onclick = shareScreen;
	buttonShareScreen.value = 'pending';
	buttonShareScreen.disabled = false;
}

/***************
	Receive screen
***************/
function confirmReceiveScreen() {
	if (confirm('Do you accept screen sharing from your interlocutor ?')) {
    	return true;
  	}
  	else 
  	{
    	return false;
  	}
}

function receiveScreenSuccess() {
	console.log('On receive screen success');
}

function receiveScreenError(error) {
	console.error(error);
}	

/****************
	Chat callback
****************/
function chatSuccess() {
	console.log('On chat success');
}

function chatError(error) {
	console.error(error);
}

/****************
	Receive chat
****************/
function receiveChatSuccess() {
	console.log('On receive chat success');
}

function receiveChatError(error) {
	console.error(error);
}

/*********************
		Data channel callback
********************/
function receiveChat(message) {
	//console.log('datachannel message : ' + message);
	try {	
		json = JSON.parse(message);
		console.log('can parse JSON : ' + json);
		if (json != null) {
			console.log('json not null');
			if (json.text != null)  {
				console.log('json text not null');
				addMessageChannelToTextareaWithName(json.username, json.text);
			}
			else if (json.file != null) {
				console.log('json file not null');
				addMessageChannelToTextarea(' * ' + json.username + ' offers to download <a href="' + decodeURI(json.file) + '" target="_blank">' + json.fileName + '</a> - ' + Math.round(json.fileSize/1024) + ' ko');
			}
			else if (json.type != null) {
				MyPeerConnection.receiveMessage(json.type, json.message);
			}
			else {
				console.log('can not handle json');
			}
		} 
	}
	catch(error) {
		console.error(error);
	}
}

function onOpenChannel() {
	addMessageChannelToTextareaWithName('Server', 'Connected.');
	MyPeerConnection.setSendMessage(sendMessageTrhoughDataChannel);

	buttonSendChat.disabled = false;
	buttonFileInput.disabled = false;
	buttonShareWebcam.disabled = false;
	if (MyPeerConnection.getMyBrowser() == 'Chrome' && (MyPeerConnection.getInterlocutorBrowser() == 'Chrome' || MyPeerConnection.getInterlocutorBrowser() == 'Opera')) {
		buttonShareScreen.disabled = false;
	}
	else {		
		addMessageChannelToTextareaWithName('Server', 'You or your interlocutor are using a browser not compatible with screen sharing.');
	}
}

function onCloseChannel() {
	console.log('ON CLOSE CHANNEL');
}

function onErrorChannel(error) {
	console.log('ON ERROR CHANNEL');
}

/********************************
		Initialisation for RTCPeerConnection
********************************/

function getPeerConnectionServers() {
	peerConnectionServer = new Array();
	peerConnectionServer.push({url: 'stun:stun.l.google.com:19302'});
	return peerConnectionServer;
}

function getPeerConnectionOptions() {
	peerConnectionOptions = new Array();
	return peerConnectionOptions;
}

function getDataChannelOptions () {
	dataChannelOptions = {reliable: false};
	return dataChannelOptions;
}

/***************************
		Messages from webSocket
***************************/
function socketOpen(msg) {
	if (!browserSupportWebRTC) {
		socket.disconnect();
		return ;
	}
}

function socketMessage (msg) {
	message = JSON.parse(msg);
	if (message.type && message.message == 1) {
		addMessageChannelToTextareaWithName('Server', 'You are actually alone.');
	}
	else if (message.type && message.message == 2) {
		addMessageChannelToTextareaWithName('Server', 'Connecting with the other peer...');
	}

	MyPeerConnection.receiveMessage(message.type, message.message);
}

function socketClose(msg) {
	addMessageChannelToTextarea('* Server is turning off.');
}
