class AuthModule {
  constructor(client) {
    this.client = client;
  }

  async login(username, password) {
    const data = await this.client.request('/api/auth/login', {
      method: 'POST',
      body: { username, password }
    });
    if (data && data.token) {
      this.client.setToken(data.token);
    }
    return data;
  }

  async register(username, password, role = 'student') {
    const data = await this.client.request('/api/auth/register', {
      method: 'POST',
      body: { username, password, role }
    });
    if (data && data.token) {
      this.client.setToken(data.token);
    }
    return data;
  }

  async getProfile() {
    return this.client.request('/api/auth/profile');
  }

  async updateAvatar(avatarData) {
    return this.client.request('/api/auth/profile/avatar', {
      method: 'PUT',
      body: avatarData
    });
  }

  async changePassword(oldPassword, newPassword) {
    return this.client.request('/api/auth/change-password', {
      method: 'PUT',
      body: { oldPassword, newPassword }
    });
  }

  logout() {
    this.client.clearToken();
  }
}

module.exports = AuthModule;
