import apiClient from '../api/authService';

/**
 * Upload file to Cloudinary via Backend proxy
 */
export const uploadFile = async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);

    console.log("Attempting upload via apiClient to /upload");

    try {
        const response = await apiClient.post('upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        console.log("Upload success:", response.data);
        return response.data;
    } catch (err: any) {
        if (err.response) {
            console.error("Upload error response body:", err.response.data);
            console.error("Upload error response status:", err.response.status);
            console.error("Upload error response headers:", err.response.headers);
        } else {
            console.error("Upload error (no response):", err.message);
        }
        const errorMsg = err.response?.data?.message || "Lỗi khi upload file";
        throw new Error(errorMsg);
    }
};
