// YogaAI Posture Analyzer - Main Application

// DOM Elements
const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('output-canvas');
const canvasCtx = canvasElement.getContext('2d');
const loadingIndicator = document.getElementById('loading-indicator');
const catBackScoreElement = document.getElementById('cat-back-score');
const scoreBarElement = document.getElementById('score-bar');
const neckAngleElement = document.getElementById('neck-angle');
const shoulderAngleElement = document.getElementById('shoulder-angle');
const spineCurveElement = document.getElementById('spine-curve');
const fpsElement = document.getElementById('fps');
const improvementSection = document.getElementById('improvement-section');
const poseSuggestions = document.getElementById('pose-suggestions');

// Pose improvement suggestions
const improvementPoses = [
  {
    name: "猫のポーズ",
    description: "背中を丸めたり反らしたりして、背骨の柔軟性を高めます",
    image: "assets/poses/cat.jpg"
  },
  {
    name: "子どものポーズ",
    description: "背中を伸ばし、肩と首の緊張を和らげます",
    image: "assets/poses/child.jpg"
  },
  {
    name: "コブラのポーズ",
    description: "胸を開き、背中の筋肉を強化します",
    image: "assets/poses/cobra.jpg"
  }
];

// Mediapipe Pose configuration
let pose;
let camera;
let lastFrameTime = 0;
let frameCount = 0;
let fps = 0;
let poseData = null;
let catBackScore = 0;

// Initialize the application
async function init() {
  // Set up canvas size to match video
  canvasElement.width = videoElement.width;
  canvasElement.height = videoElement.height;

  // Initialize Mediapipe Pose
  pose = new Pose({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`;
    }
  });

  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  pose.onResults(onResults);

  // Initialize camera
  camera = new Camera(videoElement, {
    onFrame: async () => {
      await pose.send({image: videoElement});
    },
    width: 640,
    height: 480
  });

  try {
    await camera.start();
    loadingIndicator.style.display = 'none';
  } catch (error) {
    console.error('Failed to start camera:', error);
    loadingIndicator.innerHTML = '<p class="text-red-500">カメラの起動に失敗しました。<br>カメラへのアクセスを許可してください。</p>';
  }

  // Handle window resize
  window.addEventListener('resize', () => {
    canvasElement.width = videoElement.clientWidth;
    canvasElement.height = videoElement.clientHeight;
  });

  // Initial resize
  canvasElement.width = videoElement.clientWidth;
  canvasElement.height = videoElement.clientHeight;
}

// Process pose detection results
function onResults(results) {
  // Calculate FPS
  const now = performance.now();
  frameCount++;
  
  if (now - lastFrameTime >= 1000) {
    fps = Math.round(frameCount * 1000 / (now - lastFrameTime));
    fpsElement.textContent = `${fps} FPS`;
    frameCount = 0;
    lastFrameTime = now;
  }

  // Clear canvas
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  // Draw the pose landmarks
  if (results.poseLandmarks) {
    poseData = results.poseLandmarks;
    
    // Draw the pose skeleton
    canvasCtx.save();
    canvasCtx.drawImage(
      results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    // Draw connectors and landmarks
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
      {color: '#00FF00', lineWidth: 2});
    drawLandmarks(canvasCtx, results.poseLandmarks,
      {color: '#FF0000', lineWidth: 1, radius: 3});
    canvasCtx.restore();
    
    // Analyze posture
    analyzePosture(results.poseLandmarks);
  }
}

// Calculate angle between three points
function calculateAngle(a, b, c) {
  let ab = Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
  let bc = Math.sqrt(Math.pow(b.x - c.x, 2) + Math.pow(b.y - c.y, 2));
  let ac = Math.sqrt(Math.pow(c.x - a.x, 2) + Math.pow(c.y - a.y, 2));
  
  return Math.acos((ab * ab + bc * bc - ac * ac) / (2 * ab * bc)) * (180 / Math.PI);
}

// Calculate angle between a line and the horizontal
function calculateHorizontalAngle(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
}

// Analyze posture and update UI
function analyzePosture(landmarks) {
  if (!landmarks || landmarks.length < 33) return;
  
  // Extract key landmarks
  const nose = landmarks[0];
  const leftEye = landmarks[2];
  const rightEye = landmarks[5];
  const leftEar = landmarks[7];
  const rightEar = landmarks[8];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  
  // Calculate midpoints
  const midEyes = {
    x: (leftEye.x + rightEye.x) / 2,
    y: (leftEye.y + rightEye.y) / 2,
    z: (leftEye.z + rightEye.z) / 2
  };
  
  const midShoulders = {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2,
    z: (leftShoulder.z + rightShoulder.z) / 2
  };
  
  const midHips = {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
    z: (leftHip.z + rightHip.z) / 2
  };
  
  // Calculate posture angles
  
  // 1. 首前傾角（目-肩-腰）
  const neckAngle = calculateAngle(midEyes, midShoulders, midHips);
  
  // 2. 肩左右差（肩-肩線の傾斜角）
  const shoulderAngle = Math.abs(calculateHorizontalAngle(leftShoulder, rightShoulder));
  
  // 3. 背骨湾曲度（耳-腰ベクトル）
  const midEars = {
    x: (leftEar.x + rightEar.x) / 2,
    y: (leftEar.y + rightEar.y) / 2,
    z: (leftEar.z + rightEar.z) / 2
  };
  const spineCurve = calculateAngle(midEars, midShoulders, midHips);
  
  // Update UI with angles
  neckAngleElement.textContent = `${Math.round(neckAngle)}°`;
  shoulderAngleElement.textContent = `${Math.round(shoulderAngle)}°`;
  spineCurveElement.textContent = `${Math.round(spineCurve)}°`;
  
  // Calculate cat back score
  // Ideal values (these are approximate and could be adjusted)
  const idealNeckAngle = 160; // Closer to 180 is better
  const idealShoulderAngle = 0; // Perfectly horizontal
  const idealSpineCurve = 170; // Straighter spine
  
  // Calculate deviations from ideal
  const neckDeviation = Math.abs(neckAngle - idealNeckAngle) / idealNeckAngle;
  const shoulderDeviation = shoulderAngle / 90; // Normalize to 0-1 range
  const spineDeviation = Math.abs(spineCurve - idealSpineCurve) / idealSpineCurve;
  
  // Calculate average deviation and convert to score
  const avgDeviation = (neckDeviation + shoulderDeviation + spineDeviation) / 3;
  catBackScore = Math.min(100, Math.max(0, Math.round((1 - avgDeviation) * 100 * 1.25)));
  
  // Update score display
  catBackScoreElement.textContent = catBackScore;
  scoreBarElement.style.width = `${catBackScore}%`;
  
  // Update score color based on value
  if (catBackScore < 50) {
    scoreBarElement.className = 'bg-red-500 h-4 rounded-full';
  } else if (catBackScore < 80) {
    scoreBarElement.className = 'bg-yellow-500 h-4 rounded-full';
  } else {
    scoreBarElement.className = 'bg-green-500 h-4 rounded-full';
  }
  
  // Show improvement suggestions if score is poor
  if (catBackScore >= 80) {
    improvementSection.classList.remove('hidden');
    updatePoseSuggestions();
  } else {
    improvementSection.classList.add('hidden');
  }
}

// Update pose suggestion cards
function updatePoseSuggestions() {
  // Clear existing suggestions
  poseSuggestions.innerHTML = '';
  
  // Add new suggestion cards
  improvementPoses.forEach(pose => {
    const card = document.createElement('div');
    card.className = 'pose-card bg-indigo-50 rounded-lg overflow-hidden shadow transition-all';
    
    card.innerHTML = `
      <div class="p-4">
        <div class="h-32 bg-gray-200 rounded flex items-center justify-center mb-3">
          <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
        </div>
        <h3 class="font-semibold text-indigo-700">${pose.name}</h3>
        <p class="text-sm text-gray-600 mt-1">${pose.description}</p>
      </div>
    `;
    
    poseSuggestions.appendChild(card);
  });
}

// Start the application when the page loads
window.addEventListener('DOMContentLoaded', init);
