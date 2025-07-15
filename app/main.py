import os
import httpx # type: ignore
from fastapi import FastAPI, Request, Header, HTTPException # type: ignore
from nacl.signing import VerifyKey # type: ignore
from nacl.exceptions import BadSignatureError # type: ignore

DISCORD_PUBLIC_KEY = os.getenv("DISCORD_PUBLIC_KEY")
SEMAPHORE_VMS_LXCS_UPDATE_TRIGGER_URL = os.getenv("SEMAPHORE_VMS_LXCS_UPDATE_TRIGGER_URL")
SEMAPHORE_PVE_CLUSTERS_UPDATE_TRIGGER_URL = os.getenv("SEMAPHORE_PVE_CLUSTERS_UPDATE_TRIGGER_URL")

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

        if custom_id == "run_pve_clusters_update":
            try:
                async with httpx.AsyncClient() as client:
                    await client.post(SEMAPHORE_PVE_CLUSTERS_UPDATE_TRIGGER_URL)
            except Exception as e:
                print(f"Error triggering PVE update:", e)
                return {
                    "type": 4,
                    "data": {
                        "content": f"❌ Failed to trigger Proxmox update: {e}",
                        "flags": 64
                    }
                }

            return {
                "type": 4,
                "data": {
                    "content": "✅ Proxmox update triggered via Semaphore!",
                    "flags": 64
                }
            }

        elif custom_id == "run_vms_lxcs_update":
            try:
                async with httpx.AsyncClient() as client:
                    await client.post(SEMAPHORE_VMS_LXCS_UPDATE_TRIGGER_URL)
            except Exception as e:
                print(f"Error triggering VMs/LXCs update:", e)
                return {
                    "type": 4,
                    "data": {
                        "content": f"❌ Failed to trigger VMs/LXCs update: {e}",
                        "flags": 64
                    }
                }

            return {
                "type": 4,
                "data": {
                    "content": "✅ VMs & LXC update triggered via Semaphore!",
                    "flags": 64
                }
            }

    # Default fallback for unknown interactions
    return {"type": 5}