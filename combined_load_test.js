import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate } from 'k6/metrics';

// Custom error rate metric
export const errorRate = new Rate('errors');

// Custom counters for tracking attempts, successes, and failures
export const signInAttempts = new Counter('sign_in_attempts');
export const signInSuccesses = new Counter('sign_in_successes');
export const signInFailures = new Counter('sign_in_failures');

export const feedLoadAttempts = new Counter('feed_load_attempts');
export const feedLoadSuccesses = new Counter('feed_load_successes');
export const feedLoadFailures = new Counter('feed_load_failures');
export const longPostAttempts = new Counter('long_post_attempts');
export const longPostSuccesses = new Counter('long_post_successes');
export const longPostFailures = new Counter('long_post_failures');

export const teamAttempts = new Counter('team_attempts');
export const teamSuccesses = new Counter('team_successes');
export const teamFailures = new Counter('team_failures');

export const trainingProgramAttempts = new Counter('training_program_attempts');
export const trainingProgramSuccesses = new Counter('training_program_successes');
export const trainingProgramFailures = new Counter('training_program_failures');

export const cannedMessageAttempts = new Counter('canned_message_attempts');
export const cannedMessageSuccesses = new Counter('canned_message_successes');
export const cannedMessageFailures = new Counter('canned_message_failures');

export const connectionAttempts = new Counter('connection_attempts');
export const connectionSuccesses = new Counter('connection_successes');
export const connectionFailures = new Counter('connection_failures');

export const notificationAttempts = new Counter('notification_attempts');
export const notificationSuccesses = new Counter('notification_successes');
export const notificationFailures = new Counter('notification_failures');

export const settingAttempts = new Counter('setting_attempts');
export const settingSuccesses = new Counter('setting_successes');
export const settingFailures = new Counter('setting_failures');

// Options for k6 including stages and pushing metrics to InfluxDB
export let options = {
    vus: 500, // Simulate 500 concurrent users
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

// Map to track if connections have been fetched for each user
const connectionsFetched = new Map();

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
        console.log(`User ${email} signed in successfully.`);
        return loginRes.json('AuthenticationResult.IdToken');
    } else {
        signInFailures.add(1);
        console.log(`Sign-in failed for ${email}. Status: ${loginRes.status} Response: ${loginRes.body}`);
        errorRate.add(1);
        return null;
    }
}

// Function to perform GET requests
function performGetRequests(token, email) {
    group('Initial GET Requests', function () {
        getNotifications(token, email);
        sleep(2); // Simulate user delay
        getSettings(token, email);
        sleep(2); // Simulate user delay
        getConnections(token, email);
        sleep(2); // Simulate user delay
        loadFeed(token, email);
    });
}

// Function to get notifications
function getNotifications(token, email) {
    notificationAttempts.add(1);

    let res = http.get(`${BASE_URL}/notification`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    let success = check(res, {
        'notifications retrieved successfully': (resp) => resp.status === 200,
    });

    if (success) {
        notificationSuccesses.add(1);
        console.log(`User ${email} successfully retrieved notifications.`);
    } else {
        notificationFailures.add(1);
        console.log(`GET notifications failed for user ${email}. Status: ${res.status}, Response: ${res.body}`);
        errorRate.add(1);
    }
}

// Function to get settings
function getSettings(token, email) {
    settingAttempts.add(1);

    let res = http.get(`${BASE_URL}/setting`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    let success = check(res, {
        'settings retrieved successfully': (resp) => resp.status === 200,
    });

    if (success) {
        settingSuccesses.add(1);
        console.log(`User ${email} successfully retrieved settings.`);
    } else {
        settingFailures.add(1);
        console.log(`GET settings failed for user ${email}. Status: ${res.status}, Response: ${res.body}`);
        errorRate.add(1);
    }
}

// Function to get connections
function getConnections(token, email) {
    connectionAttempts.add(1);

    let res = http.get(`${BASE_URL}/connection`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    let success = check(res, {
        'connections retrieved successfully': (resp) => resp.status === 200,
    });

    if (success) {
        connectionSuccesses.add(1);
        console.log(`User ${email} successfully retrieved connections.`);
        connectionsFetched.set(email, true);
    } else {
        connectionFailures.add(1);
        console.log(`GET connections failed for user ${email}. Status: ${res.status}, Response: ${res.body}`);
        errorRate.add(1);
    }
}

// Function to load feed
function loadFeed(token, email) {
    feedLoadAttempts.add(1);

    let res = http.get(`${BASE_URL}/feed`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    let success = check(res, {
        'feed retrieved successfully': (resp) => resp.status === 200,
    });

    if (success) {
        feedLoadSuccesses.add(1);
        console.log(`User ${email} successfully loaded the feed.`);
    } else {
        feedLoadFailures.add(1);
        console.log(`GET feed failed for user ${email}. Status: ${res.status}, Response: ${res.body}`);
        errorRate.add(1);
    }
}

// Function to perform POST requests
function performPostRequests(token, email) {
    group('POST Requests', function () {
        createTeam(token, email);
        sleep(3); // Simulate user delay
        createTrainingProgram(token, email);
        sleep(3); // Simulate user delay
        createLongPost(token, email);
        sleep(3); // Simulate user delay
        createCannedMessage(token, email);
        sleep(3); // Simulate user delay
    });
}

// Function to create a team
function createTeam(token, email) {
    teamAttempts.add(1);

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
        teamSuccesses.add(1);
        console.log(`User ${email} successfully created a team.`);
    } else {
        teamFailures.add(1);
        console.log(`POST team failed for user ${email}. Status: ${res.status}, Response: ${res.body}`);
        errorRate.add(1);
    }
}

// Function to create a training program
function createTrainingProgram(token, email) {
    trainingProgramAttempts.add(1);

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
        trainingProgramSuccesses.add(1);
        console.log(`User ${email} successfully created a training program.`);
    } else {
        trainingProgramFailures.add(1);
        console.log(`POST training program failed for user ${email}. Status: ${res.status}, Response: ${res.body}`);
        errorRate.add(1);
    }
}

// Function to create a long post
function createLongPost(token, email) {
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
        // organizationId: 'org1',
    });

    let res = http.post(`${BASE_URL}/post`, payload, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    let success = check(res, {
        'long post created successfully': (resp) => resp.status === 201,
    });

    if (success) {
        longPostSuccesses.add(1);
        console.log(`User ${email} successfully created a long post.`);
    } else {
        longPostFailures.add(1);
        console.log(`POST long post failed for user ${email}. Status: ${res.status}, Response: ${res.body}`);
        errorRate.add(1);
    }
}

// Function to create a canned message
function createCannedMessage(token, email) {
    cannedMessageAttempts.add(1);

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
        cannedMessageSuccesses.add(1);
        console.log(`User ${email} successfully created a canned message.`);
    } else {
        cannedMessageFailures.add(1);
        console.log(`POST canned message failed for user ${email}. Status: ${res.status}, Response: ${res.body}`);
        errorRate.add(1);
    }
}

// Main test function
export default function () {
    let user = users[__VU % users.length];
    let token = signIn(user.email, user.password);

    if (token) {
        // Perform all GET requests after sign-in
        performGetRequests(token, user.email);

        // Perform all POST requests every 3 seconds
        while (true) {
            performPostRequests(token, user.email);
        }
    }

    sleep(2); // Pause for 2 seconds between requests to simulate user behavior
}