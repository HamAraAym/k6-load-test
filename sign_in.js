import http from 'k6/http';
import { check, sleep } from 'k6';

// Define an array of user credentials
const users = [
    { email: 'nhanif@sportsgravy.com', password: 'Test1234$' },
    { email: 'lebronjames11@mailinator.com', password: 'Test1234$' },
    { email: 'hamidmee@mailinator.com', password: 'Test1234$' },
    { email: 'nikohope@mailinator.com', password: 'Test1234$' },
    { email: 'rob+test@jmg.mn', password: 'Test1234$' },
    { email: 'shughes@sportsgravy.com', password: '#BassRun2' },
    // Add more users as needed
];

export const options = {
    stages: [
        { duration: '1m', target: 500 },  // Ramp up to 100 users
        { duration: '3m', target: 200 },  // Stay at 500 users for 3 minutes
        { duration: '2m', target: 1000 }, // Spike to 1000 users
        { duration: '2m', target: 0 },    // Ramp down to 0 users
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    },
};

export default function () {
    const url = 'https://dev.api.sportsgravy.com/auth/sign-in';

    // Select a user based on the VU number
    const user = users[__VU % users.length];

    const payload = JSON.stringify({
        email: user.email,
        password: user.password
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const res = http.post(url, payload, params);

    // Check for a 200 status code
    check(res, { 'status was 200': (r) => r.status === 200 });

    // Check if the response contains a token (adjust to the actual response structure)
    check(res, {
        'status was 200': (r) => r.status === 200,
        'response contains token': (r) => {
            let responseBody = r.json();
            return responseBody.AuthenticationResult && responseBody.AuthenticationResult.AccessToken !== undefined;
        }
    });

    sleep(1);
}