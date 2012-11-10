$(document).ready(function() {
    var peerConnection = new mozRTCPeerConnection();
    var source = new EventSource("/signalling");
    var me;

    peerConnection.onaddstream = function(obj) {
        var remoteVideo = $('#remote-video').get(0);
        var remoteAudio = $('#remote-audio').get(0);
        console.log(obj);

        var type = obj.type;
        if (type == "video") {
            remoteVideo.mozSrcObject = obj.stream;
            remoteVideo.play();
        } else if (type == "audio") {
            remoteAudio.mozSrcObject = obj.stream;
            remoteAudio.play();
        } else {
            console.log("sender onaddstream of unknown type, obj = " + obj.toSource());
        }
    };

    var getVideo = function() {
        var promise = new RSVP.Promise();
        var localVideo = $('#local-video').get(0);

        navigator.mozGetUserMedia({video: true}, function(stream) {
            localVideo.mozSrcObject = stream;
            localVideo.play();
            peerConnection.addStream(stream);

            promise.resolve();
        }, function(err) {
            promise.reject(err);
        });

        return promise
    }

    var getAudio = function() {
        var promise = new RSVP.Promise();
        var localAudio = $('#local-audio').get(0);

        navigator.mozGetUserMedia({audio: true}, function(stream) {
            localAudio.mozSrcObject = stream;
            localAudio.play();
            peerConnection.addStream(stream);

            promise.resolve();
        }, function(err) {
            promise.reject(err);
        });

        return promise
    };

    var sendOffer = function() {
        // Create offer
        peerConnection.createOffer(function(offer) {
            peerConnection.setLocalDescription(offer, function() {
                // Send offer
                $.ajax({
                    type: 'POST',
                    url:  '/signalling',
                    data: {
                        type: 'offer',
                        from: me,
                        offer: offer
                    }
                });
            });
        }, function() {});
    };

    var sendAnswer = function() {
        // Create offer
        peerConnection.createAnswer(function(answer) {
            peerConnection.setLocalDescription(answer, function() {
                // Send offer
                $.ajax({
                    type: 'POST',
                    url:  '/signalling',
                    data: {
                        type: 'answer',
                        from: me,
                        answer: answer
                    }
                });
            });
        }, function() {});
    };

    source.addEventListener("uid", function(event) {
        event = JSON.parse(event.data);
        me    = event.uid;
        console.log('UID: ' + me);

    });

    source.addEventListener("newfriend", function(event) {
        event = JSON.parse(event.data);

        getVideo().then(getAudio).then(function() {
            sendOffer();
        });
    });

    source.addEventListener("offer", function(event) {
        event = JSON.parse(event.data);

        if (event.from === me)
            return;

        peerConnection.setRemoteDescription(event.offer, function() {

            getVideo().then(getAudio).then(function() {
                sendAnswer();
            });
        });
    });

    source.addEventListener('answer', function(event) {
        event = JSON.parse(event.data);
        console.log(event.answer);

        if (event.from === me)
            return;

        peerConnection.setRemoteDescription(event.answer, function() {
            console.log('done');
        });
    });

});

