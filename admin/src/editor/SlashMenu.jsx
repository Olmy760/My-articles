import React, {
    useEffect,
    useState
} from "react";


const COMMANDS = [
    {
        id: "paragraph",
        title: "Текст",
        description: "Обычный текст",
        keywords: ["text", "текст"],
        command: editor =>
            editor
                .chain()
                .focus()
                .setParagraph()
                .run()
    },

    {
        id: "heading1",
        title: "Заголовок 1",
        description: "Большой заголовок",
        keywords: ["h1", "heading", "заголовок"],
        command: editor =>
            editor
                .chain()
                .focus()
                .toggleHeading({
                    level: 1
                })
                .run()
    },

    {
        id: "heading2",
        title: "Заголовок 2",
        description: "Заголовок второго уровня",
        keywords: ["h2", "heading", "заголовок"],
        command: editor =>
            editor
                .chain()
                .focus()
                .toggleHeading({
                    level: 2
                })
                .run()
    },

    {
        id: "heading3",
        title: "Заголовок 3",
        description: "Заголовок третьего уровня",
        keywords: ["h3", "heading", "заголовок"],
        command: editor =>
            editor
                .chain()
                .focus()
                .toggleHeading({
                    level: 3
                })
                .run()
    },

    {
        id: "bullet",
        title: "Маркированный список",
        description: "Список с точками",
        keywords: ["list", "bullet", "список"],
        command: editor =>
            editor
                .chain()
                .focus()
                .toggleBulletList()
                .run()
    },

    {
        id: "ordered",
        title: "Нумерованный список",
        description: "Список с номерами",
        keywords: ["list", "number", "список"],
        command: editor =>
            editor
                .chain()
                .focus()
                .toggleOrderedList()
                .run()
    },

    {
        id: "quote",
        title: "Цитата",
        description: "Выделенная цитата",
        keywords: ["quote", "цитата"],
        command: editor =>
            editor
                .chain()
                .focus()
                .toggleBlockquote()
                .run()
    },

    {
        id: "code",
        title: "Блок кода",
        description: "Форматированный код",
        keywords: ["code", "код"],
        command: editor =>
            editor
                .chain()
                .focus()
                .toggleCodeBlock()
                .run()
    },

    {
        id: "divider",
        title: "Разделитель",
        description: "Горизонтальная линия",
        keywords: ["line", "divider", "линия"],
        command: editor =>
            editor
                .chain()
                .focus()
                .setHorizontalRule()
                .run()
    }
];


export default function SlashMenu({
    editor
}) {

    const [
        visible,
        setVisible
    ] = useState(false);

    const [
        query,
        setQuery
    ] = useState("");

    const [
        selectedIndex,
        setSelectedIndex
    ] = useState(0);

    const [
        position,
        setPosition
    ] = useState({
        top: 0,
        left: 0
    });


    const filteredCommands =
        COMMANDS.filter(command => {

            if (!query) {
                return true;
            }

            const text =
                query.toLowerCase();

            return (
                command.title
                    .toLowerCase()
                    .includes(text) ||

                command.description
                    .toLowerCase()
                    .includes(text) ||

                command.keywords.some(
                    keyword =>
                        keyword
                            .toLowerCase()
                            .includes(text)
                )
            );
        });


    useEffect(() => {

        if (!editor) {
            return;
        }


        const handleUpdate = () => {

            const {
                from
            } = editor.state.selection;


            const {
                $from
            } = editor.state.selection;


            const textBefore =
                $from.parent.textBetween(
                    0,
                    $from.parentOffset,
                    undefined,
                    "\ufffc"
                );


            const match =
                textBefore.match(
                    /(?:^|\s)\/([^\s]*)$/
                );


            if (!match) {

                setVisible(false);

                return;
            }


            const slashQuery =
                match[1] || "";


            const coords =
                editor.view.coordsAtPos(from);


            setQuery(slashQuery);

            setSelectedIndex(0);

            setPosition({
                top: coords.bottom + 8,
                left: coords.left
            });

            setVisible(true);
        };


        editor.on(
            "selectionUpdate",
            handleUpdate
        );

        editor.on(
            "update",
            handleUpdate
        );


        return () => {

            editor.off(
                "selectionUpdate",
                handleUpdate
            );

            editor.off(
                "update",
                handleUpdate
            );

        };

    }, [editor]);


    useEffect(() => {

        if (!visible) {
            return;
        }


        function handleKeyDown(event) {

            if (event.key === "ArrowDown") {

                event.preventDefault();

                setSelectedIndex(
                    index =>
                        Math.min(
                            index + 1,
                            filteredCommands.length - 1
                        )
                );

                return;
            }


            if (event.key === "ArrowUp") {

                event.preventDefault();

                setSelectedIndex(
                    index =>
                        Math.max(
                            index - 1,
                            0
                        )
                );

                return;
            }


            if (event.key === "Enter") {

                event.preventDefault();

                const command =
                    filteredCommands[selectedIndex];

                if (command) {
                    executeCommand(command);
                }

                return;
            }


            if (event.key === "Escape") {

                setVisible(false);

            }

        }


        window.addEventListener(
            "keydown",
            handleKeyDown
        );


        return () => {

            window.removeEventListener(
                "keydown",
                handleKeyDown
            );

        };

    }, [
        visible,
        selectedIndex,
        filteredCommands
    ]);


    function executeCommand(command) {

        if (!editor) {
            return;
        }


        /*
         * Удаляем "/" и поисковый текст.
         */
        const {
            from,
            to
        } = editor.state.selection;


        const text =
            `/${query}`;


        const start =
            from - text.length;


        editor
            .chain()
            .focus()
            .deleteRange({
                from: start,
                to
            })
            .run();


        command.command(editor);

        setVisible(false);

        setQuery("");
    }


    if (
        !visible ||
        filteredCommands.length === 0
    ) {
        return null;
    }


    return (
        <div
            className="slash-menu"
            style={{
                top: position.top,
                left: position.left
            }}
        >

            <div className="slash-menu-title">
                Вставить
            </div>


            {filteredCommands.map(
                (command, index) => (

                    <button
                        key={command.id}
                        className={
                            "slash-command " +
                            (
                                index === selectedIndex
                                    ? "selected"
                                    : ""
                            )
                        }
                        onMouseDown={event => {
                            event.preventDefault();
                            executeCommand(command);
                        }}
                    >

                        <span className="slash-icon">
                            {getIcon(command.id)}
                        </span>

                        <span className="slash-text">

                            <strong>
                                {command.title}
                            </strong>

                            <small>
                                {command.description}
                            </small>

                        </span>

                    </button>

                )
            )}

        </div>
    );
}


function getIcon(id) {

    const icons = {
        paragraph: "T",
        heading1: "H1",
        heading2: "H2",
        heading3: "H3",
        bullet: "•",
        ordered: "1.",
        quote: "❝",
        code: "</>",
        divider: "―"
    };

    return icons[id] ?? "•";
}