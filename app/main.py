import os
import httpx
from fastapi import FastAPI, Request, Header, HTTPException
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError

DISCORD_PUBLIC_KEY = os.getenv("DISCORD_PUBLIC_KEY")
SEMAPHORE_TRIGGER_URL = os.getenv("SEMAPHORE_TRIGGER_URL")
SEMAPHORE_TRIGGER_TOKEN = os.getenv("SEMAPHORE_TRIGGER_TOKEN")

app = FastAPI()

@app.post("/interactions")
async def interactions(
    request: Request,
    x_signature_ed25519: str = Header(...),
    x_signature_timestamp: str = Header(...)
):
    body = await request.body()

    # Validate Discord Signature
    try:
        verify_key = VerifyKey(bytes.fromhex(DISCORD_PUBLIC_KEY))
        verify_key.verify(
            x_signature_timestamp.encode() + body,
            bytes.fromhex(x_signature_ed25519)
        )
    except BadSignatureError:
        raise HTTPException(status_code=401, detail="Invalid signature")

    data = await request.json()

    if data["type"] == 1:
        return {"type": 1}

    # Handle Button Interaction
    if data["type"] == 3 and data["data"]["custom_id"] == "run_update":
        # Trigger Semaphore build
        try:
            headers = {"Authorization": f"Token {SEMAPHORE_TRIGGER_TOKEN}"} if SEMAPHORE_TRIGGER_TOKEN else {}
            async with httpx.AsyncClient() as client:
                await client.post(SEMAPHORE_TRIGGER_URL, headers=headers)
        except Exception as e:
            print("Error triggering Semaphore:", str(e))
            return {
                "type": 4,
                "data": {
                    "content": f"❌ Failed to trigger update: {e}",
                    "flags": 64
                }
            }

        return {
            "type": 4,
            "data": {
                "content": "✅ Update playbook triggered via Semaphore!",
                "flags": 64
            }
        }

    return {"type": 5}

