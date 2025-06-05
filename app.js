// YogaAI Posture Analyzer - Main Application

// DOM Elements
let videoElement;
let canvasElement;
let canvasCtx;
let loadingIndicator;
let captureBtn;
let analyze360Btn;
let newCaptureBtn;
let saveResultBtn;
let resultsSection;
let capturedImage;
let captureDate;
let resultScore;
let resultScoreBar;
let resultNeckAngle;
let resultShoulderAngle;
let resultSpineCurve;
let resultAdvice;
let improvementSection;
let improvementTitle;
let improvementCards;
let neckAngleElement;
let shoulderAngleElement;
let spineCurveElement;
let scoreElement;
let scoreBar;
let adviceElement;

// 360度分析用の要素
let analysis360Section;
let analysisInstruction;
let positionIndicator;
let countdownElement;
let positionSteps;
let analysisResults;
let totalScoreElement;
let totalScoreBar;
let totalAdviceElement;
let frontScoreElement;
let frontScoreBar;
let rightScoreElement;
let rightScoreBar;
let backScoreElement;
let backScoreBar;
let leftScoreElement;
let leftScoreBar;
let detailedAdviceElement;
let restartAnalysisBtn;
let saveAnalysisBtn;

// Global variables
let pose;
let camera;
let lastFrameTime = 0;
let frameCount = 0;
let fps = 0;
let poseData = null;
let catBackScore = 0;
let currentLandmarks = null;
let currentAdvice = null;

// 360度分析用の変数
let isAnalyzing360 = false;
let currentPosition = 0;
let countdownInterval;
let countdownValue = 8;
let analysisPositions = ['正面', '右側面', '背面', '左側面', '正面（確認）'];
let positionScores = {
  front: 0,
  right: 0,
  back: 0,
  left: 0
};
let positionLandmarks = {
  front: null,
  right: null,
  back: null,
  left: null
};
let positionAdvice = {
  front: null,
  right: null,
  back: null,
  left: null
};

// Wait for DOM to be fully loaded before accessing elements
document.addEventListener('DOMContentLoaded', () => {
  videoElement = document.getElementById('webcam');
  canvasElement = document.getElementById('output-canvas');
  canvasCtx = canvasElement.getContext('2d');
  loadingIndicator = document.getElementById('loading-indicator');
  catBackScoreElement = document.getElementById('cat-back-score');
  scoreBarElement = document.getElementById('score-bar');
  neckAngleElement = document.getElementById('neck-angle');
  shoulderAngleElement = document.getElementById('shoulder-angle');
  spineCurveElement = document.getElementById('spine-curve');
  fpsElement = document.getElementById('fps');
  
  // 詳細アドバイスセクション
  detailedAdviceSection = document.getElementById('detailed-advice-section');
  ribcageAdviceText = document.getElementById('ribcage-advice-text');
  pelvisAdviceText = document.getElementById('pelvis-advice-text');
  shoulderAdviceText = document.getElementById('shoulder-advice-text');
  neckAdviceText = document.getElementById('neck-advice-text');
  
  // 360度分析用のDOM要素初期化
  analyze360Btn = document.getElementById('analyze-360-btn');
  analysis360Section = document.getElementById('analysis-360-section');
  analysisInstruction = document.getElementById('analysis-instruction');
  positionIndicator = document.getElementById('position-indicator');
  countdownElement = document.getElementById('countdown');
  positionSteps = document.querySelectorAll('.position-step');
  analysisResults = document.getElementById('analysis-results');
  totalScoreElement = document.getElementById('total-score');
  totalScoreBar = document.getElementById('total-score-bar');
  totalAdviceElement = document.getElementById('total-advice');
  frontScoreElement = document.getElementById('front-score');
  frontScoreBar = document.getElementById('front-score-bar');
  rightScoreElement = document.getElementById('right-score');
  rightScoreBar = document.getElementById('right-score-bar');
  backScoreElement = document.getElementById('back-score');
  backScoreBar = document.getElementById('back-score-bar');
  leftScoreElement = document.getElementById('left-score');
  leftScoreBar = document.getElementById('left-score-bar');
  detailedAdviceElement = document.getElementById('detailed-advice');
  restartAnalysisBtn = document.getElementById('restart-analysis-btn');
  saveAnalysisBtn = document.getElementById('save-analysis-btn');
  
  // イベントリスナーを設定
  // 姿勢分析ボタンのイベントリスナー
  if (analyze360Btn) {
    analyze360Btn.addEventListener('click', start360Analysis);
  }
  if (restartAnalysisBtn) {
    restartAnalysisBtn.addEventListener('click', start360Analysis);
  }
  if (saveAnalysisBtn) {
    saveAnalysisBtn.addEventListener('click', save360AnalysisResult);
  }
  
  // Initialize the application after DOM is loaded
  initCamera();
});

// Pose improvement suggestions
improvementPoses = [
  {
    name: "猫のポーズ",
    description: "背中を丸めたり反らしたりして、背骨の柔軟性を高めます",
    image: "assets/poses/cat.jpg",
    benefits: "猫背の改善、背中の緊張緩和",
    instruction: "四つん這いになり、息を吐きながら背中を丸め、息を吸いながら背中を反らします。5-10回繰り返しましょう。"
  },
  {
    name: "子どものポーズ",
    description: "背中を伸ばし、肩と首の緊張を和らげます",
    image: "assets/poses/child.jpg",
    benefits: "肩こり解消、首の緊張緩和",
    instruction: "膝をついて座り、前に手を伸ばして額を床につけます。肩の力を抜いて30秒間キープしましょう。"
  },
  {
    name: "コブラのポーズ",
    description: "胸を開き、背中の筋肉を強化します",
    image: "assets/poses/cobra.jpg",
    benefits: "姿勢改善、胸の開き",
    instruction: "うつ伏せになり、手のひらを肩の下に置きます。息を吸いながら上半身を持ち上げ、胸を開きます。5回繰り返しましょう。"
  }
];

// 姿勢スコアに基づくアドバイス
const postureAdvice = [
  {
    minScore: 0,
    maxScore: 40,
    title: "要注意",
    message: "姿勢が大きく崩れています。すぐに姿勢を正し、定期的に休憩を取りましょう。",
    ribcage: "肋骨が前に出ている状態です。胸を開き、肋骨を下げるように意識しましょう。吸うときに胸を前に押し出さず、横に広げるようにしましょう。",
    pelvis: "骨盤が後方に傾いています。お尻スイッチを意識して、下腹部を軽く引き置き、骨盤を中立の位置に整えましょう。仙骨を床に向かって押し付けるように意識しましょう。",
    shoulder: "肩が前に巻き、背中が丸まっています。肩甲骨を背中の中心に寄せるようにして、背中を伸ばしましょう。肩甲骨を下げ、背中の上部を広げるイメージです。",
    neck: "首が前に出ています。頭の重みで首の筋肉に負担がかかっています。頭を背骨の上に乗せるように、あごを引いて首を長く保ちましょう。"
  },
  {
    minScore: 41,
    maxScore: 70,
    title: "改善の余地あり",
    message: "姿勢に改善の余地があります。意識して姿勢を正しましょう。",
    ribcage: "肋骨がやや前に出ています。吸うときは胸を左右に広げるように意識し、肋骨を下げて自然な位置に整えましょう。胸を引き上げすぎないように注意しましょう。",
    pelvis: "骨盤の傾きがやや見られます。お尻スイッチを入れて、骨盤を中立に保ちましょう。立っているときは体重が足の真ん中にかかるようにして、座っているときは坐骨の上にしっかり体重を乗せましょう。",
    shoulder: "肩がやや前に出ています。肩甲骨を背中の中心に寄せるように意識して、背中を自然に伸ばしましょう。肩を軽く後ろに引き、胸を開くようにしましょう。",
    neck: "首がやや前に出ています。頭を背骨の上にバランスよく乗せるように、あごを軽く引き、首の後ろを長く保つようにしましょう。"
  },
  {
    minScore: 71,
    maxScore: 100,
    title: "良好",
    message: "姿勢は良好です。このまま維持しましょう。",
    ribcage: "肋骨の位置が良好です。吸うときは胸を左右に広げるようにして、自然な姿勢を維持しましょう。肋骨を下げた状態で、胸を開いた姿勢を保ちましょう。",
    pelvis: "骨盤の位置が良好です。お尻スイッチと仙骨スイッチがうまく機能しています。骨盤を中立に保ち、下腹部の軽い締め付けを維持しましょう。",
    shoulder: "肩の位置が良好です。肩甲骨が背中の中心にうまく位置しています。肩の力を抜き、自然な姿勢を維持しましょう。肩甲骨を下げ、背中を広げるようにしましょう。",
    neck: "首の位置が良好です。頭が背骨の上にバランスよく乗っています。あごを軽く引き、首の後ろを長く保つようにして、この良い姿勢を維持しましょう。"
  }
];

// Initialize the application
async function initCamera() {
  console.log('Initializing application...');
  
  // Set up canvas size to match video
  canvasElement.width = videoElement.clientWidth || 640;
  canvasElement.height = videoElement.clientHeight || 480;

  try {
    // Check if browser supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Browser does not support getUserMedia API');
    }
    
    console.log('Checking for video devices...');
    
    // Get user media directly first to ensure permissions
    const constraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      }
    };
    
    // Try to get user media directly first
    console.log('Requesting camera access...');
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoElement.srcObject = stream;
    
    // Wait for video to be ready
    await new Promise((resolve) => {
      videoElement.onloadedmetadata = () => {
        console.log('Video metadata loaded');
        videoElement.play();
        resolve();
      };
      
      // タイムアウト処理を追加
      setTimeout(() => {
        if (videoElement.readyState >= 2) { // HAVE_CURRENT_DATA以上
          console.log('Video ready state reached via timeout');
          videoElement.play().catch(e => console.error('Play failed:', e));
          resolve();
        }
      }, 3000); // 3秒のタイムアウト
    });
    
    console.log('Video stream initialized');
    
    // Initialize Mediapipe Pose
    console.log('Initializing MediaPipe Pose...');
    pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
      selfieMode: true
    });

    pose.onResults(onResults);
    
    console.log('Pose model initialized');

    // Initialize camera with the stream we already have
    console.log('Starting camera with MediaPipe...');
    camera = new Camera(videoElement, {
      onFrame: async () => {
        try {
          if (pose) {
            await pose.send({image: videoElement});
          }
        } catch (err) {
          console.error('Error in pose processing:', err);
        }
      },
      width: 640,
      height: 480
    });

    console.log('Starting camera...');
    await camera.start();
    console.log('Camera started successfully');
    loadingIndicator.style.display = 'none';
    
  } catch (error) {
    console.error('Failed to initialize:', error);
    loadingIndicator.innerHTML = `
      <div class="text-center">
        <p class="text-red-500 font-bold mb-2">カメラの起動に失敗しました</p>
        <p class="text-white mb-4">エラー: ${error.message}</p>
        <p class="text-white mb-4">以下の点を確認してください：</p>
        <ul class="text-white text-left list-disc pl-8 mb-4">
          <li>カメラへのアクセスを許可していますか？</li>
          <li>別のアプリがカメラを使用していませんか？</li>
          <li>HTTPSで接続していますか？（モバイルデバイスではHTTPSが必要です）</li>
          <li>プライバシー設定でカメラへのアクセスが許可されていますか？</li>
        </ul>
        <button id="retry-camera" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">
          再試行する
        </button>
      </div>
    `;
    
    // 再試行ボタンの機能を追加
    document.getElementById('retry-camera').addEventListener('click', () => {
      loadingIndicator.innerHTML = '<div class="text-center"><div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div><p class="mt-2">カメラ初期化中...</p></div>';
      initCamera();
    });
  }

  // Handle window resize
  window.addEventListener('resize', () => {
    if (canvasElement && videoElement) {
      canvasElement.width = videoElement.clientWidth;
      canvasElement.height = videoElement.clientHeight;
    }
  });

  // Initial resize
  if (canvasElement && videoElement) {
    canvasElement.width = videoElement.clientWidth;
    canvasElement.height = videoElement.clientHeight;
  }
}

// Process pose detection results
function onResults(results) {
  if (!canvasCtx || !canvasElement) return;
  
  try {
    // Hide loading indicator once we get results
    if (loadingIndicator) {
      loadingIndicator.style.display = 'none';
    }
    
    // Calculate FPS if element exists
    if (fpsElement) {
      const now = performance.now();
      frameCount++;
      
      if (now - lastFrameTime >= 1000) {
        fps = Math.round(frameCount * 1000 / (now - lastFrameTime));
        fpsElement.textContent = `${fps} FPS`;
        frameCount = 0;
        lastFrameTime = now;
      }
    }
    
    // Clear canvas
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    // Draw video frame
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    // Draw pose landmarks if detected
    if (results.poseLandmarks) {
      // Update current landmarks for capture
      currentLandmarks = results.poseLandmarks;
      
      // Draw connectors
      if (window.drawConnectors && window.POSE_CONNECTIONS) {
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
          {color: '#00FF00', lineWidth: 2});
        drawLandmarks(canvasCtx, results.poseLandmarks,
          {color: '#FF0000', lineWidth: 1, radius: 3});
      }
      
      // Analyze posture
      analyzePosture(results.poseLandmarks);
    } else {
      currentLandmarks = null;
    }
  } catch (error) {
    console.error('Error in onResults:', error);
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
  
  // 現在のランドマークを保存
  currentLandmarks = landmarks;
  
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
  
  // Get appropriate advice based on score
  const advice = getAdviceForScore(catBackScore);
  currentAdvice = advice; // アドバイスを保存
  
  // Update advice section
  updateAdviceSection(advice);
  
  // Always show improvement section with appropriate content
  improvementSection.classList.remove('hidden');
  updatePoseSuggestions();
}

// Get appropriate advice based on score
function getAdviceForScore(score) {
  for (const advice of postureAdvice) {
    if (score >= advice.minScore && score <= advice.maxScore) {
      return advice;
    }
  }
  // Default advice if no range matches (shouldn't happen)
  return postureAdvice[0];
}

// Update the advice section with appropriate content
function updateAdviceSection(advice) {
  if (!document.getElementById('advice-section')) {
    // Create advice section if it doesn't exist
    const adviceSection = document.createElement('div');
    adviceSection.id = 'advice-section';
    adviceSection.className = 'bg-white rounded-lg shadow-md p-6 mb-6';
    
    // Insert before improvement section
    if (improvementSection && improvementSection.parentNode) {
      improvementSection.parentNode.insertBefore(adviceSection, improvementSection);
    }
  }
  
  const adviceSection = document.getElementById('advice-section');
  
  // Set the content
  let statusClass = 'text-green-600';
  if (catBackScore < 50) {
    statusClass = 'text-red-600';
  } else if (catBackScore < 80) {
    statusClass = 'text-yellow-600';
  }
  
  adviceSection.innerHTML = `
    <h2 class="text-xl font-semibold mb-4 text-indigo-600">姿勢アドバイス</h2>
    <div class="mb-4">
      <div class="flex items-center mb-2">
        <span class="${statusClass} font-bold text-lg mr-2">${advice.title}</span>
        <span class="text-gray-700">${advice.message}</span>
      </div>
    </div>
    <div class="bg-indigo-50 p-4 rounded-lg">
      <h3 class="font-semibold text-indigo-700 mb-2">改善のヒント:</h3>
      <ul class="list-disc pl-5 text-gray-700">
        ${advice.tips.map(tip => `<li>${tip}</li>`).join('')}
      </ul>
    </div>
  `;
}

// Update pose suggestion cards
function updatePoseSuggestions() {
  // Clear existing suggestions
  poseSuggestions.innerHTML = '';
  
  // Update title based on score
  if (improvementTitle) {
    improvementTitle.textContent = catBackScore >= 80 ? '改善ポーズの提案' : 'おすすめヨガポーズ';
  }
  
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
        <div class="bg-indigo-600 text-white py-1 px-2 rounded-full text-xs font-semibold inline-block mb-2">
          ${pose.benefits}
        </div>
        <h3 class="font-semibold text-indigo-700 text-lg">${pose.name}</h3>
        <p class="text-sm text-gray-600 mt-1 mb-3">${pose.description}</p>
        <div class="border-t border-indigo-100 pt-3 mt-2">
          <h4 class="font-semibold text-indigo-600 text-sm mb-1">実践方法:</h4>
          <p class="text-xs text-gray-500">${pose.instruction}</p>
        </div>
      </div>
    `;
    
    poseSuggestions.appendChild(card);
  });
}

// 写真撮影機能
function captureImage() {
  if (!currentLandmarks || !currentAdvice) return;
  
  try {
    // 現在のビデオフレームをキャプチャ
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = videoElement.videoWidth;
    tempCanvas.height = videoElement.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    // ビデオフレームを描画
    tempCtx.drawImage(videoElement, 0, 0, tempCanvas.width, tempCanvas.height);
    
    // ランドマークを描画
    tempCtx.save();
    if (window.drawConnectors && window.POSE_CONNECTIONS) {
      drawConnectors(tempCtx, currentLandmarks, POSE_CONNECTIONS,
        {color: '#00FF00', lineWidth: 2});
      drawLandmarks(tempCtx, currentLandmarks,
        {color: '#FF0000', lineWidth: 1, radius: 3});
    }
    tempCtx.restore();
    
    // 画像をキャプチャ画像要素に設定
    capturedImage.src = tempCanvas.toDataURL('image/png');
    
    // 日時を設定
    const now = new Date();
    const dateStr = now.toLocaleDateString('ja-JP');
    const timeStr = now.toLocaleTimeString('ja-JP');
    captureDate.textContent = `${dateStr} ${timeStr}`;
    
    // スコアと角度を設定
    resultScore.textContent = catBackScore;
    resultScoreBar.style.width = `${catBackScore}%`;
    
    // スコアに応じた色を設定
    if (catBackScore < 50) {
      resultScoreBar.className = 'bg-red-500 h-4 rounded-full';
    } else if (catBackScore < 80) {
      resultScoreBar.className = 'bg-yellow-500 h-4 rounded-full';
    } else {
      resultScoreBar.className = 'bg-green-500 h-4 rounded-full';
    }
    
    // 角度情報を設定
    resultNeckAngle.textContent = neckAngleElement.textContent;
    resultShoulderAngle.textContent = shoulderAngleElement.textContent;
    resultSpineCurve.textContent = spineCurveElement.textContent;
    
    // アドバイスを設定
    resultAdvice.innerHTML = '';
    const adviceCard = document.createElement('div');
    adviceCard.className = 'bg-white rounded-lg shadow-md p-4';
    
    let adviceColor = 'text-red-600';
    if (catBackScore >= 41 && catBackScore <= 70) {
      adviceColor = 'text-yellow-600';
    } else if (catBackScore > 70) {
      adviceColor = 'text-green-600';
    }
    
    adviceCard.innerHTML = `
      <h3 class="text-xl font-bold ${adviceColor} mb-2">${currentAdvice.title}</h3>
      <p class="text-gray-700 mb-3">${currentAdvice.message}</p>
      <ul class="list-disc pl-5">
        ${currentAdvice.tips.map(tip => `<li class="text-gray-600 mb-1">${tip}</li>`).join('')}
      </ul>
    `;
    
    resultAdvice.appendChild(adviceCard);
    
    // 結果セクションを表示
    resultsSection.classList.remove('hidden');
    
    // 結果セクションまでスクロール
    resultsSection.scrollIntoView({ behavior: 'smooth' });
    
  } catch (error) {
    console.error('写真のキャプチャ中にエラーが発生しました:', error);
    alert('写真のキャプチャに失敗しました。もう一度お試しください。');
  }
}

// 結果を画像として保存する機能
async function saveResult() {
  try {
    // html2canvasを使用して結果セクションをキャプチャ
    if (typeof html2canvas !== 'function') {
      throw new Error('html2canvas がロードされていません');
    }
    
    const canvas = await html2canvas(resultsSection, {
      backgroundColor: '#1a202c', // 背景色を設定
      scale: 2, // 高解像度でキャプチャ
      logging: false, // ログを無効化
      useCORS: true // クロスオリジン画像を許可
    });
    
    // キャンバスをデータURLに変換
    const dataUrl = canvas.toDataURL('image/png');
    
    // ダウンロードリンクを作成
    const link = document.createElement('a');
    link.download = `yoga-ai-posture-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.png`;
    link.href = dataUrl;
    link.click();
    
  } catch (error) {
    console.error('結果の保存中にエラーが発生しました:', error);
    alert(`結果の保存に失敗しました: ${error.message}`);
  }
}

// 360度分析を開始する関数
async function start360Analysis() {
  // 他のセクションを隠す
  resultsSection.classList.add('hidden');
  
  // 分析セクションを表示
  analysis360Section.classList.remove('hidden');
  analysisInstruction.classList.remove('hidden');
  analysisResults.classList.add('hidden');
  
  // 変数の初期化
  isAnalyzing360 = true;
  currentPosition = 0;
  countdownValue = 8;
  positionScores = { front: 0, right: 0, back: 0, left: 0 };
  positionLandmarks = { front: null, right: null, back: null, left: null };
  positionAdvice = { front: null, right: null, back: null, left: null };
  
  // カメラが停止していれば再起動
  if (camera && !camera.isRunning) {
    try {
      // ローディング表示
      loadingIndicator.style.display = 'block';
      loadingIndicator.innerHTML = '<div class="text-center"><div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div><p class="mt-2">カメラ再起動中...</p></div>';
      
      // カメラ再起動
      await camera.start();
      console.log('カメラ再起動成功');
      loadingIndicator.style.display = 'none';
    } catch (error) {
      console.error('カメラ再起動失敗:', error);
      loadingIndicator.innerHTML = `
        <div class="text-center">
          <p class="text-red-500 font-bold mb-2">カメラの再起動に失敗しました</p>
          <p class="text-white mb-4">エラー: ${error.message}</p>
          <button id="retry-camera" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">
            再試行する
          </button>
        </div>
      `;
      
      // 再試行ボタンの機能を追加
      document.getElementById('retry-camera')?.addEventListener('click', initCamera);
      return;
    }
  }
  
  // UI更新
  updatePositionUI();
  
  // カウントダウン開始
  startCountdown();
  
  // 分析セクションまでスクロール
  analysis360Section.scrollIntoView({ behavior: 'smooth' });
}

// ポジションに応じたUIを更新する関数
function updatePositionUI() {
  // ポジションインジケータの更新
  positionIndicator.textContent = `${analysisPositions[currentPosition]}を向いてください`;
  countdownElement.textContent = countdownValue;
  
  // カウントダウンバーの更新
  const countdownBar = document.getElementById('countdown-bar');
  if (countdownBar) {
    countdownBar.style.width = `${(countdownValue / 8) * 100}%`;
  }
  
  // ステップインジケータの更新
  positionSteps.forEach((step, index) => {
    if (index === currentPosition) {
      step.querySelector('div').classList.remove('bg-gray-300');
      step.querySelector('div').classList.add('bg-indigo-600');
      step.querySelector('div').classList.remove('text-gray-600');
      step.querySelector('div').classList.add('text-white');
    } else if (index < currentPosition) {
      // 完了したステップ
      step.querySelector('div').classList.remove('bg-gray-300');
      step.querySelector('div').classList.add('bg-green-500');
      step.querySelector('div').classList.remove('text-gray-600');
      step.querySelector('div').classList.add('text-white');
    } else {
      // 未完了のステップ
      step.querySelector('div').classList.add('bg-gray-300');
      step.querySelector('div').classList.remove('bg-indigo-600');
      step.querySelector('div').classList.remove('bg-green-500');
      step.querySelector('div').classList.add('text-gray-600');
      step.querySelector('div').classList.remove('text-white');
    }
  });
}

// カウントダウンを開始する関数
function startCountdown() {
  // 既存のカウントダウンをクリア
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  
  countdownInterval = setInterval(() => {
    countdownValue--;
    countdownElement.textContent = countdownValue;
    
    if (countdownValue <= 0) {
      clearInterval(countdownInterval);
      capturePositionData();
    }
  }, 1000);
}

// 現在のポジションのデータをキャプチャする関数
function capturePositionData() {
  if (!currentLandmarks) {
    // ランドマークが検出されていない場合は少し待ってリトライ
    setTimeout(capturePositionData, 500);
    return;
  }
  
  // 現在のポジションに応じてデータを保存
  switch(currentPosition) {
    case 0: // 正面
      positionLandmarks.front = [...currentLandmarks];
      positionScores.front = catBackScore;
      positionAdvice.front = currentAdvice;
      break;
    case 1: // 右側面
      positionLandmarks.right = [...currentLandmarks];
      positionScores.right = catBackScore;
      positionAdvice.right = currentAdvice;
      break;
    case 2: // 背面
      positionLandmarks.back = [...currentLandmarks];
      positionScores.back = catBackScore;
      positionAdvice.back = currentAdvice;
      break;
    case 3: // 左側面
      positionLandmarks.left = [...currentLandmarks];
      positionScores.left = catBackScore;
      positionAdvice.left = currentAdvice;
      // 全ての方向の分析が完了したので分析結果を表示
      finishAnalysis();
      return;
  }
  
  // 次のポジションへ
  currentPosition++;
  countdownValue = 8;
  updatePositionUI();
  startCountdown();
}

// 分析を完了し結果を表示する関数
function finishAnalysis() {
  // 分析モードを終了
  isAnalyzing360 = false;
  
  // カメラを一時停止（後で再開できるように）
  if (camera) {
    camera.stop();
  }
  
  // 指示部分を隠し、結果部分を表示
  analysisInstruction.classList.add('hidden');
  analysisResults.classList.remove('hidden');
  
  // 総合スコアを計算（各方向の平均）
  const totalScore = Math.round(
    (positionScores.front + positionScores.right + positionScores.back + positionScores.left) / 4
  );
  
  // UI更新
  updateAnalysisResultUI(totalScore);
  
  // 結果セクションまでスクロール
  analysisResults.scrollIntoView({ behavior: 'smooth' });
}

// 分析結果のUIを更新する関数
function updateAnalysisResultUI(totalScore) {
  // 総合スコア
  totalScoreElement.textContent = totalScore;
  totalScoreBar.style.width = `${totalScore}%`;
  
  // スコアに応じた色を設定
  let scoreColor = 'bg-red-500';
  if (totalScore >= 71) {
    scoreColor = 'bg-green-500';
  } else if (totalScore >= 41) {
    scoreColor = 'bg-yellow-500';
  }
  totalScoreBar.className = `${scoreColor} h-4 rounded-full`;
  
  // 方向別スコア
  frontScoreElement.textContent = positionScores.front;
  frontScoreBar.style.width = `${positionScores.front}%`;
  frontScoreBar.className = `bg-indigo-600 h-2 rounded-full`;
  
  rightScoreElement.textContent = positionScores.right;
  rightScoreBar.style.width = `${positionScores.right}%`;
  rightScoreBar.className = `bg-indigo-600 h-2 rounded-full`;
  
  backScoreElement.textContent = positionScores.back;
  backScoreBar.style.width = `${positionScores.back}%`;
  backScoreBar.className = `bg-indigo-600 h-2 rounded-full`;
  
  leftScoreElement.textContent = positionScores.left;
  leftScoreBar.style.width = `${positionScores.left}%`;
  leftScoreBar.className = `bg-indigo-600 h-2 rounded-full`;
  
  // 総合アドバイス
  const advice = getAdviceForScore(totalScore);
  totalAdviceElement.innerHTML = `
    <h4 class="font-semibold mb-2">${advice.title}</h4>
    <p>${advice.message}</p>
  `;
  
  // 詳細アドバイスの設定
  // 肋骨のアドバイス
  if (ribcageAdviceText) {
    ribcageAdviceText.textContent = advice.ribcage || "肋骨の位置に関するデータが取得できませんでした";
  }
  
  // 骨盤のアドバイス
  if (pelvisAdviceText) {
    pelvisAdviceText.textContent = advice.pelvis || "骨盤の位置に関するデータが取得できませんでした";
  }
  
  // 肩甲骨・背中のアドバイス
  if (shoulderAdviceText) {
    shoulderAdviceText.textContent = advice.shoulder || "肩甲骨と背中の位置に関するデータが取得できませんでした";
  }
  
  // 首のアドバイス
  if (neckAdviceText) {
    neckAdviceText.textContent = advice.neck || "首の位置に関するデータが取得できませんでした";
  }
}
