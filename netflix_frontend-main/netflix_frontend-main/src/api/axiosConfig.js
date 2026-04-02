import axios from 'axios';

export default axios.create({
    baseURL: 'http://host.docker.internal:8080',
    headers: {
        'Content-Type': 'application/json',
    },
});