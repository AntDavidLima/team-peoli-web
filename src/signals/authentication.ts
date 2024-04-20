import { api } from "@/lib/api";
import { computed, effect, signal } from "@preact/signals";
import { Cookies } from "react-cookie";

interface LoginForm {
  email: string;
  password: string;
}

interface APIAuthenticateResponse {
  auth_token: string;
}

interface CurrentUser {
  authToken: string;
}

const cookies = new Cookies();

export const currentUser = signal<CurrentUser | null>(null);

export const isAuthenticated = computed(() => currentUser.value !== null);

effect(() => {
  if (!currentUser.value) {
    const authToken = cookies.get("auth_token");

    if (authToken) {
      currentUser.value = { authToken };

      api.defaults.headers.common["Authorization"] = `Bearer ${authToken}`;
    }
  }
});

export async function login({ email, password }: LoginForm) {
  const { data } = await api.post<APIAuthenticateResponse>(`/authentication`, {
    email,
    password,
  });

  cookies.set("auth_token", data.auth_token, { sameSite: "strict" });

  currentUser.value = { authToken: data.auth_token };
}
