import addOnSandboxSdk from "add-on-sdk-document-sandbox";
import { editor, colorUtils } from "express-document-sdk";

// Get the document sandbox runtime.
const { runtime } = addOnSandboxSdk.instance;

function start() {
    // APIs to be exposed to the UI runtime
    // i.e., to the `index.html` file of this add-on.
    const sandboxApi = {
        // Creates and appends a rectangle with given properties
        createRectangleWithProps: ({ width, height, x, y, colorHex }) => {
            const rectangle = editor.createRectangle();
            rectangle.width = width;
            rectangle.height = height;
            rectangle.translation = { x, y };
            if (colorHex) {
                rectangle.fill = editor.makeColorFill(colorUtils.fromHex(colorHex));
            }
            const insertionParent = editor.context.insertionParent;
            insertionParent.children.append(rectangle);
        },
        // Creates and appends a text node with given properties
        createTextWithProps: ({ text, x, y, fontSize, colorHex }) => {
            const textNode = editor.createText();
            textNode.fullContent.text = text;
            textNode.translation = { x, y };
            const styles = {};
            if (fontSize) styles.fontSize = fontSize;
            if (colorHex) styles.color = colorUtils.fromHex(colorHex);
            if (Object.keys(styles).length) {
                textNode.fullContent.applyCharacterStyles(styles);
            }
            const insertionParent = editor.context.insertionParent;
            insertionParent.children.append(textNode);
        }
    };

    // Expose `sandboxApi` to the UI runtime.
    runtime.exposeApi(sandboxApi);
}

start();
