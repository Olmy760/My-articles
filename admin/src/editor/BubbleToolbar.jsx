import React from "react";


export default function BubbleToolbar({
    editor
}) {

    if (!editor) {
        return null;
    }


    return (
        <div
            className="editor-bubble-toolbar"
        >

            <button
                type="button"
                className={
                    editor.isActive("bold")
                        ? "active"
                        : ""
                }
                onMouseDown={event => {
                    event.preventDefault();
                    editor.chain().focus().toggleBold().run();
                }}
            >
                B
            </button>


            <button
                type="button"
                className={
                    editor.isActive("italic")
                        ? "active"
                        : ""
                }
                onMouseDown={event => {
                    event.preventDefault();
                    editor.chain().focus().toggleItalic().run();
                }}
            >
                I
            </button>


            <button
                type="button"
                className={
                    editor.isActive("strike")
                        ? "active"
                        : ""
                }
                onMouseDown={event => {
                    event.preventDefault();
                    editor.chain().focus().toggleStrike().run();
                }}
            >
                S
            </button>


            <button
                type="button"
                className={
                    editor.isActive("heading", {
                        level: 1
                    })
                        ? "active"
                        : ""
                }
                onMouseDown={event => {
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
                onMouseDown={event => {
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


            <button
                type="button"
                onMouseDown={event => {
                    event.preventDefault();

                    const url =
                        window.prompt(
                            "URL ссылки:"
                        );

                    if (!url) {
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
                🔗
            </button>

        </div>
    );
}