from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.8-flash"
    embedding_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    chroma_dir: str = "./chroma_store"
    chroma_collection: str = "campus_documents"
    chunk_size: int = 900
    chunk_overlap: int = 150
    top_k: int = 6
    similarity_threshold: float = 0.35
    ocr_enabled: bool = False
    internal_api_key: str = "change-me-shared-secret"


settings = Settings()

NOT_FOUND_MESSAGE = (
    "I could not find reliable information about this topic "
    "in the currently uploaded college documents."
)
