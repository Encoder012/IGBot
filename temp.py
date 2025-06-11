import requests
import json


url = "https://gram-grabberz.vercel.app/api/instagram/p/DHQGCdTR4Yg"
resp = requests.get(url)
print(json.loads(resp.text)['data']['xdt_shortcode_media']['video_url'])