import os
import httpx
from fastapi import FastAPI, Request, Header, HTTPException
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError

DISCORD_PUBLIC_KEY = os.getenv("DISCORD_PUBLIC_KEY")
SEMAPHORE_TRIGGER_URL = os.getenv("SEMAPHORE_TRIGGER_URL")
SEMAPHORE_HEADER_NAME = os.getenv("SEMAPHORE_HEADER_NAME", "X-Semaphore-Matcher")

# Map Discord custom_id to header values
custom_id_map = {}
raw_map = os.getenv("DISCORD_CUSTOM_ID_MAP", "")
for entry in raw_map.split(","):
    if "=" in entry:
        custom_id, matcher_value = entry.strip().split("=", 1)
        custom_id_map[custom_id] = matcher_value

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

    # Respond to Discord PING
    if data["type"] == 1:
        return {"type": 1}

    # Handle interaction
    if data["type"] == 3:
        custom_id = data["data"]["custom_id"]
        matcher_value = custom_id_map.get(custom_id)

        if matcher_value:
            try:
                # Build combined header value
                header_value = f"key={matcher_value}, value={matcher_value}"
                headers = {SEMAPHORE_HEADER_NAME: header_value}

                async with httpx.AsyncClient() as client:
                    await client.post(SEMAPHORE_TRIGGER_URL, headers=headers)

            except Exception as e:
                print(f"[X] Failed to trigger Semaphore for '{custom_id}': {e}")
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
                    "content": f"✅ Triggered playbook",
                    "flags": 64
                }
            }

    return {"type": 5}