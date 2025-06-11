import requests
import json


igUrl = "https://www.instagram.com/reel/DGimjJZTs0P/?igsh=MWRrNXZ0eHZwZGQ3MQ=="
url = f"https://instagram-reels-downloader-tau.vercel.app/api/video?postUrl={igUrl}"


resp = requests.get(url)
print(resp.text)