class Radio{
    constructor() {
        this.index = 0;
        this.next = true;
        this.Data;
        this.input;
        this.get = false;
        this.once = true;
        this.pos = 0;

        this.audio = document.querySelector(".radio_player");
        this.player = document.querySelector(".audioSrc");
        // replace with app call
        // let playButton = document.querySelector(".play");        this.file;
        this.Latitude;
        this.Longitude;
        this.stationName = "Loading Station" ;
        this.mp3Link;
        this.shouldPause = false;
        this.stationIndex = 0;
        this.shouldChange = false;
        this.stationLength = 0;
        this.dat = {};
        this.playing = false;
        this.wasPlaying = false;
        this.station;
        this.reset = true;
        // console.log("radio")
    }

    PlayAudio()
	{
		this.wasPlaying = this.playing;
		if(this.playing == false)
		{
			this.console.log("played");
			this.playing = true;
			this.player.src = mp3Link;
			this.console.log(mp3Link);
			this.audio.load();
			this.audio.play();
			this.playButton.textContent = "Pause";
		}

		if(this.playing == true && this.wasPlaying == true)
		{
			this.playing = false;
			console.log("paused");
			this.player.setAttribute("src", "");
			this.audio.pause();
			setTimeout(function () {
				this.audio.load();
			});
			this.playButton.textContent = "Play";
		}
	}

    LoadNewTrack(link){
		this.player.setAttribute("src", link);
		if(playing == true)
		{
			this.audio.load();
			this.audio.play();
		}
	}

    getStation(input){
        if (this.reset)
        {
            this.reset = false;
            // this.station = CheckDists(input.latitude, input.longitude, obj);
        }
        var proxyurl = "https://cors-anywhere.herokuapp.com/"
        //var proxyurl = "https://cors.io/"
        var link = "http://radio.garden/api/ara/content/page/" + input.id;
        let setting = { method: "Get"};
        fetch(proxyurl + link, setting)
            .then(res => res.json())
            .then((json) => {
                this.stationLength = json.data.content[0].items.length - 1;
                link = json.data.content[0].items[stationIndex].href;
                this.stationName = json.data.content[0].items[stationIndex].title;
                link = link.substr(1);
                this.pos = link.search("/");
                link = link.substr(this.pos+1);
                this.pos = link.substr(1).search("/");
                link = link.substr(this.pos+1);
                this.pos = link.substr(1).search("/");
                this.mp3Link = "http://radio.garden/api/ara/content/listen" + link + "/channel.mp3";
                LoadNewTrack(mp3Link);
                this.shouldChange = true;
                // Replace with altering app's UI
                // document.querySelector(".lat").innerHTML = Latitude;
                // document.querySelector(".long").innerHTML = Longitude;
                // document.querySelector(".station_name").innerHTML = stationName;
            });
    }
}

export { Radio };