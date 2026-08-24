import React, { useState, useRef, useEffect } from "react";
import { NodeViewWrapper } from "@tiptap/react";

export const ImageComponent = ({ node, updateAttributes, selected }) => {
    const [isEditingCaption, setIsEditingCaption] = useState(false);
    const [caption, setCaption] = useState(node.attrs.caption || "");
    const imgRef = useRef(null);
    const wrapperRef = useRef(null);

    useEffect(() => {
        setCaption(node.attrs.caption || "");
    }, [node.attrs.caption]);

    const handleResizeStart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const startX = e.clientX;
        const startWidth = imgRef.current.offsetWidth;
        const containerWidth = wrapperRef.current?.offsetWidth || 800;
        
        const handleMouseMove = (e) => {
            const diff = e.clientX - startX;
            const newWidth = Math.min(
                containerWidth,
                Math.max(100, startWidth + diff)
            );
            updateAttributes({ width: `${Math.round(newWidth)}px` });
        };
        
        const handleMouseUp = () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
        
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };

    const handleCaptionBlur = () => {
        setIsEditingCaption(false);
        updateAttributes({ caption: caption.trim() });
    };

    const handleCaptionKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleCaptionBlur();
        }
        if (e.key === "Escape") {
            e.preventDefault();
            setCaption(node.attrs.caption || "");
            setIsEditingCaption(false);
        }
    };

    const setAlignment = (alignment) => {
        updateAttributes({ alignment });
    };

    return (
        <NodeViewWrapper 
            className={`image-node-view align-${node.attrs.alignment || "center"}`}
            ref={wrapperRef}
        >
            <figure 
                className={`image-figure ${selected ? "selected" : ""}`}
                data-align={node.attrs.alignment || "center"}
                style={{ 
                    width: node.attrs.width || "100%",
                    maxWidth: "100%"
                }}
            >
                <div className="image-wrapper">
                    <img
                        ref={imgRef}
                        src={node.attrs.src}
                        alt={node.attrs.alt || ""}
                        style={{ 
                            width: node.attrs.width || "100%",
                            maxWidth: "100%",
                            display: "block"
                        }}
                    />
                    {selected && (
                        <div 
                            className="image-resize-handle"
                            onMouseDown={handleResizeStart}
                        />
                    )}
                </div>
                
                {isEditingCaption ? (
                    <input
                        type="text"
                        className="image-caption-input"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        onBlur={handleCaptionBlur}
                        onKeyDown={handleCaptionKeyDown}
                        autoFocus
                        placeholder="Введите подпись..."
                    />
                ) : (
                    <figcaption
                        className="image-caption"
                        onDoubleClick={() => setIsEditingCaption(true)}
                    >
                        {caption || "Двойной клик для добавления подписи"}
                    </figcaption>
                )}

                {selected && (
                    <div className="image-alignment-controls">
                        <button
                            type="button"
                            className={`align-btn ${node.attrs.alignment === "left" ? "active" : ""}`}
                            onClick={() => setAlignment("left")}
                            title="По левому краю"
                        >
                            ◧
                        </button>
                        <button
                            type="button"
                            className={`align-btn ${node.attrs.alignment === "center" ? "active" : ""}`}
                            onClick={() => setAlignment("center")}
                            title="По центру"
                        >
                            ◫
                        </button>
                        <button
                            type="button"
                            className={`align-btn ${node.attrs.alignment === "right" ? "active" : ""}`}
                            onClick={() => setAlignment("right")}
                            title="По правому краю"
                        >
                            ◨
                        </button>
                    </div>
                )}
            </figure>
        </NodeViewWrapper>
    );
};