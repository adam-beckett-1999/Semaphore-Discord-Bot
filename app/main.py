import os
import httpx
from fastapi import FastAPI, Request, Header, HTTPException
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError

DISCORD_PUBLIC_KEY = os.getenv("DISCORD_PUBLIC_KEY")
SEMAPHORE_VMS_LXCS_UPDATE_TRIGGER_URL = os.getenv("SEMAPHORE_VMS_LXCS_UPDATE_TRIGGER_URL")
SEMAPHORE_PVE_CLUSTERS_UPDATE_TRIGGER_URL = os.getenv("SEMAPHORE_PVE_CLUSTERS_UPDATE_TRIGGER_URL")

# Map button custom_id to corresponding Semaphore trigger URL
TRIGGER_URLS = {
    "run_vms_lxcs_update": SEMAPHORE_VMS_LXCS_UPDATE_TRIGGER_URL,
    "run_pve_clusters_update": SEMAPHORE_PVE_CLUSTERS_UPDATE_TRIGGER_URL,
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

    if data["type"] == 1:
        return {"type": 1}

    # Handle Button Interaction
    if data["type"] == 3:
        custom_id = data["data"]["custom_id"]
        trigger_url = TRIGGER_URLS.get(custom_id)

        if trigger_url:
            try:
                async with httpx.AsyncClient() as client:
                    await client.post(trigger_url)
            except Exception as e:
                print(f"Error triggering Semaphore for {custom_id}: {str(e)}")
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
                    "content": f"✅ Update playbook triggered via Semaphore for **{custom_id}**!",
                    "flags": 64
                }
            }

    return {"type": 5}