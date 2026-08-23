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


/* =========================================================
   CONSTANTS
   ========================================================= */

const EMPTY_FRONT_MATTER = {
    title: "",
    description: "",
    date: "",
    topic: "Other",
    tags: [],
    image: ""
};


const TOPICS = [
    "ML",
    "C++",
    "Algorithms",
    "TTS",
    "Other"
];


/* =========================================================
   ADMIN APP
   ========================================================= */

export default function AdminApp() {

    const [user, setUser] =
        useState(null);

    const [saving, setSaving] =
        useState(false);

    const [authLoading, setAuthLoading] =
        useState(true);

    const [articles, setArticles] =
        useState([]);

    const [currentArticle, setCurrentArticle] =
        useState(null);

    const [metadata, setMetadata] =
        useState({
            ...EMPTY_FRONT_MATTER,
            tags: []
        });

    const [status, setStatus] =
        useState("");

    const [loadingArticles, setLoadingArticles] =
        useState(false);

    const [openTopics, setOpenTopics] =
        useState({});

    const [openYears, setOpenYears] =
        useState({});


    /* =====================================================
       EDITOR
       ===================================================== */

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
                            event
                                .clipboardData
                                ?.files || []
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


                            setStatus(
                                "Изображение добавлено ✓"
                            );

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


    /* =========================================================
       IMAGE URL
       ========================================================= */

    function getImageUrl(path) {

        return (
            `https://raw.githubusercontent.com/` +
            `Olmy760/My-articles/` +
            `own_redactor/${path}`
        );

    }


    /* =========================================================
       INSERT IMAGE
       ========================================================= */

    async function insertImage() {

        const input =
            document.createElement("input");


        input.type =
            "file";


        input.accept =
            "image/png,image/jpeg,image/gif,image/webp,image/avif";


        input.onchange =
            async () => {

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
                        await uploadImage(
                            file
                        );


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
                        `Ошибка загрузки: ${error.message}`
                    );

                }

            };


        input.click();

    }


    /* =========================================================
       INSERT VIDEO
       ========================================================= */

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
                .setVideo(
                    url.trim()
                )
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


    /* =========================================================
       INSERT SLIDER
       ========================================================= */

    async function insertSlider() {

        const input =
            document.createElement("input");


        input.type =
            "file";


        input.accept =
            "image/png,image/jpeg,image/gif,image/webp,image/avif";


        input.multiple =
            true;


        input.onchange =
            async () => {

                const files =
                    Array.from(
                        input.files || []
                    );


                if (files.length < 2) {

                    setStatus(
                        "Выберите минимум 2 изображения"
                    );

                    return;

                }


                try {

                    const results = [];


                    setStatus(
                        `Загрузка 0/${files.length}...`
                    );


                    for (
                        let i = 0;
                        i < files.length;
                        i++
                    ) {

                        const result =
                            await uploadImage(
                                files[i]
                            );


                        results.push(
                            result
                        );


                        setStatus(
                            `Загрузка ${i + 1}/${files.length}...`
                        );

                    }


                    const images =
                        results.map(
                            result => ({
                                src:
                                    getImageUrl(
                                        result.path
                                    )
                            })
                        );


                    const inserted =
                        editor
                            ?.chain()
                            .focus()
                            .setImageSlider(
                                images
                            )
                            .run();


                    if (!inserted) {

                        throw new Error(
                            "Не удалось вставить слайдер"
                        );

                    }


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


    /* =========================================================
       AUTH
       ========================================================= */

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
            ...EMPTY_FRONT_MATTER,
            tags: []
        });

        editor?.commands.clearContent();

        setStatus("");

    }


    /* =========================================================
       LOAD ARTICLES
       ========================================================= */

    async function loadArticles() {

        try {

            setLoadingArticles(true);


            const files =
                await getArticles();


            const safeFiles =
                Array.isArray(files)
                    ? files
                    : [];


            const normalized =
                safeFiles.map(
                    article =>
                        normalizeArticle(
                            article
                        )
                );


            setArticles(
                normalized
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


    /* =========================================================
       OPEN ARTICLE
       ========================================================= */

    async function openArticle(
        article
    ) {

        if (!editor) {
            return;
        }


        try {

            setStatus(
                "Открытие..."
            );


            const file =
                await getArticleContent(
                    article.path
                );


            console.log(
                "GitHub file:",
                file
            );


            const parsed =
                parseFrontMatter(
                    file.content
                );


            const parsedTopic =
                parsed.frontMatter.topic;


            const topic =
                TOPICS.includes(
                    parsedTopic
                )
                    ? parsedTopic
                    : article.topic ||
                      "Other";


            const tags =
                Array.isArray(
                    parsed.frontMatter.tags
                )
                    ? parsed.frontMatter.tags
                    : [];


            setMetadata({

                ...EMPTY_FRONT_MATTER,

                ...parsed.frontMatter,

                topic,

                tags

            });


            editor.commands.setContent(
                parsed.content,
                {
                    emitUpdate: false
                }
            );


            setCurrentArticle({

                path:
                    article.path,

                name:
                    article.name,

                sha:
                    file.sha

            });


            setStatus(
                "Статья открыта"
            );

        } catch (error) {

            console.error(error);

            setStatus(
                `Ошибка: ${error.message}`
            );

        }

    }


    /* =========================================================
       NEW ARTICLE
       ========================================================= */

    function createNewArticle() {

        setCurrentArticle(null);


        setMetadata({

            ...EMPTY_FRONT_MATTER,

            date:
                today(),

            topic:
                "Other",

            tags: []

        });


        editor?.commands.clearContent();


        setStatus(
            "Новая статья"
        );

    }


    /* =========================================================
       SAVE ARTICLE
       ========================================================= */

    async function saveArticle() {

        if (!editor) {
            return;
        }


        if (saving) {
            return;
        }


        const title =
            String(
                metadata.title || ""
            ).trim();


        if (!title) {

            setStatus(
                "Введите название"
            );

            return;

        }


        try {

            setSaving(true);


            setStatus(
                "Сохранение..."
            );


            const safeMetadata = {

                ...EMPTY_FRONT_MATTER,

                ...metadata,

                title,

                topic:
                    metadata.topic ||
                    "Other",

                tags:
                    Array.isArray(
                        metadata.tags
                    )
                        ? metadata.tags
                        : []

            };


            const markdown =
                buildMarkdown(
                    editor,
                    safeMetadata
                );


            /* =================================================
               NEW ARTICLE
               ================================================= */

            if (!currentArticle) {

                const path =
                    createArticlePath(
                        safeMetadata.title,
                        safeMetadata.topic,
                        safeMetadata.date
                    );


                const result =
                    await createArticle(
                        path,
                        markdown,
                        `Create article: ${safeMetadata.title}`
                    );


                setCurrentArticle({

                    path,

                    name:
                        path
                            .split("/")
                            .pop(),

                    sha:
                        result?.content?.sha ||
                        null

                });


                await loadArticles();


                setStatus(
                    "Создано ✓"
                );


                return;

            }


            /* =================================================
               UPDATE ARTICLE
               ================================================= */

            const result =
                await updateArticle(
                    currentArticle.path,
                    markdown,
                    `Update article: ${safeMetadata.title}`
                );


            setCurrentArticle(
                previous => {

                    if (!previous) {
                        return previous;
                    }


                    return {

                        ...previous,

                        sha:
                            result?.content?.sha ||
                            previous.sha

                    };

                }
            );


            await loadArticles();


            setStatus(
                "Сохранено ✓"
            );

        } catch (error) {

            console.error(error);

            setStatus(
                `Ошибка: ${error.message}`
            );

        } finally {

            setSaving(false);

        }

    }


    /* =========================================================
       DELETE
       ========================================================= */

    async function handleDelete() {

        if (!currentArticle?.path) {

            setStatus(
                "Статья не выбрана"
            );

            return;

        }


        const title =
            metadata.title ||
            currentArticle.name ||
            "статья";


        if (
            !window.confirm(
                `Удалить "${title}"?`
            )
        ) {

            return;

        }


        try {

            setStatus(
                "Удаление..."
            );


            await deleteArticle(
                currentArticle.path,
                `Delete article: ${title}`
            );


            setCurrentArticle(
                null
            );


            setMetadata({

                ...EMPTY_FRONT_MATTER,

                tags: []

            });


            editor?.commands.clearContent();


            await loadArticles();


            setStatus(
                "Удалено ✓"
            );

        } catch (error) {

            console.error(error);

            setStatus(
                `Ошибка: ${error.message}`
            );

        }

    }


    /* =========================================================
       AUTH LOADING
       ========================================================= */

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


    /* =========================================================
       LOGIN
       ========================================================= */

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


    /* =========================================================
       GROUPS
       ========================================================= */

    const articleGroups =
        groupArticlesByTopic(
            Array.isArray(articles)
                ? articles
                : []
        );


    /* =========================================================
       ADMIN
       ========================================================= */

    return (

        <div className="admin-layout">

            {/* =================================================
               SIDEBAR
               ================================================= */}

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
                        articles.length > 0 && (

                            <div className="article-tree">

                                {articleGroups.map(
                                    group => {

                                        const safeYears =
                                            Array.isArray(
                                                group.years
                                            )
                                                ? group.years
                                                : [];


                                        const articleCount =
                                            safeYears.reduce(
                                                (
                                                    total,
                                                    yearGroup
                                                ) =>
                                                    total +
                                                    (
                                                        Array.isArray(
                                                            yearGroup.articles
                                                        )
                                                            ? yearGroup.articles.length
                                                            : 0
                                                    ),
                                                0
                                            );


                                        const topicOpen =
                                            openTopics[
                                                group.topic
                                            ] !== false;


                                        return (

                                            <div
                                                className="article-topic-group"
                                                key={
                                                    group.topic
                                                }
                                            >

                                                {/* TOPIC */}

                                                <button
                                                    className="article-topic-header"
                                                    onClick={() =>
                                                        setOpenTopics(
                                                            previous => ({
                                                                ...previous,

                                                                [group.topic]:
                                                                    !topicOpen

                                                            })
                                                        )
                                                    }
                                                >

                                                    <span className="article-tree-arrow">
                                                        {
                                                            topicOpen
                                                                ? "▼"
                                                                : "▶"
                                                        }
                                                    </span>


                                                    <span>
                                                        {
                                                            group.topic
                                                        }
                                                    </span>


                                                    <span className="article-count">
                                                        {
                                                            articleCount
                                                        }
                                                    </span>

                                                </button>


                                                {topicOpen && (

                                                    <div className="article-topic-content">

                                                        {safeYears.map(
                                                            yearGroup => {

                                                                const safeArticles =
                                                                    Array.isArray(
                                                                        yearGroup.articles
                                                                    )
                                                                        ? yearGroup.articles
                                                                        : [];


                                                                const yearKey =
                                                                    `${group.topic}:${yearGroup.year}`;


                                                                const yearOpen =
                                                                    openYears[
                                                                        yearKey
                                                                    ] !== false;


                                                                return (

                                                                    <div
                                                                        className="article-year-group"
                                                                        key={
                                                                            yearKey
                                                                        }
                                                                    >

                                                                        {/* YEAR */}

                                                                        <button
                                                                            className="article-year-header"
                                                                            onClick={() =>
                                                                                setOpenYears(
                                                                                    previous => ({
                                                                                        ...previous,

                                                                                        [yearKey]:
                                                                                            !yearOpen

                                                                                    })
                                                                                )
                                                                            }
                                                                        >

                                                                            <span className="article-tree-arrow">

                                                                                {
                                                                                    yearOpen
                                                                                        ? "▼"
                                                                                        : "▶"
                                                                                }

                                                                            </span>


                                                                            <span>
                                                                                {yearGroup.year}
                                                                            </span>

                                                                            <span className="article-count">
                                                                                {yearGroup.articles.length}
                                                                            </span>


                                                                        </button>


                                                                        {/* ARTICLES */}

                                                                        {yearOpen && (

                                                                            <div className="article-year-content">

                                                                                {safeArticles.map(
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

                                                                                            <span className="article-date">

                                                                                                {
                                                                                                    formatDate(
                                                                                                        article.date
                                                                                                    )
                                                                                                }

                                                                                            </span>


                                                                                            <span className="article-name">

                                                                                                {
                                                                                                    getArticleTitle(
                                                                                                        article
                                                                                                    )
                                                                                                }

                                                                                            </span>

                                                                                        </button>

                                                                                    )
                                                                                )}

                                                                            </div>

                                                                        )}

                                                                    </div>

                                                                );

                                                            }
                                                        )}

                                                    </div>

                                                )}

                                            </div>

                                        );

                                    }
                                )}

                            </div>

                        )}

                </div>


                {/* FOOTER */}

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


            {/* =================================================
               MAIN
               ================================================= */}

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
                            disabled={
                                saving
                            }
                        >

                            {
                                saving
                                    ? "Сохранение..."
                                    : "Сохранить"
                            }

                        </button>

                    </div>

                </header>


                {/* =================================================
                   METADATA
                   ================================================= */}

                <section className="metadata">

                    <input
                        className="article-title"

                        value={
                            metadata.title ||
                            ""
                        }

                        placeholder="Название статьи"

                        onChange={
                            event =>
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
                            metadata.description ||
                            ""
                        }

                        placeholder="Описание"

                        onChange={
                            event =>
                                setMetadata(
                                    previous => ({
                                        ...previous,

                                        description:
                                            event.target.value

                                    })
                                )
                        }
                    />


                    <select
                        className="article-topic"

                        value={
                            metadata.topic ||
                            "Other"
                        }

                        onChange={
                            event =>
                                setMetadata(
                                    previous => ({
                                        ...previous,

                                        topic:
                                            event.target.value

                                    })
                                )
                        }
                    >

                        {TOPICS.map(
                            topic => (

                                <option
                                    key={topic}
                                    value={topic}
                                >

                                    {topic}

                                </option>

                            )
                        )}

                    </select>


                    <div className="metadata-row">

                        <input
                            type="date"

                            value={
                                metadata.date ||
                                ""
                            }

                            onChange={
                                event =>
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
                                Array.isArray(
                                    metadata.tags
                                )
                                    ? metadata.tags.join(
                                        ", "
                                    )
                                    : ""
                            }

                            placeholder="Теги"

                            onChange={
                                event => {

                                    const tags =
                                        event
                                            .target
                                            .value
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

                                }
                            }
                        />

                    </div>

                </section>


                {/* =================================================
                   EDITOR
                   ================================================= */}

                <section className="admin-editor">

                    <EditorToolbar
                        editor={editor}
                        onImage={
                            insertImage
                        }
                        onSlider={
                            insertSlider
                        }
                        onVideo={
                            insertVideo
                        }
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
   NORMALIZE ARTICLE
   ========================================================= */

function normalizeArticle(
    article = {}
) {

    const path =
        article.path || "";


    const parts =
        path.split("/");


    let topic =
        article.topic ||
        null;


    let year =
        article.year ||
        null;


    let date =
        article.date ||
        null;


    /*
     * Новый формат:
     *
     * _posts/TOPIC/YEAR/DATE-SLUG.md
     */

    if (
        parts.length >= 4 &&
        parts[0] === "_posts"
    ) {

        topic =
            topic ||
            parts[1];


        year =
            year ||
            parts[2];


        const filename =
            parts[3] ||
            "";


        const dateMatch =
            filename.match(
                /^(\d{4}-\d{2}-\d{2})/
            );


        if (dateMatch) {

            date =
                date ||
                dateMatch[1];

        }

    }


    /*
     * Старый формат:
     *
     * _posts/DATE-SLUG.md
     */

    if (
        parts.length === 2 &&
        parts[0] === "_posts"
    ) {

        const filename =
            parts[1] ||
            "";


        const dateMatch =
            filename.match(
                /^(\d{4}-\d{2}-\d{2})/
            );


        if (dateMatch) {

            date =
                date ||
                dateMatch[1];

        }

    }


    const normalizedDate =
        date || null;


    return {

        ...article,

        topic:
            topic || "Other",

        year:
            year ||
            (
                normalizedDate
                    ? normalizedDate.slice(
                        0,
                        4
                    )
                    : "Без даты"
            ),

        date:
            normalizedDate,

        tags:
            Array.isArray(
                article.tags
            )
                ? article.tags
                : []

    };

}


/* =========================================================
   GROUP ARTICLES
   ========================================================= */

function groupArticlesByTopic(
    articles = []
) {

    const topicMap =
        new Map();


    for (
        const article of articles
    ) {

        if (!article) {
            continue;
        }


        const topic =
            article.topic ||
            "Other";


        if (
            !topicMap.has(topic)
        ) {

            topicMap.set(
                topic,
                new Map()
            );

        }


        const yearMap =
            topicMap.get(
                topic
            );


        const year =
            article.year ||
            (
                article.date
                    ? article.date.slice(
                        0,
                        4
                    )
                    : "Без даты"
            );


        if (
            !yearMap.has(year)
        ) {

            yearMap.set(
                year,
                []
            );

        }


        yearMap
            .get(year)
            .push(article);

    }


    return Array.from(
        topicMap.entries()
    )

        .sort(
            ([a], [b]) =>
                getTopicOrder(a) -
                getTopicOrder(b)
        )

        .map(
            ([topic, yearMap]) => ({

                topic,

                years:
                    Array.from(
                        yearMap.entries()
                    )

                        .sort(
                            ([a], [b]) => {

                                if (
                                    a === "Без даты"
                                ) {
                                    return 1;
                                }

                                if (
                                    b === "Без даты"
                                ) {
                                    return -1;
                                }

                                return b.localeCompare(
                                    a
                                );

                            }
                        )

                        .map(
                            ([year, yearArticles]) => ({

                                year,

                                articles:
                                    Array.isArray(
                                        yearArticles
                                    )
                                        ? yearArticles.sort(
                                            compareArticles
                                        )
                                        : []

                            })
                        )

            })
        );

}


/* =========================================================
   TOPIC ORDER
   ========================================================= */

function getTopicOrder(
    topic
) {

    const index =
        TOPICS.indexOf(
            topic
        );


    if (index !== -1) {
        return index;
    }


    return TOPICS.length;

}


/* =========================================================
   ARTICLE SORT
   ========================================================= */

function compareArticles(
    a = {},
    b = {}
) {

    const dateA =
        a.date ||
        "";


    const dateB =
        b.date ||
        "";


    const dateCompare =
        dateB.localeCompare(
            dateA
        );


    if (
        dateCompare !== 0
    ) {

        return dateCompare;

    }


    return getArticleTitle(a)
        .localeCompare(
            getArticleTitle(b),
            "ru"
        );

}


/* =========================================================
   ARTICLE TITLE
   ========================================================= */

function getArticleTitle(
    article = {}
) {

    if (
        article.title
    ) {

        return String(
            article.title
        );

    }


    const filename =
        article.name ||
        article.path
            ?.split("/")
            .pop() ||
        "Без названия";


    return String(
        filename
    )

        .replace(
            /\.md$/,
            ""
        )

        .replace(
            /^\d{4}-\d{2}-\d{2}-/,
            ""
        )

        .replace(
            /-/g,
            " "
        );

}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(
    date
) {

    if (!date) {
        return "";
    }


    const match =
        String(date).match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );


    if (!match) {
        return date;
    }


    return (
        `${match[3]}.${match[2]}.${match[1]}`
    );

}


/* =========================================================
   FRONT MATTER
   ========================================================= */

function parseFrontMatter(
    markdown
) {

    const text =
        String(
            markdown || ""
        );


    const match =
        text.match(
            /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/
        );


    if (!match) {

        return {

            frontMatter:
                {
                    ...EMPTY_FRONT_MATTER,
                    tags: []
                },

            content:
                text

        };

    }


    const parsed =
        parseYaml(
            match[1]
        );


    return {

        frontMatter: {

            ...EMPTY_FRONT_MATTER,

            ...parsed,

            tags:
                Array.isArray(
                    parsed.tags
                )
                    ? parsed.tags
                    : []

        },

        content:
            match[2]

    };

}


/* =========================================================
   YAML PARSER
   ========================================================= */

function parseYaml(
    yaml = ""
) {

    const result = {};


    const lines =
        String(
            yaml
        ).split(
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


        /*
         * Array:
         *
         * tags: ["ML", "XGBoost"]
         */

        if (
            value.startsWith("[") &&
            value.endsWith("]")
        ) {

            const inner =
                value.slice(
                    1,
                    -1
                );


            if (!inner.trim()) {

                value = [];

            } else {

                value =
                    inner
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

            }

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


/* =========================================================
   SERIALIZE FRONT MATTER
   ========================================================= */

function serializeFrontMatter(
    metadata = {}
) {

    const safeTags =
        Array.isArray(
            metadata.tags
        )
            ? metadata.tags
            : [];


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
        metadata.topic
    ) {

        lines.push(
            `topic: "${escapeYaml(
                metadata.topic
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
        safeTags.length > 0
    ) {

        lines.push(
            `tags: [${safeTags
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


/* =========================================================
   ESCAPE YAML
   ========================================================= */

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
   BUILD MARKDOWN
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

        String(
            body || ""
        ).trim() +

        "\n"

    );

}


/* =========================================================
   ARTICLE PATH
   ========================================================= */

function createArticlePath(
    title,
    topic,
    date
) {

    const slug =
        createSlug(
            title
        );


    const normalizedTopic =
        normalizeTopic(
            topic
        );


    const articleDate =
        date ||
        today();


    const year =
        articleDate.slice(
            0,
            4
        );


    return (
        `_posts/` +
        `${normalizedTopic}/` +
        `${year}/` +
        `${articleDate}-` +
        `${slug || "article"}.md`
    );

}


/* =========================================================
   SLUG
   ========================================================= */

function createSlug(
    title
) {

    return String(
        title || ""
    )

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
        )

        .replace(
            /^-+|-+$/g,
            ""
        );

}


/* =========================================================
   NORMALIZE TOPIC
   ========================================================= */

function normalizeTopic(
    topic
) {

    return (

        String(
            topic || "Other"
        )

            .trim()

            .replace(
                /[\\/:*?"<>|]/g,
                ""
            )

            ||

        "Other"

    );

}


/* =========================================================
   TODAY
   ========================================================= */

function today() {

    const date =
        new Date();


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        )
            .padStart(
                2,
                "0"
            );


    const day =
        String(
            date.getDate()
        )
            .padStart(
                2,
                "0"
            );


    return (
        `${year}-${month}-${day}`
    );

}