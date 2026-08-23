import { Node } from "@tiptap/core";


/* =========================================================
   PROVIDER
   ========================================================= */

function getVideoProvider(url) {

    try {

        const parsed =
            new URL(url);

        const hostname =
            parsed.hostname.toLowerCase();


        /* =====================================================
           YOUTUBE
           ===================================================== */

        if (
            hostname === "youtube.com" ||
            hostname === "www.youtube.com" ||
            hostname === "m.youtube.com" ||
            hostname === "youtu.be"
        ) {
            return "youtube";
        }


        /* =====================================================
           RUTUBE
           ===================================================== */

        if (
            hostname === "rutube.ru" ||
            hostname === "www.rutube.ru"
        ) {
            return "rutube";
        }


        /* =====================================================
           VK VIDEO
           ===================================================== */

        if (
            hostname === "vk.com" ||
            hostname === "www.vk.com" ||
            hostname === "m.vk.com" ||
            hostname === "vkvideo.ru" ||
            hostname === "www.vkvideo.ru"
        ) {
            return "vk";
        }


        return null;

    } catch {

        return null;

    }
}


/* =========================================================
   YOUTUBE
   ========================================================= */

function getYouTubeId(url) {

    try {

        const parsed =
            new URL(url);

        const hostname =
            parsed.hostname.toLowerCase();


        /*
         * youtu.be/VIDEO_ID
         */

        if (
            hostname === "youtu.be"
        ) {

            const id =
                parsed.pathname
                    .slice(1)
                    .split("/")[0];

            return id || null;

        }


        /*
         * youtube.com/...
         */

        if (
            hostname.includes(
                "youtube.com"
            )
        ) {

            /*
             * /watch?v=VIDEO_ID
             */

            const watchId =
                parsed.searchParams.get(
                    "v"
                );

            if (watchId) {
                return watchId;
            }


            /*
             * /shorts/VIDEO_ID
             */

            const shorts =
                parsed.pathname.match(
                    /^\/shorts\/([^/]+)/
                );

            if (shorts) {
                return shorts[1];
            }


            /*
             * /embed/VIDEO_ID
             */

            const embed =
                parsed.pathname.match(
                    /^\/embed\/([^/]+)/
                );

            if (embed) {
                return embed[1];
            }

        }


        return null;

    } catch {

        return null;

    }
}


/* =========================================================
   RUTUBE
   ========================================================= */

function getRutubeId(url) {

    try {

        const parsed =
            new URL(url);


        /*
         * Обычная ссылка:
         *
         * https://rutube.ru/video/XXXXXXXX/
         */

        const videoMatch =
            parsed.pathname.match(
                /^\/video\/([a-zA-Z0-9_-]+)/
            );

        if (videoMatch) {
            return videoMatch[1];
        }


        /*
         * Embed:
         *
         * https://rutube.ru/play/embed/XXXXXXXX
         */

        const embedMatch =
            parsed.pathname.match(
                /^\/play\/embed\/([a-zA-Z0-9_-]+)/
            );

        if (embedMatch) {
            return embedMatch[1];
        }


        return null;

    } catch {

        return null;

    }
}


/* =========================================================
   VK VIDEO ID
   ========================================================= */

function getVkVideoData(url) {

    try {

        const parsed =
            new URL(url);


        /*
         * =====================================================
         * VK video_ext.php
         *
         * https://vk.com/video_ext.php?oid=-123&id=456
         * =====================================================
         */

        if (
            parsed.pathname.includes(
                "video_ext.php"
            )
        ) {

            const oid =
                parsed.searchParams.get(
                    "oid"
                );

            const id =
                parsed.searchParams.get(
                    "id"
                ) ||
                parsed.searchParams.get(
                    "vid"
                );

            if (
                oid &&
                id
            ) {

                return {
                    oid,
                    id
                };

            }

        }


        /*
         * =====================================================
         * VK:
         *
         * /video-123_456
         * /video123_456
         *
         * =====================================================
         */

        const path =
            parsed.pathname;


        const match =
            path.match(
                /\/video(-?\d+)_([0-9]+)/
            );


        if (match) {

            return {

                oid:
                    match[1],

                id:
                    match[2]

            };

        }


        /*
         * =====================================================
         * Некоторые VK URL:
         *
         * /video/-123_456
         *
         * =====================================================
         */

        const alternative =
            path.match(
                /\/video\/(-?\d+)_([0-9]+)/
            );


        if (alternative) {

            return {

                oid:
                    alternative[1],

                id:
                    alternative[2]

            };

        }


        /*
         * =====================================================
         * VK Video может использовать:
         *
         * vkvideo.ru/video-123_456
         * =====================================================
         */

        const vkVideoMatch =
            path.match(
                /\/video(-?\d+)_([0-9]+)/
            );


        if (vkVideoMatch) {

            return {

                oid:
                    vkVideoMatch[1],

                id:
                    vkVideoMatch[2]

            };

        }


        return null;

    } catch {

        return null;

    }
}


/* =========================================================
   VK EMBED
   ========================================================= */

function getVkEmbedUrl(url) {

    /*
     * Если пользователь уже вставил
     * video_ext.php — используем его.
     */

    if (
        url.includes(
            "video_ext.php"
        )
    ) {

        return url;

    }


    const video =
        getVkVideoData(url);


    if (!video) {

        return null;

    }


    return (
        `https://vk.com/video_ext.php` +
        `?oid=${encodeURIComponent(
            video.oid
        )}` +
        `&id=${encodeURIComponent(
            video.id
        )}`
    );
}


/* =========================================================
   EMBED URL
   ========================================================= */

function getEmbedUrl(url) {

    const provider =
        getVideoProvider(url);


    /* =====================================================
       YOUTUBE
       ===================================================== */

    if (
        provider === "youtube"
    ) {

        const id =
            getYouTubeId(url);


        if (!id) {
            return null;
        }


        return (
            `https://www.youtube.com/embed/${id}`
        );

    }


    /* =====================================================
       RUTUBE
       ===================================================== */

    if (
        provider === "rutube"
    ) {

        const id =
            getRutubeId(url);


        if (!id) {
            return null;
        }


        return (
            `https://rutube.ru/play/embed/${id}`
        );

    }


    /* =====================================================
       VK
       ===================================================== */

    if (
        provider === "vk"
    ) {

        return getVkEmbedUrl(url);

    }


    return null;
}


/* =========================================================
   NODE
   ========================================================= */

export const VideoNode =
    Node.create({

        name: "video",

        group: "block",

        atom: true,

        selectable: true,

        draggable: true,


        /* =================================================
           ATTRIBUTES
           ================================================= */

        addAttributes() {

            return {

                /*
                 * Здесь ВСЕГДА хранится
                 * оригинальная ссылка пользователя.
                 */

                src: {
                    default: null
                },


                provider: {
                    default: null
                }

            };

        },


        /* =================================================
           PARSE HTML
           ================================================= */

        parseHTML() {

            return [

                {

                    tag:
                        "div[data-type='video']",


                    getAttrs:
                        element => {

                            const iframe =
                                element.querySelector(
                                    "iframe"
                                );


                            if (!iframe) {

                                return false;

                            }


                            /*
                             * В новых статьях
                             * сохраняем оригинальный
                             * URL здесь.
                             */

                            const originalUrl =
                                iframe.getAttribute(
                                    "data-src"
                                );


                            if (
                                originalUrl
                            ) {

                                const provider =
                                    getVideoProvider(
                                        originalUrl
                                    );


                                if (!provider) {
                                    return false;
                                }


                                return {

                                    src:
                                        originalUrl,

                                    provider

                                };

                            }


                            /*
                             * Совместимость
                             * со старыми статьями.
                             */

                            const iframeSrc =
                                iframe.getAttribute(
                                    "src"
                                );


                            if (!iframeSrc) {

                                return false;

                            }


                            const restored =
                                restoreOriginalUrl(
                                    iframeSrc
                                );


                            if (!restored) {

                                return false;

                            }


                            const provider =
                                getVideoProvider(
                                    restored
                                );


                            if (!provider) {

                                return false;

                            }


                            return {

                                src:
                                    restored,

                                provider

                            };

                        }

                }

            ];

        },


        /* =================================================
           RENDER HTML
           ================================================= */

        renderHTML({
            HTMLAttributes
        }) {

            const src =
                HTMLAttributes.src;


            const embedUrl =
                getEmbedUrl(src);


            /*
             * Если URL неправильный,
             * не пытаемся создать iframe.
             */

            if (!embedUrl) {

                return [

                    "div",

                    {

                        "data-type":
                            "video",

                        class:
                            "article-video"

                    },

                    "Некорректная ссылка на видео"

                ];

            }


            return [

                "div",

                {

                    "data-type":
                        "video",

                    class:
                        "article-video"

                },


                [

                    "iframe",

                    {

                        /*
                         * Оригинальный URL.
                         *
                         * Он нужен при повторном
                         * открытии статьи.
                         */

                        "data-src":
                            src,


                        /*
                         * Реальный URL iframe.
                         */

                        src:
                            embedUrl,


                        frameborder:
                            "0",


                        allow:
                            "autoplay; encrypted-media; fullscreen; picture-in-picture",


                        allowfullscreen:
                            "true"

                    }

                ]

            ];

        },


        /* =================================================
           COMMAND
           ================================================= */

        addCommands() {

            return {

                setVideo:
                    src =>
                    ({ commands }) => {

                        const provider =
                            getVideoProvider(
                                src
                            );


                        if (!provider) {

                            return false;

                        }


                        const embedUrl =
                            getEmbedUrl(
                                src
                            );


                        if (!embedUrl) {

                            return false;

                        }


                        return commands
                            .insertContent({

                                type:
                                    this.name,

                                attrs: {

                                    /*
                                     * Сохраняем
                                     * исходную ссылку.
                                     */

                                    src,

                                    provider

                                }

                            });

                    }

            };

        }

    });


/* =========================================================
   RESTORE ORIGINAL URL
   ========================================================= */

function restoreOriginalUrl(
    embedUrl
) {

    try {

        const parsed =
            new URL(embedUrl);


        /* =====================================================
           YOUTUBE
           ===================================================== */

        if (
            parsed.hostname
                .toLowerCase()
                .includes(
                    "youtube.com"
                ) &&
            parsed.pathname.startsWith(
                "/embed/"
            )
        ) {

            const id =
                parsed.pathname
                    .slice(
                        "/embed/".length
                    )
                    .split("/")[0];


            if (id) {

                return (
                    `https://www.youtube.com/watch?v=${id}`
                );

            }

        }


        /* =====================================================
           RUTUBE
           ===================================================== */

        if (
            parsed.hostname
                .toLowerCase()
                .includes(
                    "rutube.ru"
                ) &&
            parsed.pathname.startsWith(
                "/play/embed/"
            )
        ) {

            const id =
                parsed.pathname
                    .slice(
                        "/play/embed/".length
                    )
                    .split("/")[0];


            if (id) {

                return (
                    `https://rutube.ru/video/${id}/`
                );

            }

        }


        /* =====================================================
           VK
           ===================================================== */

        if (
            parsed.hostname
                .toLowerCase()
                .includes(
                    "vk.com"
                ) &&
            parsed.pathname.includes(
                "video_ext.php"
            )
        ) {

            const oid =
                parsed.searchParams.get(
                    "oid"
                );


            const id =
                parsed.searchParams.get(
                    "id"
                ) ||
                parsed.searchParams.get(
                    "vid"
                );


            if (
                oid &&
                id
            ) {

                return (
                    `https://vk.com/video${oid}_${id}`
                );

            }

        }


        return null;

    } catch {

        return null;

    }

}