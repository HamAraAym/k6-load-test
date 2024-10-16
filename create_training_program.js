import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

// Custom metric to measure the response time for training program creation
let trainingProgramTrend = new Trend('training_program_creation_time');

// Options for load testing
export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Ramp-up to 50 users over 30 seconds
    { duration: '1m', target: 100 }, // Stay at 100 users for 1 minute
    { duration: '30s', target: 0 },  // Ramp-down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests should be below 500ms
  },
};

// Function to sign in and get the token
function signIn() {
  const loginUrl = 'https://dev.api.sportsgravy.com/auth/sign-in';
  const payload = JSON.stringify({
    email: 'loadtest@mailinator.com',
    password: 'Test1234$',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post(loginUrl, payload, params);
  const jsonResponse = response.json();
  
  // Check if login was successful
  check(response, {
    'logged in successfully': (res) => res.status === 200 && jsonResponse.idToken !== undefined,
  });

  return jsonResponse.idToken; // Return the token
}

// Main test function
export default function () {
  const token = signIn(); // Get the token from sign-in

  // Training program creation request
  const trainingProgramUrl = 'https://dev.api.sportsgravy.com/training-program';
  const trainingProgramPayload = JSON.stringify({
    name: "Test Program",
    organizationName: "Test Org",
    userRole: ["COACH"],
    type: "SMALL_GROUP_TRAINING",
    sportId: "3",
    levelId: "cltykjq9t0000w8mbydhoxyis",
    gender: ["MALE"],
  });

  const trainingProgramParams = {
    headers: {
      'Authorization': `Bearer ${token}`, // Use the token for authentication
      'Content-Type': 'application/json',
    },
  };

  const trainingProgramResponse = http.post(trainingProgramUrl, trainingProgramPayload, trainingProgramParams);
  
  // Measure training program creation response time
  trainingProgramTrend.add(trainingProgramResponse.timings.duration);

  // Check if the training program was created successfully
  check(trainingProgramResponse, {
    'training program created successfully': (res) => res.status === 201,
  });

  sleep(1); // Pause between iterations
}