class QuestionsModule {
  constructor(client) {
    this.client = client;
  }

  async getByCategory(categoryId) {
    return this.client.request('/api/questions/category/' + categoryId);
  }

  async create(questionData) {
    return this.client.request('/api/questions', {
      method: 'POST',
      body: questionData
    });
  }

  async update(questionId, questionData) {
    return this.client.request('/api/questions/' + questionId, {
      method: 'PUT',
      body: questionData
    });
  }

  async delete(questionId) {
    return this.client.request('/api/questions/' + questionId, {
      method: 'DELETE'
    });
  }

  async bulkImport(categoryId, questionsArray) {
    return this.client.request('/api/questions/bulk', {
      method: 'POST',
      body: { categoryId, questions: questionsArray }
    });
  }
}

module.exports = QuestionsModule;
