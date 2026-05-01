import { api } from "./axios";

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  avatar: string | null;
  profile: {
    current_role: string;
    target_role: string;
    known_skill_ids: number[];
  };
}

export async function register(
  email: string,
  username: string,
  password: string
): Promise<{ user: User; access: string; refresh: string }> {
  const { data } = await api.post("/api/auth/register/", {
    email,
    username,
    password,
  });
  return data;
}

export async function login(
  email: string,
  password: string
): Promise<AuthTokens> {
  const { data } = await api.post("/api/auth/login/", { email, password });
  return data;
}

export async function logout(refresh: string): Promise<void> {
  await api.post("/api/auth/logout/", { refresh });
}

export async function getMe(): Promise<User> {
  const { data } = await api.get("/api/auth/me/");
  return data;
}
