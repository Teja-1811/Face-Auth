document.addEventListener("DOMContentLoaded", async function () {
    let registerStream = null;
    let loginStream = null;
    let videoElement = document.getElementById("video");
    let loginVideoElement = document.getElementById("login_video");
    let faceDetectionInterval = null;

    console.log("🌍 Page fully loaded.");

    async function checkFaceAPI() {
        if (typeof faceapi !== "undefined") {
            console.log("✅ face-api.js loaded successfully.");
            await loadModels();
        } else {
            console.error("❌ face-api.js is not loaded. Retrying in 1 second...");
            setTimeout(checkFaceAPI, 1000);
        }
    }

    checkFaceAPI();

    async function loadModels() {
        try {
            await faceapi.nets.tinyFaceDetector.loadFromUri('/static/models/');
            await faceapi.nets.faceLandmark68Net.loadFromUri('/static/models/');
            await faceapi.nets.faceRecognitionNet.loadFromUri('/static/models/');
            console.log("✅ Face-API models loaded successfully.");
        } catch (error) {
            console.error("❌ Error loading Face-API models:", error);
        }
    }

    function showRegister() {
        document.getElementById("registerFormContainer").style.display = "block";
        document.getElementById("loginFormContainer").style.display = "none";
        stopCamera(loginVideoElement);
        startCamera(videoElement, "register");
    }

    function showLogin() {
        document.getElementById("registerFormContainer").style.display = "none";
        document.getElementById("loginFormContainer").style.display = "block";
        stopCamera(videoElement);
        startCamera(loginVideoElement, "login");
    }

    document.getElementById("showRegister").addEventListener("click", showRegister);
    document.getElementById("showLogin").addEventListener("click", showLogin);

    function startCamera(videoElement, type) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                videoElement.srcObject = stream;
                if (type === "register") registerStream = stream;
                if (type === "login") loginStream = stream;
                detectFace(videoElement);
            })
            .catch(err => console.error("❌ Webcam error:", err));
    }

    function stopCamera(videoElement) {
        if (videoElement.srcObject) {
            let tracks = videoElement.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoElement.srcObject = null;
        }
        if (faceDetectionInterval) {
            clearInterval(faceDetectionInterval);
            faceDetectionInterval = null;
        }
    }

    async function detectFace(videoElement) {
        let canvas = document.createElement("canvas");
        videoElement.parentNode.appendChild(canvas);
        let displaySize = { width: videoElement.width, height: videoElement.height };

        faceapi.matchDimensions(canvas, displaySize);

        if (faceDetectionInterval) clearInterval(faceDetectionInterval);

        faceDetectionInterval = setInterval(async () => {
            const detections = await faceapi.detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptors();

            canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
            faceapi.draw.drawDetections(canvas, detections);
            faceapi.draw.drawFaceLandmarks(canvas, detections);

            if (detections.length > 0) {
                console.log("✅ Face detected!");
            } else {
                console.log("❌ No face detected!");
            }
        }, 200);
    }

    function captureImage(videoElement, hiddenInputId) {
        let canvas = document.createElement("canvas");
        let context = canvas.getContext("2d");
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        document.getElementById(hiddenInputId).value = canvas.toDataURL("image/png");
        alert("✅ Face Captured!");
    }

    document.getElementById("captureRegister").addEventListener("click", function () {
        captureImage(videoElement, "captured_image");
    });

    document.getElementById("captureLogin").addEventListener("click", function () {
        captureImage(loginVideoElement, "login_captured_image");
    });
});
