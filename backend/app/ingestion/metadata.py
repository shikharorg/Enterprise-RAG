import uuid
from dataclasses import dataclass
from pathlib import Path

from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine

_analyzer: AnalyzerEngine | None = None
_anonymizer: AnonymizerEngine | None = None


def load_pii_engines() -> None:
    global _analyzer, _anonymizer
    _analyzer = AnalyzerEngine()
    _anonymizer = AnonymizerEngine()


def strip_pii(text: str) -> str:
    if _analyzer is None or _anonymizer is None:
        raise RuntimeError("PII engines not loaded. Call load_pii_engines() first.")
    results = _analyzer.analyze(text=text, language="en")
    if not results:
        return text
    anonymized = _anonymizer.anonymize(text=text, analyzer_results=results)
    return anonymized.text


@dataclass
class DocumentMeta:
    doc_id: str
    source: str
    role_access: str


def build_doc_meta(file_path: Path, role_access: str) -> DocumentMeta:
    return DocumentMeta(
        doc_id=str(uuid.uuid4()),
        source=file_path.name,
        role_access=role_access,
    )
