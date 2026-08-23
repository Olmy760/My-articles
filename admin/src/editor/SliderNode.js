import { Node } from "@tiptap/core";


export const SliderNode =
    Node.create({

        name: "imageSlider",

        group: "block",

        content: "image+",

        isolating: true,

        defining: true,

        addAttributes() {

            return {
                autoplay: {
                    default: true
                }
            };
        },

        parseHTML() {

            return [
                {
                    tag:
                        "div[data-type='image-slider']"
                }
            ];
        },

        renderHTML({
            HTMLAttributes
        }) {

            return [
                "div",
                {
                    ...HTMLAttributes,

                    "data-type":
                        "image-slider",

                    class:
                        "article-image-slider"
                },

                0
            ];
        },

        addCommands() {

            return {

                setImageSlider:
                    (images) =>
                    ({ commands }) => {

                        if (
                            !Array.isArray(images) ||
                            images.length === 0
                        ) {
                            return false;
                        }

                        return commands.insertContent({
                            type:
                                this.name,

                            content:
                                images.map(
                                    image => ({
                                        type:
                                            "image",

                                        attrs: {
                                            src:
                                                image.src,

                                            alt:
                                                image.alt || ""
                                        }
                                    })
                                )
                        });
                    }
            };
        }
    });