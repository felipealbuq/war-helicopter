import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GroundedSkybox } from 'three/addons/objects/GroundedSkybox.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const params = {
  height: 35,
  radius: 320,
  enabled: true,
};

let scene, camera, ambientLight, skybox, renderer, controls, stats;
let gltf, mixer, clock;
let targetPosition = new THREE.Vector3();
let isTransitioning = false;
let userIsInteracting = false;

const transitionSpeed = 0.05;

init();

function init() {
  clock = new THREE.Clock();

  setupScene();
  setupCamera();
  setupRenderer();
  setupControls();
  setupStats();
  loadAssets();
  createGUI();
  setupEventListeners();

  render();
}

function setupScene() {
  scene = new THREE.Scene();
  ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);
}

function setupCamera() {
  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.set(237, 120, -51);
}

function setupRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setAnimationLoop(render);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  document.body.appendChild(renderer.domElement);
}

function setupControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableRotate = true;
  controls.enableDamping = true;
  controls.minDistance = 40;
  controls.maxDistance = 470;
  controls.maxPolarAngle = Math.PI / 2.5;
  controls.minPolarAngle = 0;
  controls.target.set(0, 0.1, 0);
  controls.update();

  controls.addEventListener('start', () => {
    userIsInteracting = true;
    isTransitioning = false;
  });

  controls.addEventListener('end', () => {
    userIsInteracting = false;
  });
}

function setupStats() {
  stats = new Stats();
  document.body.appendChild(stats.dom);
}

function loadAssets() {
  new RGBELoader()
    .setPath('/three/textures/')
    .load('hanger_exterior_cloudy_4k.pic', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      scene.background = texture;
      scene.environment = texture;

      skybox = new GroundedSkybox(texture, params.height, params.radius);
      skybox.position.y = params.height - 0.01;
      scene.add(skybox);

      loadModel();
    });
}

function loadModel() {
  const loader = new GLTFLoader().setPath('/three/glb/');
  loader.load('Helicopter.glb', (gltfLoaded) => {
    gltf = gltfLoaded;
    gltf.scene.scale.set(6.5, 6.5, 6.5);
    gltf.scene.rotation.set(0, Math.PI / 4, 0);

    mixer = new THREE.AnimationMixer(gltf.scene);
    gltf.animations.forEach(animation => mixer.clipAction(animation).stop());

    scene.add(gltf.scene);

    document.getElementById('details-color').addEventListener('input', function () {
      changeMaterialColor(this.value);
    });
  });
}

function createGUI() {
  const gui = new GUI({ width: 250 });

  const groundFolder = gui.addFolder('Ground');
  groundFolder.add(params, 'enabled').name("Grounded").onChange(toggleGround);

  const animationFolder = gui.addFolder('Animations');
  animationFolder.add({ Flying: () => toggleAnimation('flying') }, 'Flying');
  animationFolder.add({ None: () => toggleAnimation('None') }, 'None');

  const speedFolder = gui.addFolder('Velocity');
  speedFolder.add({ speed: 1 }, 'speed', 0.0, 5, 0.01).onChange((speed) => {
    mixer.timeScale = speed;
  });
}

function changeMaterialColor(color) {
  gltf.scene.traverse((child) => {
    if (child.isMesh && child.material.name === "Yellow") {
      child.material.color.set(color);
    }
  });
}

function toggleGround(enabled) {
  if (enabled) {
    scene.add(skybox);
    scene.background = null;
  } else {
    scene.remove(skybox);
    scene.background = scene.environment;
  }
}

function toggleAnimation(animationName) {
  if (animationName === 'flying') {
    gltf.animations.forEach((animation) => mixer.clipAction(animation).play());
    setTargetPosition(378, 179, -205);
  } else {
    gltf.animations.forEach((animation) => mixer.clipAction(animation).stop());
    setTargetPosition(237, 120, -51);
  }
}

function setTargetPosition(x, y, z) {
  targetPosition.set(x, y, z);
  isTransitioning = true;
}

function setupEventListeners() {
  window.addEventListener('resize', onWindowResize);
  document.addEventListener("keydown", onDocumentKeyDown, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}


function render() {
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  if (isTransitioning && !userIsInteracting) {
    camera.position.lerp(targetPosition, transitionSpeed);
    if (camera.position.distanceTo(targetPosition) < 0.1) {
      camera.position.copy(targetPosition);
      isTransitioning = false;
    }
  }

  stats.update();
  controls.update();
  renderer.render(scene, camera);
}