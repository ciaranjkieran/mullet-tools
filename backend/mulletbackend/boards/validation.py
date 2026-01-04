# boards/validation.py
ALLOWED_FILE_EXTS = {
    "pdf","doc","docx","rtf","odt",
    "xls","xlsx","csv",
    "ppt","pptx",
    "txt","md","json",
    "zip","rar","7z","tar","gz",
}

ALLOWED_FILE_MIMES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/rtf",
    "application/vnd.oasis.opendocument.text",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/markdown",
    "application/json",
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
    "application/x-tar",
    "application/gzip",
}

MAX_FILE_BYTES = 50 * 1024 * 1024
