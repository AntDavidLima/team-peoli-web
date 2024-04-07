import { computed, effect, signal } from "@preact/signals";
import axios from "axios";
import { Cookies } from "react-cookie";

interface LoginForm {
	email: string;
	password: string;
}

interface APIAuthenticateResponse {
	auth_token: string;
}

const cookies = new Cookies();

export const currentUser = signal(null);

export const isAuthenticated = computed(() => currentUser.value !== null);

effect(() => {
	const authToken = cookies.get("auth_token");

	currentUser.value = authToken || null;
});

export async function login({ email, password }: LoginForm) {
	const { data } = await axios.post<APIAuthenticateResponse>(
		`${import.meta.env.VITE_API_URL}/authentication`,
		{
			email,
			password,
		},
	);

	cookies.set("auth_token", data.auth_token, { sameSite: "strict" });
}
