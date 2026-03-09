// convex/utils.ts

/**
 * Kiểm tra xem một chuỗi có phải là đường dẫn HTTP/HTTPS hợp lệ không.
 * An toàn tuyệt đối với giá trị null hoặc undefined.
 */
export const isHttpUrl = (url: string | null | undefined): boolean => {
  return typeof url === 'string' && url.startsWith('http');
};