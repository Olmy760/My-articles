import {
    getToken,
    GITHUB_API,
    REPO_OWNER,
    REPO_NAME,
    REPO_BRANCH
} from "./auth";


function headers() {

    const token = getToken();

    if (!token) {
        throw new Error(
            "GitHub: пользователь не авторизован"
        );
    }

    return {
        Authorization:
            `Bearer ${token}`,

        Accept:
            "application/vnd.github+json",

        "X-GitHub-Api-Version":
            "2022-11-28",

        "Content-Type":
            "application/json"
    };
}


function encodePath(path) {

    return path
        .split("/")
        .map(
            encodeURIComponent
        )
        .join("/");
}


/*
 * Получить список статей.
 */
export async function getArticles() {

    const response =
    await fetch(
        `${GITHUB_API}/repos/` +
        `${REPO_OWNER}/${REPO_NAME}/contents/_posts` +
        `?ref=${REPO_BRANCH}`,
        {
            headers: headers(),
            cache: "no-store"
        }
    );


    if (!response.ok) {

        throw new Error(
            `GitHub ${response.status}: ` +
            await response.text()
        );

    }


    const files =
        await response.json();


    return files
        .filter(
            file =>
                file.type === "file" &&
                file.name.endsWith(".md")
        )
        .sort(
            (a, b) =>
                b.name.localeCompare(
                    a.name
                )
        );
}


/*
 * Получить конкретный файл.
 *
 * ВАЖНО:
 * Здесь GitHub возвращает актуальный SHA.
 */
export async function getArticle(
    path
) {

    const response =
        await fetch(
            `${GITHUB_API}/repos/` +
            `${REPO_OWNER}/${REPO_NAME}/contents/` +
            `${encodePath(path)}` +
            `?ref=${REPO_BRANCH}`,
            {
                headers:
                    headers()
            }
        );


    if (!response.ok) {

        throw new Error(
            `GitHub ${response.status}: ` +
            await response.text()
        );

    }


    return response.json();
}


/*
 * Получить содержимое статьи.
 */
export async function getArticleContent(
    path
) {

    const file =
        await getArticle(path);


    return {
        ...file,

        content:
            decodeBase64(
                file.content
            )
    };
}


/*
 * Создать статью.
 *
 * SHA здесь НЕ нужен.
 */
export async function createArticle(
    path,
    content,
    message
) {

    return putFile(
        path,
        content,
        message
    );
}


/*
 * Обновить статью.
 *
 * Перед PUT самостоятельно получаем
 * актуальный SHA из GitHub.
 */
export async function updateArticle(
    path,
    content,
    message
) {

    const file =
        await getArticle(path);


    if (!file.sha) {

        throw new Error(
            "GitHub: у существующего файла отсутствует SHA"
        );

    }


    return putFile(
        path,
        content,
        message,
        file.sha
    );
}


/*
 * Универсальная запись файла.
 */
async function putFile(
    path,
    content,
    message,
    sha
) {

    const body = {

        message,

        content:
            encodeBase64(content),

        branch:
            REPO_BRANCH

    };


    /*
     * SHA передаём только при обновлении.
     */
    if (sha) {

        body.sha =
            sha;

    }


    console.log(
        "GitHub PUT:",
        {
            path,
            sha:
                body.sha || "(new file)"
        }
    );


    const response =
        await fetch(
            `${GITHUB_API}/repos/` +
            `${REPO_OWNER}/${REPO_NAME}/contents/` +
            `${encodePath(path)}`,
            {
                method: "PUT",

                headers:
                    headers(),

                body:
                    JSON.stringify(
                        body
                    )
            }
        );


    if (!response.ok) {

        throw new Error(
            `GitHub ${response.status}: ` +
            await response.text()
        );

    }


    return response.json();
}


/*
 * Удалить статью.
 *
 * SHA получаем непосредственно
 * перед DELETE.
 */
export async function deleteArticle(
    path,
    message
) {

    const file =
        await getArticle(path);


    if (!file.sha) {

        throw new Error(
            "GitHub: не удалось получить SHA перед удалением"
        );

    }


    console.log(
        "GitHub DELETE:",
        {
            path,
            sha:
                file.sha
        }
    );


    const response =
        await fetch(
            `${GITHUB_API}/repos/` +
            `${REPO_OWNER}/${REPO_NAME}/contents/` +
            `${encodePath(path)}`,
            {
                method: "DELETE",

                headers:
                    headers(),

                body:
                    JSON.stringify({

                        message,

                        sha:
                            file.sha,

                        branch:
                            REPO_BRANCH

                    })
            }
        );


    if (!response.ok) {

        throw new Error(
            `GitHub ${response.status}: ` +
            await response.text()
        );

    }


    return response.json();
}


/*
 * Base64 → UTF-8.
 */
function decodeBase64(
    value
) {

    const binary =
        atob(
            value.replace(
                /\n/g,
                ""
            )
        );


    const bytes =
        Uint8Array.from(
            binary,
            character =>
                character.charCodeAt(0)
        );


    return new TextDecoder()
        .decode(bytes);
}


/*
 * UTF-8 → Base64.
 */
function encodeBase64(
    value
) {

    const bytes =
        new TextEncoder()
            .encode(value);


    let binary = "";


    for (
        const byte of bytes
    ) {

        binary +=
            String.fromCharCode(
                byte
            );

    }


    return btoa(
        binary
    );
}