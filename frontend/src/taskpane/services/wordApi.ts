/**
 * Office JS Word API wrapper for document operations.
 */

/* global Word */

export interface ParagraphData {
    index: number;
    text: string;
}

/**
 * Read all paragraphs from the document body.
 */
export async function getDocumentParagraphs(): Promise<ParagraphData[]> {
    return Word.run(async (context) => {
        const paragraphs = context.document.body.paragraphs;
        paragraphs.load("text");
        await context.sync();
        return paragraphs.items
            .map((p, index) => ({ index, text: p.text }))
            .filter((p) => p.text.trim().length > 0);
    });
}

/**
 * Read only the user-selected text (for incremental review).
 */
export async function getSelectedParagraphs(): Promise<ParagraphData[]> {
    return Word.run(async (context) => {
        const selection = context.document.getSelection();
        const paragraphs = selection.paragraphs;
        paragraphs.load("text");
        await context.sync();
        return paragraphs.items
            .map((p, index) => ({ index, text: p.text }))
            .filter((p) => p.text.trim().length > 0);
    });
}

/**
 * Get the plain text of the current selection (for preview display).
 */
export async function getSelectedText(): Promise<string> {
    return Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.load("text");
        await context.sync();
        return selection.text.trim();
    });
}

/**
 * Get the document title (file name).
 */
export async function getDocumentTitle(): Promise<string> {
    return Word.run(async (context) => {
        const properties = context.document.properties;
        properties.load("title");
        await context.sync();
        return properties.title || "Untitled";
    });
}

/**
 * Search for target text in the document, select it and scroll to it.
 * Does NOT insert a comment -- purely for navigation/location.
 */
export async function scrollToText(targetText: string): Promise<boolean> {
    return Word.run(async (context) => {
        const searchStr =
            targetText.length > 255 ? targetText.substring(0, 255) : targetText;

        const results = context.document.body.search(searchStr, {
            matchCase: false,
            matchWholeWord: false,
        });
        results.load("items");
        await context.sync();

        if (results.items.length > 0) {
            results.items[0].select();
            await context.sync();
            return true;
        }
        return false;
    });
}

/**
 * Insert a comment at the first occurrence of the target text in the document.
 */
export async function insertComment(
    targetText: string,
    comment: string,
): Promise<boolean> {
    return Word.run(async (context) => {
        // Limit search text to a reasonable length for matching
        const searchStr =
            targetText.length > 255 ? targetText.substring(0, 255) : targetText;

        const results = context.document.body.search(searchStr, {
            matchCase: false,
            matchWholeWord: false,
        });
        results.load("items");
        await context.sync();

        if (results.items.length > 0) {
            results.items[0].insertComment(comment);
            await context.sync();
            return true;
        }
        return false;
    });
}

/**
 * Insert multiple comments at once (for batch apply).
 */
export async function insertComments(
    items: Array<{ targetText: string; comment: string }>,
): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const item of items) {
        try {
            const result = await insertComment(item.targetText, item.comment);
            if (result) {
                success++;
            } else {
                failed++;
            }
        } catch {
            failed++;
        }
    }

    return { success, failed };
}
