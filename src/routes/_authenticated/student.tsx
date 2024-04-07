import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/student")({
  component: Aluno,
});

function Aluno() {
  return (
    <div>
      <h1>Aluno</h1>
    </div>
  );
}
