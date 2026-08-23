const PROXY_URL =
    "https://olmy-decap-proxy.gleb-babushkin-v.workers.dev";

const GITHUB_API =
    "https://api.github.com";


const REPO_OWNER =
    "Olmy760";

const REPO_NAME =
    "My-articles";

const REPO_BRANCH =
    "main";


const TOKEN_KEY =
    "my_articles_github_token";

const USER_KEY =
    "my_articles_github_user";


/*
 * GitHub OAuth через существующий
 * Decap OAuth Proxy.
 */
export function login() {

    return new Promise(
        (resolve, reject) => {

            const width = 600;
            const height = 700;

            const left =
                window.screenX +
                (window.outerWidth - width) / 2;

            const top =
                window.screenY +
                (window.outerHeight - height) / 2;


            const authUrl =
                `${PROXY_URL}/auth` +
                `?provider=github`;


            const popup =
                window.open(
                    authUrl,
                    "github-auth",
                    [
                        `width=${width}`,
                        `height=${height}`,
                        `left=${left}`,
                        `top=${top}`,
                        "popup=yes"
                    ].join(",")
                );


            if (!popup) {

                reject(
                    new Error(
                        "Браузер заблокировал popup"
                    )
                );

                return;

            }


            let finished = false;


            let closeTimer;


            function cleanup() {

                window.removeEventListener(
                    "message",
                    handleMessage
                );


                if (closeTimer) {

                    clearInterval(
                        closeTimer
                    );

                }

            }


            function finishSuccess(
                token
            ) {

                if (finished) {
                    return;
                }


                finished = true;

                cleanup();


                localStorage.setItem(
                    TOKEN_KEY,
                    token
                );


                try {

                    popup.close();

                } catch {
                    // ignore
                }


                resolve(token);

            }


            function finishError(
                message
            ) {

                if (finished) {
                    return;
                }


                finished = true;

                cleanup();


                try {

                    popup.close();

                } catch {
                    // ignore
                }


                reject(
                    new Error(
                        message
                    )
                );

            }


            function handleMessage(
                event
            ) {

                /*
                 * Worker использует "*",
                 * поэтому проверяем source,
                 * а не только origin.
                 */
                if (
                    event.source !== popup
                ) {

                    return;

                }


                const data =
                    event.data;


                /*
                 * Первый message от Worker:
                 *
                 * authorizing:github
                 *
                 * На него нужно ответить,
                 * чтобы callback Worker
                 * продолжил handshake.
                 */
                if (
                    data ===
                    "authorizing:github"
                ) {

                    popup.postMessage(
                        "authorizing:github",
                        new URL(
                            PROXY_URL
                        ).origin
                    );


                    return;

                }


                /*
                 * Финальный message:
                 *
                 * authorization:github:
                 * success:
                 * {"token":"..."}
                 */
                if (
                    typeof data !==
                    "string"
                ) {

                    return;

                }


                const prefix =
                    "authorization:github:";


                if (
                    !data.startsWith(
                        prefix
                    )
                ) {

                    return;

                }


                const payload =
                    data.slice(
                        prefix.length
                    );


                /*
                 * payload:
                 *
                 * success:{"token":"..."}
                 */

                const separator =
                    payload.indexOf(
                        ":"
                    );


                if (
                    separator === -1
                ) {

                    return;

                }


                const status =
                    payload.slice(
                        0,
                        separator
                    );


                const json =
                    payload.slice(
                        separator + 1
                    );


                if (
                    status !==
                    "success"
                ) {

                    finishError(
                        "GitHub OAuth завершился с ошибкой"
                    );

                    return;

                }


                try {

                    const result =
                        JSON.parse(
                            json
                        );


                    const token =
                        result?.token;


                    if (!token) {

                        finishError(
                            "OAuth Proxy не вернул GitHub token"
                        );

                        return;

                    }


                    finishSuccess(
                        token
                    );

                } catch (error) {

                    console.error(
                        error
                    );


                    finishError(
                        "Не удалось разобрать ответ OAuth Proxy"
                    );

                }

            }


            window.addEventListener(
                "message",
                handleMessage
            );


            /*
             * Если popup закрыли вручную.
             */
            closeTimer =
                setInterval(
                    () => {

                        if (
                            popup.closed
                        ) {

                            finishError(
                                "Авторизация отменена"
                            );

                        }

                    },
                    500
                );

        }
    );

}


/*
 * Выход.
 */
export function logout() {

    localStorage.removeItem(
        TOKEN_KEY
    );

    localStorage.removeItem(
        USER_KEY
    );

}


/*
 * GitHub token.
 */
export function getToken() {

    return localStorage.getItem(
        TOKEN_KEY
    );

}


/*
 * Проверка авторизации.
 */
export function isAuthenticated() {

    return Boolean(
        getToken()
    );

}


/*
 * Получение текущего GitHub пользователя.
 */
export async function getCurrentUser() {

    const token =
        getToken();


    if (!token) {

        return null;

    }


    const response =
        await fetch(
            `${GITHUB_API}/user`,
            {
                headers: {

                    Authorization:
                        `Bearer ${token}`,

                    Accept:
                        "application/vnd.github+json",

                    "X-GitHub-Api-Version":
                        "2022-11-28"

                }

            }
        );


    if (!response.ok) {

        logout();

        return null;

    }


    const user =
        await response.json();


    localStorage.setItem(
        USER_KEY,
        JSON.stringify(
            user
        )
    );


    return user;

}


export {
    PROXY_URL,
    GITHUB_API,
    REPO_OWNER,
    REPO_NAME,
    REPO_BRANCH
};