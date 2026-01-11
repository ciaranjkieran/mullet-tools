# boards/thumbs.py
from io import BytesIO
from PIL import Image
from django.core.files.base import ContentFile


def make_image_thumb(file_field, max_size=(640, 640), format="JPEG", quality=80):
    print("THUMB: make_image_thumb called")
    print("THUMB: file name =", getattr(file_field, "name", None))

    try:
        file_field.open("rb")
        file_field.seek(0)
        print("THUMB: file opened + seek(0)")
    except Exception as e:
        print("THUMB ERROR: opening file failed:", repr(e))
        raise

    try:
        img = Image.open(file_field)
        print("THUMB: PIL opened image:", img.format, img.size, img.mode)
    except Exception as e:
        print("THUMB ERROR: PIL Image.open failed:", repr(e))
        raise

    try:
        img = img.convert("RGB")
        img.thumbnail(max_size)
        print("THUMB: converted + resized:", img.size)
    except Exception as e:
        print("THUMB ERROR: image processing failed:", repr(e))
        raise

    try:
        buf = BytesIO()
        img.save(buf, format=format, quality=quality, optimize=True)
        buf.seek(0)
        data = buf.read()
        print("THUMB: image saved to buffer, bytes =", len(data))
    except Exception as e:
        print("THUMB ERROR: saving image failed:", repr(e))
        raise

    return ContentFile(data)


def make_pdf_thumb(file_field, max_size=(640, 640)):
    print("THUMB: make_pdf_thumb called")
    print("THUMB: file name =", getattr(file_field, "name", None))

    try:
        import fitz  # PyMuPDF
        print("THUMB: PyMuPDF imported")
    except Exception as e:
        print("THUMB ERROR: importing PyMuPDF failed:", repr(e))
        raise

    try:
        file_field.open("rb")
        file_field.seek(0)
        pdf_bytes = file_field.read()
        print("THUMB: PDF bytes read:", len(pdf_bytes))
    except Exception as e:
        print("THUMB ERROR: reading PDF failed:", repr(e))
        raise

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page = doc.load_page(0)
        print("THUMB: PDF page loaded")
    except Exception as e:
        print("THUMB ERROR: PDF render failed:", repr(e))
        raise

    try:
        mat = fitz.Matrix(2, 2)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img = Image.open(BytesIO(pix.tobytes("png"))).convert("RGB")
        img.thumbnail(max_size)
        print("THUMB: PDF page rendered to image:", img.size)
    except Exception as e:
        print("THUMB ERROR: converting PDF to image failed:", repr(e))
        raise

    try:
        out = BytesIO()
        img.save(out, format="JPEG", quality=80, optimize=True)
        out.seek(0)
        data = out.read()
        print("THUMB: PDF thumb saved, bytes =", len(data))
    except Exception as e:
        print("THUMB ERROR: saving PDF thumb failed:", repr(e))
        raise

    return ContentFile(data)
