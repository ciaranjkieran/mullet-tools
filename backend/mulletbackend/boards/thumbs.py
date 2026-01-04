# boards/thumbs.py
from io import BytesIO
from PIL import Image
from django.core.files.base import ContentFile

def make_image_thumb(file_field, max_size=(640, 640), format="JPEG", quality=80):
    """
    Create a thumbnail from an image FileField.
    Returns ContentFile ready to save into ImageField.
    """
    file_field.open("rb")
    img = Image.open(file_field)
    img = img.convert("RGB")
    img.thumbnail(max_size)

    buf = BytesIO()
    img.save(buf, format=format, quality=quality, optimize=True)
    return ContentFile(buf.getvalue())

def make_pdf_thumb(file_field, max_size=(640, 640)):
    """
    Render the first page of a PDF to an image thumbnail using PyMuPDF.
    """
    import fitz  # PyMuPDF

    file_field.open("rb")
    pdf_bytes = file_field.read()

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page = doc.load_page(0)

    # Render at a reasonable scale for clarity
    mat = fitz.Matrix(2, 2)  # 2x
    pix = page.get_pixmap(matrix=mat, alpha=False)

    img = Image.open(BytesIO(pix.tobytes("png"))).convert("RGB")
    img.thumbnail(max_size)

    out = BytesIO()
    img.save(out, format="JPEG", quality=80, optimize=True)
    return ContentFile(out.getvalue())
