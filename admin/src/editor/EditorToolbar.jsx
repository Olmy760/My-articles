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

    const run = (callback) => {
        callback();
        editor.commands.focus();
    };

    return (
        <div className="editor-toolbar">

            <button
                type="button"
                className={editor.isActive("bold") ? "active" : ""}
                onMouseDown={(event) => {
                    event.preventDefault();

                    editor
                        .chain()
                        .focus()
                        .toggleBold()
                        .run();
                }}
            >
                <strong>B</strong>
            </button>

            <button
                type="button"
                className={editor.isActive("italic") ? "active" : ""}
                onMouseDown={(event) => {
                    event.preventDefault();

                    editor
                        .chain()
                        .focus()
                        .toggleItalic()
                        .run();
                }}
            >
                <em>I</em>
            </button>

            <button
                type="button"
                className={editor.isActive("strike") ? "active" : ""}
                onMouseDown={(event) => {
                    event.preventDefault();

                    editor
                        .chain()
                        .focus()
                        .toggleStrike()
                        .run();
                }}
            >
                <s>S</s>
            </button>

            <button
                type="button"
                className={editor.isActive("underline") ? "active" : ""}
                onMouseDown={(event) => {
                    event.preventDefault();

                    editor
                        .chain()
                        .focus()
                        .toggleUnderline()
                        .run();
                }}
            >
                <u>U</u>
            </button>

            <span className="toolbar-divider" />

            <button
                type="button"
                className={
                    editor.isActive("heading", {
                        level: 1
                    })
                        ? "active"
                        : ""
                }
                onMouseDown={(event) => {
                    event.preventDefault();

                    editor
                        .chain()
                        .focus()
                        .toggleHeading({
                            level: 1
                        })
                        .run();
                }}
            >
                H1
            </button>

            <button
                type="button"
                className={
                    editor.isActive("heading", {
                        level: 2
                    })
                        ? "active"
                        : ""
                }
                onMouseDown={(event) => {
                    event.preventDefault();

                    editor
                        .chain()
                        .focus()
                        .toggleHeading({
                            level: 2
                        })
                        .run();
                }}
            >
                H2
            </button>

            <span className="toolbar-divider" />

            <button
                type="button"
                className={
                    editor.isActive("bulletList")
                        ? "active"
                        : ""
                }
                onMouseDown={(event) => {
                    event.preventDefault();

                    editor
                        .chain()
                        .focus()
                        .toggleBulletList()
                        .run();
                }}
            >
                • List
            </button>

            <button
                type="button"
                className={
                    editor.isActive("orderedList")
                        ? "active"
                        : ""
                }
                onMouseDown={(event) => {
                    event.preventDefault();

                    editor
                        .chain()
                        .focus()
                        .toggleOrderedList()
                        .run();
                }}
            >
                1. List
            </button>

            <button
                type="button"
                className={
                    editor.isActive("blockquote")
                        ? "active"
                        : ""
                }
                onMouseDown={(event) => {
                    event.preventDefault();

                    editor
                        .chain()
                        .focus()
                        .toggleBlockquote()
                        .run();
                }}
            >
                ❝
            </button>

            <span className="toolbar-divider" />

            <button
                type="button"
                onMouseDown={(event) => {
                    event.preventDefault();

                    const href =
                        window.prompt(
                            "URL ссылки:"
                        );

                    if (!href) {
                        return;
                    }

                    editor
                        .chain()
                        .focus()
                        .setLink({
                            href
                        })
                        .run();
                }}
            >
                🔗
            </button>

            <button
                type="button"
                onMouseDown={(event) => {
                    event.preventDefault();

                    onImage();
                }}
            >
                Image
            </button>

            <button
                type="button"
                onMouseDown={(event) => {
                    event.preventDefault();

                    onSlider();
                }}
            >
                Slider
            </button>

            <button
                type="button"
                onMouseDown={(event) => {
                    event.preventDefault();

                    onVideo();
                }}
            >
                Video
            </button>

        </div>
    );
}