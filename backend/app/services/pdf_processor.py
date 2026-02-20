import os
import re
from typing import List, Optional
from pypdf import PdfReader
from app.models.rag import DocumentChunk
from app.config.settings import settings


class PDFProcessor:
    """Process PDFs into chunks for embedding"""

    def __init__(
        self,
        chunk_size: int = None,
        chunk_overlap: int = None
    ):
        self.chunk_size = chunk_size or settings.RAG_CHUNK_SIZE
        self.chunk_overlap = chunk_overlap or settings.RAG_CHUNK_OVERLAP

    def extract_text_from_pdf(self, pdf_path: str) -> List[dict]:
        """
        Extract text from a PDF file page by page.

        Args:
            pdf_path: Path to the PDF file

        Returns:
            List of dictionaries with page_number and text
        """
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")

        reader = PdfReader(pdf_path)
        pages = []

        for page_num, page in enumerate(reader.pages, start=1):
            text = page.extract_text()
            if text and text.strip():
                # Clean up the text
                text = self._clean_text(text)
                pages.append({
                    "page_number": page_num,
                    "text": text
                })

        return pages

    def _clean_text(self, text: str) -> str:
        """Clean extracted text"""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove page numbers that appear alone
        text = re.sub(r'^\d+\s*$', '', text, flags=re.MULTILINE)
        # Fix common OCR issues
        text = text.replace('\x00', '')
        return text.strip()

    def _detect_section_header(self, text: str) -> Optional[str]:
        """Detect if text starts with a section header"""
        # Common patterns for section headers in dietary guidelines
        header_patterns = [
            r'^(Chapter\s+\d+[:\s]*.+)',
            r'^(\d+\.\s+[A-Z][^.]+)',
            r'^([A-Z][A-Z\s]+[A-Z])(?:\s|$)',  # ALL CAPS headers
            r'^(Key\s+Messages?|Guidelines?|Recommendations?)',
            r'^(Food\s+Group|Sample\s+Menu|Daily\s+Requirements?)',
        ]

        for pattern in header_patterns:
            match = re.match(pattern, text[:200], re.IGNORECASE)
            if match:
                return match.group(1).strip()

        return None

    def chunk_text(
        self,
        text: str,
        chunk_size: int = None,
        overlap: int = None
    ) -> List[str]:
        """
        Split text into overlapping chunks.

        Args:
            text: Text to split
            chunk_size: Maximum size of each chunk
            overlap: Number of characters to overlap between chunks

        Returns:
            List of text chunks
        """
        chunk_size = chunk_size or self.chunk_size
        overlap = overlap or self.chunk_overlap

        if len(text) <= chunk_size:
            return [text]

        chunks = []
        start = 0

        while start < len(text):
            end = start + chunk_size

            # Try to break at sentence boundary
            if end < len(text):
                # Look for sentence ending within last 20% of chunk
                search_start = max(start, end - int(chunk_size * 0.2))
                search_text = text[search_start:end]

                # Find last sentence boundary
                sentence_ends = [
                    m.end() for m in re.finditer(r'[.!?]\s+', search_text)
                ]

                if sentence_ends:
                    # Adjust end to sentence boundary
                    end = search_start + sentence_ends[-1]

            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)

            # Move start position with overlap
            start = end - overlap if end < len(text) else len(text)

        return chunks

    def create_chunks_with_metadata(
        self,
        pdf_path: str,
        source_name: Optional[str] = None
    ) -> List[DocumentChunk]:
        """
        Process a PDF and create document chunks with metadata.

        Args:
            pdf_path: Path to the PDF file
            source_name: Optional name for the source (defaults to filename)

        Returns:
            List of DocumentChunk objects
        """
        source_name = source_name or os.path.basename(pdf_path)
        pages = self.extract_text_from_pdf(pdf_path)

        all_chunks = []
        current_section = "General"

        for page_data in pages:
            page_num = page_data["page_number"]
            text = page_data["text"]

            # Check for section header
            header = self._detect_section_header(text)
            if header:
                current_section = header

            # Create chunks for this page
            chunks = self.chunk_text(text)

            for i, chunk_text in enumerate(chunks):
                chunk = DocumentChunk(
                    content=chunk_text,
                    metadata={
                        "source_file": source_name,
                        "page_number": page_num,
                        "section": current_section,
                        "chunk_index": i,
                        "total_chunks_in_page": len(chunks)
                    }
                )
                all_chunks.append(chunk)

        return all_chunks

    def process_table_content(self, text: str) -> List[DocumentChunk]:
        """
        Special processing for table content (food servings, calorie requirements).
        Tables are kept as single chunks to preserve structure.

        Args:
            text: Text containing table data

        Returns:
            List of DocumentChunk objects
        """
        # Detect table patterns
        table_patterns = [
            r'(Age.*?kcal.*?(?:\n.*?(?:\d+\s*[-–]\s*\d+|\d+\s*years?).*?)+)',
            r'(Food\s+Group.*?Servings?.*?(?:\n.*?)+)',
        ]

        chunks = []
        for pattern in table_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
            for match in matches:
                chunk = DocumentChunk(
                    content=match.strip(),
                    metadata={
                        "content_type": "table",
                        "preserve_structure": True
                    }
                )
                chunks.append(chunk)

        return chunks

    def test(self):
        """Test PDF processing with sample files"""
        print("PDF Processor Test")
        print("=" * 50)

        # Test with knowledge base files
        kb_path = os.path.join(
            os.path.dirname(__file__),
            "..", "..", "..", "Docs", "Knowledge Base Files"
        )
        kb_path = os.path.normpath(kb_path)

        if os.path.exists(kb_path):
            for filename in os.listdir(kb_path):
                if filename.endswith('.pdf'):
                    pdf_path = os.path.join(kb_path, filename)
                    print(f"\nProcessing: {filename}")

                    try:
                        chunks = self.create_chunks_with_metadata(pdf_path)
                        print(f"  Created {len(chunks)} chunks")

                        if chunks:
                            print(f"  First chunk preview: {chunks[0].content[:100]}...")
                            print(f"  Metadata: {chunks[0].metadata}")
                    except Exception as e:
                        print(f"  Error: {e}")
        else:
            print(f"Knowledge base path not found: {kb_path}")


# Create singleton instance
pdf_processor = PDFProcessor()


if __name__ == "__main__":
    pdf_processor.test()
