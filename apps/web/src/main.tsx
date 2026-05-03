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
import {
  EntryStep1,
  EntryStep2,
  EntryStep3,
  EntryStep4,
  EntryStep5,
  CoachReview,
} from "./screens/coach-entry"
import { CoachConfirm } from "./screens/coach-confirm"
import { AcceptInvite } from "./screens/accept-invite"
import { ResetPassword } from "./screens/reset-password"
import { DirectorDashboard } from "./screens/director-dashboard"
import { DirectorReports } from "./screens/director-reports"
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
          { path: "/entry/done", element: <CoachConfirm /> },
          { path: "/sessions/:id", element: <SessionDetail variant="coach" /> },
        ],
      },
      // Entry steps don't share CoachLayout — they have their own sticky shell
      { path: "/entry/1", element: <EntryStep1 /> },
      { path: "/entry/2", element: <EntryStep2 /> },
      { path: "/entry/3", element: <EntryStep3 /> },
      { path: "/entry/4", element: <EntryStep4 /> },
      { path: "/entry/5", element: <EntryStep5 /> },
      { path: "/entry/review", element: <CoachReview /> },

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
              { path: "reports", element: <DirectorReports /> },
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
