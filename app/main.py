import os
import httpx
from fastapi import FastAPI, Request, Header, HTTPException
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError
import re

DISCORD_PUBLIC_KEY = os.getenv("DISCORD_PUBLIC_KEY")

# Preload all semaphore trigger URLs by index
SEMAPHORE_TARGETS = {
    key.replace("SEMAPHORE_URL_", "").lower(): value
    for key, value in os.environ.items()
    if key.startswith("SEMAPHORE_URL_")
}

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

    # Respond to Discord PING check
    if data["type"] == 1:
        return {"type": 1}

    # Handle button interaction
    if data["type"] == 3:
        custom_id = data["data"]["custom_id"]

        # Match buttons like "semaphore_1", "semaphore_2"
        match = re.fullmatch(r"semaphore_(\d+)", custom_id)
        if match:
            target_index = match.group(1)
            target_url = SEMAPHORE_TARGETS.get(target_index)

            if target_url:
                try:
                    async with httpx.AsyncClient() as client:
                        await client.post(target_url)
                except Exception as e:
                    print(f"Error triggering Semaphore {custom_id}:", e)
                    return {
                        "type": 4,
                        "data": {
                            "content": f"❌ Failed to trigger update via Semaphore...",
                            "flags": 64
                        }
                    }

                return {
                    "type": 4,
                    "data": {
                        "content": f"✅ Playbook triggered via Semaphore!",
                        "flags": 64
                    }
                }

    return {"type": 5}
