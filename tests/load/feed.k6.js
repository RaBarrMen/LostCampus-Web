// Prueba de rendimiento con k6 (https://k6.io)
// Uso:  k6 run -e BASE_URL=https://lostcampus-gateway.onrender.com -e TOKEN=<access_token> tests/load/feed.k6.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // sube a 20 usuarios
    { duration: '1m', target: 50 }, // mantiene 50 usuarios simultáneos
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // requisito no funcional: 95% < 500 ms
    http_req_failed: ['rate<0.01'],
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:4000';
const params = { headers: { Authorization: `Bearer ${__ENV.TOKEN}` } };

export default function () {
  const health = http.get(`${BASE}/api/v1/health`);
  check(health, { 'health 200': (r) => r.status === 200 });

  const feed = http.get(`${BASE}/api/v1/items?limit=24`, params);
  check(feed, { 'feed 200': (r) => r.status === 200 });

  const cats = http.get(`${BASE}/api/v1/categories`, params);
  check(cats, { 'categorías 200': (r) => r.status === 200 });

  sleep(1);
}
