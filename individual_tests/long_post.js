import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { Rate } from 'k6/metrics';

export const errorRate = new Rate('errors');

export let options = {
    stages: [
        { duration: '1m', target: 200 }, // ramp up to 10 users
        { duration: '3m', target: 100 }, // stay at 10 users
        { duration: '1m', target: 20 },  // ramp down to 0 users
    ],
};

const BASE_URL = 'https://dev.api.sportsgravy.com';

// Function to sign in and return the access token
function signIn() {
    let loginRes = http.post(`${BASE_URL}/auth/sign-in`, JSON.stringify({
        email: 'hamidmee@mailinator.com',
        password: 'Test1234$',
    }), {
        headers: { 'Content-Type': 'application/json' },
    });

    // Log the full response if there is an issue
    if (loginRes.status !== 200) {
        console.log('Sign-in failed. Status code:', loginRes.status);
        console.log('Response body:', loginRes.body);
        fail('Sign-in request failed.');
    }

    check(loginRes, {
        'logged in successfully': (resp) => resp.json('AuthenticationResult.IdToken') !== '',
    });

    let authToken = loginRes.json('AuthenticationResult.IdToken');

    // Log if token is null
    if (!authToken) {
        console.log('Token is null. Response body:', loginRes.body);
        fail('Failed to retrieve the access token.');
    }

    console.log('Access Token:', authToken);

    return authToken;
}

export default function () {
    let token = signIn();

    let postData = {
        body: 'This is a test post',
        shareTo: [{
            "connectionType":"*",
            "connectionTypeId":"*"
            }],
       // tags: ['tag1', 'tag2'],
       // sports: ['Basketball', 'Hockey'],
       // repostOf: '',
       // reaction: 'THUMBS_UP', // Updated to a valid value
       // copiedFromMessageId: '',
       // mediaIds: ['media1', 'media2'],
       // organizationId: 'org1',
    };

    let postRes = http.post(`${BASE_URL}/post`, JSON.stringify(postData), {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });

    // Log the full response if there is an issue
    if (postRes.status !== 201) {
        console.log('Post creation failed. Status code:', postRes.status);
        console.log('Response body:', postRes.body);
    }

    check(postRes, {
        'post created successfully': (resp) => resp.status === 201 && resp.json('postId') !== '',
    });

    errorRate.add(postRes.status !== 200);
    sleep(1);
}