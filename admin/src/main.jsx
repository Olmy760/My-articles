import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import AdminApp from "./admin/AdminApp";

import "./style.css";


const isAdmin =
    window.location.pathname === "/admin" ||
    window.location.pathname.startsWith("/admin/");


ReactDOM.createRoot(
    document.getElementById("root")
).render(
    <React.StrictMode>
        {isAdmin ? <AdminApp /> : <App />}
    </React.StrictMode>
);