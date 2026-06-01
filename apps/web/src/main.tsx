import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "./index.css"

import { AppShell } from "./layouts/app-shell"
import { CoachLayout } from "./layouts/coach-layout"
import { DirectorLayout } from "./layouts/director-layout"
import { RequireDirector } from "./layouts/require-role"
import { Toaster } from "./components/ui/sonner"

import { Login } from "./screens/login"
import { CoachHome } from "./screens/coach-home"
import { IndexRedirect } from "./screens/index-redirect"
import { CoachRecall } from "./screens/coach-recall"
import { CoachSessionForm } from "./screens/coach-session-form"
import { CoachHistory } from "./screens/coach-history"
import { CoachConfirm } from "./screens/coach-confirm"
import { AcceptInvite } from "./screens/accept-invite"
import { ResetPassword } from "./screens/reset-password"
import { DirectorDashboard } from "./screens/director-dashboard"
import { DirectorFormSettings } from "./screens/director-form"
import { DirectorCoaches } from "./screens/director-coaches"
import { DirectorSessions } from "./screens/director-sessions"
import { SessionDetail } from "./screens/session-detail"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/login", element: <Login /> },
      { path: "/accept-invite/:id", element: <AcceptInvite /> },
      { path: "/reset-password/:token", element: <ResetPassword /> },

      // Index dispatches by role
      {
        element: <CoachLayout />,
        children: [
          { path: "/", element: <IndexRedirect /> },
          { path: "/coach", element: <CoachHome /> },
          { path: "/coach/history", element: <CoachHistory /> },
          { path: "/entry/done", element: <CoachConfirm /> },
          { path: "/sessions/:id", element: <SessionDetail variant="coach" /> },
        ],
      },
      // Recall + post-session form have their own full-height sticky shell
      { path: "/coach/recall/:eventId", element: <CoachRecall /> },
      { path: "/coach/session/:eventId", element: <CoachSessionForm /> },

      // Director — role-gated
      {
        path: "/director",
        element: <RequireDirector />,
        children: [
          {
            element: <DirectorLayout />,
            children: [
              { index: true, element: <Navigate to="overview" replace /> },
              { path: "overview", element: <DirectorDashboard /> },
              { path: "sessions", element: <DirectorSessions /> },
              {
                path: "sessions/:id",
                element: <SessionDetail variant="director" />,
              },
              { path: "form", element: <DirectorFormSettings /> },
              { path: "form/new", element: <DirectorFormSettings /> },
              { path: "coaches", element: <DirectorCoaches /> },
            ],
          },
        ],
      },
    ],
  },
])

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
)
