const AuthModule = require('./auth');
const CategoriesModule = require('./categories');
const QuestionsModule = require('./questions');
const ScoresModule = require('./scores');
const SocketModule = require('./socket');

class JuegaMenteSDK {
  constructor(options = {}) {
    this.baseUrl = (options.baseUrl || 'http://localhost:5000').replace(/\/$/, '');
    this.token = options.token || null;

    this.auth = new AuthModule(this);
    this.categories = new CategoriesModule(this);
    this.questions = new QuestionsModule(this);
    this.scores = new ScoresModule(this);
    this.socket = new SocketModule(this);
  }

  setToken(token) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  async request(endpoint, options = {}) {
    const url = this.baseUrl + endpoint;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (this.token) {
      headers['Authorization'] = 'Bearer ' + this.token;
    }

    const fetchFn = typeof fetch !== 'undefined' ? fetch : globalThis.fetch;
    if (!fetchFn) {
      throw new Error('[JuegaMente SDK] No se encontro la funcion fetch global.');
    }

    const res = await fetchFn(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error(data.message || data.error || 'HTTP Error ' + res.status);
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data;
  }
}

module.exports = JuegaMenteSDK;
module.exports.JuegaMenteSDK = JuegaMenteSDK;
