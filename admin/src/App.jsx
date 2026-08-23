import React from "react";


export default function App() {

    return (
        <div className="public-site">

            <header className="site-header">

                <a
                    href="/"
                    className="site-logo"
                >
                    My Articles
                </a>

                <a
                    href="/admin"
                    className="admin-link"
                >
                    Admin
                </a>

            </header>


            <main className="site-main">

                <h1>
                    My Articles
                </h1>

                <p>
                    Публичная часть сайта.
                </p>

            </main>

        </div>
    );
}