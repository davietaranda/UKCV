/**
 * The uploaded-CV size cap, kept import-free so the client-side file picker
 * can use the same number as the server without pulling zod into the bundle.
 *
 * 4MB, not more: the upload rides a Server Action request, and Vercel
 * rejects any request body over 4.5MB before our code runs.
 * next.config.ts sets serverActions.bodySizeLimit just above this to leave
 * room for the other form fields.
 */
export const MAX_CV_SIZE_BYTES = 4 * 1024 * 1024;
export const MAX_CV_SIZE_LABEL = "4MB";
