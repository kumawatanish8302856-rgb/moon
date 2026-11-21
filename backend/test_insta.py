import urllib.request
import re
import json

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Sec-Fetch-Mode': 'navigate',
}

url = 'https://www.instagram.com/reel/C8kF3a2M1bQ/embed/captioned/'
try:
    req = urllib.request.Request(url, headers=headers)
    html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8', 'ignore')
    
    # Check for direct video links
    mp4_links = re.findall(r'https:[^"\'\\<>\s]+?\.mp4[^"\'\\<>\s]*', html)
    print("Direct mp4 links found:", len(mp4_links))
    for m in set(mp4_links[:5]):
        clean = m.replace('\\u0026', '&').replace('&amp;', '&')
        print("MP4 URL:", clean[:100])
        
    # Check for video title/caption/thumbnail
    title_match = re.search(r'<title>([^<]+)</title>', html)
    print("Title:", title_match.group(1) if title_match else "None")

except Exception as e:
    print("Error:", e)
