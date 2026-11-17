import { api, getToken, setToken } from "./api.js";

const USER_KEY = "keyhold:user";

export function currentUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export const isLoggedIn = () => Boolean(getToken() && currentUser());
export const isOwner = () => currentUser()?.role === "owner";

function persist({ token, user }) {
  setToken(token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export const login = async (email, password) =>
  persist(await api.post("/auth/login", { email, password }, { auth: false }));

export const register = async (name, email, password, companyName) =>
  persist(await api.post("/auth/register", { name, email, password, companyName }, { auth: false }));

export const join = async (name, email, password, inviteCode) =>
  persist(await api.post("/auth/join", { name, email, password, inviteCode }, { auth: false }));

export function logout() {
  setToken(null);
  localStorage.removeItem(USER_KEY);
}
