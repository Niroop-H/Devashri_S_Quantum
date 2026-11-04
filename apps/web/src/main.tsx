import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
const Landing = lazy(() => import("./Landing"));
const Studio = lazy(() => import("./App").then((m) => ({ default: m.App })));
const isStudio = window.location.pathname.replace(/\/$/, "") === "/studio";
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
      {isStudio ? <Studio /> : <Landing />}
    </Suspense>
  </React.StrictMode>,
);
