import { createFileRoute } from "@tanstack/react-router";
import { Icon } from "@iconify-icon/react";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
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
          <form class="flex flex-col gap-9 w-full max-w-80">
            <div class="flex flex-col gap-1">
              <label
                for="email"
                class="font-medium drop-shadow-md flex items-center gap-1"
              >
                <Icon icon="ph:envelope" width={20} height={20} />
                E-mail
              </label>
              <input
                class="h-10 rounded p-1 drop-shadow-md text-dark focus:outline focus:outline-primary"
                id="email"
                type="email"
                placeholder="seuemail@exemplo.com"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label
                for="senha"
                class="font-medium drop-shadow-md flex items-center gap-1"
              >
                <Icon icon="ph:keyhole" width={20} height={20} />
                Senha
              </label>
              <input
                class="h-10 rounded p-1 drop-shadow-md focus:outline focus:outline-primary text-dark text-xs"
                id="senha"
                type="password"
                placeholder="••••••••••••"
              />
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
