import { Image as BaseImage } from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageComponent } from "./ImageComponent";

export const CustomImage = BaseImage.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: null,
                parseHTML: element => {
                    const width = element.getAttribute("width") || element.style.width;
                    return width || null;
                },
                renderHTML: attributes => {
                    if (!attributes.width) return {};
                    return { width: attributes.width };
                },
            },
            alignment: {
                default: "center",
                parseHTML: element => element.getAttribute("data-align") || "center",
                renderHTML: attributes => {
                    return { "data-align": attributes.alignment };
                },
            },
            caption: {
                default: "",
                parseHTML: element => {
                    const figcaption = element.querySelector("figcaption");
                    return figcaption?.textContent || "";
                },
                renderHTML: attributes => {
                    return {};
                },
            },
        };
    },

    renderHTML({ node, HTMLAttributes }) {
        const { src, alt, title, width, alignment, caption } = node.attrs;
        
        const imgAttrs = {
            src,
            alt: alt || "",
            title: title || "",
        };
        if (width) {
            imgAttrs.width = width;
            imgAttrs.style = `width: ${width}`;
        }

        const img = ["img", imgAttrs];
        
        if (caption) {
            return [
                "figure",
                { "data-align": alignment || "center", class: `image-figure align-${alignment || "center"}` },
                img,
                ["figcaption", {}, caption]
            ];
        }
        
        return [
            "figure",
            { "data-align": alignment || "center", class: `image-figure align-${alignment || "center"}` },
            img
        ];
    },

    addNodeView() {
        return ReactNodeViewRenderer(ImageComponent);
    },
});