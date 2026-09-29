import io
import re
import os
import tempfile
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader
import docx
from PIL import Image
import cv2
from google import genai
from google.genai import types
from gemini_service import generate_content_with_fallback

def chunk_text(text: str, target_words: int = 175) -> List[Dict[str, str]]:
    """
    Split text into logical chunks of roughly 150-200 words each.
    Each chunk is tagged with an id: c1, c2, c3...
    """
    if not text or not text.strip():
        return [{"id": "c1", "text": "No content provided."}]
    
    # Clean text whitespace
    cleaned = re.sub(r'\s+', ' ', text).strip()
    words = cleaned.split()
    
    if len(words) <= target_words:
        return [{"id": "c1", "text": cleaned}]
    
    chunks = []
    chunk_index = 1
    i = 0
    total_words = len(words)
    
    while i < total_words:
        # Take target_words words, but try to end at a sentence boundary if possible
        end_idx = min(i + target_words, total_words)
        chunk_words = words[i:end_idx]
        chunk_str = " ".join(chunk_words)
        
        # If we are not at the end of the text, look for sentence boundary in the last 40 words
        if end_idx < total_words:
            last_period = max(chunk_str.rfind('. '), chunk_str.rfind('? '), chunk_str.rfind('! '))
            if last_period > len(chunk_str) // 2:
                # Truncate at sentence boundary
                valid_str = chunk_str[:last_period + 1]
                actual_words = len(valid_str.split())
                if actual_words > 50: # Avoid tiny chunks
                    chunk_str = valid_str
                    i += actual_words
                else:
                    i = end_idx
            else:
                i = end_idx
        else:
            i = end_idx
            
        chunks.append({
            "id": f"c{chunk_index}",
            "text": chunk_str.strip()
        })
        chunk_index += 1
        
    return chunks

async def extract_text_from_file(file_bytes: bytes, filename: str, gemini_client: genai.Client) -> str:
    """
    Extract raw text from uploaded PDF, DOCX, Image, or Video.
    """
    ext = os.path.splitext(filename)[1].lower()
    
    if ext in ['.pdf']:
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            text = []
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    text.append(f"--- Page {i+1} ---\n" + page_text)
            full_text = "\n\n".join(text)
            if not full_text.strip():
                raise ValueError("PDF contains no readable text (it may be scanned images).")
            return full_text
        except Exception as e:
            raise ValueError(f"Failed to extract text from PDF '{filename}': {str(e)}")
            
    elif ext in ['.docx']:
        try:
            doc = docx.Document(io.BytesIO(file_bytes))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            full_text = "\n\n".join(paragraphs)
            if not full_text.strip():
                raise ValueError("DOCX document is empty.")
            return full_text
        except Exception as e:
            raise ValueError(f"Failed to extract text from DOCX '{filename}': {str(e)}")
            
    elif ext in ['.txt', '.md', '.csv', '.json']:
        try:
            return file_bytes.decode('utf-8', errors='ignore')
        except Exception as e:
            raise ValueError(f"Failed to read text file '{filename}': {str(e)}")
            
    elif ext in ['.png', '.jpg', '.jpeg', '.webp']:
        try:
            image = Image.open(io.BytesIO(file_bytes))
            contents = [
                image,
                "Extract all visible text from this image accurately. Also provide a concise summary description of any charts, diagrams, infographics, or visual contents present."
            ]
            response_text = generate_content_with_fallback(gemini_client, contents, config=None)
            return response_text or "No text could be extracted from image."
        except Exception as e:
            raise ValueError(f"Failed to process image with Gemini Vision: {str(e)}")
            
    elif ext in ['.mp4', '.avi', '.mov', '.mkv', '.webm']:
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
                tmp.write(file_bytes)
                tmp_path = tmp.name
                
            cap = cv2.VideoCapture(tmp_path)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS) or 30
            
            extracted_images = []
            if total_frames > 0:
                num_samples = min(5, total_frames)
                indices = [int(i * total_frames / num_samples) for i in range(num_samples)]
                
                for idx in indices:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
                    ret, frame = cap.read()
                    if ret:
                        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                        pil_img = Image.fromarray(rgb_frame)
                        extracted_images.append(pil_img)
            cap.release()
            os.remove(tmp_path)
            
            if not extracted_images:
                return "Video uploaded, but could not extract frames."
                
            contents = extracted_images + [
                "The following images are representative keyframes extracted from a video. Extract all visible text, slides, subtitles, and describe the sequential video scenes and main topic discussed."
            ]
            response_text = generate_content_with_fallback(gemini_client, contents, config=None)
            return response_text or "No content described from video frames."
        except Exception as e:
            raise ValueError(f"Failed to process video file '{filename}': {str(e)}")
    else:
        raise ValueError(f"Unsupported file format '{ext}'. Supported formats: .txt, .pdf, .docx, .png, .jpg, .jpeg, .webp, .mp4, .mov, .avi")
