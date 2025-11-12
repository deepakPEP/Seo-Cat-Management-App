// lib/auth.ts

export const saveToken = (accessToken: string, userId: string, role: string) => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('userId', userId);  
  localStorage.setItem('role', role);

  // console.log("Saving userId:", userId);
  // console.log("Saving role:", role);

};

export const getUserId = () => localStorage.getItem('userId');

export const clearAuthData = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('userId');
  localStorage.removeItem('role');
};
