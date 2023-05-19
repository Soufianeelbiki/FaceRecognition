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


let userFolderRef;
// Initialize Firebase app
firebase.initializeApp(firebaseConfig);

// Get DOM elements
const videoElement = document.getElementById('videoElement');
const captureCanvas = document.getElementById('captureCanvas');
const nameInput = document.getElementById('nameInput');
const submitButton = document.getElementById('submitButton');

// Load Face API models
Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
]).then(startVideo);

// Start video stream from the webcam
function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      videoElement.srcObject = stream;
      videoElement.onloadedmetadata = () => {
        videoElement.play();
      };
    })
    .catch(error => {
      console.error('Error accessing webcam:', error);
    });
}

async function detectFace() {
  const canvasContext = captureCanvas.getContext('2d');
  let captureCount = 0;
  let intervalId;
  

  intervalId = setInterval(async () => {
    if (captureCount >= 10) {
      // Stop capturing images
      clearInterval(intervalId);
      console.log('Face captured successfully!');
      saveUserDataToFirebase(); // Save user data to Firestore
      redirectToIndex();
      return;
    }

    const detections = await faceapi.detectSingleFace(videoElement, new faceapi.SsdMobilenetv1Options())
      .withFaceLandmarks();

    if (detections) {
      canvasContext.drawImage(videoElement, 0, 0, captureCanvas.width, captureCanvas.height);
      const imageDataURL = captureCanvas.toDataURL();

      saveImageToFirebase(imageDataURL, captureCount + 1)
        .then(() => {
          captureCount++;
        })
        .catch(error => {
          console.error('Error saving image:', error);
        });
    }
  }, 3000); // Capture an image every second
}

// Redirect to index.html
function redirectToIndex() {
  window.location.href = 'index.html';
}

// Save image to Firebase Storage
function saveImageToFirebase(imageDataURL, imageIndex) {
  const userName = nameInput.value;

  if (!userName) {
    console.error('Username is required!');
    return Promise.reject('Username is required!');
  }

  const storageRef = firebase.storage().ref();
  userFolderRef = storageRef.child(`User/${userName}`); // Update the path to include the username

  return userFolderRef
    .listAll()
    .then(result => {
      // Check if the user folder already exists
      if (result.prefixes.length > 0) {
        console.log('User folder already exists');
        return;
      }

      // Create a new user folder
      return userFolderRef.put(new Blob(), { contentType: 'application/octet-stream' })
        .then(() => {
          console.log('User folder created');
          const imageRef = userFolderRef.child(`image${imageIndex}.png`);

          return fetch(imageDataURL)
            .then(response => response.blob())
            .then(blob => imageRef.put(blob))
            .then(() => {
              console.log(`Image ${imageIndex} saved to Firebase`);
            });
        });
    })
    .catch(error => {
      console.error('Error saving image:', error);
      return Promise.reject(error);
    });
}

// Save user data to Firebase Realtime Database
function saveUserDataToFirebase() {
  const userName = nameInput.value;
  const databaseRef = firebase.database().ref('users');
  const userRef = databaseRef.child(userName);
  const userImagesRef = userFolderRef.child('images'); // Use userFolderRef here

  userFolderRef
    .listAll()
    .then(result => {
      const imagePromises = result.items.map(imageRef => {
        return imageRef.getDownloadURL();
      });

      Promise.all(imagePromises)
        .then(imageURLs => {
          const userData = {
            name: userName,
            images: imageURLs,
          };

          userRef
            .set(userData)
            .then(() => {
              console.log('User data saved to Firebase');
            })
            .catch(error => {
              console.error('Error saving user data:', error);
            });
        });
    })
    .catch(error => {
      console.error('Error retrieving image URLs:', error);
    });
}


// Add event listener to submit button
submitButton.addEventListener('click', () => {
  if (nameInput.value) {
    // Start capturing images after clicking submit
    detectFace();
  } else {
    console.error('Name is required!');
  }
});