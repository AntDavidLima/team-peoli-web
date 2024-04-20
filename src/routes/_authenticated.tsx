import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
} from "@tanstack/react-router";
import { isAuthenticated } from "../signals/authentication";
import { Icon } from "@iconify-icon/react/dist/iconify.mjs";
import { signal } from "@preact/signals";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ location }) => {
    if (!isAuthenticated.value) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: AuthenticatedLayout,
});

const expanded = signal(true);

function AuthenticatedLayout() {
  return (
    <div class="flex">
      <aside
        class="relative h-screen bg-card pt-6 px-4 data-[expanded=false]:px-1.5 data-[expanded=false]:hover:w-36 data-[expanded=false]:w-16 transition-all group w-72"
        data-expanded={expanded.value}
      >
        <div class="flex items-center justify-center w-full">
          <img
            src={
              expanded.value
                ? "/assets/logo-horizontal.svg"
                : "/assets/logo-without-text.svg"
            }
            class={expanded.value ? "w-32" : "w-12"}
          />
          <button
            class="flex items-center justify-center rounded-full transition-all data-[expanded=false]:rotate-180 data-[expanded=false]:hidden group-hover:data-[expanded=false]:flex absolute right-1 hover:bg-white/10 p-2"
            onClick={() => (expanded.value = !expanded.value)}
            data-expanded={expanded.value}
          >
            <Icon icon="uiw:d-arrow-left" width={20} height={20} />
          </button>
        </div>
        <ul class="mt-12 space-y-2">
          <Link to="/student">
            <li
              class="flex items-center gap-2 bg-primary rounded p-4 font-bold"
              data-expanded={expanded.value}
            >
              <Icon icon="ph:student-bold" width={20} height={20} />
              <p
                data-expanded={expanded.value}
                class="data-[expanded=false]:hidden data-[expanded=false]:group-hover:inline truncate"
              >
                Alunos
              </p>
            </li>
          </Link>
        </ul>
      </aside>
      <main class="container mx-auto py-12">
        <Outlet />
      </main>
    </div>
  );
}
