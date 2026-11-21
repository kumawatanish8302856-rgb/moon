# Instagram Reels & Private Post Download Guide

## How Instagram Reel Downloading Works
Instagram (Meta) strictly blocks anonymous backend/server IPs from accessing video streams without an authenticated session. When an unauthenticated server requests a Reel, Instagram responds with:
> `Instagram API is not granting access / Instagram sent an empty media response`

---

## How to Enable Instant Instagram Reel Downloads:

You only need to export your browser's Instagram cookies once into a `cookies.txt` file:

1. **Install Browser Extension**:
   - Install **"Get cookies.txt LOCALLY"** (available on Chrome Web Store or Firefox Add-ons).
2. **Open Instagram**:
   - Go to [https://www.instagram.com](https://www.instagram.com) in your browser and ensure you are signed in.
3. **Export Cookies**:
   - Click the extension icon and click **Export**.
   - Save the file as **`cookies.txt`**.
4. **Copy to MOONFLOW Backend**:
   - Place `cookies.txt` inside the `backend/` folder:
     `c:\Users\kumaw\OneDrive\Desktop\moonhub\backend\cookies.txt`
5. **Restart or Run Backend**:
   - MOONFLOW's FastAPI backend automatically detects `cookies.txt` on every request.
   - Any public or private Instagram Reel / Post / Audio will now download without any login walls or rate-limits!
