import { API_CONFIG, STORAGE_KEYS } from './config';

class ApiService {
    private baseURL: string;

    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
    }

    private getHeaders(withAuth: boolean = true) {
        const headers = { ...API_CONFIG.DEFAULT_HEADERS } as any;
        if (withAuth) {
            const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }
        return headers;
    }

    private async handleResponse(response: Response) {
        if (response.status === 401) {
            this.logout();
            if (typeof window !== 'undefined') {
                window.location.href = '/login';
            }
            throw new Error('Unauthorized');
        }
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || data.message || 'API Request failed');
        }
        return data;
    }

    async login(credentials: any) {
        const response = await fetch(`${this.baseURL}${API_CONFIG.ENDPOINTS.AUTH.LOGIN}`, {
            method: 'POST',
            headers: this.getHeaders(false),
            body: JSON.stringify(credentials),
        });
        const data = await this.handleResponse(response);
        
        if (data.access_token) {
            localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, data.access_token);
        }
        return data;
    }

    async getMe() {
        const response = await fetch(`${this.baseURL}${API_CONFIG.ENDPOINTS.AUTH.ME}`, {
            method: 'GET',
            headers: this.getHeaders(true),
        });
        return this.handleResponse(response);
    }

    async getStats() {
        const response = await fetch(`${this.baseURL}${API_CONFIG.ENDPOINTS.STATS}`, {
            method: 'GET',
            headers: this.getHeaders(true),
        });
        return this.handleResponse(response);
    }

    async getCameras() {
        const response = await fetch(`${this.baseURL}${API_CONFIG.ENDPOINTS.CAMERAS.LIST}`, {
            method: 'GET',
            headers: this.getHeaders(true),
        });
        return this.handleResponse(response);
    }

    async updateCamera(id: number, isActive: boolean) {
        const response = await fetch(`${this.baseURL}${API_CONFIG.ENDPOINTS.CAMERAS.UPDATE(id)}`, {
            method: 'PATCH',
            headers: this.getHeaders(true),
            body: JSON.stringify({ is_active: isActive }),
        });
        return this.handleResponse(response);
    }

    async addCamera(cameraData: any) {
        const response = await fetch(`${this.baseURL}${API_CONFIG.ENDPOINTS.CAMERAS.LIST}`, {
            method: 'POST',
            headers: this.getHeaders(true),
            body: JSON.stringify(cameraData),
        });
        return this.handleResponse(response);
    }

    async getAlerts() {
        const response = await fetch(`${this.baseURL}${API_CONFIG.ENDPOINTS.ALERTS}`, {
            method: 'GET',
            headers: this.getHeaders(true),
        });
        return this.handleResponse(response);
    }

    async getAnalytics(range: string = 'week') {
        const response = await fetch(`${this.baseURL}${API_CONFIG.ENDPOINTS.ANALYTICS}?range=${range}`, {
            method: 'GET',
            headers: this.getHeaders(true),
        });
        return this.handleResponse(response);
    }

    async getRecordings() {
        const response = await fetch(`${this.baseURL}${API_CONFIG.ENDPOINTS.RECORDINGS}`, {
            method: 'GET',
            headers: this.getHeaders(true),
        });
        return this.handleResponse(response);
    }

    logout() {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    }

    isAuthenticated() {
        return !!localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    }
}

export const apiService = new ApiService();
