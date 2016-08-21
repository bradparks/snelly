
var Snelly = function()
{
	this.initialized = false; 

	var render_canvas = document.getElementById('render-canvas');
	render_canvas.width  = window.innerWidth;
	render_canvas.height = window.innerHeight;
	this.width = render_canvas.width;
	this.height = render_canvas.height;

	window.addEventListener( 'resize', this, false );

	this.container = document.getElementById('container');
	{
		this.stats = new Stats();
		this.stats.domElement.style.position = 'absolute';
		this.stats.domElement.style.top = '0px';
		this.container.appendChild( this.stats.domElement );
	}

	// Setup THREE.js GL viewport renderer and camera
	var ui_canvas = document.getElementById('ui-canvas');
	ui_canvas.style.top = 0;
	ui_canvas.style.position = 'fixed' 

	var VIEW_ANGLE = 45;
	var ASPECT = this.width / this.height ;
	var NEAR = 0.05;
	var FAR = 1000;
	this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);

	this.glRenderer = new THREE.WebGLRenderer( { canvas: ui_canvas,
											     alpha: true,
											     antialias: true } );
	this.glRenderer.setClearColor( 0x000000, 0 ); // the default
	this.glRenderer.setSize(this.width, this.height);
	this.glScene = new THREE.Scene();
	this.glScene.add(this.camera);

	var pointLight = new THREE.PointLight(0xa0a0a0);
	pointLight.position.x = 10;
	pointLight.position.y = 50;
	pointLight.position.z = 130;
	this.glScene.add(pointLight);

	var light = new THREE.AmbientLight( 0x808080 ); // soft white light
	this.glScene.add( light );


	// Create user control system for camera
	this.controls = new THREE.OrbitControls(this.camera, this.glRenderer.domElement);
	this.controls.zoomSpeed = 2.0;
	this.controls.addEventListener( 'change', camChanged );

	// Setup Laser pointer
	this.laser = new LaserPointer(this.glRenderer, this.glScene, this.camera, this.controls);
	this.laser.setPosition(new THREE.Vector3(-5.0, 0.0, 0.0));
	this.laser.setDirection(new THREE.Vector3(1.0, 0.0, 0.0));

	// Setup keypress and mouse events
	snelly = this;
	window.addEventListener('keydown', function(event) 
	{
		var charCode = (event.which) ? event.which : event.keyCode;
		switch (charCode)
		{
			case 122: // F11 key: go fullscreen
				var element	= document.body;
				if      ( 'webkitCancelFullScreen' in document ) element.webkitRequestFullScreen();
				else if ( 'mozCancelFullScreen'    in document ) element.mozRequestFullScreen();
				else console.assert(false);
				break;
			case 70: // F key: focus on emitter
				snelly.controls.object.zoom = snelly.controls.zoom0;
				snelly.controls.target.copy(snelly.laser.getPoint());
				snelly.controls.update();
				break; 
		}
	}, false);
	
	this.glRenderer.domElement.addEventListener( 'mousemove', this, false );
	this.glRenderer.domElement.addEventListener( 'mousedown', this, false );
	this.glRenderer.domElement.addEventListener( 'mouseup',   this, false );
	this.glRenderer.domElement.addEventListener( 'contextmenu',   this, false );

	// Instantiate scenes
	this.scenes = {}
	this.sceneObj = null;
	{
		this.addScene(new SphereScene("sphere", "Simple sphere"));
		this.addScene(new FibreScene("fibre", "Simple optical fibre"));
		this.addScene(new BoxScene("box", "Simple box"));
		this.addScene(new OceanScene("ocean", "Ocean"));
		this.addScene(new MengerScene("menger", "Menger Sponge"));
		this.addScene(new EllipsoidScene("ellipsoid", "Ellipsoid"));

		// ...
	}

	// Instantiate materials
	this.materials = {}
	this.materialObj = null;
	{
		// Dielectrics
		this.addMaterial( new ConstantDielectric("Constant IOR dielectric", "", 1.5) ); 

		this.addMaterial( new SellmeierDielectric("Glass (BK7)", "",     [0.0,        1.03961212, 0.00600069867, 0.231792344, 0.0200179144, 1.01046945, 103.560653]) );
		this.addMaterial( new SellmeierDielectric("Glass (N-FK51A)", "", [0.0,        0.97124781, 0.00472301995, 0.216901417, 0.0153575612, 0.90465166, 168.68133]) );
		this.addMaterial( new Sellmeier2Dielectric("Water", "",          [0.0,        5.67252e-1, 5.08555046e-3, 1.736581e-1, 1.8149386e-2, 2.12153e-2, 2.61726e-2, 1.1384932e-1, 1.073888e1]) );
		this.addMaterial( new Sellmeier2Dielectric("Ethanol", "",        [0.0,        0.83189,    0.00930,       -0.15582,    -49.45200]) );
		this.addMaterial( new Sellmeier2Dielectric("Polycarbonate", "",  [0.0,        0.83189,    0.00930,       -0.15582,    -49.45200]) );
		this.addMaterial( new CauchyDielectric("Glycerol", "",             [1.45797, 0.00598, -2, -0.00036, -4]) );
		this.addMaterial( new CauchyDielectric("Liquid Crystal (E7)", "",  [1.4990,  0.0072,  -2,  0.0003,  -4]) );

		this.addMaterial( new SellmeierDielectric("Diamond", "",         [0.0,        0.3306,     0.175,         4.3356,      0.1060]) );
		this.addMaterial( new SellmeierDielectric("Quartz", "",         [0.0, 0.6961663, 0.0684043, 0.4079426, 0.1162414, 0.8974794, 9.896161]) );
		this.addMaterial( new SellmeierDielectric("Fused Silica", "",    [0.0,        0.6961663,  0.0684043,     0.4079426,  0.1162414, 0.8974794, 9.896161]) );
		this.addMaterial( new SellmeierDielectric("Sapphire", "",        [0.0,        1.5039759,  0.0740288,     0.55069141, 0.1216529, 6.5927379, 20.072248]) );
		this.addMaterial( new SellmeierDielectric("Sodium Chloride", "", [0.00055,    0.19800,    0.050,         0.48398,     0.100,        0.38696,   0.128]) );
		this.addMaterial( new PolyanskiyDielectric("Proustite", "", [7.483, 0.474, 0.0, 0.09, 1.0]) );
		this.addMaterial( new PolyanskiyDielectric("Rutile (Titanium Dioxide)", "", [5.913, 0.2441, 0.0, 0.0803, 1.0]) );
		this.addMaterial( new PolyanskiyDielectric("Silver Chloride", "", [4.00804, 0.079086, 0.0, 0.04584, 1.0]) );

		// Gases
		/*
		this.addMaterial( new Gas("Air", "", [0.0, 0.05792105, 238.0185, 0.00167917, 57.362]) );
		this.addMaterial( new Gas("Helium gas", "", [0.0, 0.01470091, 423.98]) );
		this.addMaterial( new Gas("Nitrogen gas", "", [6.497378e-5, 3.0738649e-2, 144.0]) );
		this.addMaterial( new Gas("Oxygen gas", "", [1.181494e-4, 9.708931e-3, 75.4]) );
		this.addMaterial( new Gas("Ammonia gas", "", [0.0, 0.032953, 90.392]) );
		this.addMaterial( new Gas("Argon gas", "", [0.0, 2.50141e-3, 91.012, 5.00283e-4, 87.892, 5.22343e-2, 214.02]) );
		this.addMaterial( new Gas("Neon gas", "", [0.0, 0.00128145, 184.661, 0.0220486, 376.840]) );
		this.addMaterial( new Gas("Krypton gas", "", [0.0, 0.00253637, 65.4742, 0.00273649, 73.698, 0.0620802, 181.08]) );
		this.addMaterial( new Gas("Xenon gas", "", [0.0, 0.00322869, 46.301, 0.00355393, 50.578, 0.0606764, 112.74]) );
		*/

		// @todo: Metals. Need better approximations than the below: 
		/*
		this.addMaterial( new LinearMetal("Aluminium", "",  0.46555, 4.7121, 1.6620, 8.0439) );
		this.addMaterial( new LinearMetal("Gold", "",            1.5275, 1.8394, 0.16918, 3.8816) );
		*/
	}

	// Instantiate light tracer
	this.lightTracer = new LightTracer();

	// Instantiate distance field surface renderer
	this.surfaceRenderer = new SurfaceRenderer();

	// Do initial resize:
	this.resize();

	// Load the initial scene and material
	this.loadScene("sphere");
	this.loadMaterial("Glass (BK7)");

	// Create dat gui
	this.gui = new GUI();

	this.initialized = true; 
}

Snelly.prototype.getLightTracer = function()
{
	return this.lightTracer;
}

Snelly.prototype.getSurfaceRenderer = function()
{
	return this.surfaceRenderer;
}

Snelly.prototype.getGUI= function()
{
	return this.gui;
}

Snelly.prototype.getLaser = function()
{
	return this.laser;
}

Snelly.prototype.getCamera = function()
{
	return this.camera;
}


//
// Scene management
//
Snelly.prototype.addScene = function(sceneObj)
{
	this.scenes[sceneObj.getName()] = sceneObj;
}

Snelly.prototype.getScenes = function()
{
	return this.scenes;
}

Snelly.prototype.loadScene = function(sceneName)
{
	this.sceneObj = this.scenes[sceneName];
	this.sceneObj.setCam(this.controls, this.camera);
	this.sceneObj.setLaser(this.laser);
	this.laser.unsetTarget();

	// Camera frustum update
	this.camera.near = 1.0e-2*this.sceneObj.getScale();
	this.camera.far  = 1.0e4*this.sceneObj.getScale();

	this.reset();
}

Snelly.prototype.getLoadedScene = function()
{
	return this.sceneObj;
}


//
// Material management
//
Snelly.prototype.addMaterial = function(materialObj)
{
	this.materials[materialObj.getName()] = materialObj;
}

Snelly.prototype.getMaterials = function()
{
	return this.materials;
}

Snelly.prototype.loadMaterial = function(materialName)
{
	this.materialObj = this.materials[materialName];
	this.reset();
}

Snelly.prototype.getLoadedMaterial = function()
{
	return this.materialObj;
}


var flag = 0;

// Renderer reset on camera update
Snelly.prototype.reset = function()
{	
	this.surfaceRenderer.reset();
	this.lightTracer.reset();

	if (this.initialized)
		this.render();
}

// Render all 
Snelly.prototype.render = function()
{
	if (this.sceneObj == null) return;
	
	var gl = GLU.gl;
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.DEPTH_TEST);

	gl.viewport(0, 0, this.width, this.height);

	// Render laser pointer
	this.laser.render();

	// Render light beams
	this.lightTracer.render();

	// Render distance field surface
	this.surfaceRenderer.render();

	// Update stats
	this.stats.update();
}



Snelly.prototype.resize = function()
{
	var width = window.innerWidth;
	var height = window.innerHeight;
	this.width = width;
	this.height = height;

	var render_canvas = document.getElementById('render-canvas');
	render_canvas.width  = width;
	render_canvas.height = height;

	var ui_canvas = document.getElementById('ui-canvas');
	ui_canvas.width  = width;
	ui_canvas.height = height;

	this.camera.aspect = width / height;
	this.camera.updateProjectionMatrix();

	this.lightTracer.resize(width, height);
	this.surfaceRenderer.resize(width, height);
	this.glRenderer.setSize(width, height);
	this.laser.resize(width, height);

	this.render();
}


Snelly.prototype.handleEvent = function(event)
{
	switch (event.type)
	{
		case 'resize':      this.resize();  break;
		case 'mousemove':   this.onDocumentMouseMove(event);  break;
		case 'mousedown':   this.onDocumentMouseDown(event);  break;
		case 'mouseup':     this.onDocumentMouseUp(event);    break;
		case 'contextmenu': this.onDocumentRightClick(event); break;
	}
}

Snelly.prototype.onDocumentMouseMove = function(event)
{
	this.controls.update();
	event.preventDefault();
	if (this.laser.onMouseMove(event)) this.reset();
}

Snelly.prototype.onDocumentMouseDown = function(event)
{
	this.controls.update();
	event.preventDefault();
	this.laser.onMouseDown(event);
}

Snelly.prototype.onDocumentMouseUp = function(event)
{
	this.controls.update();
	event.preventDefault();
	this.laser.onMouseUp(event);
}

Snelly.prototype.onDocumentRightClick = function(event)
{
	this.controls.update();
	event.preventDefault();

	var xPick =   (( event.clientX - this.glRenderer.domElement.offsetLeft ) / this.glRenderer.domElement.width)*2 - 1;
	var yPick = - (( event.clientY - this.glRenderer.domElement.offsetTop ) / this.glRenderer.domElement.height)*2 + 1;

	var pickedPoint = this.surfaceRenderer.pick(xPick, yPick);
	if (pickedPoint == null)
	{
		this.laser.unsetTarget();
		return;
	} 

	this.laser.setTarget(pickedPoint);	
	this.reset();
}

function camChanged()
{
	snelly.reset();
	snelly.render();
}





