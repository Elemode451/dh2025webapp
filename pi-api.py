from fastapi import FastAPI
import asyncio
import requests
import time
from typing import Dict

# local imports
from humidity import humidity_call
from atemp import atemp_call
from soil import soil_call
from water_sensor_s import water_call

app = FastAPI()

# -----------------------------
# Config
# -----------------------------
POD_ID = ""
POST_URL = ""

# Example list of plant IDs
PLANT_IDS = ["plant-uuid-1"]

# -----------------------------
# Aggregate plant info
# -----------------------------
def read_plant_info() -> Dict:
    plant_info = {}
    for pid in PLANT_IDS:
        try:
            plant_info[pid] = {
                "moisture": soil_call(),        # your moisture function
                "lastWateredAt": water_call()  # your last watered timestamp
            }
        except Exception as e:
            print(f"Error reading plant {pid}:", e)
    return plant_info

# -----------------------------
# Aggregate global info
# -----------------------------
def read_global_info() -> Dict:
    try:
        return {
            "avgTempC": atemp_call(),      # your temperature function
            "avgHumidity": humidity_call() # your humidity function
        }
    except Exception as e:
        print("Error reading global sensors:", e)
        return {}

# -----------------------------
# Post telemetry
# -----------------------------
def post_telemetry(watered: bool=False):
    payload = {
        "podId": POD_ID,
        "at": int(time.time()),  # current timestamp in seconds
        "watered": watered,
        "plant_info": read_plant_info(),
        "global_info": read_global_info()
    }
    try:
        response = requests.post(POST_URL, json=payload)
        print(f"Posted telemetry: {payload}")
        print("Response:", response.status_code, response.text)
    except Exception as e:
        print("Failed to post telemetry:", e)

# -----------------------------
# Background task: every 2 hours typically
# -----------------------------
async def periodic_post():
    while True:
        post_telemetry(watered=False)
        await asyncio.sleep(30)  # 30 seconds for testing

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(periodic_post())

# -----------------------------
# Optional endpoint to check current readings
# -----------------------------
@app.get("/current")
async def get_current():
    return {
        "plant_info": read_plant_info(),
        "global_info": read_global_info()
    }
