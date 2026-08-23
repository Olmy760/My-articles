import { Node } from "@tiptap/core";

function getVideoProvider(url) {
    try {
        const parsed = new URL(url);

        if (
            parsed.hostname.includes("youtube.com") ||
            parsed.hostname === "youtu.be"
        ) {
            return "youtube";
        }

        if (
            parsed.hostname.includes("vk.com") ||
            parsed.hostname.includes("vkvideo.ru")
        ) {
            return "vk";
        }

        if (
            parsed.hostname.includes("rutube.ru")
        ) {
            return "rutube";
        }

        return null;
    } catch {
        return null;
    }
}


function getYouTubeId(url) {
    try {
        const parsed = new URL(url);

        if (parsed.hostname === "youtu.be") {
            return parsed.pathname.slice(1);
        }

        return parsed.searchParams.get("v");
    } catch {
        return null;
    }
}


function getRutubeId(url) {
    const match =
        url.match(
            /rutube\.ru\/video\/([a-zA-Z0-9_-]+)/
        );

    return match?.[1] || null;
}


function getVkEmbedUrl(url) {
    /*
     * VK имеет несколько вариантов ссылок.
     * Для известных embed-ссылок оставляем URL
     * напрямую.
     */
    if (url.includes("video_ext.php")) {
        return url;
    }

    return url;
}


function getEmbedUrl(url) {

    const provider =
        getVideoProvider(url);

    if (provider === "youtube") {

        const id =
            getYouTubeId(url);

        if (!id) {
            return null;
        }

        return `https://www.youtube.com/embed/${id}`;
    }

    if (provider === "rutube") {

        const id =
            getRutubeId(url);

        if (!id) {
            return null;
        }

        return `https://rutube.ru/play/embed/${id}`;
    }

    if (provider === "vk") {
        return getVkEmbedUrl(url);
    }

    return null;
}


export const VideoNode =
    Node.create({

        name: "video",

        group: "block",

        atom: true,

        selectable: true,

        draggable: true,

        addAttributes() {

            return {
                src: {
                    default: null
                },

                provider: {
                    default: null
                }
            };
        },

        parseHTML() {

            return [
                {
                    tag:
                        "div[data-type='video']"
                }
            ];
        },

        renderHTML({
            HTMLAttributes
        }) {

            const src =
                HTMLAttributes.src;

            const embedUrl =
                getEmbedUrl(src);

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

        addCommands() {

            return {

                setVideo:
                    (src) =>
                    ({ commands }) => {

                        const provider =
                            getVideoProvider(src);

                        if (!provider) {
                            return false;
                        }

                        return commands.insertContent({
                            type:
                                this.name,

                            attrs: {
                                src,
                                provider
                            }
                        });
                    }
            };
        }
    });