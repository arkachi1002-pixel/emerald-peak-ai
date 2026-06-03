import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/workout/$id")({
  component: () => <Outlet />,
});
