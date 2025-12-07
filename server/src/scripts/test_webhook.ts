
import axios from 'axios';

const WEBHOOK_URL = 'http://localhost:3000/api/aircall/webhook';

// Simulate a call ended event
const payload = {
    event: 'call.ended',
    timestamp: Math.floor(Date.now() / 1000),
    data: {
        id: '123456789',
        direction: 'inbound',
        duration: 45,
        started_at: Math.floor(Date.now() / 1000) - 45,
        answered_at: Math.floor(Date.now() / 1000) - 40,
        ended_at: Math.floor(Date.now() / 1000),
        raw_digits: '+33612345678',
        user: {
            id: '999999',
            name: 'Test Agent',
            email: 'test.agent@example.com' // Ensure this matches a user or fallback fails
        },
        contact: {
            id: '888888',
            phone_number: '+33612345678'
        },
        recording: 'https://assets.aircall.io/samples/test-recording.mp3', // Dummy URL
        voicemail: null,
        tags: []
    }
};

async function testWebhook() {
    try {
        console.log('Sending webhook payload to', WEBHOOK_URL);
        const response = await axios.post(WEBHOOK_URL, payload);
        console.log('Response Status:', response.status);
        console.log('Response Data:', response.data);
    } catch (error: any) {
        console.error('Error sending webhook:', error.message);
        if (error.response) {
            console.error('Server responded with:', error.response.status, error.response.data);
        }
    }
}

testWebhook();
