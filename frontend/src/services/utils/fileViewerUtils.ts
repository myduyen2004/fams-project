/**
 * Utility to get a viewable URL for files, especially PDFs.
 * 
 * Handles two issues:
 * 1. Strips Cloudinary signed URL components (s--xxx--) that cause 404 errors
 * 2. For Cloudinary raw PDF URLs, wraps with Google Docs Viewer for inline viewing
 */
export const getViewableFileUrl = (url: string): string => {
    if (!url) return url;

    // Strip Cloudinary signing component (s--xxx--/) from the URL
    // This signing causes 404 errors for public uploads
    let cleanUrl = url.replace(/\/s--[^/]+--\//, '/');

    const lowerUrl = cleanUrl.toLowerCase();
    const isPdf = lowerUrl.endsWith('.pdf') || lowerUrl.includes('.pdf');

    // Cloudinary raw URLs don't render PDFs inline — use Google Docs Viewer
    if (isPdf && lowerUrl.includes('res.cloudinary.com') && lowerUrl.includes('/raw/')) {
        return `https://docs.google.com/viewer?url=${encodeURIComponent(cleanUrl)}&embedded=true`;
    }

    return cleanUrl;
};
