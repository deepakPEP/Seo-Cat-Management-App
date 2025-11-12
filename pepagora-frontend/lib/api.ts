// lib/api.ts or utils/auth.ts
import  axiosInstance from "./axiosInstance";

export const logoutUser = async (userId: string) => {
  try {
    console.log("Logging out user with ID:", userId);
    const response = await axiosInstance.post('/auth/logout', { userId });
    return response.data;
  } catch (error: any) {
    throw error.response?.data || { message: 'Logout failed' };
  }
};
