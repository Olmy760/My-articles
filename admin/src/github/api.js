import {
    getToken,
    GITHUB_API,
    REPO_OWNER,
    REPO_NAME,
    REPO_BRANCH
} from "./auth";


/* =========================================================
   HEADERS
   ========================================================= */

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


/* =========================================================
   PATH
   ========================================================= */

function encodePath(path) {

    return path
        .split("/")
        .map(
            encodeURIComponent
        )
        .join("/");

}


/* =========================================================
   GET GITHUB DIRECTORY
   ========================================================= */

async function getDirectory(
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
                    headers(),

                cache:
                    "no-store"
            }
        );


    if (!response.ok) {

        throw new Error(
            `GitHub ${response.status}: ` +
            await response.text()
        );

    }


    const data =
        await response.json();


    if (!Array.isArray(data)) {

        throw new Error(
            `GitHub: путь "${path}" не является директорией`
        );

    }


    return data;

}


/* =========================================================
   GET ARTICLES
   =========================================================

   Структура:

   _posts/
       ML/
           2026/
               article.md

       C++/
           2026/
               article.md

       TTS/
           2026/
               article.md
*/


export async function getArticles() {

    const articles = [];


    /*
     * Рекурсивно обходим _posts.
     */

    async function scanDirectory(
        path
    ) {

        const files =
            await getDirectory(
                path
            );


        for (
            const file of files
        ) {

            /*
             * Markdown-файл.
             */

            if (
                file.type === "file" &&
                file.name
                    .toLowerCase()
                    .endsWith(".md")
            ) {

                articles.push({

                    path:
                        file.path,

                    name:
                        file.name,

                    sha:
                        file.sha

                });

                continue;

            }


            /*
             * Директория.
             */

            if (
                file.type === "dir"
            ) {

                await scanDirectory(
                    file.path
                );

            }

        }

    }


    await scanDirectory(
        "_posts"
    );


    /*
     * Сортировка:
     *
     * сначала новые даты,
     * затем название.
     */

    articles.sort(
        (a, b) => {

            const dateA =
                extractDateFromPath(
                    a.path
                );

            const dateB =
                extractDateFromPath(
                    b.path
                );


            const dateCompare =
                dateB.localeCompare(
                    dateA
                );


            if (
                dateCompare !== 0
            ) {

                return dateCompare;

            }


            return a.name.localeCompare(
                b.name,
                "ru"
            );

        }
    );


    console.log(
        "GitHub articles:",
        articles
    );


    return articles;

}


/* =========================================================
   EXTRACT DATE FROM PATH
   ========================================================= */

function extractDateFromPath(
    path
) {

    const filename =
        path
            .split("/")
            .pop() || "";


    const match =
        filename.match(
            /^(\d{4}-\d{2}-\d{2})/
        );


    return (
        match?.[1] ||
        ""
    );

}


/* =========================================================
   GET ARTICLE
   ========================================================= */

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
                    headers(),

                cache:
                    "no-store"
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


/* =========================================================
   GET ARTICLE CONTENT
   ========================================================= */

export async function getArticleContent(
    path
) {

    const file =
        await getArticle(
            path
        );


    if (
        !file ||
        !file.content
    ) {

        throw new Error(
            "GitHub: содержимое статьи не найдено"
        );

    }


    return {

        ...file,

        content:
            decodeBase64(
                file.content
            )

    };

}


/* =========================================================
   CREATE ARTICLE
   ========================================================= */

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


/* =========================================================
   UPDATE ARTICLE
   ========================================================= */

export async function updateArticle(
    path,
    content,
    message
) {

    /*
     * Получаем САМЫЙ АКТУАЛЬНЫЙ SHA
     * непосредственно перед обновлением.
     */

    const file =
        await getArticle(
            path
        );


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


/* =========================================================
   PUT FILE
   ========================================================= */

async function putFile(
    path,
    content,
    message,
    sha
) {

    const body = {

        message,

        content:
            encodeBase64(
                content
            ),

        branch:
            REPO_BRANCH

    };


    /*
     * SHA нужен только
     * для существующего файла.
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
                sha ||
                "(new file)"

        }
    );


    const response =
        await fetch(
            `${GITHUB_API}/repos/` +
            `${REPO_OWNER}/${REPO_NAME}/contents/` +
            `${encodePath(path)}`,
            {

                method:
                    "PUT",

                headers:
                    headers(),

                body:
                    JSON.stringify(
                        body
                    )

            }
        );


    if (!response.ok) {

        const errorText =
            await response.text();


        throw new Error(
            `GitHub ${response.status}: ` +
            errorText
        );

    }


    return response.json();

}


/* =========================================================
   DELETE ARTICLE
   ========================================================= */

export async function deleteArticle(
    path,
    message
) {

    /*
     * Получаем свежий SHA.
     */

    const file =
        await getArticle(
            path
        );


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

                method:
                    "DELETE",

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


/* =========================================================
   UPLOAD IMAGE
   ========================================================= */

export async function uploadImage(
    file
) {

    if (!file) {

        throw new Error(
            "Файл изображения не выбран"
        );

    }


    if (
        !file.type.startsWith(
            "image/"
        )
    ) {

        throw new Error(
            "Можно загружать только изображения"
        );

    }


    const extension =
        getImageExtension(
            file
        );


    const filename =
        `${Date.now()}-${randomString(8)}.${extension}`;


    const path =
        `static/images/${filename}`;


    const buffer =
        await file.arrayBuffer();


    const bytes =
        new Uint8Array(
            buffer
        );


    let binary =
        "";


    const chunkSize =
        0x8000;


    for (
        let i = 0;
        i < bytes.length;
        i += chunkSize
    ) {

        binary +=
            String.fromCharCode(
                ...bytes.subarray(
                    i,
                    Math.min(
                        i + chunkSize,
                        bytes.length
                    )
                )
            );

    }


    const content =
        btoa(
            binary
        );


    const response =
        await fetch(
            `${GITHUB_API}/repos/` +
            `${REPO_OWNER}/${REPO_NAME}/contents/` +
            `${encodePath(path)}`,
            {

                method:
                    "PUT",

                headers:
                    headers(),

                body:
                    JSON.stringify({

                        message:
                            `Upload image: ${filename}`,

                        content,

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


    return {

        path,

        url:
            `/${path}`,

        filename

    };

}


/* =========================================================
   IMAGE EXTENSION
   ========================================================= */

function getImageExtension(
    file
) {

    const extension =
        file.name
            .split(".")
            .pop()
            ?.toLowerCase();


    const allowed = [

        "png",
        "jpg",
        "jpeg",
        "gif",
        "webp",
        "avif"

    ];


    if (
        allowed.includes(
            extension
        )
    ) {

        return extension;

    }


    const mimeMap = {

        "image/png":
            "png",

        "image/jpeg":
            "jpg",

        "image/gif":
            "gif",

        "image/webp":
            "webp",

        "image/avif":
            "avif"

    };


    const mapped =
        mimeMap[
            file.type
        ];


    if (!mapped) {

        throw new Error(
            "Неподдерживаемый формат изображения"
        );

    }


    return mapped;

}


/* =========================================================
   RANDOM STRING
   ========================================================= */

function randomString(
    length
) {

    const chars =
        "abcdefghijklmnopqrstuvwxyz0123456789";


    let result =
        "";


    for (
        let i = 0;
        i < length;
        i++
    ) {

        result +=
            chars[
                Math.floor(
                    Math.random() *
                    chars.length
                )
            ];

    }


    return result;

}


/* =========================================================
   BASE64 → UTF-8
   ========================================================= */

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
        .decode(
            bytes
        );

}


/* =========================================================
   UTF-8 → BASE64
   ========================================================= */

function encodeBase64(
    value
) {

    const bytes =
        new TextEncoder()
            .encode(
                value
            );


    let binary =
        "";


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