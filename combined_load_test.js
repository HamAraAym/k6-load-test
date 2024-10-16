import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';
import { readFileSync } from 'fs';

// Load configuration
const config = JSON.parse(readFileSync('config.json'));

// Custom error rate metric
export const errorRate = new Rate('errors');

// Custom counters for tracking attempts, successes, and failures
export const signInAttempts = new Counter('sign_in_attempts');
export const signInSuccesses = new Counter('sign_in_successes');
export const signInFailures = new Counter('sign_in_failures');

export const teamAttempts = new Counter('team_attempts');
export const teamSuccesses = new Counter('team_successes');
export const teamFailures = new Counter('team_failures');

export const trainingProgramAttempts = new Counter('training_program_attempts');
export const trainingProgramSuccesses = new Counter('training_program_successes');
export const trainingProgramFailures = new Counter('training_program_failures');

export const cannedMessageAttempts = new Counter('canned_message_attempts');
export const cannedMessageSuccesses = new Counter('canned_message_successes');
export const cannedMessageFailures = new Counter('canned_message_failures');

export const longPostAttempts = new Counter('long_post_attempts');
export const longPostSuccesses = new Counter('long_post_successes');
export const longPostFailures = new Counter('long_post_failures');

// Options for k6 including stages and pushing metrics to InfluxDB
export let options = {
    vus: 1, // One virtual user to ensure sequential execution
    duration: '5m', // Total duration of the test
    thresholds: {
        http_req_duration: ['p(95)<5000'], // 95% of requests must complete below 5000ms
        errors: ['rate<0.01'], // Error rate should be less than 1%
    },
    ext: {
        loadimpact: {
            projectID: config.projectID, // Load project ID from config
            distribution: {
                'development': {
                    type: 'influxdb',
                    address: config.influxdb.address,
                    database: config.influxdb.database,
                    token: config.influxdb.token, // Load token from config
                    tags: { environment: 'development' },
                }
            }
        }
    }
};

const BASE_URL = config.baseUrl; // Load base URL from config
const users = config.users; // Array of user credentials

// Function to simulate browsing by making more GET requests
function browseApp(token) {
    // Make GET requests for various parts of the app
    const res1 = http.get(`${BASE_URL}/team`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    check(res1, { 'team list fetched successfully': (r) => r.status === 200 });

    const res2 = http.get(`${BASE_URL}/training-program`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    check(res2, { 'training programs fetched successfully': (r) => r.status === 200 });

    sleep(3); // Simulate time spent reading content

    const res3 = http.get(`${BASE_URL}/post`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    check(res3, { 'posts fetched successfully': (r) => r.status === 200 });
}

// Function to sign in and return the access token
function signIn(email, password) {
    signInAttempts.add(1); // Increment sign-in attempts counter

    let loginRes = http.post(`${BASE_URL}/auth/sign-in`, JSON.stringify({
        email: email,
        password: password,
    }), {
        headers: { 'Content-Type': 'application/json' },
    });

    let success = check(loginRes, {
        'logged in successfully': (resp) => resp.status === 200 && resp.json('AuthenticationResult.IdToken') !== '',
    });

    if (success) {
        signInSuccesses.add(1); // Increment sign-in successes counter
        return loginRes.json('AuthenticationResult.IdToken');
    } else {
        signInFailures.add(1); // Increment sign-in failures counter
        console.log('Sign-in failed. Response:', loginRes.body);
        errorRate.add(1);
        return null;
    }
}

// Function to perform all POST operations with pauses in between
function createData(token) {
    createTeam(token);
    sleep(2); // Simulate user waiting time between requests

    createTrainingProgram(token);
    sleep(2);

    createCannedMessage(token);
    sleep(2);

    createLongPost(token);
    sleep(2);
}

// Function to create a team
function createTeam(token) {
    teamAttempts.add(1); // Increment attempts counter

    let payload = JSON.stringify({
        name: "Load Test Team",
        organizationName: "Load Test Org",
        sportId: "3",
        gender: "MALE",
        userRole: ["COACH", "MANAGER"],
        levelId: "cltykjq9t0000w8mbydhoxyis",
        customSeason: {}
    });

    let res = http.post(`${BASE_URL}/team`, payload, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (res.status === 201) {
        teamSuccesses.add(1); // Increment successes counter
    } else {
        teamFailures.add(1); // Increment failures counter
        console.log('Team creation failed. Status:', res.status, 'Response:', res.body);
        errorRate.add(1);
    }
}

// Function to create a training program
function createTrainingProgram(token) {
    trainingProgramAttempts.add(1); // Increment attempts counter

    let payload = JSON.stringify({
        name: "Load Test Program",
        organizationName: "Load Test Org",
        userRole: ["COACH"],
        type: "SMALL_GROUP_TRAINING",
        sportId: "3",
        levelId: "cltykjq9t0000w8mbydhoxyis",
        gender: ["MALE"]
    });

    let res = http.post(`${BASE_URL}/training-program`, payload, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (res.status === 201) {
        trainingProgramSuccesses.add(1); // Increment successes counter
    } else {
        trainingProgramFailures.add(1); // Increment failures counter
        console.log('Training program creation failed. Status:', res.status, 'Response:', res.body);
        errorRate.add(1);
    }
}

// Function to create a canned message
function createCannedMessage(token) {
    cannedMessageAttempts.add(1); // Increment attempts counter

    let payload = JSON.stringify({
        title: "Load Test Can",
        sportId: "3",
        message: "Canned Message Load Test",
        genders: ["FEMALE", "MALE"]
    });

    let res = http.post(`${BASE_URL}/canned-message`, payload, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (res.status === 201) {
        cannedMessageSuccesses.add(1); // Increment successes counter
    } else {
        cannedMessageFailures.add(1); // Increment failures counter
        console.log('Canned message creation failed. Status:', res.status, 'Response:', res.body);
        errorRate.add(1);
    }
}

// Function to post a long post
function createLongPost(token) {
    longPostAttempts.add(1); // Increment attempts counter

    let payload = JSON.stringify({
        body: "This is a load test long post.",
        shareTo: [{
            connectionType: "*",
            connectionTypeId: "*"
        }]
    });

    let res = http.post(`${BASE_URL}/post`, payload, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (res.status === 201) {
        longPostSuccesses.add(1); // Increment successes counter
    } else {
        longPostFailures.add(1); // Increment failures counter
        console.log('Long post creation failed. Status:', res.status, 'Response:', res.body);
        errorRate.add(1);
    }
}

// Main test function
export default function () {
    // Iterate over each user
    for (const user of users) {
        // Step 1: Sign in and get token
        let token = signIn(user.email, user.password);

        // Step 2: Simulate browsing more than creating
        if (token) {
            for (let i = 0; i < 5; i++) {
                browseApp(token); // Perform more GET requests
                sleep(5); // Simulate user navigating through the app

                createData(token); // Perform POST operations with longer intervals

                sleep(10); // Simulate a break between interactions
            }
        }
    }
}

// Log the results at the end of the test
export function handleSummary(data) {
    return {
        'stdout': `
        Sign-in attempts: ${signInAttempts.value}
        Sign-in successes: ${signInSuccesses.value}
        Sign-in failures: ${signInFailures.value}

        Team creation attempts: ${teamAttempts.value}
        Team creation successes: ${teamSuccesses.value}
        Team creation failures: ${teamFailures.value}

        Training program creation attempts: ${trainingProgramAttempts.value}
        Training program creation successes: ${trainingProgramSuccesses.value}
        Training program creation failures: ${trainingProgramFailures.value}

        Canned message creation attempts: ${cannedMessageAttempts.value}
        Canned message creation successes: ${cannedMessageSuccesses.value}
        Canned message creation failures: ${cannedMessageFailures.value}

        Long post creation attempts: ${longPostAttempts.value}
        Long post creation successes: ${longPostSuccesses.value}
        Long post creation failures: ${longPostFailures.value}
        `,
    };
}