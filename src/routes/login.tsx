import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@iconify-icon/react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

export const Route = createFileRoute("/login")({
	component: Login,
});

const loginFormSchema = yup.object({
	email: yup.string().email("E-mail inválido").required("Campo obrigatório"),
	password: yup.string().required("Campo obrigatório"),
});

type LoginForm = yup.InferType<typeof loginFormSchema>;

function Login() {
	const {
		register,
		formState: { errors },
		handleSubmit,
	} = useForm<LoginForm>({
		resolver: yupResolver(loginFormSchema),
	});

	return (
		<div class="bg-[url('/assets/login-background.jpg')] bg-top bg-cover bg-fixed h-dvh">
			<main class="backdrop-blur-lg h-dvh overflow-y-scroll">
				<div class="flex items-center flex-col container mx-auto p-4 h-full">
					<h1>
						<img
							src="/assets/logo-horizontal.svg"
							alt='Logo do Team Peoli (Mago com chapeu e barba grande escrito "Team Peoli" ao lado)'
							width={320}
							class="drop-shadow-md"
						/>
					</h1>
					<form
						onSubmit={handleSubmit(handleLogin)}
						class="flex flex-col gap-8 w-full max-w-80"
					>
						<div class="flex flex-col gap-1">
							<label
								for="email"
								class="font-medium drop-shadow-md flex items-center gap-1"
							>
								<Icon icon="ph:envelope" width={20} height={20} />
								E-mail
							</label>
							<input
								class="h-10 rounded p-1 drop-shadow-md focus:outline focus:outline-primary text-dark data-[invalid]:outline data-[invalid]:outline-red-700 focus:data-[invalid]:outline-red-900"
								data-invalid={errors.email}
								id="email"
								placeholder="seuemail@exemplo.com"
								{...register("email")}
							/>
							<p
								data-invalid={errors.email}
								class="bg-red-700 bg-opacity-50 brightness-100 mt-1 px-1 rounded text-sm"
							>
								{errors.email?.message}
							</p>
						</div>
						<div class="flex flex-col gap-1">
							<label
								for="password"
								class="font-medium drop-shadow-md flex items-center gap-1"
							>
								<Icon icon="ph:keyhole" width={20} height={20} />
								Senha
							</label>
							<input
								class="h-10 rounded p-1 drop-shadow-md focus:outline focus:outline-primary text-dark text-xs data-[invalid]:outline data-[invalid]:outline-red-700 focus:data-[invalid]:outline-red-900"
								id="password"
								data-invalid={errors.password}
								type="password"
								placeholder="••••••••••••"
								{...register("password")}
							/>
							{errors.password && (
								<p
									data-invalid={errors.email}
									class="bg-red-700 bg-opacity-50 brightness-100 mt-1 px-1 rounded text-sm"
								>
									{errors.password.message}
								</p>
							)}
							<p class="font-medium text-sm drop-shadow-md">
								Esqueceu sua senha?{" "}
								<a
									class="font-semibold text-primary cursor-pointer outline-none focus:bg-primary focus:text-white"
									href="/"
								>
									Clique aqui
								</a>
							</p>
						</div>
						<button
							type="submit"
							class="bg-primary rounded font-semibold h-10 mb-10 drop-shadow-md focus:outline focus:outline-white hover:brightness-95"
						>
							Acessar
						</button>
					</form>
				</div>
			</main>
		</div>
	);
}

function handleLogin() {
	alert("Login");
}
