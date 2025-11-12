import {jwtDecode} from 'jwt-decode';

export interface TokenPayload {
  id: string;
  role: string;
  exp: number;
  iat: number;
}

export const decodeToken = (token: string): TokenPayload | null => {
  try {
    return jwtDecode<TokenPayload>(token);
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
};
