import { toast } from "@/components/ui/use-toast";
import { APIError } from "@/lib/api";
import { isAuthenticated, login } from "@/signals/authentication";
import { yupResolver } from "@hookform/resolvers/yup";
import { Icon } from "@iconify-icon/react/dist/iconify.mjs";
import { signal } from "@preact/signals";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { AxiosError } from "axios";
import { useForm } from "react-hook-form";
import * as yup from "yup";

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
      <main class="backdrop-blur-lg h-dvh overflow-y-scroll">
        <div class="flex items-center flex-col container mx-auto p-4 h-full">
          <h1>
            <img
              src="/assets/logo-horizontal.svg"
              alt='Logo do Team Peoli (Mago com chapeu e barba grande escrito "Team Peoli" ao lado)'
              class="drop-shadow-md fill-white w-56 my-24"
            />
          </h1>
          <form
            class="flex flex-col gap-8 w-full max-w-80"
            onSubmit={handleSubmit(handleLogin)}
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
                class="text-input h-10 rounded p-1 drop-shadow-md focus:outline focus:outline-primary data-[invalid]:outline data-[invalid]:outline-red-700 focus:data-[invalid]:outline-red-900"
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
            <div class="flex flex-col gap-1">
              <label
                for="password"
                class="font-medium drop-shadow-md flex items-center gap-1"
              >
                <Icon icon="ph:keyhole" width={20} height={20} />
                Senha
              </label>
              <div class="relative">
                <input
                  class="w-full h-10 rounded p-1 drop-shadow-md focus:outline focus:outline-primary text-input text-xs data-[visible=true]:text-base data-[invalid]:outline data-[invalid]:outline-red-700 focus:data-[invalid]:outline-red-900 pr-8"
                  id="password"
                  type={passwordVisible.value ? "text" : "password"}
                  placeholder="••••••••••••"
                  data-invalid={errors.password}
                  data-visible={passwordVisible.value}
                  {...register("password")}
                />
                <button
                  type="button"
                  class="absolute right-2 top-3 text-gray-500 cursor-pointer flex"
                  onClick={() =>
                    (passwordVisible.value = !passwordVisible.value)
                  }
                >
                  {passwordVisible.value ? (
                    <Icon icon="ph:eye-slash" />
                  ) : (
                    <Icon icon="ph:eye" />
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
              <p class="font-medium text-sm drop-shadow-md">
                Esqueceu sua senha?{" "}
                <a
                  class="font-semibold text-primary cursor-pointer outline-none focus:bg-primary focus:text-white underline"
                  href="/"
                >
                  Clique aqui
                </a>
              </p>
            </div>
            <button
              type="submit"
              class="bg-primary rounded font-semibold h-10 my-10 drop-shadow-md focus:outline focus:outline-white hover:brightness-95"
            >
              Acessar
            </button>
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
