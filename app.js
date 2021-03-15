import * as THREE from './libs/three/three.module.js';
import { VRButton } from './libs/VRButton.js';
import { BoxLineGeometry } from './libs/three/jsm/BoxLineGeometry.js';
import { GLTFLoader } from './libs/three/jsm/GLTFLoader.js';
import { Stats } from './libs/stats.module.js';
import { OrbitControls } from './libs/three/jsm/OrbitControls.js';
import { SpotLightVolumetricMaterial } from './libs/SpotLightVolumetricMaterial.js';
import { XRControllerModelFactory } from './libs/three/jsm/XRControllerModelFactory.js';
import { CanvasUI } from './libs/CanvasUI.js';
import {
	Constants as MotionControllerConstants,
	fetchProfile,
	MotionController
} from './libs/three/jsm/motion-controllers.module.js';
import { Radio } from './radio.js';

const DEFAULT_PROFILES_PATH = 'https://cdn.jsdelivr.net/npm/@webxr-input-profiles/assets@1.0/dist/profiles';
const DEFAULT_PROFILE = 'generic-trigger';

class App{
	constructor(){
        this.radio = new Radio(this)
		const container = document.createElement( 'div' );
		document.body.appendChild( container );
        this.clock = new THREE.Clock();
        this.orbitOrigin = new THREE.Object3D()
        this.dolly = new THREE.Object3D()
        this.dolly.position.set(0,0,0)
        this.orbitOrigin.position.set(0,0,0)
		this.camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 0.1, 100 );
		this.camera.position.set( 0, 0, 0);
        this.dolly.add( this.camera )
		this.scene = new THREE.Scene();
        this.orbitOrigin.add(this.dolly)
        this.scene.add(this.orbitOrigin)
        this.scene.background = new THREE.Color( 0x505050 );

		this.scene.add( new THREE.HemisphereLight( 0x606060, 0x404040 ) );

        const light = new THREE.DirectionalLight( 0xffffff );
        light.position.set( 1, 1, 1 ).normalize();
		this.scene.add( light );
			
		this.renderer = new THREE.WebGLRenderer({ antialias: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        
		container.appendChild( this.renderer.domElement );
        
        this.controls = new OrbitControls( this.camera, this.renderer.domElement );
        this.controls.target.set(0, 1.6, -2);
        this.controls.update();
        
        this.stats = new Stats();
        document.body.appendChild( this.stats.dom );

        this.raycaster = new THREE.Raycaster();
        this.workingMatrix = new THREE.Matrix4();
        this.workingVector = new THREE.Vector3();
        
        this.initScene();
        this.setupXR();
        this.getInputSources = true;

        window.addEventListener('resize', this.resize.bind(this) );
        
        this.renderer.setAnimationLoop( this.render.bind(this) );
	}	

    
    random( min, max ){
        return Math.random() * (max-min) + min;
    }
    
    initScene(){
        this.loading = false
        this.nodeSelected = false
        this.dir = 0
        this.rad = 2.5
        this.both = 0

        this.radius = 0.08;
        var geometry = new THREE.IcosahedronBufferGeometry( this.radius, 2 );
        var object = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );

        object.position.x = 0;
        object.position.y = 0;
        object.position.z = 0;

        this.rotation = 0
        this.scene.add( object );

        this.radius = 0.08;
        var geometry1 = new THREE.IcosahedronBufferGeometry( this.radius, 2 );
        var object1 = new THREE.Mesh( geometry1, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );

        object1.position.x = 0;
        object1.position.y = 0;
        object1.position.z = 0;

        this.scene.add( object1 );

        this.radius = 0.4
        var loader = new THREE.TextureLoader();
        this.earth = new THREE.Group();
        this.earth.position.y = 0
        this.earth.position.z = 0
        this.positions = []

        var self = this
        loader.load( './Assets/sphere.jpg', function ( texture ) {
            var geometry = new THREE.SphereGeometry( self.radius, 50, 50 );
            var material = new THREE.MeshBasicMaterial( { map: texture, overdraw: 0.5 } );
            self.globe = new THREE.Mesh( geometry, material );
            self.earth.add( self.globe );
            //self.globe.add(sound)
            const bbox = new THREE.Box3().setFromObject( self.globe );
            console.log(`min:${bbox.min.x.toFixed(2)},${bbox.min.y.toFixed(2)},${bbox.min.z.toFixed(2)} -  max:${bbox.max.x.toFixed(2)},${bbox.max.y.toFixed(2)},${bbox.max.z.toFixed(2)}`);
        } )

        this.nodeGeometry = new THREE.BoxGeometry(0.002, 0.002, 0.01)
        this.nodeMaterial = new THREE.MeshLambertMaterial( { color: 0x00FF82 } )
        this.geom = new THREE.Geometry()
        $.getJSON("./Assets/coords.json", function(data) {
            self.allQuestions = data;
        }).then( () => {
            self.allQuestions.forEach( (value) => {
                this.addNode(value.latitude, value.longitude, this.radius, self)
            })
            var total = new THREE.Mesh(self.geom, self.nodeMaterial)
            self.earth.add(total)
            self.earth.add(this.positions)
        })
        this.scene.add( this.earth )

        this.highlight = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( { color: 0xffffff, side: THREE.BackSide } ) );
        this.highlight.scale.set(1.2, 1.2, 1.2);
        this.scene.add(this.highlight);

        this.ui = this.createUI();
    }

    addNode(lat, lon, radius, self){
        const node = new THREE.Mesh( self.nodeGeometry, self.nodeMaterial );
	
	    node.position.x = this.calcPosFromLatLonRad( lat, lon, radius)[0]
	    node.position.y = this.calcPosFromLatLonRad( lat, lon, radius)[1]
	    node.position.z = this.calcPosFromLatLonRad( lat, lon, radius)[2]
        node.lookAt(new THREE.Vector3(0, 0, 0))
        self.positions.push(new THREE.Vector3(node.position.x, node.position.y, node.position.z))

        node.updateMatrix()
        self.geom.merge(node.geometry, node.matrix)
    }

    createUI(){
        const config = {
            panelSize: { height: 0.5 },
            height: 500,
            body: { type: "text" }
        }
        const ui = new CanvasUI( { body: "" }, config );
        ui.mesh.position.set(0, 2.0, -1.8);
        this.scene.add( ui.mesh );
        return ui;
    }
    
    //{"trigger":{"button":0},"touchpad":{"button":2,"xAxis":0,"yAxis":1}},"squeeze":{"button":1},"thumbstick":{"button":3,"xAxis":2,"yAxis":3},"button":{"button":6}}}
    createButtonStates(components){

        const buttonStates = {};
        this.gamepadIndices = components;
        
        Object.keys( components ).forEach( (key) => {
            if ( key.indexOf('touchpad')!=-1 || key.indexOf('thumbstick')!=-1){
                buttonStates[key] = { button: 0, xAxis: 0, yAxis: 0 };
            }else{
                buttonStates[key] = 0; 
            }
        })
        
        this.buttonStates = buttonStates;
    }
    
    updateUI(){
        const str = JSON.stringify( this.buttonStates );
        if (this.strStates === undefined || ( str != this.strStates )){
            this.ui.updateElement( 'body', str );
            this.ui.update(); 
            this.strStates = str;
        }
    }

    calcPosFromLatLonRad(lat,lon,radius){
  
        var phi   = (90-lat)*(Math.PI/180)
        var theta = (lon+180)*(Math.PI/180)
        
        var x = -((radius) * Math.sin(phi)*Math.cos(theta))
        var z = ((radius) * Math.sin(phi)*Math.sin(theta))
        var y = ((radius) * Math.cos(phi))
      
        return [x,y,z]
    
    }

    setSound(link) {
        // var audioSourceNode = audioContext.createMediaStreamSource(stream);
        // this.sound.setMediaStreamSource(audioSourceNode)
        this.mediaElement = new Audio(link)
        this.mediaElement.crossOrigin = "anonymous"
        this.mediaElement.loop = true
        // mediaElement.play()
        this.sound.setMediaElementSource( this.mediaElement )
    }

    setupXR(){
        this.renderer.xr.enabled = true;
        
        const button = new VRButton( this.renderer );
        
        const self = this;
        
        function onConnected( event ){
            const info = {};

            self.audio = document.querySelector(".radio_player");
            self.player = document.querySelector(".audioSrc");
            self.player.setAttribute("src", "https://radio.garden/api/ara/content/listen/lWw8pNel/channel.mp3");
            self.audio.load();
			self.audio.play();

            // console.log(decodeURIComponent("https://radio.garden/api/ara/content/listen/lWw8pNel/channel.mp3"));

            // fetch("https://radio.garden/api/ara/content/listen/lWw8pNel/channel.mp3").then((res) => {
            //     console.log(res.request.uri.href)
            // })

            // var myReq = new Request("https://radio.garden/api/ara/content/listen/lWw8pNel/channel.mp3")
            // console.log(myReq.url)

            // var xhr = new XMLHttpRequest();

            // $.ajax({
            //     url: "https://radio.garden/api/ara/content/listen/lWw8pNel/channel.mp3",
            //     type: 'post',
            //     data: '...',
            //     xhr: function() {
            //         return xhr;
            //     },
            //     success: function () {
            //         console.log(xhr.responseURL);
            //     }
            // });
            // try {
            //     $.ajax({
            //         url: "https://radio.garden/api/ara/content/listen/lWw8pNel/channel.mp3",
            //         success:function(result,status,xhr){
            //         console.log(xhr.getResponseHeader('Location'));
            //         }
            //     });
            // } catch (e) {
            //     console.log(e)
            // }

            // var url = "https://radio.garden/api/ara/content/listen/lWw8pNel/channel.mp3";

            // $.ajax({
            //     type: 'get',
            //     url: url,
            //     context: this,
            //     success: this.mySuccess,
            //     error: this.myError,
            //     cache: false,
            //     error: function(jqXHR, exception) {
            //         console.log(url)
            //     }
            // });
            // function getRadioStation(link, i) {
            //     $.ajax({
            //         type: 'get',
            //         url: link,
            //         context: this,
            //         // success: this.mySuccess,
            //         // error: this.myError,
            //         cache: false,
            //         beforeSend: function(jqXHR, settings) {
            //             jqXHR.url = settings.url;
            //         },
            //         error: function(jqXHR, exception) {
            //             if (i < 1){
            //                 getRadioStation(jqXHR.url, i+1)
            //             } else {
            //                 // alert(context.url);
            //                 alert(this.url)
            //                 alert(exception.url)
            //             }
            //         }
            //     });
            // }
            // getRadioStation("https://radio.garden/api/ara/content/listen/lWw8pNel/channel.mp3", 1)


            // $.ajax({
            //     type: 'get',
            //     url: "https://radio.garden/api/ara/content/listen/lWw8pNel/channel.mp3",
            //     context: this,
            //     success: this.mySuccess,
            //     error: this.myError,
            //     cache: false,
            //     beforeSend: function(jqXHR, settings) {
            //         jqXHR.url = settings.url;
            //         console.log(jqXHR.url)
            //     },
            //     error: function(jqXHR, exception) {
            //         console.log(jqXHR.url);
            //         var secondURL = jqXHR.url
            //         $.ajax({
            //             type: 'get',
            //             url: secondURL,
            //             context: this,
            //             success: this.mySuccess,
            //             error: this.myError,
            //             cache: false,
            //             beforeSend: function(jqXHR, settings) {
            //                 jqXHR.url = settings.url;
            //                 console.log(jqXHR.url)
            //             },
            //             error: function(jqXHR, exception) {
            //                 console.log(jqXHR.url)
            //                 var thirdURL = jqXHR.url

            //                 $.ajax({
            //                     type: 'get',
            //                     url: thirdURL,
            //                     context: this,
            //                     success: this.mySuccess,
            //                     error: this.myError,
            //                     cache: false,
            //                     beforeSend: function(jqXHR, settings) {
            //                         jqXHR.url = settings.url;
            //                     },
            //                     error: function(jqXHR, exception) {
            //                         alert(jqXHR.url);
            //                     }
            //                 });
            //             }
            //         });
            //     }
            // });



            // var xmlHttp = new XMLHttpRequest();
            // xmlHttp.open( "GET", "https://radio.garden/api/ara/content/listen/lWw8pNel/channel.mp3", false ); // false for synchronous request
            // console.log(xmlHttp);
            // xmlHttp.send( null );
            // console.log(xmlHttp.responseText);

            // self.listener = new THREE.AudioListener()
            // self.sound = new THREE.Audio( self.listener )
            // self.mediaElement = new Audio("https://radio.garden/api/ara/content/listen/lWw8pNel/channel.mp3")
            // self.mediaElement.crossOrigin = "anonymous"
            // self.mediaElement.loop = true
            // self.mediaElement.play()
            // self.sound.setMediaElementSource( self.mediaElement )

            // self.setSound("https://cors-anywhere.herokuapp.com/http://radio.garden/api/ara/content/listen/lWw8pNel/channel.mp3")
            // self.sound.setRefDistance(20)
            // self.camera.add( self.listener )
            // self.mediaElement.play()
            // self.globe.add( self.sound )
            // self.audio = document.querySelector(".radio_player");
            // self.player = document.querySelector(".audioSrc");
            // audioLoader.load("https://cors-anywhere.herokuapp.com/http://radio.garden/api/ara/content/listen/lWw8pNel/channel.mp3", function ( buffer ) {
            //     sound.setBuffer( buffer )
            //     self.sound.setRefDistance(20)
            //     self.mediaElement.play()
            //     self.globe.add( self.sound )
            //     console.log("playing")
            // })

            // const file = "https://cors-anywhere.herokuapp.com/http://radio.garden/api/ara/content/listen/lWw8pNel/channel.mp3"
            // self.mediaElement = new Audio( file );
            // self.mediaElement.crossOrigin = "anonymous"
            // self.mediaElement.loop = true
            // self.mediaElement.play();
            // audio.setMediaElementSource( mediaElement );

            fetchProfile( event.data, DEFAULT_PROFILES_PATH, DEFAULT_PROFILE ).then( ( { profile, assetPath } ) => {                
                info.name = profile.profileId;
                info.targetRayMode = event.data.targetRayMode;

                Object.entries( profile.layouts ).forEach( ( [key, layout] ) => {
                    const components = {};
                    Object.values( layout.components ).forEach( ( component ) => {
                        components[component.rootNodeName] = component.gamepadIndices;
                    });
                    info[key] = components;
                });

                self.createButtonStates( info.right );
                
                self.updateControllers( info );

            } );
        }
         
        const controller = this.renderer.xr.getController( 0 );
        
        controller.addEventListener( 'connected', onConnected );
        
        const modelFactory = new XRControllerModelFactory();
        
        const geometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3( 0,0,0 ), new THREE.Vector3( 0,0,-1 ) ] );

        const line = new THREE.Line( geometry );
        line.scale.z = 0;
        
        this.controllers = {};
        this.dolly.position.set(0,-0.6,1.0)
        this.controllers.right = this.buildController( 0, line, modelFactory );
        this.controllers.left = this.buildController( 1, line, modelFactory );
    }
    
    buildController( index, line, modelFactory ){
        const controller = this.renderer.xr.getController( index );
        
        controller.userData.selectPressed = false;
        controller.userData.index = index;
        
        if (line) controller.add( line.clone() );
        
        this.dolly.add( controller );
        
        let grip;
        
        if ( modelFactory ){
            grip = this.renderer.xr.getControllerGrip( index );
            grip.add( modelFactory.createControllerModel( grip ));
            this.dolly.add( grip );
        }
        
        return { controller, grip };
    }
    
    updateControllers(info){
        const self = this;
        
        function onSelectStart( ){
            if (self.nodeSelected == false) {
                this.userData.selectPressed = true;
            }
        }

        function onSelectEnd( ){
            this.children[0].scale.z = 0;
            this.userData.selectPressed = false;
            this.userData.selected = undefined;
        }

        function onSqueezeStart( ){
            this.userData.squeezePressed = true;
            if (this.userData.selected !== undefined ){
                this.attach( this.userData.selected );
                this.userData.attachedObject = this.userData.selected;
            }
        }

        function onSqueezeEnd( ){
            this.userData.squeezePressed = false;
            if (this.userData.attachedObject !== undefined){
                self.room.attach( this.userData.attachedObject );
                this.userData.attachedObject = undefined;
            }
        }
        
        function onDisconnected(){
            const index = this.userData.index;
            console.log(`Disconnected controller ${index}`);
            
            if ( self.controllers ){
                const obj = (index==0) ? self.controllers.right : self.controllers.left;
                
                if (obj){
                    if (obj.controller){
                        const controller = obj.controller;
                        while( controller.children.length > 0 ) controller.remove( controller.children[0] );
                        self.scene.remove( controller );
                    }
                    if (obj.grip) self.scene.remove( obj.grip );
                }
            }
        }
        
        if (info.right !== undefined){
            const right = this.renderer.xr.getController(0);
            
            let trigger = false, squeeze = false;
            
            Object.keys( info.right ).forEach( (key) => {
                if (key.indexOf('trigger')!=-1) trigger = true;                   
                if (key.indexOf('squeeze')!=-1) squeeze = true;      
            });
            
            if (trigger){
                right.addEventListener( 'selectstart', onSelectStart );
                right.addEventListener( 'selectend', onSelectEnd );
            }

            if (squeeze){
                right.addEventListener( 'squeezestart', onSqueezeStart );
                right.addEventListener( 'squeezeend', onSqueezeEnd );
            }
            
            right.addEventListener( 'disconnected', onDisconnected );
        }
        
        if (info.left !== undefined){
            const left = this.renderer.xr.getController(1);
            
            let trigger = false, squeeze = false;
            
            Object.keys( info.left ).forEach( (key) => {
                if (key.indexOf('trigger')!=-1) trigger = true; 
                if (key.indexOf('squeeze')!=-1) squeeze = true;      
            });
            
            if (trigger){
                left.addEventListener( 'selectstart', onSelectStart );
                left.addEventListener( 'selectend', onSelectEnd );
            }

            if (squeeze){
                left.addEventListener( 'squeezestart', onSqueezeStart );
                left.addEventListener( 'squeezeend', onSqueezeEnd );
            }
            
            left.addEventListener( 'disconnected', onDisconnected );
        }
    }
    
    distanceVector( v1, v2 )
    {
        var dx = v1.x - v2.x;
        var dy = v1.y - v2.y;
        var dz = v1.z - v2.z;
        
        return Math.sqrt( dx * dx + dy * dy + dz * dz );
    }

    handleController( controller ){
        const self = this
        if (controller.userData.selectPressed ){
            // selecting nodes for radio
            //********************************************************************************** */

            this.workingMatrix.identity().extractRotation( controller.matrixWorld );

            this.raycaster.ray.origin.setFromMatrixPosition( controller.matrixWorld );
            this.raycaster.ray.direction.set( 0, 0, - 1 ).applyMatrix4( this.workingMatrix );

            const intersects = this.raycaster.intersectObjects( this.earth.children, true );

            if (intersects.length>0){

                intersects[0].object.add(this.highlight);
                this.highlight.visible = true;
                controller.children[0].scale.z = intersects[0].distance;
                controller.userData.selected = intersects[0].object;

                if(this.nodeSelected == true && this.loading == false) {
                    this.nodeSelected == false
                    this.loading = true
                    console.log(intersects[0])

                    var geometry = new THREE.IcosahedronBufferGeometry( 0.03, 2 );
                    var object = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } ) );
                    object.position.x = intersects[0].point.x
                    object.position.y = intersects[0].point.y
                    object.position.z = intersects[0].point.z
                    this.scene.add(object)

                    console.log(intersects[0].point.distanceTo(self.positions[0]))
                    console.log(`${intersects[0].point.x}, ${intersects[0].point.y}, ${intersects[0].point.z}`)
                    console.log(`${self.positions[0].x}, ${self.positions[0].x}, ${self.positions[0].x}`)

                    var v1 = intersects[0].point
                    var v2 = self.positions[0]
                    var dx = v1.x.toFixed(2) - v2.x.toFixed(2);
                    var dy = v1.y.toFixed(2) - v2.y.toFixed(2);
                    var dz = v1.z.toFixed(2) - v2.z.toFixed(2);

                    console.log(`${intersects[0].point.x} ${intersects[0].point.y} ${intersects[0].point.z}`)
                    console.log(`${self.positions[0].x} ${self.positions[0].y} ${self.positions[0].z}`)

                    console.log(Math.sqrt( dx * dx + dy * dy + dz * dz ))

                    console.log(self.distanceVector(
                        new THREE.Vector3(
                        self.positions[0].x,
                        self.positions[0].y,
                        self.positions[0].z), 
                        new THREE.Vector3(
                        intersects[0].x,
                        intersects[0].y,
                        intersects[0].z
                    )))

                    var dists = []
                    var shortestDist = 10000

                    console.log(`positions: ${self.positions.length}, data: ${self.allQuestions.length}`)
                    console.log(self.positions)
                    console.log(self.allQuestions)

                    self.positions.forEach ( (pos) => {
                        dists.push(intersects[0].point.distanceTo(pos))
                    })

                    dists.forEach ( (it) => {
                        if (it < shortestDist) {
                            shortestDist = it
                            console.log(it)
                            console.log(self.allQuestions[dists.indexOf(it)])
                        }
                    })

                    var finalPos = self.allQuestions[dists.indexOf(shortestDist)]
                    var dat =
                        {
                            latitude : finalPos.latitude,
                            longitude : finalPos.longitude,
                            id : finalPos.id
                        }
                    this.radio.getStation(dat)
                    console.log(`final pos: ${JSON.stringify(finalPos)}`)
                }
            }else{
                controller.children[0].scale.z = 0;
            }
        }
    }
    
    resize(){
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );  
    }
    
	render( ) {   
        
        const dt = this.clock.getDelta();
        if (this.renderer.xr.isPresenting){
            const session = this.renderer.xr.getSession();
            const inputSources = session.inputSources;
            const self = this; 
            if ( this.getInputSources ){    
                const info = [];

                inputSources.forEach( inputSource => {
                    const gp = inputSource.gamepad;
                    const axes = gp.axes;
                    const buttons = gp.buttons;
                    const mapping = gp.mapping;
                    this.useStandard = (mapping == 'xr-standard');
                    const gamepad = { axes, buttons, mapping };
                    const handedness = inputSource.handedness;
                    const profiles = inputSource.profiles;
                    this.type = "";
                    profiles.forEach( profile => {
                        if (profile.indexOf('touchpad')!=-1) this.type = 'touchpad';
                        if (profile.indexOf('thumbstick')!=-1) this.type = 'thumbstick';
                    });
                    const targetRayMode = inputSource.targetRayMode;
                    info.push({ gamepad, handedness, profiles, targetRayMode });
                });
                    
                console.log( JSON.stringify(info) );
                
                this.getInputSources = false;
            }else if (this.useStandard && this.type!=""){
                inputSources.forEach( inputSource => {
                    if (this.both == 0) {
                        const gp = inputSource.gamepad;
                        const thumbstick = (this.type=='thumbstick');
                        const offset = (thumbstick) ? 2 : 0;
                        const btnIndex = (thumbstick) ? 3 : 2;
                        const btnPressed = gp.buttons[btnIndex].pressed;

                        if ( inputSource.handedness == 'right'){
                            if(gp.axes[offset] > 0) {
                                this.dir = 1
                                this.both += 1
                            } else if (gp.axes[offset] < 0) {
                                this.dir = -1
                                this.both += 1
                            } else{
                                this.dir = 0
                            }
                        }else if ( inputSource.handedness == 'left'){
                            if(gp.axes[offset] > 0 && this.both == 0) {
                                this.dir = 1
                                this.both += 1
                            } else if (gp.axes[offset] < 0 && this.both == 0) {
                                this.dir = -1
                                this.both += 1
                            } else if (this.both == 0){
                                this.dir = 0
                            }
                        }

                        if (gp.buttons[4].pressed == true) {
                            this.nodeSelected = true
                        }
                    }
                })
                this.both = 0
            }

            if (this.dir == -1) {
                this.orbitOrigin.rotateY(-0.01)
            } else if(this.dir == 1) {
                this.orbitOrigin.rotateY(0.01)
    
            }

            if (this.controllers ){
                Object.values( this.controllers).forEach( ( value ) => {
                    self.handleController( value.controller );
                });
            } 
            if (this.elapsedTime===undefined) this.elapsedTime = 0;
            this.elapsedTime += dt;
        }else{
            this.stats.update();
        }
        this.renderer.render( this.scene, this.camera );
    }
}

export { App };