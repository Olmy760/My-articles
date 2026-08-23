import Image
    from "@tiptap/extension-image";

import Underline
    from "@tiptap/extension-underline";

import Link
    from "@tiptap/extension-link";

import { VideoNode }
    from "../editor/VideoNode";

import { SliderNode }
    from "../editor/SliderNode";

import EditorToolbar
    from "../editor/EditorToolbar";

import React, {
    useEffect,
    useState
} from "react";

import {
    login,
    logout,
    getCurrentUser
} from "../github/auth";

import {
    getArticles,
    getArticleContent,
    createArticle,
    updateArticle,
    deleteArticle,
    uploadImage
} from "../github/api";

import {
    EditorContent,
    useEditor
} from "@tiptap/react";

import StarterKit
    from "@tiptap/starter-kit";

import Placeholder
    from "@tiptap/extension-placeholder";

import {
    Markdown
} from "tiptap-markdown";

import "./admin.css";


const EMPTY_FRONT_MATTER = {
    title: "",
    description: "",
    date: "",
    tags: [],
    image: ""
};


export default function AdminApp() {

    const [user, setUser] =
        useState(null);

    const [authLoading, setAuthLoading] =
        useState(true);

    const [articles, setArticles] =
        useState([]);

    const [currentArticle, setCurrentArticle] =
        useState(null);

    const [metadata, setMetadata] =
        useState({
            ...EMPTY_FRONT_MATTER
        });

    const [status, setStatus] =
        useState("");

    const [loadingArticles, setLoadingArticles] =
        useState(false);


    const editor =
        useEditor({

            extensions: [

    StarterKit,

    Underline,

    Image.configure({
        allowBase64: false
    }),

    Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true
    }),

    VideoNode,

    SliderNode,

    Placeholder.configure({
        placeholder:
            "Начните писать..."
    }),

    Markdown.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: true
    })
],

            content: "",

            editorProps: {

    attributes: {
        class:
            "tiptap-editor"
    },

    handlePaste(
    view,
    event
) {

    const files =
        Array.from(
            event.clipboardData?.files || []
        );

    const image =
        files.find(
            file =>
                file.type.startsWith(
                    "image/"
                )
        );

    if (!image) {
        return false;
    }

    uploadImage(image)
        .then(result => {

            editor
                ?.chain()
                .focus()
                .setImage({
                    src:
                        getImageUrl(
                            result.path
                        )
                })
                .run();

        })
        .catch(error => {

            console.error(error);

            setStatus(
                `Ошибка загрузки: ${error.message}`
            );
        });

    return true;
}
}

        });


    /* =====================================================
       AUTH
       ===================================================== */

    useEffect(() => {

        checkAuthentication();

    }, []);


    async function checkAuthentication() {

        try {

            const currentUser =
                await getCurrentUser();


            if (!currentUser) {

                setAuthLoading(false);

                return;

            }


            if (
                currentUser.login !==
                "Olmy760"
            ) {

                logout();

                throw new Error(
                    "Доступ разрешён только Olmy760"
                );

            }


            setUser(
                currentUser
            );


            await loadArticles();

        } catch (error) {

            console.error(error);

            setStatus(
                error.message
            );

        } finally {

            setAuthLoading(false);

        }

    }


    async function handleLogin() {

        try {

            setStatus(
                "Авторизация..."
            );


            await login();


            const currentUser =
                await getCurrentUser();


            if (!currentUser) {

                throw new Error(
                    "GitHub пользователь не получен"
                );

            }


            if (
                currentUser.login !==
                "Olmy760"
            ) {

                logout();

                throw new Error(
                    "Этот аккаунт не имеет доступа"
                );

            }


            setUser(
                currentUser
            );


            await loadArticles();


            setStatus(
                "Готово"
            );

        } catch (error) {

            console.error(error);

            setStatus(
                error.message
            );

        }

    }


    function handleLogout() {

        logout();

        setUser(null);

        setArticles([]);

        setCurrentArticle(null);

        setMetadata({
            ...EMPTY_FRONT_MATTER
        });

        editor?.commands.clearContent();

        setStatus("");

    }


    /* =====================================================
       ARTICLES
       ===================================================== */

    async function loadArticles() {

        try {

            setLoadingArticles(true);


            const files =
                await getArticles();


            setArticles(
                files
            );


        } catch (error) {

            console.error(error);

            setStatus(
                `Ошибка загрузки: ${error.message}`
            );

        } finally {

            setLoadingArticles(false);

        }

    }


    async function openArticle(article) {
    if (!editor) {
        return;
    }

    try {
        setStatus("Открытие...");

        const file =
            await getArticleContent(article.path);

        console.log("GitHub file:", file);

        const parsed =
            parseFrontMatter(file.content);

        setMetadata({
            ...EMPTY_FRONT_MATTER,
            ...parsed.frontMatter,
            tags: Array.isArray(parsed.frontMatter.tags)
                ? parsed.frontMatter.tags
                : []
        });

        editor.commands.setContent(
            parsed.content
        );

        setCurrentArticle({
            path: article.path,
            name: article.name,
            sha: file.sha
        });

        console.log(
            "Current article:",
            {
                path: article.path,
                sha: file.sha
            }
        );

        setStatus("Статья открыта");

    } catch (error) {

        console.error(error);

        setStatus(
            `Ошибка: ${error.message}`
        );
    }
}


    function createNewArticle() {

        setCurrentArticle(null);


        setMetadata({

            ...EMPTY_FRONT_MATTER,

            date:
                today()

        });


        editor?.commands.clearContent();


        setStatus(
            "Новая статья"
        );

    }


    /* =====================================================
       SAVE
       ===================================================== */

    async function saveArticle() {

    if (!editor) {
        return;
    }

    if (!metadata.title.trim()) {
        setStatus("Введите название");
        return;
    }

    try {

        setStatus("Сохранение...");


        const markdown =
            buildMarkdown(
                editor,
                metadata
            );


        /*
         * Новая статья
         */
        if (!currentArticle) {

    const path =
        createArticlePath(
            metadata.title
        );

    const result =
        await createArticle(
            path,
            markdown,
            `Create article: ${metadata.title}`
        );

    setCurrentArticle({
        path,
        name: path.split("/").pop(),
        sha: result.content.sha
    });

    await loadArticles();

    setStatus("Создано ✓");

    return;
}


        /*
         * Существующая статья
         */

        if (!currentArticle.sha) {

            throw new Error(
                "У статьи отсутствует GitHub SHA. " +
                "Откройте статью заново."
            );

        }


        const result =
            await updateArticle(
    currentArticle.path,
    markdown,
    `Update article: ${metadata.title}`
);


        setCurrentArticle(
            previous => ({
                ...previous,
                sha: result.content.sha
            })
        );


        await loadArticles();


        setStatus("Сохранено ✓");

    } catch (error) {

        console.error(error);

        setStatus(
            `Ошибка: ${error.message}`
        );

    }
}


    /* =====================================================
       DELETE
       ===================================================== */

    async function handleDelete() {

    if (!currentArticle?.path) {
        setStatus("Статья не выбрана");
        return;
    }

    const title =
        metadata.title ||
        currentArticle.name;

    if (!window.confirm(`Удалить "${title}"?`)) {
        return;
    }

    try {

        setStatus("Удаление...");

        await deleteArticle(
            currentArticle.path,
            `Delete article: ${title}`
        );

        setCurrentArticle(null);

        setMetadata({
            ...EMPTY_FRONT_MATTER
        });

        editor?.commands.clearContent();

        await loadArticles();

        setStatus("Удалено ✓");

    } catch (error) {

        console.error(error);

        setStatus(
            `Ошибка: ${error.message}`
        );
    }
}


    /* =====================================================
       AUTH LOADING
       ===================================================== */

    if (authLoading) {

        return (

            <div className="admin-auth-screen">

                <div className="admin-auth-card">

                    <h1>
                        My Articles
                    </h1>

                    <p>
                        Проверяем авторизацию...
                    </p>

                </div>

            </div>

        );

    }


    /* =====================================================
       LOGIN
       ===================================================== */

    if (!user) {

        return (

            <div className="admin-auth-screen">

                <div className="admin-auth-card">

                    <h1>
                        My Articles
                    </h1>

                    <p>
                        Панель администратора
                    </p>


                    <button
                        className="github-login"
                        onClick={
                            handleLogin
                        }
                    >
                        Войти через GitHub
                    </button>


                    {status && (

                        <div className="auth-status">

                            {status}

                        </div>

                    )}

                </div>

            </div>

        );

    }


    /* =====================================================
       ADMIN
       ===================================================== */

    return (

        <div className="admin-layout">


            {/* SIDEBAR */}

            <aside className="admin-sidebar">


                <div className="admin-sidebar-header">

                    <div>

                        <h1>
                            My Articles
                        </h1>

                        <span>
                            Admin
                        </span>

                    </div>


                    <button
                        className="new-article-button"
                        onClick={
                            createNewArticle
                        }
                    >
                        +
                    </button>

                </div>


                <div className="admin-articles">


                    {loadingArticles && (

                        <div className="articles-empty">
                            Загрузка...
                        </div>

                    )}


                    {!loadingArticles &&
                        articles.length === 0 && (

                            <div className="articles-empty">
                                Нет статей
                            </div>

                        )}


                    {!loadingArticles &&
                        articles.map(
                            article => (

                                <button
                                    key={
                                        article.path
                                    }

                                    className={
                                        "admin-article " +
                                        (
                                            currentArticle?.path ===
                                            article.path
                                                ? "active"
                                                : ""
                                        )
                                    }

                                    onClick={() =>
                                        openArticle(
                                            article
                                        )
                                    }
                                >

                                    {
                                        article.name
                                            .replace(
                                                /\.md$/,
                                                ""
                                            )
                                    }

                                </button>

                            )
                        )}

                </div>


                <div className="admin-sidebar-footer">


                    <div className="admin-user">

                        <img
                            src={
                                user.avatar_url
                            }

                            alt=""
                        />

                        <div>

                            <strong>
                                {user.login}
                            </strong>

                            <span>
                                GitHub
                            </span>

                        </div>

                    </div>


                    <button
                        className="admin-logout"
                        onClick={
                            handleLogout
                        }
                    >
                        Выйти
                    </button>


                </div>

            </aside>


            {/* EDITOR */}

            <main className="admin-main">


                <header className="admin-header">


                    <div className="admin-header-title">

                        {
                            currentArticle
                                ? metadata.title ||
                                  "Без названия"
                                : "Новая статья"
                        }

                    </div>


                    <div className="admin-header-actions">


                        <span className="admin-status">

                            {status}

                        </span>


                        {currentArticle && (

                            <button
                                className="delete-button"
                                onClick={
                                    handleDelete
                                }
                            >
                                Удалить
                            </button>

                        )}


                        <button
                            className="save-button"
                            onClick={
                                saveArticle
                            }
                        >
                            Сохранить
                        </button>


                    </div>

                </header>


                {/* METADATA */}

                <section className="metadata">


                    <input
                        className="article-title"

                        value={
                            metadata.title
                        }

                        placeholder="Название статьи"

                        onChange={event =>
                            setMetadata(
                                previous => ({

                                    ...previous,

                                    title:
                                        event.target.value

                                })
                            )
                        }
                    />


                    <input
                        className="article-description"

                        value={
                            metadata.description
                        }

                        placeholder="Описание"

                        onChange={event =>
                            setMetadata(
                                previous => ({

                                    ...previous,

                                    description:
                                        event.target.value

                                })
                            )
                        }
                    />


                    <div className="metadata-row">


                        <input
                            type="date"

                            value={
                                metadata.date ||
                                ""
                            }

                            onChange={event =>
                                setMetadata(
                                    previous => ({

                                        ...previous,

                                        date:
                                            event.target.value

                                    })
                                )
                            }
                        />


                        <input
                            type="text"

                            value={
                                metadata.tags.join(
                                    ", "
                                )
                            }

                            placeholder="Теги"

                            onChange={event => {

                                const tags =
                                    event.target.value
                                        .split(",")
                                        .map(
                                            tag =>
                                                tag.trim()
                                        )
                                        .filter(
                                            Boolean
                                        );


                                setMetadata(
                                    previous => ({

                                        ...previous,

                                        tags

                                    })
                                );

                            }}
                        />


                    </div>


                </section>


                {/* TIPTAP */}

                <section className="admin-editor">

                    <EditorToolbar
                        editor={editor}
                        onImage={insertImage}
                        onSlider={insertSlider}
                        onVideo={insertVideo}
                    />


                    <EditorContent
                        editor={
                            editor
                        }
                    />

                </section>


            </main>

        </div>

    );

}


/* =========================================================
   FRONT MATTER
   ========================================================= */

function parseFrontMatter(
    markdown
) {

    const match =
        markdown.match(
            /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/
        );


    if (!match) {

        return {

            frontMatter: {
                ...EMPTY_FRONT_MATTER
            },

            content:
                markdown

        };

    }


    return {

        frontMatter:
            parseYaml(
                match[1]
            ),

        content:
            match[2]

    };

}


function parseYaml(
    yaml
) {

    const result = {};


    const lines =
        yaml.split(
            /\r?\n/
        );


    for (
        const line of lines
    ) {

        const match =
            line.match(
                /^([a-zA-Z0-9_-]+):\s*(.*)$/
            );


        if (!match) {
            continue;
        }


        const key =
            match[1];

        let value =
            match[2].trim();


        if (
            value.startsWith("[") &&
            value.endsWith("]")
        ) {

            value =
                value
                    .slice(1, -1)
                    .split(",")
                    .map(
                        item =>
                            item
                                .trim()
                                .replace(
                                    /^["']|["']$/g,
                                    ""
                                )
                    )
                    .filter(
                        Boolean
                    );

        } else {

            value =
                value.replace(
                    /^["']|["']$/g,
                    ""
                );

        }


        result[key] =
            value;

    }


    return result;

}


function serializeFrontMatter(
    metadata
) {

    const lines = [
        "---"
    ];


    lines.push(
        `title: "${escapeYaml(
            metadata.title
        )}"`
    );


    if (
        metadata.description
    ) {

        lines.push(
            `description: "${escapeYaml(
                metadata.description
            )}"`
        );

    }


    if (
        metadata.date
    ) {

        lines.push(
            `date: ${metadata.date}`
        );

    }


    if (
        metadata.tags?.length
    ) {

        lines.push(
            `tags: [${metadata.tags
                .map(
                    tag =>
                        `"${escapeYaml(
                            tag
                        )}"`
                )
                .join(", ")}]`
        );

    }


    if (
        metadata.image
    ) {

        lines.push(
            `image: "${escapeYaml(
                metadata.image
            )}"`
        );

    }


    lines.push(
        "---"
    );


    return lines.join(
        "\n"
    );

}


function escapeYaml(
    value
) {

    return String(
        value || ""
    )
        .replace(
            /\\/g,
            "\\\\"
        )
        .replace(
            /"/g,
            '\\"'
        );

}


/* =========================================================
   MARKDOWN
   ========================================================= */

function buildMarkdown(
    editor,
    metadata
) {

    const body =
        editor.storage
            .markdown
            .getMarkdown();


    return (
        serializeFrontMatter(
            metadata
        ) +
        "\n\n" +
        body.trim() +
        "\n"
    );

}


/* =========================================================
   PATH
   ========================================================= */

function createArticlePath(
    title
) {

    const slug =
        title

            .toLowerCase()

            .trim()

            .replace(
                /[^a-zа-яё0-9\s-]/gi,
                ""
            )

            .replace(
                /\s+/g,
                "-"
            )

            .replace(
                /-+/g,
                "-"
            );


    return (
        `_posts/` +
        `${today()}-` +
        `${slug || "article"}.md`
    );

}


/* =========================================================
   DATE
   ========================================================= */

function today() {

    const date =
        new Date();


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        `${year}-${month}-${day}`
    );

}


function getImageUrl(path) {

    return (
        `https://raw.githubusercontent.com/` +
        `${REPO_OWNER}/${REPO_NAME}/` +
        `${REPO_BRANCH}/${path}`
    );
}

async function insertImage() {

    const input =
        document.createElement("input");

    input.type = "file";

    input.accept =
        "image/png,image/jpeg,image/gif,image/webp,image/avif";

    input.onchange = async () => {

        const file =
            input.files?.[0];

        if (!file) {
            return;
        }

        try {

            setStatus(
                "Загрузка изображения..."
            );

            const result =
                await uploadImage(file);

            editor
                ?.chain()
                .focus()
                .setImage({
                    src:
                        getImageUrl(
                            result.path
                        )
                })
                .run();

            setStatus(
                "Изображение добавлено ✓"
            );

        } catch (error) {

            console.error(error);

            setStatus(
                `Ошибка: ${error.message}`
            );
        }
    };

    input.click();
}

function insertVideo() {

    const url =
        window.prompt(
            "Вставьте ссылку на YouTube, VK Видео или Rutube:"
        );


    if (!url) {
        return;
    }


    const inserted =
        editor
            ?.chain()
            .focus()
            .setVideo(url)
            .run();


    if (!inserted) {

        setStatus(
            "Не удалось определить видеосервис"
        );

        return;
    }


    setStatus(
        "Видео добавлено ✓"
    );
}

async function insertSlider() {

    const input =
        document.createElement(
            "input"
        );

    input.type = "file";

    input.accept =
        "image/png,image/jpeg,image/gif,image/webp,image/avif";

    input.multiple = true;


    input.onchange =
        async () => {

            const files =
                Array.from(
                    input.files || []
                );


            if (
                files.length < 2
            ) {

                setStatus(
                    "Выберите минимум 2 изображения"
                );

                return;
            }


            try {

                setStatus(
                    `Загрузка 0/${files.length}...`
                );


                const results =
                    await uploadImages(
                        files,
                        (current, total) => {

                            setStatus(
                                `Загрузка ${current}/${total}...`
                            );
                        }
                    );


                const images =
                    results.map(
                        result => ({
                            src:
                                getImageUrl(
                                    result.path
                                )
                        })
                    );


                editor
                    ?.chain()
                    .focus()
                    .setImageSlider(
                        images
                    )
                    .run();


                setStatus(
                    `Слайдер добавлен: ${images.length} изображений ✓`
                );

            } catch (error) {

                console.error(error);

                setStatus(
                    `Ошибка загрузки: ${error.message}`
                );
            }
        };


    input.click();
}