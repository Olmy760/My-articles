import React from "react";


export default function EditorToolbar({
    editor,
    onImage,
    onSlider,
    onVideo
}) {

    if (!editor) {
        return null;
    }


    function button(
        label,
        action,
        active = false
    ) {

        return (
            <button
                type="button"
                className={
                    active
                        ? "active"
                        : ""
                }
                onMouseDown={event => {

                    event.preventDefault();

                    action();
                }}
            >
                {label}
            </button>
        );
    }


    return (
        <div className="editor-toolbar">

            {button(
                "H1",
                () =>
                    editor
                        .chain()
                        .focus()
                        .toggleHeading({
                            level: 1
                        })
                        .run(),

                editor.isActive(
                    "heading",
                    { level: 1 }
                )
            )}


            {button(
                "H2",
                () =>
                    editor
                        .chain()
                        .focus()
                        .toggleHeading({
                            level: 2
                        })
                        .run(),

                editor.isActive(
                    "heading",
                    { level: 2 }
                )
            )}


            <span className="toolbar-divider" />


            {button(
                "• Список",
                () =>
                    editor
                        .chain()
                        .focus()
                        .toggleBulletList()
                        .run(),

                editor.isActive(
                    "bulletList"
                )
            )}


            {button(
                "1. Список",
                () =>
                    editor
                        .chain()
                        .focus()
                        .toggleOrderedList()
                        .run(),

                editor.isActive(
                    "orderedList"
                )
            )}


            {button(
                "❝ Цитата",
                () =>
                    editor
                        .chain()
                        .focus()
                        .toggleBlockquote()
                        .run(),

                editor.isActive(
                    "blockquote"
                )
            )}


            <span className="toolbar-divider" />


            <button
                type="button"
                onMouseDown={event => {
                    event.preventDefault();
                    onImage();
                }}
            >
                🖼 Изображение
            </button>


            <button
                type="button"
                onMouseDown={event => {
                    event.preventDefault();
                    onSlider();
                }}
            >
                ▣ Слайдер
            </button>


            <button
                type="button"
                onMouseDown={event => {
                    event.preventDefault();
                    onVideo();
                }}
            >
                ▶ Видео
            </button>


            <button
                type="button"
                onMouseDown={event => {

                    event.preventDefault();

                    const previousUrl =
                        editor.getAttributes(
                            "link"
                        ).href;

                    const url =
                        window.prompt(
                            "URL ссылки:",
                            previousUrl || ""
                        );

                    if (
                        url === null
                    ) {
                        return;
                    }

                    if (!url) {

                        editor
                            .chain()
                            .focus()
                            .unsetLink()
                            .run();

                        return;
                    }

                    editor
                        .chain()
                        .focus()
                        .setLink({
                            href: url
                        })
                        .run();
                }}
            >
                🔗 Ссылка
            </button>

        </div>
    );
}