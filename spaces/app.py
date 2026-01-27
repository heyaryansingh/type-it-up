from fastapi import FastAPI, UploadFile
from marker.converters.pdf import PdfConverter
import io

app = FastAPI()

@app.get("/health")
async def health_check():
    return {"status": "ok", "model": "marker", "version": "0.2.17"}

@app.post("/convert")
async def convert_document(file: UploadFile):
    # Implementation placeholder for Phase 2
    return {"status": "ready", "message": "Endpoint created, processing TBD"}
