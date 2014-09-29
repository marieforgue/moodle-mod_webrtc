var MyPeerConnection = (function() {
	/**************************
		Private static fields
	**************************/
	var rtcPeerConnection = null;
	var myWebcamRtcPeerConnection = null;
	var myScreenRtcPeerConnection = null;
	var yourWebcamRtcPeerConnection = null;
	var yourScreenRtcPeerConnection = null;

	var dataChannelWaiting = false;
	var doOfferDataChannel = false;
	var ptrCreateDataChannel = null;

	var serversList = null;
	var peerConnectionOptions = null;

	var myWebcam = null;
	var yourWebcam = null;
	var myScreen = null;
	var yourScreen = null;

	var myWebcamStream = null;
	var yourWebcamStream = null;
	var myScreenStream = null;
	var yourScreenStream = null;

	var numberOfConnections = 0;
	var interlocutorBrowser = null;

	var ptrSendMessage = null;

	var ptrAskingReceiveWebcam = function(){return true;};
	var ptrAskingReceiveScreen = function(){return true;};

	var ptrDisconnection = function(){};
	var ptrOnWebcamSuccess = function(){};
	var ptrOnWebcamError = function(){};
	var ptrOnScreenSuccess = function(){};
	var ptrOnScreenError = function(){};
	var ptrOnDataChannelSuccess = function(){};
	var ptrOnDataChannelError = function(){};

	var ptrOnReceiveWebcamSuccess = function(){};
	var ptrOnReceiveWebcamError = function(){};
	var ptrOnReceiveScreenSuccess = function(){};
	var ptrOnReceiveScreenError = function(){};
	var ptrOnReceiveDataChannelSuccess = function(){};
	var ptrOnReceiveDataChannelErrror = function(){};

	var priorityWebcamCallback = 0;
	var priorityScreenCallback = 0;
	var priorityChatCallback = 0;


	//Browser detection : http://www.javascripter.net/faq/browsern.htm
	var nVer = navigator.appVersion;
	var nAgt = navigator.userAgent;
	var browserName  = navigator.appName;
	var fullVersion  = ''+parseFloat(navigator.appVersion); 
	var majorVersion = parseInt(navigator.appVersion,10);
	var nameOffset,verOffset,ix;

	/**************************
		Private static methods
	**************************/

	//Browser detection : http://www.javascripter.net/faq/browsern.htm
	var detectBrowser = function() {
		// In Opera, the true version is after "Opera" or after "Version"
		if ((verOffset=nAgt.indexOf("Opera"))!=-1) {
			browserName = "Opera";
			fullVersion = nAgt.substring(verOffset+6);
			if ((verOffset=nAgt.indexOf("Version"))!=-1) 
				fullVersion = nAgt.substring(verOffset+8);
		}
		// In MSIE, the true version is after "MSIE" in userAgent
		else if ((verOffset=nAgt.indexOf("MSIE"))!=-1) {
			browserName = "Microsoft Internet Explorer";
			fullVersion = nAgt.substring(verOffset+5);
		}
		// In Chrome, the true version is after "Chrome" 
		else if ((verOffset=nAgt.indexOf("Chrome"))!=-1) {
			browserName = "Chrome";
			fullVersion = nAgt.substring(verOffset+7);
		}
		// In Safari, the true version is after "Safari" or after "Version" 
		else if ((verOffset=nAgt.indexOf("Safari"))!=-1) {
			browserName = "Safari";
			fullVersion = nAgt.substring(verOffset+7);
			if ((verOffset=nAgt.indexOf("Version"))!=-1) 
				fullVersion = nAgt.substring(verOffset+8);
		}
		// In Firefox, the true version is after "Firefox" 
		else if ((verOffset=nAgt.indexOf("Firefox"))!=-1) {
			browserName = "Firefox";
			fullVersion = nAgt.substring(verOffset+8);
		}
		// In most other browsers, "name/version" is at the end of userAgent 
		else if ( (nameOffset=nAgt.lastIndexOf(' ')+1) < 
			(verOffset=nAgt.lastIndexOf('/')) ) 
		{
			browserName = nAgt.substring(nameOffset,verOffset);
			fullVersion = nAgt.substring(verOffset+1);
			if (browserName.toLowerCase()==browserName.toUpperCase()) {
				browserName = navigator.appName;
			}
		}
		// trim the fullVersion string at semicolon/space if present
		if ((ix=fullVersion.indexOf(";"))!=-1)
		fullVersion=fullVersion.substring(0,ix);
		if ((ix=fullVersion.indexOf(" "))!=-1)
			fullVersion=fullVersion.substring(0,ix);

		majorVersion = parseInt(''+fullVersion,10);
		if (isNaN(majorVersion)) {
			fullVersion  = ''+parseFloat(navigator.appVersion); 
			majorVersion = parseInt(navigator.appVersion,10);
		}

		console.log(browserName + ' detected. Version: ' + majorVersion);
	};

	var getConstraints = function() {
		var constraints = {
			mandatory: {
				OfferToReceiveAudio: true,
				OfferToReceiveVideo: true
			}
		};
		return constraints;
	};

	/**************************
		Webcam callback
	**************************/

	var getWebcam = function() {
		getUserMedia({"audio": true, "video": true}, gotWebcamCallback, errorGotWebcam);
	};

	var gotWebcamCallback = function(stream) {
		myWebcamStream = stream;
		attachMediaStream(myWebcam, myWebcamStream);
		if (interlocutorBrowser == 'Firefox' || browserName == 'Firefox') {
			console.log('Firefox detected in gotWebcamCallback.');
			myWebcamRtcPeerConnection.addWebcam(myWebcamStream);
			myWebcamRtcPeerConnection.createWebcamOffer();
		}
		else {
			console.log('Chrome detected in gotWebcamCallback.');
			rtcPeerConnection.addWebcam(myWebcamStream);
		}
	};

	var errorGotWebcam = function(error) {
		throwOnWebcamErrorCallback("Error to webcam access : " + error);
		console.error();
	};

	/***********************
		Screen callback
	**********************/

	var getScreen = function() {
		getUserMedia({"audio": false, "video": {mandatory: {chromeMediaSource: 'screen', maxWidth: 1920, maxHeight: 1080}}}, gotScreenCallback, errorGotScreen);
	};

	var gotScreenCallback = function(stream) {
		myScreenStream = stream;
		attachMediaStream(myScreen, myScreenStream);
		rtcPeerConnection.addScreen(myScreenStream);
	};

	var errorGotScreen = function(error) {
		throwOnScreenErrorCallback("Error to screen access : " + error);
	};

	/*********************
		Sending user callback
	*********************/
	var throwOnWebcamSuccessCallback = function() {
		//console.log('--------------> Webcam success: priorityWebcamCallback='+priorityWebcamCallback+' priorityScreenCallback='+priorityScreenCallback+' priorityChatCallback='+priorityChatCallback);
		priorityWebcamCallback = 0;
		ptrOnWebcamSuccess();
		ptrOnWebcamSuccess = function(){};
		ptrOnWebcamError = function(){};
	};

	var throwOnWebcamErrorCallback = function(message) {
		//console.log('--------------> Webcam error: priorityWebcamCallback='+priorityWebcamCallback+' priorityScreenCallback='+priorityScreenCallback+' priorityChatCallback='+priorityChatCallback);
		priorityWebcamCallback = 0;
		ptrOnWebcamError(message);
		ptrOnWebcamSuccess = function(){};
		ptrOnWebcamError = function(){};
	};

	var throwOnScreenSuccessCallback = function() {
		//console.log('--------------> screen success: priorityWebcamCallback='+priorityWebcamCallback+' priorityScreenCallback='+priorityScreenCallback+' priorityChatCallback='+priorityChatCallback);
		priorityScreenCallback = 0;
		ptrOnScreenSuccess();
		ptrOnScreenSuccess = function(){};
		ptrOnScreenError = function(){};
	};

	var throwOnScreenErrorCallback = function(message) {
		//console.log('--------------> Screen error: priorityWebcamCallback='+priorityWebcamCallback+' priorityScreenCallback='+priorityScreenCallback+' priorityChatCallback='+priorityChatCallback);
		priorityScreenCallback = 0;
		ptrOnScreenError(message);
		ptrOnScreenSuccess = function(){};
		ptrOnScreenError = function(){};
	};


	// Utilitée ?
/*	var throwOnChatSuccessCallback = function() {
		priorityChatCallback = 0;
		ptrOnDataChannelSuccess();
		ptrOnDataChannelSuccess = function(){};
		ptrOnDataChannelError = function(){};
	};*/

	var throwOnChatErrorCallback = function(message) {
		priorityChatCallback = 0;
		if (ptrCreateDataChannel.ptrOnErrorChannel)
			ptrCreateDataChannel.ptrOnErrorChannel();
	};

	/******************
		Closing all connections
	******************/

	var closeAllConnections = function() {
		if (myWebcamStream) {
			myWebcamStream.stop();
			myWebcamStream = null;
		}

		if (yourWebcamStream) {
			//yourWebcamStream.stop();
			yourWebcamStream = null;
		}

		if (myScreenStream) {
			myScreenStream.stop();
			myScreenStream = null;
		}

		if (yourScreenStream) {
			//yourScreenStream.stop();
			yourScreenStream = null;
		}

		if (rtcPeerConnection) {
			rtcPeerConnection.closeDataChannel();
			//rtcPeerConnection.closeConnection();
			rtcPeerConnection = null;
		}

		if (myWebcamRtcPeerConnection) {
			//myWebcamRtcPeerConnection.closeConnection();
			myWebcamRtcPeerConnection = null;
		}

		if (yourWebcamRtcPeerConnection) {
			//yourWebcamRtcPeerConnection.closeConnection();
			yourWebcamRtcPeerConnection = null;
		}

		if (myScreenRtcPeerConnection) {
			//myScreenRtcPeerConnection.closeConnection();
			myScreenRtcPeerConnection = null;
		}

		if (yourScreenRtcPeerConnection) {
			//yourScreenRtcPeerConnection.closeConnection();
			yourScreenRtcPeerConnection = null;
		}

	};

	var PeerConnection = function(listServers, optionsPeerConnection) {
		/*********************
			Private object field
		*********************/
		var connection = null;
		var dataChannel = null;

		var receiveWebcam = 0;
		var receiveScreen = 0;

		var webcamNegotiationNeeded = false;
		var screenNegotiationNeeded = false;
		var chatNegotiationNeeded = false;

		var type = null;

		var caller = null;

		/***********************************
			Offer callback
		**********************************/
		var createOfferCallback = function(localDescription) {
			connection.setLocalDescription(localDescription, offerSetLocalDescriptionCallback, errorOfferSetLocalDescription);
			ptrSendMessage(type + 'Offer', localDescription);
		};

		var errorCreateOffer = function(error) {
			if (type == 'webcam') {
				throwOnWebcamErrorCallback('Error when create offer : ' + error);
			}
			else if (type == 'screen') {
				throwOnScreenErrorCallback('Error when create offer : ' + error);
			}
			else if (type == 'chat') {
				throwOnChatErrorCallback('Error when create offer : ' + error);
			}
		};

		var offerSetLocalDescriptionCallback = function() {
			console.log('Set local description success.');
		};

		var errorOfferSetLocalDescription = function(error) {
			if (type == 'webcam') {
				throwOnWebcamErrorCallback('Error when set local description in offer : ' + error);
			}
			else if (type == 'screen') {
				throwOnScreenErrorCallback('Error when set local description in offer : ' + error);
			}
			else if (type == 'chat') {
				throwOnChatErrorCallback('Error when set local description in offer : ' + error);
			}
		};

		/***************************************
			Set remote description callback
		***************************************/
		var offerSetRemoteDescriptionCallback = function() {
			console.log('Set remote description success.');
			connection.createAnswer(createAnswerCallback, errorCreateAnswer, getConstraints());
		};

		var errorOfferSetRemoteDescription = function(error) {
			if (type == 'webcam') {
				ptrOnReceiveWebcamError('Error when set remote description when receive offer : ' + JSON.stringify(error));
			}
			else if (type == 'screen') {
				ptrOnReceiveScreenError('Error when set remote description when receive offer : ' + JSON.stringify(error));
			}
			else if (type == 'chat') {
				ptrOnReceiveDataChannelErrror('Error when set remote description when receive offer : ' + JSON.stringify(error));	
			}
		};

		/**********************************
			Answer callback
		**********************************/
		var createAnswerCallback = function(localDescription) {
			connection.setLocalDescription(localDescription, answerSetLocalDescriptionCallback, errorAnswerSetLocalDescription);
			if (interlocutorBrowser == 'Firefox' || browserName == 'Firefox')
				ptrSendMessage(type + 'Answer', localDescription);
			else
				ptrSendMessage('answer', localDescription);
		};

		var errorCreateAnswer = function(error) {
			if (type == 'webcam') {
				ptrOnReceiveWebcamError('Error when create answer : ' + error);
			}
			else if (type == 'screen') {
				ptrOnReceiveScreenError('Error when create answer : ' + error);
			}
			else if (type == 'chat') {
				ptrOnReceiveDataChannelErrror('Error when create answer : ' + error);
			}
		};

		var answerSetLocalDescriptionCallback = function(localDescription) {
			console.log('Set answer local description success.');
		};

		var errorAnswerSetLocalDescription = function(error) {
			if (type == 'webcam') {
				ptrOnReceiveWebcamError('Error when set local description in answer : ' + error);
			}
			else if (type == 'screen') {
				ptrOnReceiveScreenError('Error when set local description in answer : ' + error);
			}
			else if (type == 'chat') {
				ptrOnReceiveDataChannelErrror('Error when set local description in answer : ' + error);
			}
		};

		/***********************************
				Remote answer callback
		***********************************/
		var answerSetRemoteDescriptionCallback = function() {
			console.log('Set answer description success.');
			if (priorityWebcamCallback > priorityScreenCallback && priorityWebcamCallback > priorityChatCallback) {
				throwOnWebcamSuccessCallback();
			}
			else if (priorityScreenCallback > priorityWebcamCallback && priorityScreenCallback > priorityChatCallback) {
				throwOnScreenSuccessCallback();
			}
			// Utilitée ? Doublon avec onopen du datachannel ?
			else if (priorityChatCallback > priorityWebcamCallback && priorityChatCallback > priorityScreenCallback) {
				//throwOnChatSuccessCallback();
				priorityChatCallback = 0;
			}
		};

		var errorAnswerSetRemoteDescription = function(error) {
			if (priorityWebcamCallback > priorityScreenCallback && priorityWebcamCallback > priorityChatCallback) {
				throwOnWebcamErrorCallback('Error on set remote description when receive an answer : ' + JSON.stringify(error));
			}
			else if(priorityScreenCallback > priorityWebcamCallback && priorityScreenCallback > priorityChatCallback) {
				throwOnScreenErrorCallback('Error on set remote description when receive an answer : ' + JSON.stringify(error));
			}
			else if(priorityChatCallback > priorityWebcamCallback && priorityChatCallback > priorityScreenCallback) {
				throwOnChatErrorCallback('Error on set remote description when receive an answer : ' + JSON.stringify(error));
			}
		};

		/******************************
			Add ice candidate callback
		******************************/
		var addIceCandidateCallback = function() {
			console.log('Add ice candidate success !');
		};

		var errorAddIceCandidate = function(error) {
			console.error('Error when adding ice candidate : ' + JSON.stringify(error));
		};

		/********************
			Public object methods
		*******************/
		return {
			initialize : function() {
				console.log('Peer connection initilization');
			},

	    	createConnection : function() { 
	    		console.log('Creating a RTCPeerConnection...');
				connection = new RTCPeerConnection({iceServers:serversList}, {optional:peerConnectionOptions});
				this.setOnicecandidate();
				this.setOnaddstream();
				this.setOnnegotiationneeded();
				this.setOniceconnectionstatechange();
				this.setOnsignalingstatechange();

				connection.onremovestream = function() {
					console.log('onremovestream event not defined');
				};

				this.setOndataChannel();
	    	},

	    	createDataChannel : function(ptrOnMessageChannel, ptrOnOpenChannel, ptrOnCloseChannel, ptrOnErrorChannel) {
	    		console.log('Creating data channel...');

	    		if (dataChannelWaiting) {
	    			chatNegotiationNeeded = true;
	    		}
	    		else {
	    			chatNegotiationNeeded = false;
	    		}

				dataChannel = connection.createDataChannel("dataChannel", {reliable: false});

				this.setOnmessagechannel(ptrOnMessageChannel);
				this.setOnopenchannel(ptrOnOpenChannel);
				this.setOnclosechannel(ptrOnCloseChannel);
				this.setOnerrorchannel(ptrOnErrorChannel);

				result = new Array();
				result[0] = connection;
				result[1] = dataChannel;
	    	},

	    	/***************************
	    	****************************/
	    	setOnicecandidate : function() {
				connection.onicecandidate = function(event) {
					if (event.candidate == null) { 
						console.log('Receive null candidate');
						return; 
					}

					if ((type == 'webcam' || type == 'screen') && (interlocutorBrowser == 'Firefox' || browserName == 'Firefox')) {
						if (caller == null) {
							console.error('Caller is not defined. Use setCaller(bool) to set caller.');
						}
						else {
							console.log('Sending ' + type + ' candidate');
							if (caller) {
								ptrSendMessage('mytoyour' + type + 'Candidate', event.candidate);
							}
							else {
								ptrSendMessage('yourtomy' + type + 'Candidate', event.candidate);
							}
						}
					}
					else {
						if (type == 'chat')
							console.log('Sending ' + type + ' candidate');
						else
							console.log('Sending candidate');
						ptrSendMessage('candidate', event.candidate);
					}
				}
	    	},

	    	setOnaddstream : function() {
	    		connection.onaddstream = function(event) {
	    			console.log('on add stream. receiveWebcam='+receiveWebcam+' receiveScreen='+receiveScreen);
					connectionEtablished = true;
					if (receiveWebcam > receiveScreen) {
						console.log('Adding webcam stream');
						yourWebcamStream = event.stream;
						attachMediaStream(yourWebcam, yourWebcamStream);
						receiveWebcam = 0;
						ptrOnReceiveWebcamSuccess();
					}
					else if (receiveScreen > receiveWebcam) {
						console.log('Adding screen stream.');
						yourScreenStream = event.stream;
						attachMediaStream(yourScreen, yourScreenStream);
						receiveScreen = 0;
						ptrOnReceiveScreenSuccess();
					}
					//console.log('---------END on add stream. receiveWebcam='+receiveWebcam+' receiveScreen='+receiveScreen);
	    		}
	    	},

	    	setOnnegotiationneeded : function() {
	    		var ptrCreateWebcamOffer = this.createWebcamOffer;
	    		var ptrCreateScreenOffer = this.createScreenOffer;
	    		var ptrCreateChatOffer = this.createChatOffer;
	    		connection.onnegotiationneeded = function() {
					console.log("on negotioation needed");
					if (webcamNegotiationNeeded)
					{
						console.log('Starting webcam negotioation.');
						ptrCreateWebcamOffer();
					}
					else if (screenNegotiationNeeded)
					{
						console.log('Starting screen negotioation.');
						ptrCreateScreenOffer();
					}
					else if (chatNegotiationNeeded) {
						console.log('Starting chat negotioation.');
						ptrCreateChatOffer();
					}
				}
	    	},

	    	setOnremovestream : function(func) {
	    		connection.onremovestream = func;
	    	},

	    	setOniceconnectionstatechange : function() {
	    		connection.oniceconnectionstatechanged = function(event) {
	    			console.log('oniceconnectionstatechanged : ' + event.target.iceConnectionState);
	    		}
	    	},

	    	setOnsignalingstatechange : function() {
	   			connection.onsignalingstatechange = function(event) {
	   				if (browserName == 'Chrome')
						console.log('onsignalingstatechange : ' + event.target.signalingState);
					else 
						console.log('onsignalingstatechange : ' + JSON.stringify(event));
				};
	    	},

	    	setOndataChannel : function() {
	    		connection.ondatachannel = function(event) {
	    			console.log('on data channel added');
					dataChannel = event.channel;
					ptrOnReceiveDataChannelSuccess();
				};
	    	},

	    	/*************************
	    	*************************/

	    	setOnmessagechannel : function(ptrFunction) {
	    		if (ptrFunction) {
		    		dataChannel.onmessage = function(event) {
		    			ptrFunction(event.data);
		    		};
	    		}
	    		else {
	    			dataChannel.onmessage = function(event) {
						console.error('Message receive but no handler is define. Use MyPeerConnection.setMessageChannel(*fonction).');
					};
	    		}
	    	},

	    	setOnopenchannel : function(ptrFunction) {
	    		if (ptrFunction) {
	    			dataChannel.onopen = function() {
		    			ptrFunction();
	    			};
	    		}
	    		else {
					dataChannel.onopen = function() {
						console.log('on open channel. Use MyPeerConnection.setOpenChannel(*fonction) for redefine.');
					};
	    		}
	    	},

	    	//onclosechannel not fired in chrome
	    	//http://stackoverflow.com/questions/17376804/onclose-and-onerror-not-getting-called-on-datachannel-disconnect
	    	setOnclosechannel : function(ptrFunction) {
	    		if (ptrFunction) {
	    			dataChannel.onclose = function() {
		    			ptrFunction();
	    			};
	    		}
	    		else {
					dataChannel.onclose = function() {
						console.log('on close channel. Use MyPeerConnection.setCloseChannel(*fonction) for redefine.');
					};
	    		}
	    	},

	    	setOnerrorchannel : function(ptrFunction) {
	    		if (ptrFunction) {
	    			dataChannel.onerror = function(error) {
	    				ptrFunction(error);
	    			}
	    		}
	    		else {
					dataChannel.onerror = function(error) {
						console.log('Use MyPeerConnection.setErrorChannel(*fonction) for redefine. on error channel : ' + error);
					};
	    		}
	    	},

	    	/************************
	    	************************/
	    	setCaller : function(bool) {
	    		console.log('Setting caller');
	    		caller = bool;
	    	},

	    	/***************************
	    	***************************/

	    	createWebcamOffer : function() {
	    		console.log('Creating webcam offer');
	    		type = 'webcam';
				connection.createOffer(createOfferCallback, errorCreateOffer, getConstraints());
				webcamNegotiationNeeded = false;
	    	},

	    	createScreenOffer : function() {
	    		console.log('Creating screen offer');
				type = 'screen';
				connection.createOffer(createOfferCallback, errorCreateOffer, getConstraints());
				screenNegotiationNeeded = false;
	    	},

	    	createChatOffer : function() {
	    		console.log('Creating chat offer');
	    		type = 'chat';
				connection.createOffer(createOfferCallback, errorCreateOffer, getConstraints());
				chatNegotiationNeeded = false;
	    	},

	    	/****************************
	    	****************************/
	    	addWebcam : function(stream) {
	    		console.log('Adding webcam');
	    		webcamNegotiationNeeded = true;
	    		connection.addStream(stream);
	    	},

	    	removeWebcam : function() {
	    		console.log('Removing webcam');
	    		webcamNegotiationNeeded = true;
	    		connection.removeStream(myWebcamStream);
	    		myWebcamStream.stop();
	    	},

	    	addScreen : function(stream) {
	    		console.log('Adding screen');
	    		screenNegotiationNeeded = true;
	    		connection.addStream(stream);
	    	},

	    	removeScreen : function() {
	    		console.log('Removing screen');
	    		screenNegotiationNeeded = true;
	    		connection.removeStream(myScreenStream);
	    		myScreenStream.stop();
	    	},

	    	/*************************
	    	*************************/
	    	receiveWebcamOffer : function(description) {
	    		console.log("Receive webcam offer");
	    		//console.log('--------------- receiveWebcamOffer - receiveWebcam='+receiveWebcam+ ' receiveScreen='+receiveScreen);
	    		if ((yourWebcamStream == null || yourWebcamStream.ended) || ((interlocutorBrowser == 'Firefox' || browserName == 'Firefox') && myWebcamRtcPeerConnection != null)) {
	    			receiveWebcam = (receiveScreen == 0) ? 1 : receiveScreen++;
	    		}
				type = 'webcam';
				//console.log('--------------- receiveWebcamOffer - receiveWebcam='+receiveWebcam+ ' receiveScreen='+receiveScreen);
				connection.setRemoteDescription(new RTCSessionDescription(description), offerSetRemoteDescriptionCallback, errorOfferSetRemoteDescription);
	    	},

	    	receiveScreenOffer : function(description) {
	    		console.log('Receive screen offer');
	    		//console.log('--------------- receiveScreenOffer - receiveWebcam='+receiveWebcam+ ' receiveScreen='+receiveScreen);
	    		if (yourScreenStream == null || yourScreenStream.ended) {
	    			receiveScreen = (receiveWebcam == 0) ? 1 : receiveWebcam++;
	    		}
	    		type = 'screen';
	    		//console.log('--------------- receiveScreenOffer - receiveWebcam='+receiveWebcam+ ' receiveScreen='+receiveScreen);
				connection.setRemoteDescription(new RTCSessionDescription(description), offerSetRemoteDescriptionCallback, errorOfferSetRemoteDescription);
	    	},

	    	receiveChatOffer : function(description) {
	    		console.log('Receive chat offer');
	    		type = 'chat';
	    		connection.setRemoteDescription(new RTCSessionDescription(description), offerSetRemoteDescriptionCallback, errorOfferSetRemoteDescription);
	    	},

	    	receiveCandidate : function(msg) {
				console.log("Receive candidate");
				if (msg !== null && msg !== '' && msg.candidate !== null) {
					connection.addIceCandidate(new RTCIceCandidate({sdpMLineIndex: msg.sdpMLineIndex, candidate: msg.candidate}), addIceCandidateCallback, errorAddIceCandidate);
				}
	    	},

	    	receiveAnswer : function(msg) {
	    		console.log('Receive answer');
	    		connection.setRemoteDescription(new RTCSessionDescription(msg), answerSetRemoteDescriptionCallback, errorAnswerSetRemoteDescription);
	    	},

	    	/******************
	    	******************/
	    	closeConnection : function() {
	    		connection.close();
	    		connection = null;
	    	},

	    	closeDataChannel : function() {
	    		if (dataChannel) {
	    			dataChannel.close();
	    			dataChannel = null;
	    		}
	    	},

	    	sendDataChannel : function(message) {
				if (dataChannel != null) {
					message = message.replace(new RegExp('<', 'g'), '&lt;');
					message = message.replace(new RegExp('>', 'g'), '&gt;');
					dataChannel.send(message);
				}
	    	},

	    	getRemoteStream : function() {
	    		return connection.getRemoteStreams();
	    	},

	    	getLocalStream : function() {
	    		return connection.getLocalStreams();
	    	},
		};
	};


	/*************************
		Public methods
	*************************/
	var publicMethods = {};

	publicMethods.initialize = function(listServers, optionsPeerConnection, sendMessage, ptrDisconnect, onError) {

		detectBrowser();
		if (browserName != 'Firefox' && browserName != 'Chrome' && browserName != 'Opera') {
			if (onError) {
				onError(browserName + ' is not a compatible browser.');
			}
			else {
				throw {name: 'FatalError', message: browserName + ' is not a compatible browser.'};
			}
			return ;
		}

		if (browserName == 'Firefox' && majorVersion < 30) {
			if (onError) {
				onError('Mozilla Firefox ' + majorVersion + ' is not a compatible browser. Please update to 30+.');
			}
			else {
				throw {name: 'FatalError', message: 'Mozilla Firefox ' + majorVersion + ' is not a compatible browser. Please update to 30+.'};
			}
			return ;
		}

		if (browserName == 'Chrome' && majorVersion < 36) {
			if (onError) {
				onError('Google chrome ' + majorVersion + ' is not a compatible browser. Please update to 36+.');
			}
			else {
				throw {name: 'FatalError', message: 'Google chrome ' + majorVersion + ' is not a compatible browser. Please update to 36+.'};
			}
			return ;
		}

		if (browserName == 'Opera' && majorVersion < 23) {
			if (onError) {
				onError('Opera ' + majorVersion + ' is not a compatible browser. Please update to 23+.');
			}
			else {
				throw {name: 'FatalError', message: 'Opera ' + majorVersion + ' is not a compatible browser. Please update to 23+.'};
			}
			return ;
		}

		if (sendMessage == null || typeof(sendMessage) != 'function') {
			if (onError) {
				onError('sendMessage parameter is not a function.')
			}
			else {
				throw {name: 'FatalError', message: 'sendMessage parameter is not a function.'};
			}
			return ;
		}

		serversList = listServers || (function(){var array = new Array(); array.push({url: 'stun:stun.l.google.com:19302'}); return array;}());
		peerConnectionOptions = optionsPeerConnection || (function(){var array = new Array(); return array;}());
		ptrSendMessage = sendMessage;
		ptrDisconnection = ptrDisconnect || function(){};

		if (!rtcPeerConnection && numberOfConnections == 2 && interlocutorBrowser == 'Firefox' != null && interlocutorBrowser != 'Firefox' && browserName != 'Firefox') {
			console.log('Creating preer connection in initialize');
			rtcPeerConnection = new PeerConnection(serversList, peerConnectionOptions);
			rtcPeerConnection.createConnection();
		}
	};

	publicMethods.setAllVideosElements = function(myWebcamElement, yourWebcamElement, myScreenElement, yourScreenElement) {
		myWebcam = myWebcamElement || null;
		yourWebcam = yourWebcamElement || null;
		myScreen = myScreenElement || null;
		yourScreen = yourScreenElement || null;
	};

	publicMethods.setSendMessage = function(ptrFunction) {
		if (ptrFunction == null || typeof(ptrFunction) != 'function') {
			throw {name: 'FatalError', message: 'setSendMessage parameter is not a function.'};
			return ;
		}
		ptrSendMessage = ptrFunction;
	};

	publicMethods.getMyBrowser = function() {
		return browserName;
	};

	publicMethods.getInterlocutorBrowser = function() {
		return interlocutorBrowser;
	};

	publicMethods.startWebcamSharing = function(onSuccess, onError) {

		ptrOnWebcamSuccess = onSuccess || function(){};
		ptrOnWebcamError = onError || function(){};

		priorityWebcamCallback = 1;
		(priorityScreenCallback > 0) ? priorityScreenCallback++ : null;
		(priorityChatCallback > 0) ? priorityChatCallback++ : null;

		if (numberOfConnections == 2) {
			if (interlocutorBrowser == 'Firefox' || browserName == 'Firefox') {
				if (!myWebcamRtcPeerConnection) {
					myWebcamRtcPeerConnection = new PeerConnection(serversList, peerConnectionOptions);
					myWebcamRtcPeerConnection.createConnection();
					myWebcamRtcPeerConnection.setCaller(true);
				}
				ptrSendMessage('prepareOfferWebcam', '');
			}
			else {
				ptrSendMessage('prepareOfferWebcam', '');
				//getWebcam();
			}
		}
		//console.log('--------------> Start Webcam sharing: priorityWebcamCallback='+priorityWebcamCallback+' priorityScreenCallback='+priorityScreenCallback+' priorityChatCallback='+priorityChatCallback);
	};

	publicMethods.stopWebcamSharing = function() {
		if (interlocutorBrowser == 'Firefox' || browserName == 'Firefox') {
			myWebcamStream.stop();
			myWebcamRtcPeerConnection.closeConnection();
			myWebcamRtcPeerConnection = null;
			ptrSendMessage('closeMyVideoPeerConnection', '');
		}
		else {
			rtcPeerConnection.removeWebcam();
		}
	};

	//	Must be return
	//		- true if user accept to receive other webcam
	//		- false if user do not want receive other webcam
	publicMethods.beforeReceiveWebcam = function(ptrFunction) {
		ptrAskingReceiveWebcam = ptrFunction || function(){return true;};
	};

	publicMethods.startScreenSharing = function(onSuccess, onError) {
		if (interlocutorBrowser != 'Firefox' && browserName != 'Firefox') {
			ptrOnScreenSuccess = onSuccess || function(){};
			ptrOnScreenError = onError || function(){};

			priorityScreenCallback = 1;
			(priorityWebcamCallback > 0) ? priorityWebcamCallback++ : null;
			(priorityChatCallback > 0) ? priorityChatCallback++ : null;

			ptrSendMessage('prepareOfferScreen', '');

			//console.log('--------------> Start screen sharing: priorityWebcamCallback='+priorityWebcamCallback+' priorityScreenCallback='+priorityScreenCallback+' priorityChatCallback='+priorityChatCallback);
		}
	};

	publicMethods.stopScreenSharing = function() {
		if (interlocutorBrowser == 'Firefox' || browserName == 'Firefox') {

		}
		else {
			rtcPeerConnection.removeScreen();
		}
	};

	//	Must be return
	//		- true if user accept to receive other screen
	//		- false if user do not want receive other screen
	publicMethods.beforeReceiveScreen = function(ptrFunction) {
		ptrAskingReceiveScreen = ptrFunction || function(){return true;};
	};

	publicMethods.setOnReceiveWebcam = function(onSuccess, onError) {
		ptrOnReceiveWebcamSuccess = onSuccess || function(){};
		ptrOnReceiveWebcamError = onError || function(){};
	};

	publicMethods.setOnReceiveScreen = function(onSuccess, onError) {
		ptrOnReceiveScreenSuccess = onSuccess || function(){};
		ptrOnReceiveScreenError = onError || function(){};
	};

	publicMethods.setOnReceiveDataChannel = function(onSuccess, onError) {
		ptrOnReceiveDataChannelSuccess = onSuccess || function(){};
		ptrOnReceiveDataChannelErrror = onError || function(){};
	};

	//onError is active in the establishment of the connection and when the connection is active
	publicMethods.createDataChannel = function(ptrOnMessageChannel, ptrOnOpenChannel, ptrOnCloseChannel, ptrOnErrorChannel) {
		console.log('Create data channel');

/*		ptrOnDataChannelSuccess = onSuccess || function(){};
		ptrOnDataChannelError = onError || function(){};*/

		priorityChatCallback = 1;
		(priorityWebcamCallback > 0) ? priorityWebcamCallback++ : null;
		(priorityScreenCallback > 0) ? priorityScreenCallback++ : null;

		ptrCreateDataChannel = {ptrOnMessageChannel:ptrOnMessageChannel, ptrOnOpenChannel:ptrOnOpenChannel, ptrOnCloseChannel:ptrOnCloseChannel, ptrOnErrorChannel:ptrOnErrorChannel};
		dataChannelWaiting = true;

		if (numberOfConnections == 2) {
			if (!rtcPeerConnection) {
				console.log('not rtcPeerConnection in createDataChannel');
				if (interlocutorBrowser == 'Firefox' || browserName == 'Firefox') {
					console.log('Create rtcPeerConnection in createWebcamOffer');
					rtcPeerConnection = new PeerConnection(serversList, peerConnectionOptions);
					rtcPeerConnection.createConnection();
				}
				else {
					if (numberOfConnections == 2) {
						console.error('Please call createDataChannel after MyPeerConnection.initialize');
						return ;
					}
				}
			}
			console.log('Sending dataChannelWaiting');
			ptrSendMessage('dataChannelWaiting', '');
		}
		else {
			doOfferDataChannel = true;
			console.log('doOfferDataChannel='+doOfferDataChannel);
		}
	};

	publicMethods.closeDataChannel = function() {
		rtcPeerConnection.closeDataChannel();
	};

	publicMethods.sendDataChannel = function(message) {
		rtcPeerConnection.sendDataChannel(message);
	};

	publicMethods.receiveMessage = function(type, message) {
		//console.log('Receive - type:' + type + ' - message:' + message);
		switch(type) {
			case 'numberOfConnections' :
				console.log('Receive new connection : ' + message);
				if (message == 1) {
					doOfferDataChannel = false;
					priorityChatCallback = 0;
				}
				else if (message == 2) {
					ptrSendMessage('interlocutorBrowser', browserName);
				}
				numberOfConnections = message;
				break;
			case 'interlocutorBrowser' :
				interlocutorBrowser = message;
				if (interlocutorBrowser != 'Firefox' && browserName != 'Firefox' && !rtcPeerConnection && serversList != null && peerConnectionOptions != null) {
					console.log('Creating peer connection when receive interlocutorBrowser');
					rtcPeerConnection = new PeerConnection(serversList, peerConnectionOptions);
					rtcPeerConnection.createConnection();
				}

				if (dataChannelWaiting) {
					console.log('In interlocutorBrowser - dataChannelWaiting...');
					if (interlocutorBrowser == 'Firefox' || browserName == 'Firefox') {
						console.log('In interlocutorBrowser - create rtcPeerConnection');
						rtcPeerConnection = new PeerConnection(serversList, peerConnectionOptions);
						rtcPeerConnection.createConnection();
					}
					if (doOfferDataChannel) {
						console.log('In interlocutorBrowser - doOfferDataChannel');
						ptrSendMessage('dataChannelWaiting', '');
						doOfferDataChannel = false;
					}
				}
				break;
			case 'prepareOfferWebcam' :
				if (ptrAskingReceiveWebcam()) {
					if (!yourWebcamRtcPeerConnection) {
						yourWebcamRtcPeerConnection = new PeerConnection(serversList, peerConnectionOptions);
						yourWebcamRtcPeerConnection.createConnection();
						yourWebcamRtcPeerConnection.setCaller(false);
					}				
					ptrSendMessage('waitingOfferWebcam', true);
				}
				else {
					ptrSendMessage('waitingOfferWebcam', false);
				}
				break;
			case 'waitingOfferWebcam' :
				if (message) {
					getWebcam();
				}
				else {
					throwOnWebcamErrorCallback('Refused by interlocutor.');
				}
				break;
			case 'prepareOfferScreen' : 
				if (ptrAskingReceiveScreen()) {
					ptrSendMessage('waitingOfferScreen', true);
				}
				else {
					ptrSendMessage('waitingOfferScreen', false);
				}
				break;
			case 'waitingOfferScreen' :
				if (message) {
					getScreen();
				}
				else {
					throwOnScreenErrorCallback('Refused by interlocutor');
				}
				break;
			case 'webcamOffer' :
				if (interlocutorBrowser == 'Firefox' || browserName == 'Firefox') {
					yourWebcamRtcPeerConnection.receiveWebcamOffer(message);
				}
				else {
					rtcPeerConnection.receiveWebcamOffer(message);
				}				
				break;
			case 'screenOffer' :
				if (interlocutorBrowser == 'Firefox' || browserName == 'Firefox') { //impossible
					
				}
				else {
					rtcPeerConnection.receiveScreenOffer(message);
				}
				break;
			case 'chatOffer' :
				rtcPeerConnection.receiveChatOffer(message);
				break;
			case 'answer' :
				rtcPeerConnection.receiveAnswer(message);
				break;
			case 'webcamAnswer' :
				myWebcamRtcPeerConnection.receiveAnswer(message);
				break;
			case 'screenAnswer' :
				myScreenRtcPeerConnection.receiveAnswer(message);
				break;
			case 'chatAnswer' :
				rtcPeerConnection.receiveAnswer(message);
				break;
			case 'candidate' :
				rtcPeerConnection.receiveCandidate(message);
				break;
			case 'mytoyourwebcamCandidate' :
				yourWebcamRtcPeerConnection.receiveCandidate(message);
				break;
			case 'yourtomywebcamCandidate' :
				myWebcamRtcPeerConnection.receiveCandidate(message);
				break;
			case 'mytoyourscreenCandidate' :
				yourScreenRtcPeerConnection.receiveCandidate(message);
				break;
			case 'yourtomyscreenCandidate' :
				myScreenRtcPeerConnection.receiveCandidate(message);
				break;
			case 'mytoyourchatCandidate' :
				//rtcPeerConnection.receiveCandidate(message);
				break;
			case 'closeMyVideoPeerConnection' :
				yourWebcamRtcPeerConnection.closeConnection();
				yourWebcamRtcPeerConnection = null;
				break;
			case 'dataChannelWaiting' : 
				console.log('Receive data channel waiting');
				if (dataChannelWaiting) {
					dataChannelWaiting = false;
					rtcPeerConnection.createDataChannel(ptrCreateDataChannel.ptrOnMessageChannel, ptrCreateDataChannel.ptrOnOpenChannel, ptrCreateDataChannel.ptrOnCloseChannel, ptrCreateDataChannel.ptrOnErrorChannel);
					ptrSendMessage('readyForCreateDataChannel', '');
				}
				break;
			case 'readyForCreateDataChannel' :
				console.log('Receive ready for create data channel');
				rtcPeerConnection.createDataChannel(ptrCreateDataChannel.ptrOnMessageChannel, ptrCreateDataChannel.ptrOnOpenChannel, ptrCreateDataChannel.ptrOnCloseChannel, ptrCreateDataChannel.ptrOnErrorChannel);
				if (browserName == 'Firefox') {
					rtcPeerConnection.createChatOffer();
				}
				dataChannelWaiting = false;
				break;
			case 'disconnection' :
				if (message < 2) {
					closeAllConnections();
					if (ptrCreateDataChannel.ptrOnMessageChannel) {
						dataChannelWaiting = true;
					}
					ptrDisconnection();
				}
				break;
		}
	};

	return publicMethods;
}());