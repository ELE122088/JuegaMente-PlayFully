class CategoriesModule {
  constructor(client) {
    this.client = client;
  }

  async getAll() {
    return this.client.request('/api/categories');
  }

  async getById(categoryId) {
    return this.client.request('/api/categories/' + categoryId);
  }

  async joinByPin(roomPin) {
    return this.client.request('/api/categories/join', {
      method: 'POST',
      body: { roomCode: roomPin }
    });
  }

  async create(categoryData) {
    return this.client.request('/api/categories', {
      method: 'POST',
      body: categoryData
    });
  }

  async update(categoryId, categoryData) {
    return this.client.request('/api/categories/' + categoryId, {
      method: 'PUT',
      body: categoryData
    });
  }

  async delete(categoryId) {
    return this.client.request('/api/categories/' + categoryId, {
      method: 'DELETE'
    });
  }
}

module.exports = CategoriesModule;
