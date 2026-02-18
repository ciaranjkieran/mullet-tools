# boards/thumbs.py
import logging
from io import BytesIO
from PIL import Image
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)


def make_image_thumb(file_field, max_size=(640, 640), format="JPEG", quality=80):
    logger.debug("THUMB: make_image_thumb called")
    logger.debug("THUMB: file name = %s", getattr(file_field, "name", None))

    try:
        file_field.open("rb")
        file_field.seek(0)
        logger.debug("THUMB: file opened + seek(0)")
    except Exception as e:
        logger.debug("THUMB ERROR: opening file failed: %s", repr(e))
        raise

    try:
        img = Image.open(file_field)
        logger.debug("THUMB: PIL opened image: %s %s %s", img.format, img.size, img.mode)
    except Exception as e:
        logger.debug("THUMB ERROR: PIL Image.open failed: %s", repr(e))
        raise

    try:
        img = img.convert("RGB")
        img.thumbnail(max_size)
        logger.debug("THUMB: converted + resized: %s", img.size)
    except Exception as e:
        logger.debug("THUMB ERROR: image processing failed: %s", repr(e))
        raise

    try:
        buf = BytesIO()
        img.save(buf, format=format, quality=quality, optimize=True)
        buf.seek(0)
        data = buf.read()
        logger.debug("THUMB: image saved to buffer, bytes = %s", len(data))
    except Exception as e:
        logger.debug("THUMB ERROR: saving image failed: %s", repr(e))
        raise

    return ContentFile(data)


def make_pdf_thumb(file_field, max_size=(640, 640)):
    logger.debug("THUMB: make_pdf_thumb called")
    logger.debug("THUMB: file name = %s", getattr(file_field, "name", None))

    try:
        import fitz  # PyMuPDF
        logger.debug("THUMB: PyMuPDF imported")
    except Exception as e:
        logger.debug("THUMB ERROR: importing PyMuPDF failed: %s", repr(e))
        raise

    try:
        file_field.open("rb")
        file_field.seek(0)
        pdf_bytes = file_field.read()
        logger.debug("THUMB: PDF bytes read: %s", len(pdf_bytes))
    except Exception as e:
        logger.debug("THUMB ERROR: reading PDF failed: %s", repr(e))
        raise

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page = doc.load_page(0)
        logger.debug("THUMB: PDF page loaded")
    except Exception as e:
        logger.debug("THUMB ERROR: PDF render failed: %s", repr(e))
        raise

    try:
        mat = fitz.Matrix(2, 2)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img = Image.open(BytesIO(pix.tobytes("png"))).convert("RGB")
        img.thumbnail(max_size)
        logger.debug("THUMB: PDF page rendered to image: %s", img.size)
    except Exception as e:
        logger.debug("THUMB ERROR: converting PDF to image failed: %s", repr(e))
        raise

    try:
        out = BytesIO()
        img.save(out, format="JPEG", quality=80, optimize=True)
        out.seek(0)
        data = out.read()
        logger.debug("THUMB: PDF thumb saved, bytes = %s", len(data))
    except Exception as e:
        logger.debug("THUMB ERROR: saving PDF thumb failed: %s", repr(e))
        raise

    return ContentFile(data)
