export default function configureMockForPopper() {
    global.document.createRange = () => ({
        setStart: () => {
        },
        setEnd: () => {
        },
        commonAncestorContainer: {
            nodeName: 'BODY',
            ownerDocument: document
        }
    });
}