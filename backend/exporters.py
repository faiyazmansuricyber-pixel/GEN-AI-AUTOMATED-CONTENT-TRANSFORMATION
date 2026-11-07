from io import BytesIO
from typing import Any, Dict, List, Tuple
import re
import zipfile

from docx import Document
from pptx import Presentation


DOCX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
PPTX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
ZIP_MEDIA_TYPE = "application/zip"


def _label(value: str) -> str:
    return value.replace("_", " ").strip().title()


def _write_docx_value(document: Document, value: Any) -> None:
    if isinstance(value, dict):
        for key, nested_value in value.items():
            if key == "content":
                _write_docx_value(document, nested_value)
            else:
                document.add_heading(_label(str(key)), level=2)
                _write_docx_value(document, nested_value)
    elif isinstance(value, list):
        for item in value:
            if isinstance(item, (dict, list)):
                _write_docx_value(document, item)
            else:
                document.add_paragraph(str(item), style="List Bullet")
    elif value is not None:
        document.add_paragraph(str(value))


def _value_to_lines(value: Any) -> List[str]:
    if isinstance(value, dict):
        lines: list[str] = []
        for key, nested_value in value.items():
            if key == "content":
                lines.extend(_value_to_lines(nested_value))
            else:
                lines.append(f"{_label(str(key))}:")
                lines.extend(_value_to_lines(nested_value))
        return lines
    if isinstance(value, list):
        return [line for item in value for line in _value_to_lines(item)]
    if value is None:
        return []
    return [str(value)]


def _build_presentation(output_type: str, output: Dict[str, Any]) -> bytes:
    presentation = Presentation()
    content = output.get("content", output)
    slides = content.get("slides") if isinstance(content, dict) else None
    slide_contents = slides if isinstance(slides, list) and slides else [content]

    for index, slide_content in enumerate(slide_contents, start=1):
        slide = presentation.slides.add_slide(presentation.slide_layouts[1])
        title = (
            slide_content.get("title")
            if isinstance(slide_content, dict)
            else None
        ) or (f"{_label(output_type)} - {index}" if len(slide_contents) > 1 else _label(output_type))
        slide.shapes.title.text = str(title)

        body = slide.placeholders[1].text_frame
        body.clear()
        body_lines = _value_to_lines(slide_content)
        if isinstance(slide_content, dict):
            body_lines = []
            for key, value in slide_content.items():
                if key == "title":
                    continue
                body_lines.append(f"{_label(str(key))}:")
                body_lines.extend(_value_to_lines(value))

        for line_index, line in enumerate(body_lines):
            paragraph = body.paragraphs[0] if line_index == 0 else body.add_paragraph()
            paragraph.text = line
            paragraph.level = 0 if line.endswith(":") else 1

    buffer = BytesIO()
    presentation.save(buffer)
    return buffer.getvalue()


def export_output(output_type: str, output: Dict[str, Any]) -> Tuple[bytes, str, str]:
    if output_type == "presentation":
        return _build_presentation(output_type, output), f"{output_type}.pptx", PPTX_MEDIA_TYPE

    document = Document()
    document.add_heading(_label(output_type), level=0)
    _write_docx_value(document, output.get("content", output))
    buffer = BytesIO()
    document.save(buffer)
    return buffer.getvalue(), f"{output_type}.docx", DOCX_MEDIA_TYPE


def export_all_outputs(outputs: Dict[str, Any]) -> bytes:
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for output_type, output in outputs.items():
            content, filename, _ = export_output(output_type, output)
            safe_filename = re.sub(r"[^A-Za-z0-9_.-]", "_", filename)
            archive.writestr(safe_filename, content)
    return buffer.getvalue()
