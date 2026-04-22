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

/** Tag used to identify rewrite content controls. */
const REWRITE_MARK_TAG = "thesischeck_rewrite";

/**
 * Mark the current selection with an invisible ContentControl.
 * This locks in the exact range so we can reliably replace it later,
 * regardless of text length (avoids the 255-char search limit).
 * Returns the selected text, or empty string if nothing is selected.
 */
export async function markSelectedRange(): Promise<string> {
    return Word.run(async (context) => {
        const selection = context.document.getSelection();
        selection.load("text");
        await context.sync();

        const text = selection.text.trim();
        if (!text) return "";

        // Clean up any leftover marks from previous sessions
        const existing = context.document.contentControls.getByTag(REWRITE_MARK_TAG);
        existing.load("items");
        await context.sync();
        for (const cc of existing.items) {
            cc.delete(true); // keep content, remove wrapper
        }
        if (existing.items.length > 0) await context.sync();

        // Wrap the selection in a hidden content control
        const cc = selection.insertContentControl();
        cc.tag = REWRITE_MARK_TAG;
        cc.title = "";
        cc.appearance = Word.ContentControlAppearance.hidden;
        await context.sync();

        return text;
    });
}

/**
 * Replace the marked range content with new text in tracked-changes (revision) mode.
 * Finds the ContentControl by tag, enables change tracking, replaces content,
 * then removes the wrapper.
 */
export async function replaceMarkedRange(newText: string): Promise<boolean> {
    return Word.run(async (context) => {
        const contentControls = context.document.contentControls.getByTag(REWRITE_MARK_TAG);
        contentControls.load("items");
        await context.sync();

        if (contentControls.items.length === 0) return false;

        const cc = contentControls.items[0];

        // Enable change tracking so the replacement shows as a revision
        context.document.changeTrackingMode = Word.ChangeTrackingMode.trackAll;
        await context.sync();

        // Replace content inside the content control
        cc.insertText(newText, Word.InsertLocation.replace);
        await context.sync();

        // Remove the content control wrapper, keeping the new text in place
        cc.delete(true);
        await context.sync();

        return true;
    });
}

/**
 * Remove any rewrite marks without changing document content.
 * Call this when the user cancels or resets the rewrite operation.
 */
export async function clearRewriteMark(): Promise<void> {
    return Word.run(async (context) => {
        const contentControls = context.document.contentControls.getByTag(REWRITE_MARK_TAG);
        contentControls.load("items");
        await context.sync();

        for (const cc of contentControls.items) {
            cc.delete(true); // keep content, just remove wrapper
        }
        if (contentControls.items.length > 0) {
            await context.sync();
        }
    });
}
