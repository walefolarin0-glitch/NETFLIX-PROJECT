import axios from 'axios';

export default axios.create({
    baseURL: 'http://172.24.0.1:8080/api',
    headers: {
        'Content-Type': 'application/json',
    },
});