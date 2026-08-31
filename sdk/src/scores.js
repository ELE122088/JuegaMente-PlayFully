class ScoresModule {
  constructor(client) {
    this.client = client;
  }

  async saveResult(resultData) {
    return this.client.request('/api/scores', {
      method: 'POST',
      body: resultData
    });
  }

  async getRanking(categoryId) {
    return this.client.request('/api/scores/ranking/' + categoryId);
  }

  async clearRanking(categoryId) {
    return this.client.request('/api/scores/ranking/' + categoryId, {
      method: 'DELETE'
    });
  }

  async getUserHistory() {
    return this.client.request('/api/scores/history');
  }

  async clearUserHistory() {
    return this.client.request('/api/scores/history', {
      method: 'DELETE'
    });
  }
}

module.exports = ScoresModule;
