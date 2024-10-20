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
        console.log(`User ${email} signed in successfully.`);
        return loginRes.json('AuthenticationResult.IdToken');
    } else {
        signInFailures.add(1);
        console.log(`Sign-in failed for ${email}. Response: ${loginRes.body}`);
        errorRate.add(1);
        return null;
    }
}

// Function to simulate feed loading
function loadFeed(email) {
    feedLoadAttempts.add(1);

    // Simulate feed loading time
    sleep(2);

    // Log feed loading success
    feedLoadSuccesses.add(1);
    console.log(`User ${email} successfully loaded the feed.`);
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
        postId: 'test-post-id', // Required property
        mediaIds: ['media1', 'media2'], // Required property
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

// Main test function
export default function () {
    let user = users[__VU % users.length];
    let token = signIn(user.email, user.password);

    if (token) {
        // Simulate feed loading and create Long Post
        group('Feed Operations', function () {
            loadFeed(user.email);
            createLongPost(token, user.email);
        });
    }

    sleep(1); // Pause for 1 second between requests
}