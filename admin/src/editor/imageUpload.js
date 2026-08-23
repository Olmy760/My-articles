import { uploadImage } from "../github/api";

export async function uploadImages(
    files,
    onProgress
) {
    const results = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!file.type.startsWith("image/")) {
            continue;
        }

        onProgress?.(
            i + 1,
            files.length
        );

        const result =
            await uploadImage(file);

        results.push(result);
    }

    return results;
}