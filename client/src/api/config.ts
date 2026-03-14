// API Configuration
export const API_CONFIG = {
    BASE_URL: typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : 'https://api.elephant.com',

    ENDPOINTS: {
        AUTH: {
            LOGIN: '/api/auth/login',
            ME: '/api/auth/me',
        },
        STATS: '/api/stats',
        CAMERAS: {
            LIST: '/api/cameras',
            UPDATE: (id: number) => `/api/cameras/${id}`,
        },
        ALERTS: '/api/alerts',
        ANALYTICS: '/api/analytics'
    },

    DEFAULT_HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
};

// Storage keys
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'elephant_auth_token',
    REFRESH_TOKEN: 'elephant_refresh_token',
    USER_DATA: 'elephant_user_data',
};

// API Response types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export interface AuthResponse {
    token: string;
    refreshToken: string;
    user: {
        id?: string;
        email: string;
        name?: string;
    };
}

