# MOONFLOW

Expo mobile app for video downloads and WhatsApp status saving, with a FastAPI media backend.

## Run locally

Install the JavaScript dependencies and Python backend requirements:

```bash
npm install
python -m pip install -r backend/requirements.txt
```

Start both services in separate terminals:

```bash
npm run backend
npm start
```

On Windows, `npm run dev` starts both services in separate command windows.

## Web deployment

Build the web app with `npx expo export --platform web`. It is a single-page app, so configure the host to serve `index.html` for routes such as `/status` and `/downloads`.

## Instagram access

Some Instagram posts require authentication. See [backend/README_COOKIES.md](./backend/README_COOKIES.md) for backend cookie setup.
