// // lib/axiosInterceptor.ts
// import api from './api';

// export const setupAxiosInterceptors = (setToken: (token: string) => void) => {
//   api.interceptors.request.use((config) => {
//     const token = localStorage.getItem('accessToken');
//     if (token) {
//       config.headers['Authorization'] = `Bearer ${token}`;
//     }
//     return config;
//   });

//   api.interceptors.response.use(
//     (response) => response,
//     async (error) => {
//       const originalRequest = error.config;

//       // If 401 and not already retried
//       if (error.response?.status === 401 && !originalRequest._retry) {
//         originalRequest._retry = true;
//         try {
//           const refreshResponse = await api.post('/auth/refresh');
//           const newAccessToken = refreshResponse.data.accessToken;

//           if (newAccessToken) {
//             localStorage.setItem('accessToken', newAccessToken);
//             setToken(newAccessToken);

//             originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
//             return api(originalRequest); // Retry original request
//           }
//         } catch (refreshError) {
//           console.error('Refresh token failed:', refreshError);
//           localStorage.removeItem('accessToken');
//           window.location.href = '/login';
//         }
//       }

//       return Promise.reject(error);
//     }
//   );
// };
