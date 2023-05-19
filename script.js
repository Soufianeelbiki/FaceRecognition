// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAGC5-72KGa-tvqA1UhHfDn9ScBE_rvKUo",
  authDomain: "face-recognition-2e0de.firebaseapp.com",
  projectId: "face-recognition-2e0de",
  storageBucket: "face-recognition-2e0de.appspot.com",
  messagingSenderId: "1093309181346",
  appId: "1:1093309181346:web:1aa467e3e8fedffcded6fb",
  measurementId: "G-BRMY92HSML"
};

// Initialize Firebase app
firebase.initializeApp(firebaseConfig);
var storage = firebase.storage();
var storageRef = storage.ref();
var userFolderRef = storageRef.child('User/');

userFolderRef.listAll()
  .then((res) => {
    res.prefixes.forEach((folderRef) => {
      console.log(folderRef.name); // Log the folder name
    });
  })
  .catch((error) => {
    console.log("Error retrieving folder names: ", error);
  });
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
  
      for (let i = 1; i <= 10; i++) {
        if (i === 2) {
          continue; // Skip iteration when i is 2
        }
      
        const imgRef = storageRef.child(`User/${label}/image${i}.png`);
      
        try {
          const imgUrl = await imgRef.getDownloadURL();
          const img = await faceapi.fetchImage(imgUrl);
          const detections = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();
      
          // Skip images where no face is detected
          if (!detections) {
            console.log(`Skipping image: ${imgUrl}`);
            continue;
          }
      
          descriptions.push(detections.descriptor);
        } catch (error) {
          console.error(`Error retrieving image: ${imgRef.fullPath}`, error);
          // Handle the error, such as logging or skipping the image
        }
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
  
  async function retrieveFolderNames() {
    var userFolderRef = storageRef.child('User/');
  
    try {
      const res = await userFolderRef.listAll();
      const folderNames = res.prefixes.map((prefixRef) => {
        // Extract the folder name by removing the directory path
        return prefixRef.name.replace(userFolderRef.name, '').replace('/', '');
      });
      return folderNames;
    } catch (error) {
      console.log("Error retrieving folder names: ", error);
      return [];
    }
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
      // Retrieve folder names dynamically from Firebase Storage
      const folderNames = await retrieveFolderNames();
    
      const labeledFaceDescriptors = await getLabeledFaceDescriptions(folderNames);
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
  const threshold = 40;
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
          if (percentageMatch < 70) {
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


