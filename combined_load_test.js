import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate } from 'k6/metrics';

// Custom error rate metric
export const errorRate = new Rate('errors');

// Custom counters for tracking attempts, successes, and failures
export const signInAttempts = new Counter('sign_in_attempts');
export const signInSuccesses = new Counter('sign_in_successes');
export const signInFailures = new Counter('sign_in_failures');

export const teamGetAttempts = new Counter('team_get_attempts');
export const teamGetSuccesses = new Counter('team_get_successes');
export const teamGetFailures = new Counter('team_get_failures');
export const teamPostAttempts = new Counter('team_post_attempts');
export const teamPostSuccesses = new Counter('team_post_successes');
export const teamPostFailures = new Counter('team_post_failures');

export const trainingProgramGetAttempts = new Counter('training_program_get_attempts');
export const trainingProgramGetSuccesses = new Counter('training_program_get_successes');
export const trainingProgramGetFailures = new Counter('training_program_get_failures');
export const trainingProgramPostAttempts = new Counter('training_program_post_attempts');
export const trainingProgramPostSuccesses = new Counter('training_program_post_successes');
export const trainingProgramPostFailures = new Counter('training_program_post_failures');

export const cannedMessageGetAttempts = new Counter('canned_message_get_attempts');
export const cannedMessageGetSuccesses = new Counter('canned_message_get_successes');
export const cannedMessageGetFailures = new Counter('canned_message_get_failures');
export const cannedMessagePostAttempts = new Counter('canned_message_post_attempts');
export const cannedMessagePostSuccesses = new Counter('canned_message_post_successes');
export const cannedMessagePostFailures = new Counter('canned_message_post_failures');

export const feedGetAttempts = new Counter('feed_get_attempts');
export const feedGetSuccesses = new Counter('feed_get_successes');
export const feedGetFailures = new Counter('feed_get_failures');
export const longPostAttempts = new Counter('long_post_attempts');
export const longPostSuccesses = new Counter('long_post_successes');
export const longPostFailures = new Counter('long_post_failures');

// Options for k6 including stages and pushing metrics to InfluxDB
export let options = {
    vus: 7, // Simulate 7 concurrent users
    duration: '3m', // Total duration of the test
    thresholds: {
        http_req_duration: ['p(95)<5000'], // 95% of requests must complete below 5000ms
        errors: ['rate<0.01'],             // Error rate should be less than 1%
    },
    ext: {
        loadimpact: {
            projectID: __ENV.PROJECT_ID,
            distribution: {
                'development': {
                    type: 'influxdb',
                    address: __ENV.INFLUXDB_ADDRESS,
                    database: __ENV.INFLUXDB_DATABASE,
                    token: __ENV.INFLUXDB_TOKEN,
                    tags: { environment: 'development' },
                }
            }
        }
    }
};

const BASE_URL = __ENV.BASE_URL; // Load base URL from environment variables

// Array of user credentials
const users = JSON.parse(__ENV.USERS);

// Function to sign in and return the access token
function signIn(email, password) {
    signInAttempts.add(1);

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
        signInSuccesses.add(1);
        return loginRes.json('AuthenticationResult.IdToken');
    } else {
        signInFailures.add(1);
        console.log(`Sign-in failed for ${email}. Response: ${loginRes.body}`);
        errorRate.add(1);
        return null;
    }
}

// Function to GET team
function getTeam(token) {
    teamGetAttempts.add(1);

    let res = http.get(`${BASE_URL}/team`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    let success = check(res, {
        'team retrieved successfully': (resp) => resp.status === 200,
    });

    if (success) {
        teamGetSuccesses.add(1);
    } else {
        teamGetFailures.add(1);
        console.log('GET team failed. Status:', res.status, 'Response:', res.body);
        errorRate.add(1);
    }
}

// Function to create a team
function createTeam(token) {
    teamPostAttempts.add(1);

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
        teamPostSuccesses.add(1);
    } else {
        teamPostFailures.add(1);
        console.log('POST team failed. Status:', res.status, 'Response:', res.body);
        errorRate.add(1);
    }
}

// Function to GET training program
function getTrainingProgram(token) {
    trainingProgramGetAttempts.add(1);

    let res = http.get(`${BASE_URL}/training-program`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    let success = check(res, {
        'training program retrieved successfully': (resp) => resp.status === 200,
    });

    if (success) {
        trainingProgramGetSuccesses.add(1);
    } else {
        trainingProgramGetFailures.add(1);
        console.log('GET training program failed. Status:', res.status, 'Response:', res.body);
        errorRate.add(1);
    }
}

// Function to create a training program
function createTrainingProgram(token) {
    trainingProgramPostAttempts.add(1);

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
        trainingProgramPostSuccesses.add(1);
    } else {
        trainingProgramPostFailures.add(1);
        console.log('POST training program failed. Status:', res.status, 'Response:', res.body);
        errorRate.add(1);
    }
}

// Function to GET canned messages
function getCannedMessages(token) {
    cannedMessageGetAttempts.add(1);

    let res = http.get(`${BASE_URL}/canned-message`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    let success = check(res, {
        'canned messages retrieved successfully': (resp) => resp.status === 200,
    });

    if (success) {
        cannedMessageGetSuccesses.add(1);
    } else {
        cannedMessageGetFailures.add(1);
        console.log('GET canned messages failed. Status:', res.status, 'Response:', res.body);
        errorRate.add(1);
    }
}

// Function to create a canned message
function createCannedMessage(token) {
    cannedMessagePostAttempts.add(1);

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
        cannedMessagePostSuccesses.add(1);
    } else {
        cannedMessagePostFailures.add(1);
        console.log('POST canned message failed. Status:', res.status, 'Response:', res.body);
        errorRate.add(1);
    }
}

// Function to GET feed
function getFeed(token) {
    feedGetAttempts.add(1);

    let res = http.get(`${BASE_URL}/feed`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    let success = check(res, {
        'feed retrieved successfully': (resp) => resp.status === 200,
    });

    if (success) {
        feedGetSuccesses.add(1);
    } else {
        feedGetFailures.add(1);
        console.log('GET feed failed. Status:', res.status, 'Response:', res.body);
        errorRate.add(1);
    }
}

// Function to create a long post
function createLongPost(token) {
    longPostAttempts.add(1);

    let payload = JSON.stringify({
        body: 'This is a test post',
        shareTo: [{
            "connectionType":"*",
            "connectionTypeId":"*"
        }],
        // Uncomment and update the following fields as needed
        // tags: ['tag1', 'tag2'],
        // sports: ['Basketball', 'Hockey'],
        // repostOf: '',
        // reaction: 'THUMBS_UP', // Updated to a valid value
        // copiedFromMessageId: '',
        // mediaIds: ['media1', 'media2'],
        // organizationId: 'org1',
    });

    let res = http.post(`${BASE_URL}/feed/long-post`, payload, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    if (res.status === 201) {
        longPostSuccesses.add(1);
    } else {
        longPostFailures.add(1);
        console.log('POST long post failed. Status:', res.status, 'Response:', res.body);
        errorRate.add(1);
    }
}

// Main test function
export default function () {
    let user = users[__VU % users.length];
    let token = signIn(user.email, user.password);

    if (token) {
        // GET and POST Team
        group('Team Operations', function () {
            getTeam(token);
            createTeam(token);
        });

        // GET and POST Training Program
        group('Training Program Operations', function () {
            getTrainingProgram(token);
            createTrainingProgram(token);
        });

        // GET and POST Canned Messages
        group('Canned Message Operations', function () {
            getCannedMessages(token);
            createCannedMessage(token);
        });

        // GET Feed and create Long Post
        group('Feed Operations', function () {
            getFeed(token);
            createLongPost(token);
        });
    }

    sleep(1); // Pause for 1 second between requests
}