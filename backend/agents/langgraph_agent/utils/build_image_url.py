def build_image_url(base64: str, mime_type: str) -> list:
    image_url = f"data:{mime_type};base64,{base64}"
    return image_url 