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
    useMemo,
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

const DEFAULT_TOPICS = [
    "ML",
    "C++",
    "Algorithms",
    "TTS",
    "Other"
];

const TOPICS_STORAGE_KEY =
    "my-articles-admin-topics";


const EMPTY_FRONT_MATTER = {
    title: "",
    description: "",
    date: "",
    topic: "Other",
    image: ""
};


/* =========================================================
   ADMIN APP
   ========================================================= */

export default function AdminApp() {

    /* =====================================================
       STATE
       ===================================================== */

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
            ...EMPTY_FRONT_MATTER
        });

    const [status, setStatus] =
        useState("");

    const [loadingArticles, setLoadingArticles] =
        useState(false);

    const [openTopics, setOpenTopics] =
        useState({});

    const [openYears, setOpenYears] =
        useState({});

    const [searchQuery, setSearchQuery] =
        useState("");

    const [topics, setTopics] =
        useState(DEFAULT_TOPICS);

    const [showTopicManager, setShowTopicManager] =
        useState(false);

    const [newTopicName, setNewTopicName] =
        useState("");

    const [renamingTopic, setRenamingTopic] =
        useState(null);

    const [renamingTopicName, setRenamingTopicName] =
        useState("");


    /* =====================================================
       TOPICS
       ===================================================== */

    useEffect(() => {

        loadTopics();

    }, []);


    function loadTopics() {

        try {

            const stored =
                localStorage.getItem(
                    TOPICS_STORAGE_KEY
                );


            if (!stored) {

                setTopics(
                    DEFAULT_TOPICS
                );

                return;

            }


            const parsed =
                JSON.parse(
                    stored
                );


            if (
                !Array.isArray(parsed)
            ) {

                setTopics(
                    DEFAULT_TOPICS
                );

                return;

            }


            const normalized =
                normalizeTopics(
                    parsed
                );


            setTopics(
                normalized
            );

        } catch (error) {

            console.error(
                "Не удалось загрузить темы:",
                error
            );

            setTopics(
                DEFAULT_TOPICS
            );

        }

    }


    function saveTopics(
        nextTopics
    ) {

        const normalized =
            normalizeTopics(
                nextTopics
            );


        setTopics(
            normalized
        );


        try {

            localStorage.setItem(
                TOPICS_STORAGE_KEY,
                JSON.stringify(
                    normalized
                )
            );

        } catch (error) {

            console.error(
                "Не удалось сохранить темы:",
                error
            );

        }

    }


    function normalizeTopics(
        values
    ) {

        const result = [];


        for (
            const value of values
        ) {

            const topic =
                String(
                    value || ""
                ).trim();


            if (!topic) {
                continue;
            }


            if (
                !result.includes(topic)
            ) {

                result.push(
                    topic
                );

            }

        }


        if (
            !result.includes("Other")
        ) {

            result.push("Other");

        }


        return result;

    }


    function addTopic() {

        const topic =
            newTopicName.trim();

        if (!topic) {
            return;
        }

        try {
            validateTopicName(topic);
        } catch (error) {
            setStatus(error.message);
            return;
        }

        saveTopics([
            ...topics,
            topic
        ]);

        setNewTopicName("");

        setStatus(
            `Тема "${topic}" добавлена ✓`
        );

    }


        async function deleteTopic(topicToDelete) {
        // 1. Базовые проверки
        if (topicToDelete === "Other") {
            setStatus('Тему "Other" удалить нельзя');
            return;
        }

        if (loadingArticles) {
            setStatus("Дождитесь полной загрузки статей перед изменением тем");
            return;
        }

        // 2. Находим все статьи, которые принадлежат этой теме
        const articlesToMove = articles.filter(
            article =>
                article.topic === topicToDelete ||
                getTopicFromPath(article.path) === topicToDelete
        );

        // 3. Предупреждаем пользователя о переносе
        if (
            !window.confirm(
                `Удалить тему "${topicToDelete}"?\n\n` +
                `Все ${articlesToMove.length} статей из этой темы будут автоматически перемещены в категорию "Other".`
            )
        ) {
            return;
        }

        try {
            setSaving(true);
            setStatus(`Перенос статей в "Other": 0/${articlesToMove.length}...`);

            // 4. Поочерёдно переносим каждую статью
            for (let i = 0; i < articlesToMove.length; i++) {
                const article = articlesToMove[i];
                
                // Читаем текущее содержимое файла
                const file = await getArticleContent(article.path);
                const parts = article.path.split("/");
                const filename = parts[parts.length - 1];

                if (!filename) {
                    throw new Error(`Не удалось определить имя файла: ${article.path}`);
                }

                // Определяем год для нового пути (используем дату из front matter или метаданных)
                const parsed = parseFrontMatter(file.content);
                const articleDate = parsed.frontMatter.date || article.date || today();
                const year = article.year || String(articleDate).slice(0, 4) || "Без даты";

                // Формируем новый путь: _posts/Other/<год>/<имя_файла>
                const newPath = `_posts/Other/${year}/${filename}`;

                // Обновляем front matter, меняя тему на "Other"
                // (функция updateFrontMatterTopic теперь находится на верхнем уровне файла)
                const newMarkdown = updateFrontMatterTopic(file.content, "Other");

                // Создаём файл на новом месте
                await createArticle(
                    newPath,
                    newMarkdown,
                    `Move article to Other after deleting topic ${topicToDelete}: ${getArticleTitle(article)}`
                );

                // Удаляем файл со старого места
                await deleteArticle(
                    article.path,
                    `Delete old path after moving to Other (topic ${topicToDelete} deleted): ${getArticleTitle(article)}`
                );

                setStatus(`Перенос статей: ${i + 1}/${articlesToMove.length}...`);
            }

            // 5. Безопасно удаляем тему из списка (читаем актуальное состояние из localStorage)
            const storedTopics = localStorage.getItem(TOPICS_STORAGE_KEY);
            const currentTopics = storedTopics ? JSON.parse(storedTopics) : DEFAULT_TOPICS;
            
            saveTopics(currentTopics.filter(t => t !== topicToDelete));

            // 6. Если открытая сейчас статья была перемещена, сбрасываем редактор, чтобы избежать рассинхронизации
            if (
                currentArticle && 
                (currentArticle.topic === topicToDelete || getTopicFromPath(currentArticle.path) === topicToDelete)
            ) {
                setCurrentArticle(null);
                setMetadata({ ...EMPTY_FRONT_MATTER });
                editor?.commands.clearContent();
            }

            // 7. Перезагружаем список статей и показываем успех
            await loadArticles();
            setStatus(`Тема "${topicToDelete}" удалена, статьи перемещены в "Other" ✓`);

        } catch (error) {
            console.error("Ошибка при удалении темы:", error);
            setStatus(`Ошибка при удалении темы: ${error.message}`);
        } finally {
            setSaving(false);
        }
    }


    /* =====================================================
       TOPIC NAME VALIDATION
       ===================================================== */

    function validateTopicName(
        value,
        currentTopic = null
    ) {
        const topic = String(value || "").trim();

        if (!topic) {
            throw new Error("Название темы не может быть пустым");
        }

        if (topic.length > 50) {
            throw new Error("Название темы слишком длинное");
        }

        if (/[\\/:*?"<>|]/.test(topic)) {
            throw new Error(
                "В названии темы нельзя использовать: \\ / : * ? \" < > |"
            );
        }

        if (topic.toLowerCase() === "other") {
            throw new Error('Тему "Other" нельзя переименовать или создать заново');
        }

        if (topics.some(
            existing =>
                existing !== currentTopic &&
                existing.toLowerCase() === topic.toLowerCase()
        )) {
            throw new Error("Такая тема уже существует");
        }

        return topic;
    }


    /* =====================================================
       RENAME TOPIC
       ===================================================== */

    function startRenameTopic(topic) {
        if (topic === "Other") {
            setStatus('Тему "Other" переименовать нельзя');
            return;
        }

        setRenamingTopic(topic);
        setRenamingTopicName(topic);
    }


    function cancelRenameTopic() {
        setRenamingTopic(null);
        setRenamingTopicName("");
    }


    async function renameTopic() {
        const oldTopic = renamingTopic;

        if (!oldTopic) {
            return;
        }

        let newTopic;

        try {
            newTopic = validateTopicName(
                renamingTopicName,
                oldTopic
            );
        } catch (error) {
            setStatus(error.message);
            return;
        }

        if (oldTopic === newTopic) {
            cancelRenameTopic();
            return;
        }

        const articlesToMove = articles.filter(
            article =>
                article.topic === oldTopic ||
                getTopicFromPath(article.path) === oldTopic
        );

        if (!window.confirm(
            `Переименовать тему "${oldTopic}" в "${newTopic}"?\n\n` +
            `Будет перенесено статей: ${articlesToMove.length}.\n` +
            "У каждого файла изменится путь и topic в front matter."
        )) {
            return;
        }

        try {
            setSaving(true);
            setStatus(
                `Подготовка переименования: 0/${articlesToMove.length}...`
            );

            const migrationItems = [];

            /* Находим и читаем все статьи старой темы. */
            for (const article of articlesToMove) {
                if (!article?.path) {
                    throw new Error("У одной из статей отсутствует путь");
                }

                const file = await getArticleContent(article.path);
                const parts = article.path.split("/");
                const filename = parts[parts.length - 1];

                if (!filename) {
                    throw new Error(
                        `Не удалось определить имя файла: ${article.path}`
                    );
                }

                const parsed = parseFrontMatter(file.content);
                const articleDate =
                    parsed.frontMatter.date ||
                    article.date ||
                    null;

                const year =
                    article.year ||
                    (articleDate
                        ? String(articleDate).slice(0, 4)
                        : parts[2] || "Без даты");

                migrationItems.push({
                    article,
                    parsed: {
                        ...parsed,
                        raw: file.content
                    },
                    newPath:
                        `_posts/${normalizeTopic(newTopic)}/${year}/${filename}`,
                    year
                });
            }

            /* Проверяем будущие пути до любых изменений. */
            const movingPaths = new Set(
                migrationItems.map(item => item.article.path)
            );

            const existingPaths = new Set(
                articles.map(article => article.path)
            );

            for (const item of migrationItems) {
                if (
                    existingPaths.has(item.newPath) &&
                    !movingPaths.has(item.newPath)
                ) {
                    throw new Error(
                        `Новый файл уже существует: ${item.newPath}`
                    );
                }
            }

            /* Создаём каждый файл в новом каталоге и меняем front matter. */
            for (let index = 0; index < migrationItems.length; index++) {
                const item = migrationItems[index];

                const newMarkdown =
                    updateFrontMatterTopic(
                        item.parsed.raw,
                        newTopic
                    );

                await createArticle(
                    item.newPath,
                    newMarkdown,
                    `Rename topic ${oldTopic} to ${newTopic}: ${
                        getArticleTitle(item.article)
                    }`
                );

                setStatus(
                    `Создание новых файлов: ${index + 1}/${migrationItems.length}...`
                );
            }

            /* Удаляем старые файлы только после создания всех новых. */
            for (let index = 0; index < migrationItems.length; index++) {
                const item = migrationItems[index];

                await deleteArticle(
                    item.article.path,
                    `Remove old topic path ${oldTopic} after rename to ${newTopic}: ${
                        getArticleTitle(item.article)
                    }`
                );

                setStatus(
                    `Удаление старых файлов: ${index + 1}/${migrationItems.length}...`
                );
            }

            /* Заменяем старую тему в topics только после миграции. */
            const storedTopics = localStorage.getItem(TOPICS_STORAGE_KEY);
            const currentTopics = storedTopics ? JSON.parse(storedTopics) : DEFAULT_TOPICS;

            saveTopics(
                currentTopics.map(
                    topic =>
                        topic === oldTopic
                            ? newTopic
                            : topic
                )
            );

            /* Сохраняем открываемую статью до перезагрузки списка. */
            const renamedCurrentArticle = currentArticle
                ? migrationItems.find(
                    item =>
                        item.article.path === currentArticle.path
                )
                : null;

            if (renamedCurrentArticle) {
                setCurrentArticle(previous => ({
                    ...previous,
                    path: renamedCurrentArticle.newPath,
                    topic: newTopic,
                    year: renamedCurrentArticle.year,
                    sha: null
                }));
            }

            setMetadata(previous => ({
                ...previous,
                topic:
                    previous.topic === oldTopic
                        ? newTopic
                        : previous.topic
            }));

            cancelRenameTopic();

            /* articles полностью перечитываются из GitHub. */
            await loadArticles();

            setStatus(
                `Тема "${oldTopic}" переименована в "${newTopic}" ✓`
            );
        } catch (error) {
            console.error("Ошибка переименования темы:", error);
            setStatus(
                `Ошибка переименования темы: ${error.message}`
            );
        } finally {
            setSaving(false);
        }
    }


    /*
     * Добавляем в список тем темы,
     * которые уже существуют в GitHub.
     *
     * Это особенно важно для старых статей,
     * если тема была создана до появления
     * менеджера тем.
     */
    function mergeArticleTopics(articleList) {
    try {
        const stored = localStorage.getItem(TOPICS_STORAGE_KEY);
        const currentTopics = stored ? JSON.parse(stored) : DEFAULT_TOPICS;

        const articleTopics = articleList
            .map(article => article.topic)
            .filter(Boolean);

        const merged = normalizeTopics([
            ...currentTopics,
            ...articleTopics
        ]);

        if (JSON.stringify(merged) !== JSON.stringify(currentTopics)) {
            saveTopics(merged);
        }
    } catch (error) {
        console.error("Ошибка при слиянии тем:", error);
    }
}


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

                            console.error(
                                error
                            );

                            setStatus(
                                `Ошибка загрузки: ${error.message}`
                            );

                        });


                    return true;

                }

            }

        });


    /* =====================================================
       IMAGE URL
       ===================================================== */

    function getImageUrl(
        path
    ) {

        return (
            `https://raw.githubusercontent.com/` +
            `Olmy760/My-articles/` +
            `own_redactor/${path}`
        );

    }


    /* =====================================================
       INSERT IMAGE
       ===================================================== */

    async function insertImage() {

        const input =
            document.createElement(
                "input"
            );


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

                    console.error(
                        error
                    );

                    setStatus(
                        `Ошибка загрузки: ${error.message}`
                    );

                }

            };


        input.click();

    }


    /* =====================================================
       INSERT VIDEO
       ===================================================== */

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


    /* =====================================================
       INSERT SLIDER
       ===================================================== */

    async function insertSlider() {

        const input =
            document.createElement(
                "input"
            );


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


                if (
                    files.length < 2
                ) {

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

                    console.error(
                        error
                    );

                    setStatus(
                        `Ошибка загрузки: ${error.message}`
                    );

                }

            };


        input.click();

    }


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

            console.error(
                error
            );

            setStatus(
                error.message
            );

        } finally {

            setAuthLoading(
                false
            );

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

            console.error(
                error
            );

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
       LOAD ARTICLES
       ===================================================== */

    async function loadArticles() {

        try {

            setLoadingArticles(
                true
            );


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


            /*
             * Если в GitHub есть тема,
             * которой ещё нет в localStorage,
             * добавляем её автоматически.
             */
            mergeArticleTopics(
                normalized
            );


            setCurrentArticle(
                previous => {

                    if (!previous) {

                        return previous;

                    }


                    const updated =
                        normalized.find(
                            article =>
                                article.path ===
                                previous.path
                        );


                    if (!updated) {

                        return null;

                    }


                    return {
                        ...previous,
                        ...updated
                    };

                }
            );

        } catch (error) {

            console.error(
                error
            );

            setStatus(
                `Ошибка загрузки: ${error.message}`
            );

        } finally {

            setLoadingArticles(
                false
            );

        }

    }


    /* =====================================================
       FILTER ARTICLES
       ===================================================== */

    const filteredArticles =
        useMemo(() => {

            const query =
                searchQuery
                    .trim()
                    .toLowerCase();


            if (!query) {

                return articles;

            }


            return articles.filter(
                article => {

                    const title =
                        getArticleTitle(
                            article
                        )
                            .toLowerCase();


                    const topic =
                        String(
                            article.topic || ""
                        )
                            .toLowerCase();


                    const path =
                        String(
                            article.path || ""
                        )
                            .toLowerCase();


                    return (
                        title.includes(query) ||
                        topic.includes(query) ||
                        path.includes(query)
                    );

                }
            );

        }, [
            articles,
            searchQuery
        ]);


    /* =====================================================
       GROUPS
       ===================================================== */

    const articleGroups =
        useMemo(
            () =>
                groupArticlesByTopic(
                    filteredArticles,
                    topics
                ),
            [
                filteredArticles,
                topics
            ]
        );


    /* =====================================================
       OPEN ARTICLE
       ===================================================== */

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


            const parsed =
                parseFrontMatter(
                    file.content
                );


            const parsedTopic =
                parsed.frontMatter.topic;


            const topic =
                topics.includes(
                    parsedTopic
                )
                    ? parsedTopic
                    : article.topic ||
                      "Other";


            setMetadata({

                ...EMPTY_FRONT_MATTER,

                ...parsed.frontMatter,

                topic

            });


            editor.commands.setContent(
                parsed.content,
                {
                    emitUpdate: false
                }
            );


            setCurrentArticle({

                ...article,

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

            console.error(
                error
            );

            setStatus(
                `Ошибка: ${error.message}`
            );

        }

    }


    /* =====================================================
       NEW ARTICLE
       ===================================================== */

    function createNewArticle() {

        setCurrentArticle(
            null
        );


        setMetadata({

            ...EMPTY_FRONT_MATTER,

            date:
                today(),

            topic:
                topics.includes("Other")
                    ? "Other"
                    : topics[0] || "Other"

        });


        editor?.commands.clearContent();


        setStatus(
            "Новая статья"
        );

    }


    /* =====================================================
       CHANGE ARTICLE TOPIC
       ===================================================== */

    async function moveArticleToTopic(
        article,
        newTopic
    ) {

        if (!article?.path) {

            throw new Error(
                "Путь статьи не найден"
            );

        }


        const oldTopic =
            article.topic ||
            getTopicFromPath(
                article.path
            ) ||
            "Other";


        if (
            oldTopic === newTopic
        ) {

            return article;

        }


        const file =
            await getArticleContent(
                article.path
            );


        const filename =
            article.path
                .split("/")
                .pop();


        if (!filename) {

            throw new Error(
                "Не удалось определить имя файла"
            );

        }


        const date =
            metadata.date ||
            article.date ||
            today();


        const year =
            date.slice(
                0,
                4
            );


        const newPath =
            `_posts/` +
            `${normalizeTopic(newTopic)}/` +
            `${year}/` +
            `${filename}`;


        if (
            newPath ===
            article.path
        ) {

            return article;

        }


        /*
         * Сначала создаём новую версию.
         * Только после успешного создания
         * удаляем старую.
         */
        await createArticle(
            newPath,
            file.content,
            `Move article to ${newTopic}: ${metadata.title || article.name}`
        );


        try {

            await deleteArticle(
                article.path,
                `Move article from ${oldTopic} to ${newTopic}: ${metadata.title || article.name}`
            );

        } catch (error) {

            /*
             * Новая версия уже существует,
             * поэтому сообщаем об этом отдельно.
             */
            throw new Error(
                `Статья скопирована в новую тему, но старый файл не удалось удалить: ${error.message}`
            );

        }


        return {

            ...article,

            path:
                newPath,

            topic:
                newTopic,

            year

        };

    }


    /* =====================================================
       SAVE ARTICLE
       ===================================================== */

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

            setSaving(
                true
            );


            setStatus(
                "Сохранение..."
            );


            const selectedTopic =
                metadata.topic ||
                "Other";


            const safeMetadata = {

                ...EMPTY_FRONT_MATTER,

                ...metadata,

                title,

                topic:
                    selectedTopic,

                date:
                    metadata.date ||
                    today()

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
                        null,

                    topic:
                        safeMetadata.topic,

                    date:
                        safeMetadata.date

                });


                await loadArticles();


                setStatus(
                    "Создано ✓"
                );


                return;

            }


            /* =================================================
               EXISTING ARTICLE
               ================================================= */

            const oldTopic =
                currentArticle.topic ||
                getTopicFromPath(
                    currentArticle.path
                ) ||
                "Other";


            /*
             * Если тема изменилась,
             * сначала обновляем markdown,
             * затем переносим файл.
             */
            if (
                oldTopic !==
                safeMetadata.topic
            ) {

                setStatus(
                    "Перенос статьи в новую тему..."
                );


                /*
                 * Получаем актуальный SHA/content.
                 */
                const file =
                    await getArticleContent(
                        currentArticle.path
                    );


                const filename =
                    currentArticle.path
                        .split("/")
                        .pop();


                const year =
                    safeMetadata.date.slice(
                        0,
                        4
                    );


                const newPath =
                    `_posts/` +
                    `${normalizeTopic(safeMetadata.topic)}/` +
                    `${year}/` +
                    `${filename}`;


                if (
                    newPath ===
                    currentArticle.path
                ) {

                    throw new Error(
                        "Новый путь статьи совпадает со старым"
                    );

                }


                /*
                 * Сначала создаём файл
                 * в новой теме.
                 */
                await createArticle(
                    newPath,
                    markdown,
                    `Move article to ${safeMetadata.topic}: ${safeMetadata.title}`
                );


                /*
                 * После успешного создания
                 * удаляем старый файл.
                 */
                await deleteArticle(
                    currentArticle.path,
                    `Move article from ${oldTopic} to ${safeMetadata.topic}: ${safeMetadata.title}`
                );


                setCurrentArticle(
                    previous => {

                        if (!previous) {

                            return previous;

                        }


                        return {

                            ...previous,

                            path:
                                newPath,

                            name:
                                filename,

                            topic:
                                safeMetadata.topic,

                            year,

                            date:
                                safeMetadata.date,

                            sha:
                                null

                        };

                    }
                );


                await loadArticles();


                setStatus(
                    "Сохранено и перенесено ✓"
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

                        topic:
                            safeMetadata.topic,

                        date:
                            safeMetadata.date,

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

            console.error(
                error
            );

            setStatus(
                `Ошибка: ${error.message}`
            );

        } finally {

            setSaving(
                false
            );

        }

    }


    /* =====================================================
       DELETE ARTICLE
       ===================================================== */

    async function handleDelete() {

        if (
            !currentArticle?.path
        ) {

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
                ...EMPTY_FRONT_MATTER
            });


            editor?.commands.clearContent();


            await loadArticles();


            setStatus(
                "Удалено ✓"
            );

        } catch (error) {

            console.error(
                error
            );

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


                    <div className="admin-sidebar-actions">

                        <button
                            className="refresh-articles-button"
                            onClick={
                                loadArticles
                            }
                            disabled={
                                loadingArticles
                            }
                            title="Обновить статьи"
                        >
                            ⟳
                        </button>


                        <button
                            className="new-article-button"
                            onClick={
                                createNewArticle
                            }
                            title="Новая статья"
                        >
                            +
                        </button>

                    </div>

                </div>


                {/* =================================================
                   SEARCH
                   ================================================= */}

                <div className="admin-search">

                    <input
                        type="search"

                        value={
                            searchQuery
                        }

                        onChange={
                            event =>
                                setSearchQuery(
                                    event.target.value
                                )
                        }

                        placeholder="Поиск статей..."
                    />

                </div>


                {/* =================================================
                   TOPIC MANAGER
                   ================================================= */}

                <div className="admin-topic-manager">

                    <button
                        className="admin-topic-manager-toggle"
                        onClick={() =>
                            setShowTopicManager(
                                previous =>
                                    !previous
                            )
                        }
                    >
                        <span>
                            Темы
                        </span>

                        <span>
                            {topics.length}
                        </span>
                    </button>


                    {showTopicManager && (

                        <div className="admin-topic-manager-panel">

                            <div className="admin-topic-add">

                                <input
                                    type="text"

                                    value={
                                        newTopicName
                                    }

                                    onChange={
                                        event =>
                                            setNewTopicName(
                                                event.target.value
                                            )
                                    }

                                    onKeyDown={
                                        event => {

                                            if (
                                                event.key ===
                                                "Enter"
                                            ) {

                                                event.preventDefault();

                                                addTopic();

                                            }

                                        }
                                    }

                                    placeholder="Новая тема"
                                />


                                <button
                                    type="button"
                                    onClick={
                                        addTopic
                                    }
                                    disabled={
                                        saving
                                    }
                                >
                                    +
                                </button>

                            </div>


                            <div className="admin-topic-list">
    {topics.map(topic => {
        const count = articles.filter(
            article => article.topic === topic
        ).length;

        return (
            <div
                className={"admin-topic-row " + (renamingTopic === topic ? "editing" : "")}
                key={topic}
            >
                {renamingTopic === topic ? (
                    <>
                        <input
                            className="topic-edit-input"
                            type="text"
                            value={renamingTopicName}
                            autoFocus
                            disabled={saving}
                            onChange={event => setRenamingTopicName(event.target.value)}
                            onKeyDown={event => {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    renameTopic();
                                }
                                if (event.key === "Escape") {
                                    event.preventDefault();
                                    cancelRenameTopic();
                                }
                            }}
                        />
                        <div className="admin-topic-row-actions">
                            <button
                                type="button"
                                className="admin-topic-save"
                                onClick={renameTopic}
                                disabled={saving}
                                title="Сохранить переименование"
                            >
                                ✓
                            </button>
                            <button
                                type="button"
                                className="admin-topic-cancel"
                                onClick={cancelRenameTopic}
                                disabled={saving}
                                title="Отменить"
                            >
                                ×
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <span>{topic}</span>
                        <div className="admin-topic-row-actions">
                            <span className="admin-topic-row-count">{count}</span>
                            {topic !== "Other" && (
                                <>
                                    <button
                                        type="button"
                                        className="admin-topic-edit"
                                        onClick={() => startRenameTopic(topic)}
                                        title="Переименовать тему"
                                    >
                                        ✎
                                    </button>
                                    <button
                                        type="button"
                                        className="admin-topic-delete"
                                        onClick={() => deleteTopic(topic)}
                                        title="Удалить тему"
                                    >
                                        ×
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    })}
</div>

                        </div>

                    )}

                </div>


                {/* =================================================
                   ARTICLES
                   ================================================= */}

                <div className="admin-articles">

                    {loadingArticles && (

                        <div className="articles-empty">
                            Загрузка...
                        </div>

                    )}


                    {!loadingArticles &&
                        articles.length === 0 && (

                            <div className="articles-empty">

                                <div>
                                    Нет статей
                                </div>


                                <button
                                    className="empty-new-button"
                                    onClick={
                                        createNewArticle
                                    }
                                >
                                    Создать первую статью
                                </button>

                            </div>

                        )}


                    {!loadingArticles &&
                        articles.length > 0 &&
                        filteredArticles.length === 0 && (

                            <div className="articles-empty">
                                Ничего не найдено
                            </div>

                        )}


                    {!loadingArticles &&
                        filteredArticles.length > 0 && (

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


                                                    <span className="article-topic-name">
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


                                                {/* YEARS */}

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


                                                                            <span className="article-year-name">
                                                                                {
                                                                                    yearGroup.year
                                                                                }
                                                                            </span>


                                                                            <span className="article-count">
                                                                                {
                                                                                    safeArticles.length
                                                                                }
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


                {/* =================================================
                   FOOTER
                   ================================================= */}

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


                    {/* =================================================
                       TOPIC
                       ================================================= */}

                    {/* =================================================
   TOPIC
   ================================================= */}

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

                        {topics.map(
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


                    {/* =================================================
                       DATE
                       ================================================= */}

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
            normalizedDate

    };

}


/* =========================================================
   GET TOPIC FROM PATH
   ========================================================= */

function getTopicFromPath(
    path
) {

    const parts =
        String(
            path || ""
        ).split("/");


    if (
        parts.length >= 4 &&
        parts[0] === "_posts"
    ) {

        return (
            parts[1] ||
            "Other"
        );

    }


    return "Other";

}


/* =========================================================
   GROUP ARTICLES
   ========================================================= */

function groupArticlesByTopic(
    articles = [],
    topics = []
) {

    const topicMap =
        new Map();




    /*
     * Сначала создаём пустые группы
     * для всех существующих тем.
     */
    for (
        const topic of topics
    ) {

        topicMap.set(
            topic,
            new Map()
        );

    }


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

        .filter(
            ([topic, yearMap]) =>
                yearMap.size > 0 ||
                topics.includes(topic)
        )

        .sort(
            ([a], [b]) =>
                getTopicOrder(
                    a,
                    topics
                ) -
                getTopicOrder(
                    b,
                    topics
                )
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
                                    a ===
                                    "Без даты"
                                ) {

                                    return 1;

                                }


                                if (
                                    b ===
                                    "Без даты"
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
    topic,
    topics = []
) {

    const index =
        topics.indexOf(
            topic
        );


    if (
        index !== -1
    ) {

        return index;

    }


    return topics.length;

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
                    ...EMPTY_FRONT_MATTER
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

            ...parsed

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


        if (
            value.startsWith("[") &&
            value.endsWith("]")
        ) {

            const inner =
                value.slice(
                    1,
                    -1
                );


            if (
                !inner.trim()
            ) {

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

/* =========================================================
   UPDATE TOPIC IN FRONT MATTER
   ========================================================= */
function updateFrontMatterTopic(markdown, topic) {
    const text = String(markdown || "");
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    const topicLine = `topic: "${escapeYaml(topic)}"`;

    if (!match) {
        return "---\n" + topicLine + "\n---\n\n" + text.trim() + "\n";
    }

    let frontMatter = match[1];

    if (/^topic\s*:/m.test(frontMatter)) {
        frontMatter = frontMatter.replace(/^topic\s*:.*$/m, topicLine);
    } else {
        frontMatter = frontMatter.trimEnd() + "\n" + topicLine;
    }

    return "---\n" + frontMatter + "\n---\n" + match[2].trim() + "\n";
}