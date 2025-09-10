import { fetchWithAuth } from '../lib/api';

export interface User {
  id: number;
  name: string;
  email: string;
}

export const userService = {
  getAllUsers: async (): Promise<User[]> => {
    const response = await fetchWithAuth('/users');
    return response.json();
  },
};

export default userService;