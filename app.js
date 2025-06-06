// DOM要素の取得
const video = document.getElementById('webcam');
const canvas = document.getElementById('output-canvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('start-button');
const retryButton = document.getElementById('retry-button');
const timerDisplay = document.getElementById('timer-display');
const loadingMessage = document.getElementById('loading-message');
const startSection = document.getElementById('start-section');
const resultSection = document.getElementById('result-section');
const postureScoreElement = document.getElementById('posture-score');
const postureCommentElement = document.getElementById('posture-comment');

// グローバル変数
let poseDetector = null;
let isRunning = false;
let timeLeft = 8;
let timerInterval = null;
let postureLandmarks = [];
let videoWidth = 0;
let videoHeight = 0;

// Mediapipe Pose Landmarkerの設定
const initializePoseLandmarker = async () => {
  const vision = await window.tasks.FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  
  poseDetector = await window.tasks.vision.PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numPoses: 1
  });
  
  loadingMessage.style.display = "none";
  startButton.disabled = false;
};

// カメラの初期化
const initializeCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: 640, height: 480 },
      audio: false
    });
    
    video.srcObject = stream;
    
    return new Promise((resolve) => {
      video.onloadedmetadata = () => {
        videoWidth = video.videoWidth;
        videoHeight = video.videoHeight;
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        resolve();
      };
    });
  } catch (error) {
    console.error("カメラへのアクセスに失敗しました:", error);
    alert("カメラへのアクセスに失敗しました。ブラウザの設定でカメラへのアクセスを許可してください。");
  }
};

// ポーズ検出の実行
const detectPose = async (timestamp) => {
  if (!isRunning || !poseDetector) return;
  
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    const detections = await poseDetector.detectForVideo(video, timestamp);
    
    if (detections.landmarks && detections.landmarks.length > 0) {
      postureLandmarks.push(detections.landmarks[0]);
      drawPoseLandmarks(detections.landmarks[0]);
    }
  }
  
  requestAnimationFrame(detectPose);
};

// ランドマークの描画
const drawPoseLandmarks = (landmarks) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 接続線の描画
  ctx.strokeStyle = '#00FF00';
  ctx.lineWidth = 2;
  
  // 肩から肩
  if (landmarks[11] && landmarks[12]) {
    ctx.beginPath();
    ctx.moveTo(landmarks[11].x * canvas.width, landmarks[11].y * canvas.height);
    ctx.lineTo(landmarks[12].x * canvas.width, landmarks[12].y * canvas.height);
    ctx.stroke();
  }
  
  // 肩から腰
  if (landmarks[11] && landmarks[23]) {
    ctx.beginPath();
    ctx.moveTo(landmarks[11].x * canvas.width, landmarks[11].y * canvas.height);
    ctx.lineTo(landmarks[23].x * canvas.width, landmarks[23].y * canvas.height);
    ctx.stroke();
  }
  
  if (landmarks[12] && landmarks[24]) {
    ctx.beginPath();
    ctx.moveTo(landmarks[12].x * canvas.width, landmarks[12].y * canvas.height);
    ctx.lineTo(landmarks[24].x * canvas.width, landmarks[24].y * canvas.height);
    ctx.stroke();
  }
  
  // 腰から腰
  if (landmarks[23] && landmarks[24]) {
    ctx.beginPath();
    ctx.moveTo(landmarks[23].x * canvas.width, landmarks[23].y * canvas.height);
    ctx.lineTo(landmarks[24].x * canvas.width, landmarks[24].y * canvas.height);
    ctx.stroke();
  }
  
  // ランドマークの描画
  ctx.fillStyle = '#FF0000';
  for (const landmark of [0, 11, 12, 23, 24]) {
    if (landmarks[landmark]) {
      ctx.beginPath();
      ctx.arc(
        landmarks[landmark].x * canvas.width,
        landmarks[landmark].y * canvas.height,
        5, 0, 2 * Math.PI
      );
      ctx.fill();
    }
  }
};

// タイマーの開始
const startTimer = () => {
  timerDisplay.style.display = "block";
  timerDisplay.textContent = timeLeft;
  
  timerInterval = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = timeLeft;
    
    if (timeLeft <= 0) {
      stopDetection();
    }
  }, 1000);
};

// 検出の停止
const stopDetection = () => {
  isRunning = false;
  clearInterval(timerInterval);
  timerDisplay.style.display = "none";
  
  // 姿勢スコアの計算と表示
  const score = calculatePostureScore();
  displayResults(score);
  
  // 結果セクションの表示
  startSection.classList.add('hidden');
  resultSection.classList.remove('hidden');
};

// 姿勢スコアの計算
const calculatePostureScore = () => {
  if (postureLandmarks.length === 0) return 0;
  
  let totalScore = 0;
  
  // 各フレームの姿勢を評価
  for (const landmarks of postureLandmarks) {
    // 肩の傾き評価
    const shoulderSlope = Math.abs(landmarks[11].y - landmarks[12].y);
    const shoulderScore = Math.max(0, 100 - shoulderSlope * 1000);
    
    // 背骨の真っ直ぐさ評価
    const spineVertical = Math.abs(landmarks[0].x - ((landmarks[23].x + landmarks[24].x) / 2));
    const spineScore = Math.max(0, 100 - spineVertical * 500);
    
    // 頭の位置評価
    const headPosition = landmarks[0].z;
    const headScore = Math.max(0, 100 - Math.abs(headPosition) * 200);
    
    // 総合スコア
    totalScore += (shoulderScore * 0.4 + spineScore * 0.4 + headScore * 0.2);
  }
  
  // 平均スコアを計算して返す
  return Math.round(totalScore / postureLandmarks.length);
};

// 結果の表示
const displayResults = (score) => {
  postureScoreElement.textContent = score;
  
  // スコアに基づいてコメントを設定
  let comment = '';
  if (score >= 90) {
    comment = '素晴らしい姿勢です！このまま維持しましょう。';
  } else if (score >= 70) {
    comment = '良い姿勢です。少し改善の余地があります。';
  } else if (score >= 50) {
    comment = '姿勢に注意が必要です。もう少し背筋を伸ばしましょう。';
  } else {
    comment = '姿勢が悪いです。背筋を伸ばし、肩の力を抜きましょう。';
  }
  
  postureCommentElement.textContent = comment;
};

// 計測開始
const startDetection = async () => {
  if (!poseDetector) return;
  
  postureLandmarks = [];
  timeLeft = 8;
  isRunning = true;
  
  startButton.disabled = true;
  startTimer();
  requestAnimationFrame(detectPose);
};

// 再計測
const resetDetection = () => {
  startButton.disabled = false;
  resultSection.classList.add('hidden');
  startSection.classList.remove('hidden');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

// イベントリスナー
startButton.addEventListener('click', startDetection);
retryButton.addEventListener('click', resetDetection);

// 初期化
(async () => {
  startButton.disabled = true;
  await initializeCamera();
  await initializePoseLandmarker();
})();
