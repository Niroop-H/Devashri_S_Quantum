import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
const Landing = lazy(() => import("./Landing"));
const Studio = lazy(() => import("./App").then((m) => ({ default: m.App })));
const Playground = lazy(() => import("./lab/Playground"));
const Lab = lazy(() => import("./lab/LabTwin"));
const Sensing = lazy(() => import("./lab/Sensing"));
const Communication = lazy(() => import("./lab/Communication"));
const path = window.location.pathname.replace(/\/$/, "");
const Content = path === '/studio' ? Studio : path === '/lab/operations' ? Lab : path === '/lab' ? Playground : path === '/sensing' ? Sensing : path === '/communication' ? Communication : Landing;
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense
      fallback={
        <div
          style={{
            padding: 40,
            background: "#f7f9f4",
            color: "#172124",
            minHeight: "100vh",
          }}
        >
          Loading MAH Quantum…
        </div>
      }
    >
      <Content />
    </Suspense>
  </React.StrictMode>,
);
