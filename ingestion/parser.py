import os
from io import BytesIO
from pypdf import PdfReader
from docx import Document

class DocumentParser:
    @staticmethod
    def parse_pdf(file_path: str) -> str:
        """Parses a digital PDF and returns extracted text."""
        text = ""
        try:
            reader = PdfReader(file_path)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        except Exception as e:
            print(f"Error parsing PDF {file_path}: {e}")
        return text

    @staticmethod
    def parse_docx(file_path: str) -> str:
        """Parses a DOCX file and returns extracted text."""
        text = ""
        try:
            doc = Document(file_path)
            for para in doc.paragraphs:
                text += para.text + "\n"
        except Exception as e:
            print(f"Error parsing DOCX {file_path}: {e}")
        return text

    @staticmethod
    def parse_txt(file_path: str) -> str:
        """Parses a standard plain text file."""
        text = ""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                text = f.read()
        except Exception as e:
            print(f"Error parsing TXT {file_path}: {e}")
        return text
        
    @staticmethod
    def parse_file(file_path: str) -> str:
        """Routes file to correct parser based on extension."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
            
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            return DocumentParser.parse_pdf(file_path)
        elif ext in [".doc", ".docx"]:
            return DocumentParser.parse_docx(file_path)
        elif ext == ".txt":
            return DocumentParser.parse_txt(file_path)
        else:
            raise ValueError(f"Unsupported file extension: {ext}")
