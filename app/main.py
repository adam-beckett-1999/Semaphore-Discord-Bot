import os
import httpx
from fastapi import FastAPI, Request, Header, HTTPException
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError

DISCORD_PUBLIC_KEY = os.getenv("DISCORD_PUBLIC_KEY")
SEMAPHORE_TRIGGER_URL = os.getenv("SEMAPHORE_TRIGGER_URL")

# Map Discord button custom_ids to header keys
# Example: run_vms → vms-lxcs-update
custom_id_map = {}
raw_map = os.getenv("DISCORD_CUSTOM_ID_MAP", "")
for entry in raw_map.split(","):
    if "=" in entry:
        custom_id, header_key = entry.strip().split("=", 1)
        custom_id_map[custom_id] = header_key

app = FastAPI()

@app.post("/interactions")
async def interactions(
    request: Request,
    x_signature_ed25519: str = Header(...),
    x_signature_timestamp: str = Header(...)
):
    body = await request.body()

    # Verify Discord signature
    try:
        verify_key = VerifyKey(bytes.fromhex(DISCORD_PUBLIC_KEY))
        verify_key.verify(
            x_signature_timestamp.encode() + body,
            bytes.fromhex(x_signature_ed25519)
        )
    except BadSignatureError:
        raise HTTPException(status_code=401, detail="Invalid signature")

    data = await request.json()

    # Discord PING
    if data["type"] == 1:
        return {"type": 1}

    # Button interaction
    if data["type"] == 3:
        custom_id = data["data"]["custom_id"]
        header_key = custom_id_map.get(custom_id)

        if header_key:
            try:
                headers = {header_key: "true"}

                async with httpx.AsyncClient() as client:
                    await client.post(SEMAPHORE_TRIGGER_URL, headers=headers)

                return {
                    "type": 4,
                    "data": {
                        "content": f"✅ Triggered playbook: **{header_key}**",
                        "flags": 64  # ephemeral response
                    }
                }

            except Exception as e:
                print(f"[X] Semaphore trigger failed for '{custom_id}':", e)
                return {
                    "type": 4,
                    "data": {
                        "content": f"❌ Failed to trigger update: {e}",
                        "flags": 64
                    }
                }

    # Fallback for unsupported actions
    return {"type": 5}