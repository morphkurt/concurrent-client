videojs.registerPlugin('simplegtm', function (options) {
    __indexOf = [].indexOf || function (item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };



    var debug = false;
    var firstPlay = false;
    var _dataLayerArray;
    var mediaPlayBackPosition = 0;
    var userid = options.user;
    var pingURL = options.pingURL;
    var sessionId = ''
    var pingInterval = options.pingInterval;
    var lastPing = -1;




    if (options) {
        debug = true || options.debug;
    }



    var player = this,
        percentsPlayedInterval = options.percentsPlayedInterval,
        percentsAlreadyTracked = []

    player.on('loadedmetadata', function () {

        fetch(pingURL + `/rest/v1/user/${userid}/sessions`,
            {
                method: 'post'
            }
        )
            .then(response => response.json())
            .then(data => {
                sessionId = data.sessionId;
                console.log(sessionId)
            });

        debug && console.log('++++ loadedmetadata +++ ');
    });

    player.on('play', function () {
        debug && console.log('+++ play +++ ');
        if (firstPlay) {
            debug && console.log('+++ first play +++ ');
            pushDataLayer('mediaPlayProgressStarted', 0)
            firstPlay = false
        } else {
            debug && console.log('+++ non first play +++ ');
            pushDataLayer('mediaPlayBackStarted', mediaPlayBackPosition)

        }
    });
    //
    player.on('loadstart', function () {
        debug && console.log('+++ loadstart +++ ');
        firstPlay = true;
        percentsAlreadyTracked = [];
    });

    player.on('pause', function () {

        var currentTime = Math.round(this.currentTime());
        var duration = Math.round(this.duration());
        var percentPlayed = Math.round(currentTime / duration * 100);
        debug && console.log('+++ Percentage played' + percentPlayed + ' +++ ');
        if (percentPlayed < 99) {
            debug && console.log('+++ pause +++ ');
            pushDataLayer('mediaPlaybackPaused', mediaPlayBackPosition)

        } else {
            debug && console.log('+++ pause at the end detected +++ ');
        }
    });

    player.on('ended', function () {
        debug && console.log('+++ ended +++ ');
        pushDataLayer('mediaPlaybackFinished', 1)
        mediaPlayBackPosition = 0;


    });

    player.on('timeupdate', function () {
        debug && console.log('+++ timeupdate +++ ');
        var currentTime = Math.round(this.currentTime());
        var duration = Math.round(this.duration());
        if (lastPing != Math.floor(currentTime / pingInterval)) {
            //send ping
            lastPing = Math.floor(currentTime / pingInterval);
            console.log("sending ping")
            fetch(pingURL + `/rest/v1/user/${userid}/sessions/${sessionId}`,
                {
                    method: 'post'
                }
            )
                .then(response => response.json())
                .then(data => console.log(data));
        }
        console.log(currentTime)
        console.log(Math.floor(currentTime / pingInterval))
    });

    function pushDataLayer(event, progressPosition) {
        _dataLayerObject = {}
        _dataLayerObject['event'] = event;
        _dataLayerObject['mediaPlayProgressPosition'] = progressPosition
        _dataLayerObject['timestamp'] = Date.now()
        var _finalDataLayerArray = Object.assign(_dataLayerObject, _dataLayerArray)
    }

    function modify(object, value) {
        if (object['type'] == 'replace') {
            var regex = new RegExp(atob(object['regexBase64']), "g");
            return value.replace(regex, object['replaceValue'])
        } else if (object['type'] == 'comparator') {
            if (object['operator'] == "==") {
                return (value == object['variable']) ? object['value1'] : object['value2']
            }
        } else if (object['type'] == "addSpace") {
            return addSpace(value);
        }
        else if (object['type'] == "convertDate") {
            return convertDate(value);
        } else if (object['type'] == "convertTime") {
            return convertTime(value);
        }
        else if (object['type'] == "arrayContains") {
            return (arrayContains(player.mediainfo['tags'], object['variable'])) ? object['value1'] : object['value2']
        }
        else {
            return value;
        }
    }

    function arrayContains(array, variable) {
        let returnVal = false;
        array.forEach(v => {
            if (v == variable) returnVal = true
        })
        return returnVal;
    }

    function convertTime(d) {
        var options = {
            timeZone: 'Australia/Brisbane',
            hour: 'numeric', minute: 'numeric', second: 'numeric',

            hour12: false,
            timeZoneName: 'short'
        }
        formatter = new Intl.DateTimeFormat('en-AU', options)
        return formatter.format(new Date(d));
    }

    function convertDate(d) {
        var options = {
            timeZone: 'Australia/Brisbane',
            literal: '-',
            year: 'numeric', month: 'numeric', day: 'numeric'
        }
        formatter = new Intl.DateTimeFormat('en-AU', options)
        return formatter.format(new Date(d)).replace(/\//g, '-');
    }

    function ArrNoDupe(a) {
        var temp = {};
        for (var i = 0; i < a.length; i++) temp[a[i]] = true;
        return Object.keys(temp);
    }

    function addSpace(v) {
        let cut = []
        let words = [];
        cut.push(0);
        for (i = 0; i < v.length - 1; i++) {
            let s = v.substring(i, i + 2)
            if (/[0-9][A-Z]/g.test(v.substring(i, i + 2))) cut.push(i + 1);
            if (/[a-z][A-Z0-9]/g.test(v.substring(i, i + 2))) cut.push(i + 1);
            if (/[A-Z0-9][a-z]/g.test(v.substring(i, i + 2))) cut.push(i);
        }
        cut.push(v.length);
        let uA = ArrNoDupe(cut);
        for (i = 1; i < uA.length; i++) words.push(v.substring(uA[i - 1], uA[i]))
        var sentence = ''
        words.forEach(w => { sentence += w + " " })
        return sentence.replace(/(AFL)/g, ' $1').replace(/ +(?= )/g, '').trim()
    }


});
