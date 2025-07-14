import os
from fastapi import FastAPI, Request, Header, HTTPException
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError

DISCORD_PUBLIC_KEY = os.getenv("DISCORD_PUBLIC_KEY")

app = FastAPI()

@app.post("/interactions")
async def interactions(
    request: Request,
    x_signature_ed25519: str = Header(...),
    x_signature_timestamp: str = Header(...)
):
    body = await request.body()

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

    if data["type"] == 3 and data["data"]["custom_id"] == "run_update":
        return {
            "type": 4,
            "data": {
                "content": "✅ Update playbook triggered!",
                "flags": 64
            }
        }

    return {"type": 5}
