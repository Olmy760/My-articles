export function parseFrontMatter(markdown) {
    const match = markdown.match(
        /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/m
    );

    if (!match) {
        return {
            frontMatter: {},
            content: markdown.trim()
        };
    }

    const frontMatterText = match[1];
    const content = match[2].trim();

    return {
        frontMatter: parseYaml(frontMatterText),
        content
    };
}


export function serializeFrontMatter(
    frontMatter,
    content
) {
    const lines = [
        "---"
    ];

    if (frontMatter.title) {
        lines.push(
            `title: "${escapeQuotes(frontMatter.title)}"`
        );
    }

    if (frontMatter.date) {
        lines.push(
            `date: ${frontMatter.date}`
        );
    }

    if (frontMatter.description) {
        lines.push(
            `description: "${escapeQuotes(
                frontMatter.description
            )}"`
        );
    }

    if (
        Array.isArray(frontMatter.tags) &&
        frontMatter.tags.length > 0
    ) {
        lines.push(
            "tags:"
        );

        for (const tag of frontMatter.tags) {
            lines.push(
                `  - "${escapeQuotes(tag)}"`
            );
        }
    }

    lines.push("---");
    lines.push("");

    lines.push(content.trim());
    lines.push("");

    return lines.join("\n");
}


function parseYaml(text) {
    const result = {};

    const lines = text.split("\n");

    let currentArray = null;

    for (const rawLine of lines) {

        const line = rawLine.trimEnd();

        if (!line.trim()) {
            continue;
        }

        /*
         * Array item
         *
         * tags:
         *   - foo
         */
        const arrayItem =
            line.match(/^\s+-\s+["']?(.*?)["']?$/);

        if (arrayItem && currentArray) {

            result[currentArray].push(
                arrayItem[1]
            );

            continue;
        }


        const property =
            line.match(
                /^([A-Za-z0-9_-]+):\s*(.*)$/
            );

        if (!property) {
            continue;
        }

        const key = property[1];
        const value = property[2].trim();


        if (!value) {

            result[key] = [];

            currentArray = key;

            continue;
        }


        currentArray = null;

        result[key] =
            removeQuotes(value);
    }

    return result;
}


function removeQuotes(value) {

    if (
        value.length >= 2 &&
        (
            (
                value.startsWith('"') &&
                value.endsWith('"')
            ) ||
            (
                value.startsWith("'") &&
                value.endsWith("'")
            )
        )
    ) {
        return value.slice(1, -1);
    }

    return value;
}


function escapeQuotes(value) {
    return String(value)
        .replaceAll("\\", "\\\\")
        .replaceAll('"', '\\"');
}