import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { APIError } from "@/lib/api";
import { isAuthenticated, login } from "@/signals/authentication";
import { yupResolver } from "@hookform/resolvers/yup";
import { signal } from "@preact/signals";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { AxiosError } from "axios";
import { EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import EmailIcon from '@/../public/assets/icons/email.svg?react';
import PasswordIcon from '@/../public/assets/icons/password.svg?react';
import SeeIcon from '@/../public/assets/icons/see.svg?react';

const loginFormSchema = yup.object({
	email: yup.string().email("E-mail inválido").required("Campo obrigatório"),
	password: yup.string().required("Campo obrigatório"),
});

type LoginForm = yup.InferType<typeof loginFormSchema>;

const loginSearchSchema = yup.object({
	redirect: yup.string().optional(),
});

export const Route = createFileRoute("/login")({
	component: Login,
	validateSearch: (search) => loginSearchSchema.validateSync(search),
	beforeLoad: () => {
		if (isAuthenticated.value) {
			throw redirect({
				to: "/student",
				search: {
					query: "",
					page: 1,
					rows: 10,
				},
			});
		}
	},
});

const passwordVisible = signal(false);

function Login() {
	const router = useRouter();
	const { redirect } = Route.useSearch();

	const {
		handleSubmit,
		register,
		formState: { errors },
	} = useForm<LoginForm>({
		resolver: yupResolver(loginFormSchema),
	});

	return (
		<div class="bg-[url('/assets/login-background.jpg')] bg-top bg-cover bg-fixed h-dvh">
			<main class="backdrop-blur-sm h-dvh overflow-y-scroll justify-center items-center flex">
				<div class="bg-background/85 rounded-[40px] border-2 border max-w-[500px] flex justify-center items-center flex-col container mx-auto min-h-[80%]">
					<h1>
						<img
							src="/assets/logo.png"
							alt='Logo do Team Peoli'
							class="drop-shadow-md fill-white w-56 mt-16 mb-8"
						/>
					</h1>
					<h2 class="text-2xl font-bold">
						Bem-vindo de volta, Coach!
					</h2>
					<p class="text-secondary text-sm">Seu sistema. Seu time. Sua missão.</p>
					<form
						class="mt-4 flex flex-col gap-2 w-full"
						onSubmit={handleSubmit(handleLogin)}
					>
						<div class="flex flex-col gap-2">
							<label
								for="email"
								class="text-[#FFFFFF] font-medium drop-shadow-md flex items-center gap-2"
							>
								<EmailIcon height={16} width={16}></EmailIcon>
								E-mail
							</label>
							<input
								class="px-4 text-white bg-gray-600 text-input h-12 border-[0.5px] border-[#C1C2C1] rounded p-1 drop-shadow-md focus:outline focus:outline-primary data-[invalid]:outline data-[invalid]:outline-red-700 focus:data-[invalid]:outline-red-900"
								id="email"
								placeholder="seuemail@exemplo.com"
								data-invalid={errors.email}
								{...register("email")}
							/>
							<p
								data-invalid={errors.email}
								class="bg-red-700 bg-opacity-50 brightness-100 mt-1 px-1 rounded text-sm"
							>
								{errors.email?.message}
							</p>
						</div>
						<div class="flex flex-col gap-2">
							<label
								for="password"
								class="text-[#FFFFFF] font-medium drop-shadow-md flex items-center gap-2"
							>
								<PasswordIcon height={16} width={16}></PasswordIcon>
								Senha
							</label>
							<div class="relative">
								<input
									class="px-4 text-white bg-gray-600 w-full h-12 border-[0.5px] border-[#C1C2C1] rounded p-1 drop-shadow-md focus:outline focus:outline-primary text-input text-xs data-[visible=true]:text-base data-[invalid]:outline data-[invalid]:outline-red-700 focus:data-[invalid]:outline-red-900 pr-8"
									id="password"
									type={passwordVisible.value ? "text" : "password"}
									placeholder="••••••••••••"
									data-invalid={errors.password}
									data-visible={passwordVisible.value}
									{...register("password")}
								/>
								<button
									type="button"
									class="absolute right-3 top-4 text-gray-500 cursor-pointer flex"
									onClick={() =>
										(passwordVisible.value = !passwordVisible.value)
									}
								>
									{passwordVisible.value ? (
										<EyeOff size={16} />
									) : (
										<SeeIcon size={16} />
									)}
								</button>
							</div>
							{errors.password && (
								<p
									data-invalid={errors.email}
									class="bg-red-700 bg-opacity-50 brightness-100 mt-1 px-1 rounded text-sm"
								>
									{errors.password.message}
								</p>
							)}
							<p class="text-secondary text-right font-medium text-sm drop-shadow-md">
								<a
									class="no-underline font-semibold text-primary cursor-pointer outline-none focus:bg-primary focus:text-white underline"
									href="/"
								>
									Esqueceu a senha?
								</a>
							</p>
						</div>
						<Button type="submit" className="bg-primary my-6 drop-shadow-md w-[80%] h-12 self-center">
							Entrar
						</Button>
					</form>
				</div>
			</main>
		</div>
	);

	async function handleLogin({ email, password }: LoginForm) {
		try {
			await login({
				email,
				password,
			});

			router.history.push(redirect || "/student");
		} catch (error) {
			if (error instanceof AxiosError) {
				const apiError = error.response?.data as APIError;

				if (typeof apiError.error === "string") {
					toast({
						title: apiError.message,
						variant: "destructive",
					});
				}
			}
		}
	}
}
