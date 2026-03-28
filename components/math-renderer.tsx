"use client";

import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

export function MathRenderer({ latex, block = false }: { latex: string; block?: boolean }) {
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (ref.current) {
            try {
                katex.render(latex, ref.current, {
                    displayMode: block,
                    throwOnError: false,
                    output: "html",
                });
            } catch (err) {
                ref.current.textContent = latex;
            }
        }
    }, [latex, block]);

    return <span ref={ref} className={block ? "block-math" : "inline-math"} />;
}
