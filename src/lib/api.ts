import axios from "axios";

export interface APIError {
	error: Error | string;
	message: string;
	statusCode: number;
}

interface Error {
	name: string;
	details: Detail[];
}

interface Detail {
	code: string;
	expected: string;
	received: string;
	path: string[];
	message: string;
}

export const api = axios.create({
	baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
});
