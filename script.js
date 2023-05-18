
Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
]).then(startDetection);

function startDetection() {

  async function getLabeledFaceDescriptions(labels) {
    const labeledFaceDescriptors = [];
  
    for (const label of labels) {
      const descriptions = [];
  
      for (let i = 1; i <= 20; i++) {
        const img = await faceapi.fetchImage(`./Users/${label}/${i}.jpg`);
        const detections = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();
      
        // Skip images where no face is detected
        if (!detections) {
          console.log(`Skipping image: ./Users/${label}/${i}.jpg`);
          continue;
        }
      
        descriptions.push(detections.descriptor);
      }
    
  
      // Skip labels where no faces are detected in any image
      if (descriptions.length === 0) {
        continue;
      }
  
      const labeledFaceDescriptor = new faceapi.LabeledFaceDescriptors(
        label,
        descriptions
      );
      labeledFaceDescriptors.push(labeledFaceDescriptor);
    }
  
    return labeledFaceDescriptors;
  }

  
  let isFaceDetected = false; // Flag to track if a face is detected

  function captureImage() {
    videoElement.pause();
    videoElement.srcObject.getTracks().forEach((track) => track.stop());
  
    const videoWidth = videoElement.videoWidth;
    const videoHeight = videoElement.videoHeight;
    captureCanvas.width = videoWidth;
    captureCanvas.height = videoHeight;
  
    const context = captureCanvas.getContext("2d");
    context.drawImage(videoElement, 0, 0, videoWidth, videoHeight);
  
    const capturedImage = captureCanvas.toDataURL("image/jpeg");
  
    const img = document.createElement("img");
    img.onload = async function () {
      const labeledFaceDescriptors = await getLabeledFaceDescriptions([
        "pins_Adriana_Lima",
        "pins_Alex_Lawther",
        "pins_Alexandra_Daddario",
      ]); //Modify these to add more photos
      recognizeFaces(img, labeledFaceDescriptors);
    };
  
    img.src = capturedImage;
  }
  
  function detectFaces() {
    faceapi
      .detectAllFaces(videoElement)
      .withFaceLandmarks()
      .withFaceDescriptors()
      .then((detections) => {
        if (detections.length > 0 && !isFaceDetected) {
          isFaceDetected = true;
          captureImage();
        } else if (detections.length === 0) {
          isFaceDetected = false;
        }
      })
      .catch((error) => {
        console.error("Error detecting faces: ", error);
      });
  
    if (!isFaceDetected) {
      setTimeout(detectFaces, 100); // Repeat face detection every 100 milliseconds
    }
  }
  
  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then(function (stream) {
      videoElement.srcObject = stream;
      videoElement.play();
      detectFaces(); // Start face detection
    })
    .catch(function (error) {
      console.error("Error accessing the camera: ", error);
    });

function recognizeFaces(img, labeledFaceDescriptors) {
  const faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);
  const threshold = 35;
  faceapi
    .detectAllFaces(img)
    .withFaceLandmarks()
    .withFaceDescriptors()
    .then((detections) => {
      const results = detections.map((d) => {
        return faceMatcher.findBestMatch(d.descriptor);
      });

      results.forEach((result, i) => {
        console.log("result: ", result.label);
        const percentageMatch = Math.floor(result.distance * 100+threshold);

        if (result.label === "unknown") {
          window.location.href = "failed.html";
        } else {
          if (percentageMatch < 80) {
            window.location.href = "failed.html";
          } else {
            window.location.href = `success.html?name=${result.label}&percentage=${percentageMatch}`;
          }
        }
      });

    })
    .catch((error) => {
      console.error("Error recognizing faces: ", error);
    });
}




}


