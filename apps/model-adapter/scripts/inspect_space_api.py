import os
from gradio_client import Client

space_id = os.getenv("HF_SPACE_ID", "Pattarabordee/pea-ne1-meter-detection")
client = Client(space_id)
client.view_api()
