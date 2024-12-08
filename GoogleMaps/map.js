document.addEventListener("DOMContentLoaded", function () {
  const mapElement = document.getElementById("map");
  const globeElement = document.getElementById("globe");
  const backButton = document.createElement("button");
  backButton.innerText = "Back to Map";
  backButton.style.display = "none";
  backButton.style.position = "absolute";
  backButton.style.top = "10px";
  backButton.style.right = "10px";
  backButton.style.padding = "10px 20px";
  backButton.style.zIndex = 1000;
  document.body.appendChild(backButton);

  let map = null;
  let globeShown = false;
  let camera, scene, renderer, earth, controls, animationId;
  let previousZoomLevel = 15; // Default zoom level

  mapboxgl.accessToken = "pk.eyJ1IjoibWlzdDAtMCIsImEiOiJjbTQ0Z2dhY2owNmVwMnFxMDM2aHdnc2ZuIn0.xCY4lNhcea_biZVA6SIFbA";

  navigator.geolocation.getCurrentPosition(successLocation, errorLocation, { enableHighAccuracy: true });

  function successLocation(position) {
    setupMap([position.coords.longitude, position.coords.latitude]);
  }

  function errorLocation() {
    setupMap([-2.24, 53.48]); // Default location
  }

  function setupMap(center) {
    map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/streets-v11",
      center: center,
      zoom: 15,
    });

    const directions = new MapboxDirections({ accessToken: mapboxgl.accessToken });
    map.addControl(directions, "top-left");

    map.on("zoomend", () => {
      if (map.getZoom() < 2 && !globeShown) {
        switchToGlobe();
      }
    });
  }

  function switchToGlobe() {
    previousZoomLevel = map.getZoom();
    globeShown = true;
    mapElement.style.pointerEvents = "none";
  
    gsap.to("#map", {
      opacity: 0,
      duration: 1,
      onComplete: () => {
        mapElement.style.display = "none";
        globeElement.style.display = "block";
        backButton.style.display = "block";
  
        // Ensure the globe opacity is set to 1 after display
        gsap.to("#globe", {
          opacity: 1,
          duration: 1, // Add animation to smoothly fade it in
        });
  
        if (!renderer) {
          initGlobe();
        }
        animate();
      }
    });
  }

  function switchToMap() {
    globeShown = false;
  
    // Define a fallback location (e.g., New York City) if geolocation fails
    const fallbackLocation = [-74.0060, 40.7128]; // Default to NYC if geolocation is unavailable
  
    // If the map exists, zoom to the user's location or fallback location
    if (map) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = [position.coords.longitude, position.coords.latitude];
          map.setCenter(userLocation); // Set map center to user's location
          map.setZoom(12); // Set zoom level to a default zoom (e.g., city-level zoom)
          map.resize(); // Ensure the map resizes correctly
        },
        () => {
          // If geolocation fails, use the fallback location
          map.setCenter(fallbackLocation);
          map.setZoom(12);
          map.resize();
        }
      );
    }
  
    gsap.to("#globe", {
      opacity: 0,
      duration: 1,
      onComplete: () => {
        globeElement.style.display = "none";
        mapElement.style.display = "block";
        mapElement.style.pointerEvents = "auto"; // Re-enable pointer events
        backButton.style.display = "none";
  
        gsap.to("#map", { opacity: 1, duration: 1 });
      },
    });
  }
  
  function initGlobe() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);
  
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    globeElement.innerHTML = ""; // Clear previous canvas
    globeElement.appendChild(renderer.domElement);
  
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
  
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
  
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);
  
    // Load the star texture
    const starTexture = new THREE.TextureLoader().load('textures/stars/circle.png');
  
    // Create the star material
    const starMaterial = new THREE.PointsMaterial({
      size: 4, // Size of the stars
      map: starTexture,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending, // Makes the stars glow more
    });
  
    // Generate stars randomly
    const starCount = 10000; // Number of stars
    const starGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
  
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = Math.random() * 2000 - 1000;  // Random X position (increased range)
      positions[i * 3 + 1] = Math.random() * 2000 - 1000;  // Random Y position (increased range)
      positions[i * 3 + 2] = Math.random() * 2000 - 1000;  // Random Z position (increased range)
    }
  
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
  
    // Load Earth texture and material
    const textureLoader = new THREE.TextureLoader();
    const earthMaterial = new THREE.MeshStandardMaterial({
      map: textureLoader.load('./textures/00_earthmap1k.jpg'),
      bumpMap: textureLoader.load('./textures/01_earthbump1k.jpg'),
      bumpScale: 0.1,
      normalMap: textureLoader.load('./textures/02_earthspec1k.jpg'),
      emissiveMap: textureLoader.load('./textures/04_earthcloudmap.jpg'),
      emissive: new THREE.Color(1, 1, 1),
      emissiveIntensity: 0.1,
    });
  
    const earthGeometry = new THREE.SphereGeometry(1, 128, 128);
    earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);
  }


  function animate() {
    if (!renderer) return; // Exit if renderer is not initialized

    animationId = requestAnimationFrame(animate);
    if (earth) {
      earth.rotation.y += 0.001;
    }
    if (controls) {
      controls.update();
    }
    renderer.render(scene, camera);
  }

  window.addEventListener("resize", () => {
    if (camera && renderer) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  });

  backButton.addEventListener("click", switchToMap);
});
